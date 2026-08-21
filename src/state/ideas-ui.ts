"use client";

import { create } from "zustand";

type IdeasUiStore = {
  scrollProgress: number;
  developerVisible: boolean;
  setScrollProgress: (progress: number) => void;
  toggleDeveloper: () => void;
};

export const useIdeasUi = create<IdeasUiStore>((set) => ({
  scrollProgress: 0,
  developerVisible: false,
  setScrollProgress: (scrollProgress) => set({ scrollProgress }),
  toggleDeveloper: () => set((state) => ({ developerVisible: !state.developerVisible })),
}));
