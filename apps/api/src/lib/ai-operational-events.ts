import { prisma } from "./prisma.js";
import type { AiOperationalEvent } from "../generated/prisma/client.js";

export type RecordAiOperationalEventInput = {
  tenantId: string;
  aiSystemId?: string;
  assessmentId?: string;
  obligationId?: string;
  taskId?: string;
  actorUserId?: string;
  eventType: string;
  severity: string;
  source: string;
  message: string;
  metadata?: any;
};

/**
 * Records an AI Compliance operational event with full validation.
 * 
 * This version throws errors for validation failures, making it
 * suitable for use in critical paths where event recording
 * should succeed or fail the main operation.
 * 
 * @param input The event data to record
 * @param tx Optional transaction client for transaction-aware writes
 * @returns Promise that resolves when the event is recorded
 * @throws Error if validation fails
 */
export async function recordAiOperationalEvent(
  input: RecordAiOperationalEventInput,
  tx?: { aiOperationalEvent: any }
): Promise<AiOperationalEvent> {
  const prismaClient = tx?.aiOperationalEvent || prisma;

  // Validate tenant ownership of related objects where practical
  if (input.aiSystemId) {
    const aiSystem = await prismaClient.aiSystem.findFirst({
      where: {
        id: input.aiSystemId,
        tenantId: input.tenantId,
      },
      select: { id: true },
    });

    if (!aiSystem) {
      throw new Error("AI system not found or access denied");
    }
  }

  // Validate actor membership if actorUserId is provided
  if (input.actorUserId) {
    const actorMembership = await prismaClient.tenantMembership.findFirst({
      where: {
        userId: input.actorUserId,
        tenantId: input.tenantId,
      },
      select: { id: true },
    });

    const actorUser = await prismaClient.user.findFirst({
      where: { id: input.actorUserId },
      select: { platformAdmin: true },
    });

    if (!actorMembership && !actorUser?.platformAdmin) {
      // Drop actor attribution safely instead of rejecting
      input.actorUserId = undefined;
    }
  }

  if (input.assessmentId) {
    const assessment = await prismaClient.aiAssessment.findFirst({
      where: {
        id: input.assessmentId,
        tenantId: input.tenantId,
      },
      select: { id: true },
    });

    if (!assessment) {
      throw new Error("Assessment not found or access denied");
    }
  }

  if (input.obligationId) {
    const obligation = await prismaClient.aiObligation.findFirst({
      where: {
        id: input.obligationId,
        tenantId: input.tenantId,
      },
      select: { id: true },
    });

    if (!obligation) {
      throw new Error("Obligation not found or access denied");
    }
  }

  if (input.taskId) {
    const task = await prismaClient.aiTask.findFirst({
      where: {
        id: input.taskId,
        tenantId: input.tenantId,
      },
      select: { id: true },
    });

    if (!task) {
      throw new Error("Task not found or access denied");
    }
  }

  // Validate and bound metadata
  let validatedMetadata = null;
  if (input.metadata) {
    try {
      const serialized = JSON.stringify(input.metadata);
      
      // Keep metadata bounded (roughly 1KB limit)
      if (serialized.length > 1024) {
        throw new Error("Metadata too large");
      }
      
      validatedMetadata = input.metadata;
    } catch (error) {
      throw new Error("Invalid metadata format");
    }
  }

  // Record event
  const event = await prismaClient.aiOperationalEvent.create({
    data: {
      tenantId: input.tenantId,
      aiSystemId: input.aiSystemId,
      assessmentId: input.assessmentId,
      obligationId: input.obligationId,
      taskId: input.taskId,
      actorUserId: input.actorUserId,
      eventType: input.eventType,
      severity: input.severity,
      source: input.source,
      message: input.message,
      metadata: validatedMetadata,
    },
  });

  return event;
}

/**
 * Records an AI Compliance operational event with best-effort semantics.
 * 
 * This version does not throw errors for validation failures, making it
 * suitable for use in critical paths where event recording should not
 * disrupt the primary operation.
 * 
 * @param input The event data to record
 * @returns Promise that resolves when the event is recorded (or fails silently)
 */
export async function recordAiOperationalEventBestEffort(
  input: RecordAiOperationalEventInput
): Promise<void> {
  try {
    await recordAiOperationalEvent(input);
  } catch (error) {
    // Log error but don't throw - this is best-effort
    console.error("Failed to record operational event:", {
      error: error instanceof Error ? error.message : String(error),
      eventType: input.eventType,
      tenantId: input.tenantId,
    });
  }
}
