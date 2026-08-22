"use client";

import { createPortal } from "react-dom";
import { useEffect, useRef, type ReactNode } from "react";

interface ModalPortalProps {
  children: ReactNode;
  onClose: () => void;
  labelledBy: string;
  className?: string;
}

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

/**
 * Modal layer: portal into #modal-root, focus trap, Escape/backdrop close,
 * focus restoration — and it announces itself so the smooth-scroll engine
 * pauses while a dialog owns the viewport (wheel events inside dialogs scroll
 * the dialog, never the page behind it via data-lenis-prevent).
 */
export function ModalPortal({ children, onClose, labelledBy, className = "" }: ModalPortalProps) {
  const container = typeof document === "undefined" ? null : document.getElementById("modal-root");
  const previousFocus = useRef<HTMLElement | null>(null);
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const root = container;
    if (!root) return;
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    window.dispatchEvent(new Event("meridian:modal-open"));
    const focusFirst = () => {
      const first = root.querySelector<HTMLElement>(focusableSelector);
      first?.focus();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(root.querySelectorAll<HTMLElement>(focusableSelector));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    window.requestAnimationFrame(focusFirst);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.dispatchEvent(new Event("meridian:modal-close"));
      previousFocus.current?.focus();
    };
  }, [container]);

  if (!container) return null;
  return createPortal(
    <div
      className={`modal-backdrop ${className}`}
      role="presentation"
      data-lenis-prevent
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeRef.current();
      }}
    >
      <section className="modal-surface" role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
        {children}
      </section>
    </div>,
    container,
  );
}
