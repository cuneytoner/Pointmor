import { forwardRef, type InputHTMLAttributes } from "react";
import { cx } from "../../lib/cx";
import { FORM_CONTROL_CLASS } from "./field-classes";

export const TextField = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function TextField({ className, ...props }, ref) {
    return <input ref={ref} className={cx(FORM_CONTROL_CLASS, className)} {...props} />;
  },
);
