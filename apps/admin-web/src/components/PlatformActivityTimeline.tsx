import { Badge } from "./ui/Badge";
import {
  type ActivitySeverity,
  type ActivityType,
  presentActivitySeverityIcon,
  presentActivitySeverityLabel,
  presentActivitySeverityTone,
} from "../lib/platformPresentation";

export type PlatformActivityItem = {
  id: string;
  title: string;
  when: string;
  type: ActivityType;
  severity: ActivitySeverity;
  organization?: string;
  chain?: string;
  aging?: string;
  actor?: string;
  source?: string;
  relatedObject?: string;
  reason?: string;
};

export function PlatformActivityTimeline({
  title,
  items,
  emptyText,
}: {
  title: string;
  items: PlatformActivityItem[];
  emptyText: string;
}) {
  const grouped = groupByType(items);
  return (
    <div className="admin-app__card admin-app__card--wide">
      <p className="admin-app__card-title">{title}</p>
      {items.length === 0 ? (
        <p className="admin-app__card-text data-table__muted">{emptyText}</p>
      ) : (
        grouped.map((group) => (
          <div className="activity-group" key={group.type}>
            <div className="activity-group__head">
              <p className="admin-app__card-text">
                <strong>{presentTypeLabel(group.type)}</strong>
              </p>
              <Badge tone="neutral">{`${group.items.length} events`}</Badge>
            </div>
            <div className="activity-event-list">
              {group.items.map((item) => (
                <article className="activity-event" key={item.id}>
                  <div className="activity-event__main">
                    <div>
                      <p className="activity-event__title">{item.title}</p>
                      <p className="activity-event__meta">
                        {[item.organization, item.when].filter(Boolean).join(" - ")}
                      </p>
                    </div>
                    <Badge tone={presentActivitySeverityTone(item.severity)}>
                      {`${presentActivitySeverityIcon(item.severity)} ${presentActivitySeverityLabel(
                        item.severity,
                      )}`}
                    </Badge>
                  </div>
                  <dl className="activity-event__details">
                    <div>
                      <dt>Actor</dt>
                      <dd>{item.actor ?? "-"}</dd>
                    </div>
                    <div>
                      <dt>Source</dt>
                      <dd>{item.source ?? item.chain ?? "-"}</dd>
                    </div>
                    <div>
                      <dt>Related object</dt>
                      <dd>{item.relatedObject ?? "-"}</dd>
                    </div>
                    <div>
                      <dt>Reason</dt>
                      <dd>{item.reason ?? "-"}</dd>
                    </div>
                    <div>
                      <dt>Aging</dt>
                      <dd>{item.aging ?? "-"}</dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function presentTypeLabel(type: ActivityType): string {
  const labels: Record<ActivityType, string> = {
    compliance: "Compliance",
    billing: "Billing",
    advisor: "Advisor",
    loyalty: "Loyalty",
    onboarding: "Onboarding",
    subscription_lifecycle: "Subscription lifecycle",
  };
  return labels[type];
}

function groupByType(items: PlatformActivityItem[]): Array<{
  type: ActivityType;
  items: PlatformActivityItem[];
}> {
  const map = new Map<ActivityType, PlatformActivityItem[]>();
  for (const item of items) {
    const existing = map.get(item.type) ?? [];
    existing.push(item);
    map.set(item.type, existing);
  }
  return Array.from(map.entries()).map(([type, groupItems]) => ({
    type,
    items: groupItems,
  }));
}
