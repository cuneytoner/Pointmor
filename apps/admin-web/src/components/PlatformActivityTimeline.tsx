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
          <div className="table-wrap" key={group.type}>
            <p className="admin-app__card-text" style={{ marginBottom: 8 }}>
              <strong>{presentTypeLabel(group.type)}</strong>
            </p>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Organization</th>
                  <th>When</th>
                  <th>Actor</th>
                  <th>Source</th>
                  <th>Related object</th>
                  <th>Reason</th>
                  <th>Aging</th>
                  <th>Severity</th>
                </tr>
              </thead>
              <tbody>
                {group.items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.title}</td>
                    <td>{item.organization ?? "-"}</td>
                    <td className="data-table__muted">{item.when}</td>
                    <td className="data-table__muted">{item.actor ?? "-"}</td>
                    <td className="data-table__muted">{item.source ?? item.chain ?? "-"}</td>
                    <td className="data-table__muted">{item.relatedObject ?? "-"}</td>
                    <td className="data-table__muted">{item.reason ?? "-"}</td>
                    <td className="data-table__muted">{item.aging ?? "-"}</td>
                    <td>
                      <Badge tone={presentActivitySeverityTone(item.severity)}>
                        {`${presentActivitySeverityIcon(item.severity)} ${presentActivitySeverityLabel(
                          item.severity,
                        )}`}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
