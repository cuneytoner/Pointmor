import type { ReactNode } from "react";
import { cx } from "../../lib/cx";

const GRID_CLASS =
  "pm-form-field-grid grid min-w-0 grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2";

export type FormFieldGridProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Bölüm içi iki kolon (md+) / tek kolon (mobil); `FormField` çocuklarına uygulanır.
 * Tam genişlik için `FORM_FIELD_GRID_FULL_CLASS` kullanın.
 */
export function FormFieldGrid({ children, className }: FormFieldGridProps) {
  return <div className={cx(GRID_CLASS, className)}>{children}</div>;
}

/** Grid içinde tek satırda tüm genişlik (ad, açıklama, bölüm ipucu) */
export const FORM_FIELD_GRID_FULL_CLASS = "md:col-span-2 min-w-0";
