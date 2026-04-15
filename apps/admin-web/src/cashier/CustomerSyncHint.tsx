type CustomerSyncHintProps = {
  hintIdle: string;
  hintRefreshing: string;
  hintError: string;
  refreshLabel: string;
  state: "idle" | "refreshing" | "error";
  onRefresh: () => void;
  disabled: boolean;
};

export function CustomerSyncHint({
  hintIdle,
  hintRefreshing,
  hintError,
  refreshLabel,
  state,
  onRefresh,
  disabled,
}: CustomerSyncHintProps) {
  const text =
    state === "refreshing"
      ? hintRefreshing
      : state === "error"
        ? hintError
        : hintIdle;
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
      <span>{text}</span>
      <button
        type="button"
        className="font-medium text-indigo-600 underline-offset-2 hover:underline disabled:opacity-50"
        disabled={disabled}
        onClick={onRefresh}
      >
        {refreshLabel}
      </button>
    </div>
  );
}
