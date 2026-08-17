"use client";

import React, { useState } from "react";

interface KineticTypographyProps {
  children: string;
  as?: "h1" | "h2" | "h3" | "span" | "div" | "p";
  className?: string;
  variant?: "wave" | "cascade" | "hero";
  delayOffset?: number;
}

export function KineticTypography({
  children,
  as: Component = "span",
  className = "",
  variant = "wave",
  delayOffset = 0,
}: KineticTypographyProps) {
  const [isHovered, setIsHovered] = useState(false);
  const text = typeof children === "string" ? children : "";

  // Split into words, preserving spaces
  const words = text.split(" ");

  let totalCharIndex = 0;

  return (
    <Component
      className={`kinetic-text-wrap kinetic-${variant} ${isHovered ? "is-hovered" : ""} ${className}`}
      aria-label={text}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {words.map((word, wordIndex) => {
        const chars = Array.from(word);
        return (
          <span className="kinetic-word" key={`word-${wordIndex}`}>
            {chars.map((char) => {
              const charDelay = delayOffset + totalCharIndex * 0.022;
              totalCharIndex += 1;
              return (
                <span
                  key={`char-${totalCharIndex}`}
                  className="kinetic-char-wrapper"
                  aria-hidden="true"
                >
                  <span
                    className="kinetic-char primary"
                    style={{ transitionDelay: `${charDelay}s` }}
                  >
                    {char}
                  </span>
                  <span
                    className="kinetic-char secondary"
                    style={{ transitionDelay: `${charDelay}s` }}
                  >
                    {char}
                  </span>
                </span>
              );
            })}
            {wordIndex < words.length - 1 && (
              <span className="kinetic-space" aria-hidden="true">
                &nbsp;
              </span>
            )}
          </span>
        );
      })}
    </Component>
  );
}
