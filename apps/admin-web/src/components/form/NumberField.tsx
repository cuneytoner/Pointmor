import { forwardRef, type InputHTMLAttributes } from "react";
import { cx } from "../../lib/cx";
import { FORM_CONTROL_CLASS } from "./field-classes";

export const NumberField = forwardRef<
  HTMLInputElement,
  Omit<InputHTMLAttributes<HTMLInputElement>, "type">
>(function NumberField({ className, inputMode = "numeric", ...props }, ref) {
  return (
    <input
      ref={ref}
      type="text"
      inputMode={inputMode}
      className={cx(FORM_CONTROL_CLASS, className)}
      {...props}
    />
  );
});
