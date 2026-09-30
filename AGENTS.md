# figma-make-app

React + Next.js + Tailwind CSS v4 project running inside Figma Make.

## Development Server

A Next.js development server is **already running** on port 8443. You don't need to start it manually.

- Preview URL: The user can access the running app through the preview panel
- Hot reload: Changes to source files are reflected immediately

## Project Structure

All application code lives at the **repository root** — there is no `src/` directory. Start with task-relevant files below.

- `App.tsx` - Primary application component and the usual starting point for UI work
- `app/layout.tsx` - Next.js root layout; wires Inter font via `next/font/google` and imports `app/globals.css`
- `app/page.tsx` - Next.js root page; renders `<App />`
- `app/globals.css` - Global CSS entrypoint, Tailwind CSS v4 import, and `@theme` tokens
- `components/Sidebar.tsx` - Sidebar navigation component
- `components/TopBar.tsx` - Top header bar
- `components/ui.tsx` - Shared UI primitives (Card, Pill, Button, StatusBadge)
- `views/` - One file per view: Dashboard, Allocations, Venues, Constraints, Generate, History
- `lib/data.ts` - Seed data and TypeScript types for the app
- `next.config.ts` - Next.js configuration
- `postcss.config.mjs` - PostCSS config wiring `@tailwindcss/postcss`
- `tsconfig.json` - TypeScript config; `@/*` alias maps to the repository root
- `package.json` - Project dependencies and scripts
- `.mise.toml` - Toolchain versions for Node.js and pnpm

## Dependencies

- Runtime: React 19, React DOM 19, Next.js 15
- Styling: Tailwind CSS v4 with `@tailwindcss/postcss`
- Icons: lucide-react
- Build tooling: Next.js 15, TypeScript 5.7

## Styling

This project uses **Tailwind CSS v4** via the `@tailwindcss/postcss` PostCSS plugin. `app/globals.css` imports Tailwind with `@import 'tailwindcss'` and defines all design tokens in an `@theme {}` block. Use Tailwind utility classes directly in JSX. No separate Tailwind config file is needed.

Font wiring lives in `app/layout.tsx` using `next/font/google`. The Inter font is loaded as a CSS variable `--font-inter` and referenced in the `--font-sans` token in `app/globals.css`.

## Client Components

All interactive components use the `"use client"` directive at the top of the file (required by Next.js App Router for components with React hooks or browser event handlers).

## Code quality

- Use double quotes for strings containing apostrophes (`"We're here to help"`), or escape them in single-quoted strings.
- Ensure JSX tags are closed and braces are balanced.
- Export components as default exports.
