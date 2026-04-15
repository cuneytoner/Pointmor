type RestoreDraftNoticeProps = {
  message: string;
  visible: boolean;
};

/** Sayfa yenilemeden sonra taslak geri yüklendiyse kısa bilgi. */
export function RestoreDraftNotice({ message, visible }: RestoreDraftNoticeProps) {
  if (!visible) return null;
  return (
    <p className="mb-3 rounded-lg border border-indigo-100 bg-indigo-50/80 px-3 py-2 text-center text-xs text-indigo-900">
      {message}
    </p>
  );
}
