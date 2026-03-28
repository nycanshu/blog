# nycanshu/blog

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Astro](https://img.shields.io/badge/Astro-BC52EE?style=for-the-badge&logo=astro&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![GitHub Pages](https://img.shields.io/badge/GitHub_Pages-222?style=for-the-badge&logo=github&logoColor=white)

Personal tech blog by **nycanshu** with a custom dark-first design called **"The Void"** — cosmic dark backgrounds, purple accent bioluminescence, glass-morphism UI, and scroll-reveal animations.

Built on [Astro](https://astro.build) + [AstroPaper](https://github.com/satnaing/astro-paper) + [Tailwind CSS v4](https://tailwindcss.com).

> **Live:** [nycanshu.github.io/blog](https://nycanshu.github.io/blog)

---

## Features

- Dark-first cosmic theme with purple accent (`#7c5bf0`)
- Glass-morphism header and UI elements
- Animated hero with glowing background orbs
- Scroll-reveal animations (respects `prefers-reduced-motion`)
- Full SEO: Open Graph, Twitter Cards, JSON-LD structured data, sitemap, RSS
- Dynamic OG image generation per post
- Pagefind static search
- Tags, pagination, archives
- Dark/light mode toggle
- Env-driven config (site URL, GA, etc. via `.env` / GitHub repo variables)
- GitHub Actions CI/CD to GitHub Pages

## Quick Start

```bash
git clone https://github.com/nycanshu/blog.git
cd blog
npm install
npm run dev        # http://localhost:4321
```

## Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

| Variable | Description | Required |
|---|---|---|
| `SITE_URL` | Deployed site URL | For production |
| `SITE_BASE` | Base path (e.g. `/blog` for github.io) | For production |
| `PUBLIC_GA_ID` | Google Analytics measurement ID | No |
| `PUBLIC_GOOGLE_SITE_VERIFICATION` | Google Search Console verification | No |

In CI, these are read from **GitHub repo variables** (Settings > Secrets and variables > Actions > Variables).

## Commands

| Command | Action |
|---|---|
| `npm install` | Install dependencies |
| `npm run dev` | Dev server at `localhost:4321` |
| `npm run build` | Production build to `./dist/` |
| `npm run preview` | Preview production build |
| `npm run format` | Format with Prettier |
| `npm run lint` | Lint with ESLint |

## Project Structure

```
src/
  config.ts          # Site metadata (title, author, description)
  constants.ts       # Social links, share links
  content.config.ts  # Blog post collection schema
  data/blog/         # Markdown blog posts
  components/        # Astro components (Header, Card, Footer, etc.)
  layouts/           # Page layouts (Base, Post, About)
  pages/             # File-based routing
  styles/            # Global CSS + typography (Tailwind v4)
  scripts/           # Theme toggle logic
```

## Writing Posts

Create a `.md` file in `src/data/blog/`:

```markdown
---
title: "Your Post Title"
description: "One sentence for Google snippet"
pubDatetime: 2026-03-28T00:00:00Z
tags:
  - node.js
  - tutorial
featured: false
draft: false
---

Your content here.
```

## Deployment

Push to `main` triggers the GitHub Actions workflow which builds and deploys to GitHub Pages.

To use a custom domain:
1. Add `public/CNAME` with your domain
2. Set `SITE_URL` to your domain, `SITE_BASE` to `/`
3. Configure DNS (CNAME record pointing to `<username>.github.io`)

---

## Important: Attribution Required

> **This is not a free template.** If you use this design, theme, or any part of this project as a base for your own site, **you must give credit** to the original author.
>
> Required attribution:
> - Link back to [github.com/nycanshu/blog](https://github.com/nycanshu/blog) in your site footer or README
> - Keep the original author credit visible
>
> **Do not** present this design as your own original work.

The custom "The Void" theme design, color system, animations, and UI components are original work by [nycanshu](https://github.com/nycanshu).

## Credits

- **Theme base:** [AstroPaper](https://github.com/satnaing/astro-paper) by [Sat Naing](https://satnaing.dev) (MIT License)
- **Framework:** [Astro](https://astro.build)
- **Styling:** [Tailwind CSS](https://tailwindcss.com)
- **Search:** [Pagefind](https://pagefind.app)
- **Icons:** [Tabler Icons](https://tabler-icons.io)

## License

The underlying AstroPaper code is MIT licensed (Copyright 2023 Sat Naing).

The custom design, theme, and modifications in this repository are Copyright 2026 nycanshu. You may use them with proper attribution as described above.

See [LICENSE](LICENSE) for details.
