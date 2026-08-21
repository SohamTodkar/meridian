"use client";

type KineticTextProps = {
  children: string;
  className?: string;
  as?: "span" | "h1" | "h2" | "p";
};

export function KineticText({ children, className = "", as: Tag = "span" }: KineticTextProps) {
  return (
    <Tag className={`kinetic-text ${className}`} aria-label={children}>
      {children.split("").map((character, index) => (
        <span className="kinetic-glyph" aria-hidden="true" key={`${character}-${index}`} style={{ "--glyph-delay": `${index * 0.02}s` } as React.CSSProperties}>
          <span>{character === " " ? "\u00a0" : character}</span>
          <span>{character === " " ? "\u00a0" : character}</span>
        </span>
      ))}
    </Tag>
  );
}
