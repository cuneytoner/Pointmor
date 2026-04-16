import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cx } from "../../lib/cx";
import { TEXTAREA_CLASS, TEXTAREA_LARGE_CLASS } from "./field-classes";

export type TextAreaFieldProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  /** `default`: kısa içerik; `large`: uzun şablon / not */
  sizeVariant?: "default" | "large";
};

export const TextAreaField = forwardRef<HTMLTextAreaElement, TextAreaFieldProps>(
  function TextAreaField({ className, sizeVariant = "default", rows = 4, ...props }, ref) {
    const base = sizeVariant === "large" ? TEXTAREA_LARGE_CLASS : TEXTAREA_CLASS;
    return <textarea ref={ref} rows={rows} className={cx(base, className)} {...props} />;
  },
);
