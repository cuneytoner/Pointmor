type SuccessToastProps = {
  visible: boolean;
  message: string;
};

export function SuccessToast({ visible, message }: SuccessToastProps) {
  if (!visible) return null;
  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-16 z-30 flex justify-center px-4"
      role="status"
      aria-live="polite"
    >
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm font-medium text-emerald-900 shadow-lg">
        {message}
      </div>
    </div>
  );
}
