type InlineStatusNoticeProps = {
  variant: "error" | "info";
  message: string;
};

export function InlineStatusNotice({ variant, message }: InlineStatusNoticeProps) {
  const cls =
    variant === "error"
      ? "border-red-200 bg-red-50 text-red-900"
      : "border-slate-200 bg-slate-100 text-slate-800";
  return (
    <p
      className={`rounded-xl border px-3 py-2 text-sm ${cls}`}
      role={variant === "error" ? "alert" : "status"}
    >
      {message}
    </p>
  );
}
