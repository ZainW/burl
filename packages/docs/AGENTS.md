# Docs Package

Nuxt 4 documentation site for burl CLI. See root AGENTS.md for project overview.

## STRUCTURE

```
docs/
├── app/
│   ├── app.vue           # Root component
│   ├── pages/
│   │   ├── index.vue     # Landing page
│   │   └── [...slug].vue # Dynamic doc pages
│   └── assets/css/       # Tailwind styles
├── content/              # Markdown docs (19 pages)
│   ├── 1.getting-started/  # Introduction, Installation, Quick Start
│   ├── 2.guide/            # Usage guides (5 pages)
│   ├── 3.cli/              # CLI reference
│   ├── 4.examples/         # Use case examples (4 pages)
│   ├── 5.output-schema/    # JSON/LLM output specs
│   └── 6.advanced/         # HTTP versions, latency, building
├── content.config.ts     # Collection definitions (landing, docs)
└── nuxt.config.ts        # Modules, site config, LLM sections
```

## WHERE TO LOOK

| Task                   | File                      | Notes                           |
| ---------------------- | ------------------------- | ------------------------------- |
| Add doc page           | `content/{section}/`      | Prefix with number for ordering |
| Change page layout     | `app/pages/[...slug].vue` | Uses UPage, UPageHeader         |
| Add content collection | `content.config.ts`       | Define schema with Zod          |
| Add OG image           | `nuxt.config.ts`          | `ogImage.defaults`              |

## CONVENTIONS

- **File ordering**: Prefix with `N.` (e.g., `1.introduction.md`, `2.installation.md`)
- **Section config**: `_dir.yml` in each content folder for section metadata
- **MDC components**: Use `::u-card`, `::u-card-group`, `:icon{}` syntax
- **Links array**: Frontmatter `links:` for action buttons on pages

## CONTENT SCHEMA

```yaml
---
title: Page Title         # Required
description: SEO desc     # Required
icon: i-lucide-book       # Optional - section icon
badge: New                # Optional - badge text
links:                    # Optional - action buttons
  - label: GitHub
    icon: i-simple-icons-github
    to: https://github.com/...
---
```

## MODULES

| Module          | Purpose                            |
| --------------- | ---------------------------------- |
| `@nuxt/content` | Markdown → Vue, SQLite content DB  |
| `@nuxt/ui`      | UI components (UPage, UCard, etc.) |
| `nuxt-og-image` | Auto-generated OG images           |

## COMMANDS

```bash
bun run dev       # Dev server (localhost:3000)
bun run build     # Production build
bun run generate  # Static site generation
bun run preview   # Preview production build
```

## NOTES

- **SQLite content DB**: Stored at `.data/content.db` - gitignored
- **Deployed to**: burl.wania.app (Vercel)
- **Tailwind v4**: Uses new CSS-based config in `assets/css/main.css`
