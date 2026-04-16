import type { ReactNode } from "react";
import { cx } from "../../lib/cx";

export type FormSectionProps = {
  title: ReactNode;
  children: ReactNode;
  /** Ek sınıf — `loyalty-form-section` üzerine */
  className?: string;
};

/**
 * Uzun formlarda bölüm başlığı + içerik (`loyalty-form-section__title` ile aynı ritim).
 */
export function FormSection({ title, children, className }: FormSectionProps) {
  return (
    <div className={cx("loyalty-form-section", className)}>
      <h3 className="loyalty-form-section__title">{title}</h3>
      {children}
    </div>
  );
}
