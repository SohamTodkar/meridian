"use client";

import dynamic from "next/dynamic";

export const HeroLoader = dynamic(() => import("./hero-3d").then((module) => module.Hero3D), {
  ssr: false,
  loading: () => <div className="hero-placeholder" aria-hidden="true" />,
});
