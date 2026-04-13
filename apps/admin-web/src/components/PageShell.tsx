import type { ReactNode } from "react";

type PageShellProps = {
  eyebrow: string;
  title: string;
  description?: string;
  children?: ReactNode;
};

export function PageShell({
  eyebrow,
  title,
  description,
  children,
}: PageShellProps) {
  return (
    <div className="page-shell">
      <p className="page-shell__eyebrow">{eyebrow}</p>
      <h1 className="page-shell__title">{title}</h1>
      {description ? (
        <p className="page-shell__desc">{description}</p>
      ) : null}
      <div className="page-shell__body">{children}</div>
    </div>
  );
}
