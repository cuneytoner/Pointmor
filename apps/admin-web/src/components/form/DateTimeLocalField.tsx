import { forwardRef, type InputHTMLAttributes } from "react";
import { cx } from "../../lib/cx";
import { FORM_DATETIME_CLASS } from "./field-classes";

export const DateTimeLocalField = forwardRef<
  HTMLInputElement,
  Omit<InputHTMLAttributes<HTMLInputElement>, "type">
>(function DateTimeLocalField({ className, ...props }, ref) {
  return (
    <input ref={ref} type="datetime-local" className={cx(FORM_DATETIME_CLASS, className)} {...props} />
  );
});
