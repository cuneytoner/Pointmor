import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { buildApp } from "./app.js";
import { issueSession } from "./lib/auth-memory.js";
import { authPreHandler } from "./lib/http-auth.js";
import { prisma } from "./lib/prisma.js";
import { recordAiOperationalEvent } from "./lib/ai-operational-events.js";

describe("AI Operational Events", () => {
  let app: any;
  let testTenant: any;
  let testUser: any;
  let testSession: any;
  let testSystem: any;

  beforeAll(async () => {
    app = await buildApp();
    
    // Generate unique run ID to avoid conflicts on repeated runs
    const runId = Date.now().toString(36);
    const tenantSlug = `test-ai-events-${runId}`;
    
    // Clean up any existing test data with this slug first
    await prisma.tenant.deleteMany({
      where: { slug: { startsWith: "test-ai-events" } }
    });
    
    // Clean up any existing test users with this email pattern
    await prisma.user.deleteMany({
      where: { email: { startsWith: "test-ai-events-" } }
    });
    
    // Create test tenant and user
    testTenant = await prisma.tenant.create({
      data: {
        slug: tenantSlug,
        name: "Test AI Events Tenant",
        type: "BUSINESS",
      },
    });

    testUser = await prisma.user.create({
      data: {
        email: `test-ai-events-${runId}@example.com`,
        name: "Test AI Events User",
        passwordHash: "dummy-hash",
        platformAdmin: false,
        role: "MEMBER",
      },
    });

    // Create membership
    await prisma.tenantMembership.create({
      data: {
        userId: testUser.id,
        tenantId: testTenant.id,
        role: "ADMIN",
      },
    });

    // Activate ai_act module
    const aiActModule = await prisma.module.findFirst({
      where: { name: "ai_act" },
    });
    
    if (aiActModule) {
      await prisma.tenantModule.create({
        data: {
          tenantId: testTenant.id,
          moduleId: aiActModule.id,
          isActive: true,
        },
      });
    }

    // Create test AI system
    testSystem = await prisma.aiSystem.create({
      data: {
        tenantId: testTenant.id,
        name: "Test AI System",
        purpose: "Testing operational events",
        providerType: "INTERNAL",
        status: "ACTIVE",
        createdByUserId: testUser.id,
      },
    });

    // Create session
    testSession = issueSession({
      user: {
        id: testUser.id,
        email: testUser.email,
        name: testUser.name,
        platformAdmin: false,
      },
      tenant: {
        id: testTenant.id,
        slug: testTenant.slug,
        name: testTenant.name,
      },
      membership: {
        tenantId: testTenant.id,
        role: "ADMIN",
        isExternal: false,
      },
      memberships: [
        {
          tenant: {
            id: testTenant.id,
            slug: testTenant.slug,
            name: testTenant.name,
          },
          membership: {
            tenantId: testTenant.id,
            role: "ADMIN",
            isExternal: false,
          },
        },
      ],
    });
  });

  afterAll(async () => {
    // Guard against setup failures - only cleanup if objects exist
    if (testTenant?.id) {
      await prisma.aiOperationalEvent.deleteMany({
        where: { tenantId: testTenant.id },
      });
      await prisma.aiSystem.deleteMany({
        where: { tenantId: testTenant.id },
      });
      await prisma.tenantModule.deleteMany({
        where: { tenantId: testTenant.id },
      });
      await prisma.tenantMembership.deleteMany({
        where: { tenantId: testTenant.id },
      });
      await prisma.tenant.delete({
        where: { id: testTenant.id },
      });
    }
    
    if (testUser?.id) {
      await prisma.user.delete({
        where: { id: testUser.id },
      });
    }
  });

  it("should record operational event successfully", async () => {
    await recordAiOperationalEvent({
      tenantId: testTenant.id,
      aiSystemId: testSystem.id,
      actorUserId: testUser.id,
      eventType: "SYSTEM_CREATED",
      severity: "INFO",
      source: "test",
      message: "Test operational event",
      metadata: { test: true },
    });

    const events = await prisma.aiOperationalEvent.findMany({
      where: { tenantId: testTenant.id },
      orderBy: { createdAt: "desc" },
    });

    expect(events).toHaveLength(1);
    expect(events[0].tenantId).toBe(testTenant.id);
    expect(events[0].aiSystemId).toBe(testSystem.id);
    expect(events[0].actorUserId).toBe(testUser.id);
    expect(events[0].eventType).toBe("SYSTEM_CREATED");
    expect(events[0].severity).toBe("INFO");
    expect(events[0].source).toBe("test");
    expect(events[0].message).toBe("Test operational event");
    expect(events[0].metadata).toEqual({ test: true });
  });

  it("should validate tenant ownership of related objects", async () => {
    // Create another tenant and system
    const otherTenant = await prisma.tenant.create({
      data: {
        slug: "other-tenant",
        name: "Other Tenant",
        type: "BUSINESS",
      },
    });

    const otherSystem = await prisma.aiSystem.create({
      data: {
        tenantId: otherTenant.id,
        name: "Other AI System",
        providerType: "INTERNAL",
        status: "ACTIVE",
      },
    });

    // This should fail because the system belongs to a different tenant
    await expect(
      recordAiOperationalEvent({
        tenantId: testTenant.id,
        aiSystemId: otherSystem.id,
        actorUserId: testUser.id,
        eventType: "SYSTEM_UPDATED",
        severity: "INFO",
        source: "test",
        message: "Should fail",
      })
    ).rejects.toThrow("AI system not found or access denied");

    // Clean up
    await prisma.aiSystem.delete({ where: { id: otherSystem.id } });
    await prisma.tenant.delete({ where: { id: otherTenant.id } });
  });

  it("should prevent cross-tenant event leakage", async () => {
    // Create event for test tenant
    await recordAiOperationalEvent({
      tenantId: testTenant.id,
      aiSystemId: testSystem.id,
      actorUserId: testUser.id,
      eventType: "ASSESSMENT_SUBMITTED",
      severity: "INFO",
      source: "test",
      message: "Test event for tenant isolation",
    });

    // Create another tenant and verify they can't see test tenant's events
    const otherTenant = await prisma.tenant.create({
      data: {
        slug: `isolated-tenant-${Date.now().toString(36)}`,
        name: "Isolated Tenant",
        type: "BUSINESS",
      },
    });

    const otherUser = await prisma.user.create({
      data: {
        email: `isolated-${Date.now().toString(36)}@example.com`,
        name: "Isolated User",
        passwordHash: "dummy-hash",
        platformAdmin: false,
        role: "MEMBER",
      },
    });

    await prisma.tenantMembership.create({
      data: {
        userId: otherUser.id,
        tenantId: otherTenant.id,
        role: "ADMIN",
      },
    });

    const otherSession = issueSession({
      user: {
        id: otherUser.id,
        email: otherUser.email,
        name: otherUser.name,
        platformAdmin: false,
      },
      tenant: {
        id: otherTenant.id,
        slug: otherTenant.slug,
        name: otherTenant.name,
      },
      membership: {
        tenantId: otherTenant.id,
        role: "ADMIN",
        isExternal: false,
      },
      memberships: [
        {
          tenant: {
            id: otherTenant.id,
            slug: otherTenant.slug,
            name: otherTenant.name,
          },
          membership: {
            tenantId: otherTenant.id,
            role: "ADMIN",
            isExternal: false,
          },
        },
      ],
    });

    // Query AI Compliance operations for other tenant should return module_not_active
    const response = await app.inject({
      method: "GET",
      url: "/admin/products/ai-compliance/operations",
      headers: {
        authorization: `Bearer ${otherSession}`,
      },
    });

    expect(response.statusCode).toBe(403);
    const data = response.json();
    expect(data.error).toBe("module_not_active");

    // Clean up
    await prisma.tenantMembership.deleteMany({
      where: { tenantId: otherTenant.id },
    });
    await prisma.user.delete({ where: { id: otherUser.id } });
    await prisma.tenant.delete({ where: { id: otherTenant.id } });
  });

  it("should include operational events in AI Compliance operations endpoint", async () => {
    // Create multiple events
    await recordAiOperationalEvent({
      tenantId: testTenant.id,
      aiSystemId: testSystem.id,
      actorUserId: testUser.id,
      eventType: "SYSTEM_CREATED",
      severity: "INFO",
      source: "test",
      message: "System created event",
    });

    await recordAiOperationalEvent({
      tenantId: testTenant.id,
      aiSystemId: testSystem.id,
      actorUserId: testUser.id,
      eventType: "ASSESSMENT_SUBMITTED",
      severity: "INFO",
      source: "test",
      message: "Assessment submitted event",
    });

    await recordAiOperationalEvent({
      tenantId: testTenant.id,
      aiSystemId: testSystem.id,
      actorUserId: testUser.id,
      eventType: "OBLIGATION_CREATED",
      severity: "WARNING",
      source: "test",
      message: "Obligation created event",
    });

    // Query AI Compliance operations
    const response = await app.inject({
      method: "GET",
      url: "/admin/products/ai-compliance/operations",
      headers: {
        authorization: `Bearer ${testSession}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const data = response.json();
    expect(data.aiCompliance.systems).toHaveLength(1);
    
    const system = data.aiCompliance.systems[0];
    
    // Filter for events created in this test to avoid dependencies on previous tests
    const testEvents = system.operationalEvents.filter((e: any) => 
      ["System created event", "Assessment submitted event", "Obligation created event"].includes(e.message)
    );
    expect(testEvents).toHaveLength(3);
    
    // Verify events are sorted by createdAt (newest first)
    expect(testEvents[0].eventType).toBe("OBLIGATION_CREATED");
    expect(testEvents[1].eventType).toBe("ASSESSMENT_SUBMITTED");
    expect(testEvents[2].eventType).toBe("SYSTEM_CREATED");
    
    // Verify event structure
    const event = testEvents[0];
    expect(event).toHaveProperty("id");
    expect(event).toHaveProperty("eventType");
    expect(event).toHaveProperty("severity");
    expect(event).toHaveProperty("sourceLabel");
    expect(event).toHaveProperty("message");
    expect(event).not.toHaveProperty("metadata");
    expect(event).toHaveProperty("createdAt");
    expect(event).toHaveProperty("actor");
    expect(event.actor).toHaveProperty("id");
    expect(event.actor).toHaveProperty("name");
    expect(event.actor).toHaveProperty("email");
  });

  it("should limit operational events to prevent excessive payload", async () => {
    // Create many events (more than the limit of 50)
    const eventPromises = [];
    for (let i = 0; i < 60; i++) {
      eventPromises.push(
        recordAiOperationalEvent({
          tenantId: testTenant.id,
          aiSystemId: testSystem.id,
          actorUserId: testUser.id,
          eventType: "TASK_UPDATED",
          severity: "INFO",
          source: "test",
          message: `Event ${i}`,
        })
      );
    }
    await Promise.all(eventPromises);

    // Query AI Compliance operations
    const response = await app.inject({
      method: "GET",
      url: "/admin/products/ai-compliance/operations",
      headers: {
        authorization: `Bearer ${testSession}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const data = response.json();
    const system = data.aiCompliance.systems[0];
    
    // Should be limited to 50 events
    expect(system.operationalEvents.length).toBeLessThanOrEqual(50);
  });

  it("should sanitize metadata in endpoint response", async () => {
    // Create event with metadata
    await recordAiOperationalEvent({
      tenantId: testTenant.id,
      aiSystemId: testSystem.id,
      actorUserId: testUser.id,
      eventType: "SYSTEM_UPDATED",
      severity: "INFO",
      source: "test",
      message: "Test event with metadata",
      metadata: { sensitive: "data", internal: "stuff", count: 42 },
    });

    // Query AI Compliance operations
    const response = await app.inject({
      method: "GET",
      url: "/admin/products/ai-compliance/operations",
      headers: {
        authorization: `Bearer ${testSession}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const data = response.json();
    const system = data.aiCompliance.systems[0];
    const event = system.operationalEvents.find((e: any) => e.eventType === "SYSTEM_UPDATED");
    
    expect(event).toBeDefined();
    // Should not include raw metadata
    expect(event).not.toHaveProperty("metadata");
    // Should include sanitized fields
    expect(event).toHaveProperty("id");
    expect(event).toHaveProperty("eventType");
    expect(event).toHaveProperty("severity");
    expect(event).toHaveProperty("sourceLabel");
    expect(event).toHaveProperty("message");
    expect(event).toHaveProperty("createdAt");
    expect(event).toHaveProperty("actor");
    expect(event).toHaveProperty("relatedObjectType");
  });

  it("should validate actor membership and drop attribution if invalid", async () => {
    // Create another user without membership
    const otherUser = await prisma.user.create({
      data: {
        email: "other-user@example.com",
        name: "Other User",
        passwordHash: "dummy-hash",
        platformAdmin: false,
        role: "MEMBER",
      },
    });

    // Record event with invalid actor (no membership)
    await recordAiOperationalEvent({
      tenantId: testTenant.id,
      aiSystemId: testSystem.id,
      actorUserId: otherUser.id, // This user has no membership
      eventType: "SYSTEM_UPDATED",
      severity: "INFO",
      source: "test",
      message: "Test with invalid actor",
    });

    // Check that event was recorded but actor attribution was dropped
    const events = await prisma.aiOperationalEvent.findMany({
      where: { 
        tenantId: testTenant.id,
        eventType: "SYSTEM_UPDATED",
      },
      orderBy: { createdAt: "desc" },
      take: 1,
    });

    expect(events).toHaveLength(1);
    expect(events[0].actorUserId).toBeNull(); // Actor should be dropped

    // Clean up
    await prisma.user.delete({ where: { id: otherUser.id } });
  });

  it("should allow platform admin as actor without membership", async () => {
    // Create platform admin user without membership
    const platformAdminUser = await prisma.user.create({
      data: {
        email: "platform-admin@example.com",
        name: "Platform Admin",
        passwordHash: "dummy-hash",
        platformAdmin: true,
        role: "ADMIN",
      },
    });

    // Record event with platform admin actor
    await recordAiOperationalEvent({
      tenantId: testTenant.id,
      aiSystemId: testSystem.id,
      actorUserId: platformAdminUser.id,
      eventType: "SYSTEM_UPDATED",
      severity: "INFO",
      source: "test",
      message: "Test with platform admin actor",
    });

    // Check that event was recorded with actor attribution preserved
    const events = await prisma.aiOperationalEvent.findMany({
      where: { 
        tenantId: testTenant.id,
        eventType: "SYSTEM_UPDATED",
        message: "Test with platform admin actor",
      },
      orderBy: { createdAt: "desc" },
      take: 1,
    });

    expect(events).toHaveLength(1);
    expect(events[0].actorUserId).toBe(platformAdminUser.id); // Actor should be preserved

    // Clean up
    await prisma.user.delete({ where: { id: platformAdminUser.id } });
  });

  it("should persist concrete obligationId on obligation events", async () => {
    // Create test obligation
    const obligation = await prisma.aiObligation.create({
      data: {
        tenantId: testTenant.id,
        aiSystemId: testSystem.id,
        obligationType: "TEST_OBLIGATION_CREATED",
        status: "PENDING",
        source: "MANUAL",
      },
    });

    // Record event with concrete obligationId
    await recordAiOperationalEvent({
      tenantId: testTenant.id,
      aiSystemId: testSystem.id,
      obligationId: obligation.id,
      actorUserId: testUser.id,
      eventType: "OBLIGATION_CREATED",
      severity: "INFO",
      source: "test",
      message: "Test obligation event with concrete ID",
    });

    // Verify event was recorded with concrete obligationId
    const events = await prisma.aiOperationalEvent.findMany({
      where: { 
        tenantId: testTenant.id,
        eventType: "OBLIGATION_CREATED",
        message: "Test obligation event with concrete ID",
      },
      orderBy: { createdAt: "desc" },
      take: 1,
    });

    expect(events).toHaveLength(1);
    expect(events[0].obligationId).toBe(obligation.id);
    expect(events[0].assessmentId).toBeNull();
    expect(events[0].taskId).toBeNull();
  });

  it("should persist concrete taskId on task events", async () => {
    // Create test obligation first for FK constraint
    const obligation = await prisma.aiObligation.create({
      data: {
        tenantId: testTenant.id,
        aiSystemId: testSystem.id,
        obligationType: "TEST_TASK_OBLIGATION",
        status: "PENDING",
        source: "MANUAL",
      },
    });

    // Create test task
    const task = await prisma.aiTask.create({
      data: {
        tenantId: testTenant.id,
        aiSystemId: testSystem.id,
        obligationId: obligation.id,
        obligationType: "TEST_TASK_OBLIGATION",
        title: "Test Task",
        priority: "HIGH",
        status: "OPEN",
      },
    });

    // Record event with concrete taskId
    await recordAiOperationalEvent({
      tenantId: testTenant.id,
      aiSystemId: testSystem.id,
      taskId: task.id,
      actorUserId: testUser.id,
      eventType: "TASK_CREATED",
      severity: "INFO",
      source: "test",
      message: "Test task event with concrete ID",
    });

    // Verify event was recorded with concrete taskId
    const events = await prisma.aiOperationalEvent.findMany({
      where: { 
        tenantId: testTenant.id,
        eventType: "TASK_CREATED",
        message: "Test task event with concrete ID",
      },
      orderBy: { createdAt: "desc" },
      take: 1,
    });

    expect(events).toHaveLength(1);
    expect(events[0].taskId).toBe(task.id);
    expect(events[0].assessmentId).toBeNull();
    expect(events[0].obligationId).toBeNull();
  });

  it("should include eventLabel in endpoint DTO response", async () => {
    // Record an event
    await recordAiOperationalEvent({
      tenantId: testTenant.id,
      aiSystemId: testSystem.id,
      actorUserId: testUser.id,
      eventType: "SYSTEM_CREATED",
      severity: "INFO",
      source: "test",
      message: "Test event for DTO validation",
    });

    // Get AI Compliance operations endpoint response
    const response = await app.inject({
      method: "GET",
      url: "/admin/products/ai-compliance/operations",
      headers: {
        authorization: `Bearer ${testSession}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const data = response.json();
    
    // Find the operational events in the response
    const system = data.aiCompliance.systems.find((s: any) => s.id === testSystem.id);
    expect(system).toBeDefined();
    expect(system.operationalEvents).toBeDefined();
    
    const testEvent = system.operationalEvents.find((e: any) => 
      e.message === "Test event for DTO validation"
    );
    expect(testEvent).toBeDefined();
    expect(testEvent.eventLabel).toBe("AI system created"); // Should have human-readable label
    expect(testEvent.sourceLabel).toBeDefined(); // Should have sanitized source label
  });

  it("should prove ASSESSMENT_UPDATED carries concrete assessmentId", async () => {
    // Create assessment
    const assessment = await prisma.aiAssessment.create({
      data: {
        tenantId: testTenant.id,
        aiSystemId: testSystem.id,
        version: 1,
        status: "DRAFT",
        riskLevel: "LOW",
        createdByUserId: testUser.id,
        isCurrent: true,
      },
    });

    // Record ASSESSMENT_UPDATED event with concrete assessmentId
    await recordAiOperationalEvent({
      tenantId: testTenant.id,
      aiSystemId: testSystem.id,
      assessmentId: assessment.id,
      actorUserId: testUser.id,
      eventType: "ASSESSMENT_UPDATED",
      severity: "INFO",
      source: "test",
      message: "Assessment updated with concrete ID",
    });

    // Verify event was recorded with concrete assessmentId
    const events = await prisma.aiOperationalEvent.findMany({
      where: { 
        tenantId: testTenant.id,
        eventType: "ASSESSMENT_UPDATED",
        message: "Assessment updated with concrete ID",
      },
      orderBy: { createdAt: "desc" },
      take: 1,
    });

    expect(events).toHaveLength(1);
    expect(events[0].assessmentId).toBe(assessment.id);
    expect(events[0].obligationId).toBeNull();
    expect(events[0].taskId).toBeNull();
  });

  it("should prove OBLIGATION_UPDATED carries concrete obligationId", async () => {
    // Create obligation
    const obligation = await prisma.aiObligation.create({
      data: {
        tenantId: testTenant.id,
        aiSystemId: testSystem.id,
        obligationType: "TEST_OBLIGATION_UPDATED",
        status: "PENDING",
        source: "MANUAL",
      },
    });

    // Record OBLIGATION_UPDATED event with concrete obligationId
    await recordAiOperationalEvent({
      tenantId: testTenant.id,
      aiSystemId: testSystem.id,
      obligationId: obligation.id,
      actorUserId: testUser.id,
      eventType: "OBLIGATION_UPDATED",
      severity: "INFO",
      source: "test",
      message: "Obligation updated with concrete ID",
    });

    // Verify event was recorded with concrete obligationId
    const events = await prisma.aiOperationalEvent.findMany({
      where: { 
        tenantId: testTenant.id,
        eventType: "OBLIGATION_UPDATED",
        message: "Obligation updated with concrete ID",
      },
      orderBy: { createdAt: "desc" },
      take: 1,
    });

    expect(events).toHaveLength(1);
    expect(events[0].obligationId).toBe(obligation.id);
    expect(events[0].assessmentId).toBeNull();
    expect(events[0].taskId).toBeNull();
  });

  it("should prove TASK_UPDATED carries concrete taskId", async () => {
    // Create obligation first for FK constraint
    const obligation = await prisma.aiObligation.create({
      data: {
        tenantId: testTenant.id,
        aiSystemId: testSystem.id,
        obligationType: "TEST_TASK_UPDATED_OBLIGATION",
        status: "PENDING",
        source: "MANUAL",
      },
    });

    // Create task
    const task = await prisma.aiTask.create({
      data: {
        tenantId: testTenant.id,
        aiSystemId: testSystem.id,
        obligationId: obligation.id,
        obligationType: "TEST_TASK_UPDATED_OBLIGATION",
        title: "Test Task",
        priority: "HIGH",
        status: "OPEN",
      },
    });

    // Record TASK_UPDATED event with concrete taskId
    await recordAiOperationalEvent({
      tenantId: testTenant.id,
      aiSystemId: testSystem.id,
      taskId: task.id,
      actorUserId: testUser.id,
      eventType: "TASK_UPDATED",
      severity: "INFO",
      source: "test",
      message: "Task updated with concrete ID",
    });

    // Verify event was recorded with concrete taskId
    const events = await prisma.aiOperationalEvent.findMany({
      where: { 
        tenantId: testTenant.id,
        eventType: "TASK_UPDATED",
        message: "Task updated with concrete ID",
      },
      orderBy: { createdAt: "desc" },
      take: 1,
    });

    expect(events).toHaveLength(1);
    expect(events[0].taskId).toBe(task.id);
    expect(events[0].assessmentId).toBeNull();
    expect(events[0].obligationId).toBeNull();
  });
});
