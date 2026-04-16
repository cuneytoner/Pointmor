/**
 * Basit `{{variable}}` yer değiştirme — eksik anahtarlar boş string olur.
 */
const PLACEHOLDER = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

export function renderTemplate(
  template: string,
  data: Record<string, string | number | boolean | null | undefined>,
): string {
  return template.replace(PLACEHOLDER, (_m, key: string) => {
    const v = data[key];
    if (v === null || v === undefined) return "";
    return String(v);
  });
}

/** Şablondaki değişken adlarını listeler (benzersiz sıra). */
export function extractTemplateVariableNames(template: string): string[] {
  const names: string[] = [];
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  const re = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
  while ((m = re.exec(template)) !== null) {
    const k = m[1];
    if (!seen.has(k)) {
      seen.add(k);
      names.push(k);
    }
  }
  return names;
}
