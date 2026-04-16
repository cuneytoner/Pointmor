import { forwardRef, type InputHTMLAttributes } from "react";
import { cx } from "../../lib/cx";
import { NUMERIC_COMPACT_CONTROL_CLASS, NUMERIC_DEFAULT_CONTROL_CLASS } from "./field-classes";

export type NumberFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  /** `compact`: dar sütun (~100px), sağa hizalı; `default`: tam genişlik */
  size?: "compact" | "default";
};

export const NumberField = forwardRef<HTMLInputElement, NumberFieldProps>(function NumberField(
  { className, inputMode = "numeric", size = "compact", ...props },
  ref,
) {
  const base = size === "compact" ? NUMERIC_COMPACT_CONTROL_CLASS : NUMERIC_DEFAULT_CONTROL_CLASS;
  return (
    <input
      ref={ref}
      type="text"
      inputMode={inputMode}
      className={cx(base, className)}
      {...props}
    />
  );
});
