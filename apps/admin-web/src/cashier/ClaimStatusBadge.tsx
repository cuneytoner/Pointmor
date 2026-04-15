type ClaimStatusBadgeProps = {
  label: string;
};

export function ClaimStatusBadge({ label }: ClaimStatusBadgeProps) {
  return (
    <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-900">
      {label}
    </span>
  );
}
