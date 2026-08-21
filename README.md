# Ideas

Ideas is a responsive personal field journal for writing down, filtering, and sharing small experiments in systems, interfaces, practice, product, research, and design.

The site is a Next.js App Router application with MDX-powered ideas, a lazily loaded React Three Fiber hero, Lenis-aware scroll progress, non-blocking Rive details, Framer Motion card layout, Fuse.js search, Shiki-powered code examples, structured metadata, RSS, an Open Graph endpoint, and accessible keyboard navigation.

## Run locally

Install the repository-pinned dependencies, then start the development server.

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Use `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` to validate the project. `pnpm validate` runs the complete local release check.

## Add an idea

Add an `.mdx` file under `src/content/ideas/`. Each document must define this frontmatter:

```yaml
title: A clear working title
description: One sentence describing the idea.
tags: [Design, Practice]
status: Exploring
date: 2026-08-21
accent: coral
```

The archive automatically derives search content, filter tags, reading time, detail routes, RSS items, sitemaps, and article metadata from these files.

## Design and interaction commitments

The initial page is kept light: the WebGL scene is dynamically imported, animations are limited to `transform` and `opacity`, images are loaded as texture assets only in the canvas, and reduced-motion settings disable nonessential transitions and Lenis smoothing. Native browser keyboard scrolling, text selection, and find-in-page behavior remain untouched. Press `F1` to toggle the field-mode overlay; the Konami sequence provides a lightweight visual flourish.
