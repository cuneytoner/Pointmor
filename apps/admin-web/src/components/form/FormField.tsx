import type { ReactNode } from "react";
import { cx } from "../../lib/cx";

export type FormFieldProps = {
  id?: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  className?: string;
  children: ReactNode;
};

/**
 * Stack düzeni: etiket üstte, kontrol altta (tüm alan tipleri için varsayılan).
 * Kontrol yüksekliği `loyalty-form-control` ile gelir.
 */
export function FormField({
  id,
  label,
  hint,
  error,
  required,
  className,
  children,
}: FormFieldProps) {
  const labelEl = (
    <span className="pm-form-field__label">
      {label}
      {required ? (
        <span className="pm-form-field__req" aria-hidden="true">
          {" "}
          *
        </span>
      ) : null}
    </span>
  );

  return (
    <label className={cx("pm-form-field", className)} htmlFor={id}>
      {labelEl}
      {children}
      {hint ? <p className="loyalty-form-hint">{hint}</p> : null}
      {error ? (
        <p className="pm-form-field__error" role="alert">
          {error}
        </p>
      ) : null}
    </label>
  );
}
