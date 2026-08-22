"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

/**
 * Button atom for the answer-kit components — the variants the pasted
 * gallery expects (primary, secondary, accent, success), rendered in
 * Meridian's quiet language. Transform-only hover feedback.
 */

export type ButtonVariant = "primary" | "secondary" | "accent" | "success";

const base =
  "inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-[8px] px-3 text-[12.5px] font-medium transition-[background-color,color,border-color,opacity,transform] duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-45";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-ink text-canvas hover:opacity-90",
  secondary: "border border-line-strong text-ink-2 hover:border-ink-3 hover:text-ink",
  accent: "border border-accent/50 text-accent-ink hover:bg-accent-tint",
  success: "bg-green text-canvas hover:opacity-90",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: "sm" | "md";
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={`${base} ${variants[variant]} ${size === "sm" ? "h-7 px-2.5 text-[12px]" : ""} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
