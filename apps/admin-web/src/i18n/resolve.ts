/**
 * Nested message trees + dot-path lookup. EN bundle is always the fallback chain.
 */

export interface MessageTree {
  [key: string]: string | MessageTree;
}

export function getMessage(
  tree: MessageTree | undefined,
  path: string,
): string | undefined {
  const parts = path.split(".").filter(Boolean);
  let cur: string | MessageTree | undefined = tree;
  for (const p of parts) {
    if (cur === undefined || typeof cur === "string") return undefined;
    cur = cur[p];
  }
  return typeof cur === "string" ? cur : undefined;
}

/** Replace {{name}} placeholders — no string concatenation in copy. */
export function interpolate(
  template: string,
  params?: Record<string, string | number>,
): string {
  if (!params) return template;
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key: string) => {
    const v = params[key];
    return v !== undefined && v !== null ? String(v) : "";
  });
}
