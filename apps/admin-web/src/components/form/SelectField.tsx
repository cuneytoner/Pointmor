import { forwardRef, type SelectHTMLAttributes } from "react";
import { cx } from "../../lib/cx";
import { FORM_CONTROL_CLASS } from "./field-classes";

export const SelectField = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(function SelectField({ className, ...props }, ref) {
  return <select ref={ref} className={cx(FORM_CONTROL_CLASS, className)} {...props} />;
});
