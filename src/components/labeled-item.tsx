import type { ReactNode } from "react";

export function LabeledItem({
  name,
  qualifier,
  meta,
  children,
}: {
  name: string;
  qualifier?: ReactNode;
  meta?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <article className="labeled-item">
      <div className="labeled-item-heading">
        <strong>{name}</strong>
        {qualifier && <><span className="labeled-item-separator" aria-hidden="true"> · </span><span className="labeled-item-qualifier">{qualifier}</span></>}
      </div>
      {meta && <div className="labeled-item-meta"><span className="labeled-item-separator" aria-hidden="true">— </span>{meta}</div>}
      {children && <div className="labeled-item-body"><span className="labeled-item-separator" aria-hidden="true">— </span>{children}</div>}
    </article>
  );
}

export function DisplayPair({
  title,
  description,
  meta,
  className = "",
}: {
  title: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  className?: string;
}) {
  return (
    <span className={`display-pair ${className}`}>
      <span className="display-pair-title">{title}</span>
      {description && <><span className="display-pair-separator" aria-hidden="true"> — </span><span className="display-pair-description">{description}</span></>}
      {meta && <><span className="display-pair-separator" aria-hidden="true"> · </span><span className="display-pair-meta">{meta}</span></>}
    </span>
  );
}
