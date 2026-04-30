import type { ReactNode } from "react";

type PageShellProps = {
  /** Üst başlık yok; üst layout (ör. Workspace Administration) sağlar. */
  embedded?: boolean;
  eyebrow?: string;
  title?: string;
  description?: string;
  children?: ReactNode;
};

export function PageShell({
  embedded,
  eyebrow,
  title,
  description,
  children,
}: PageShellProps) {
  if (embedded) {
    return <div className="page-shell page-shell--embedded">{children}</div>;
  }
  return (
    <div className="page-shell">
      {eyebrow ? <p className="page-shell__eyebrow">{eyebrow}</p> : null}
      {title ? <h1 className="page-shell__title">{title}</h1> : null}
      {description ? (
        <p className="page-shell__desc">{description}</p>
      ) : null}
      <div className="page-shell__body">{children}</div>
    </div>
  );
}
