# Dr. Suraj Prasad – Academic Homepage & CV

[![Deploy to GitHub Pages](https://github.com/sprasadphy/homewebpage/actions/workflows/deploy.yml/badge.svg)](https://github.com/sprasadphy/homewebpage/actions/workflows/deploy.yml)

Personal academic website and curriculum vitae for **Dr. Suraj Prasad**, Experimental High-Energy Physics Researcher (ALICE Collaboration at CERN LHC / HUN-REN Wigner Research Centre for Physics).

Live URL: **[https://sprasadphy.github.io/homewebpage/](https://sprasadphy.github.io/homewebpage/)**

---

## Features

- **Responsive & Framework-Free**: Vanilla HTML5 and CSS with custom design tokens, modern typography, mobile navigation drawer, and print-ready CV export.
- **Dynamic Publication Explorer**: Filter publication records by document type (articles vs conference proceedings), author count, year range, refereed status, and first-author contributions.
- **LaTeX Math Support**: Mathematical expressions and kinematic notation rendered smoothly via MathJax 3.
- **Deployment-Ready**:
  - Automated GitHub Actions workflow (`.github/workflows/deploy.yml`) for continuous deployment to GitHub Pages.
  - `.nojekyll` file to bypass Jekyll build processing.
  - Custom `404.html` fallback page matching the design.
  - SEO optimization with semantic HTML, Open Graph tags, Twitter cards, `robots.txt`, and `sitemap.xml`.
  - SVG particle-physics favicon and `site.webmanifest`.

---

## Directory Structure

```text
├── index.html                   # Homepage / Biography / Research themes
├── research.html                # Detailed research overview and methodology
├── publications.html            # Interactive, filterable publication records
├── talks.html                   # Chronological list of conference talks and posters
├── experience.html              # Academic history, visiting positions, and skills
├── cv.html                      # Complete CV with PDF print-to-file action
├── 404.html                     # Branded 404 error page
├── style.css                    # Unified design system and responsive styles
├── favicon.svg                  # Particle physics vector favicon
├── site.webmanifest             # Web application manifest for mobile bookmarks
├── robots.txt                   # Search engine crawl directives
├── sitemap.xml                  # Canonical XML sitemap for SEO
├── .nojekyll                    # Disables Jekyll processing on GitHub Pages
├── .github/
│   └── workflows/
│       └── deploy.yml           # GitHub Pages CI/CD workflow
├── scripts/
│   ├── nav.js                   # Mobile navigation drawer interaction
│   ├── publications.js          # Publication rendering and client-side filtering
│   ├── publications_data.js     # Static JSON payload for publication entries
│   ├── cv-download.js           # Trigger native print-to-PDF flow
│   ├── convert_publications_tex.py # Parse LaTeX publications.tex to JSON/JS
│   ├── update_publications.py   # Fetch records directly from INSPIRE API
│   └── update_publications.sh   # Convenience wrapper for updates
└── data/                        # Local generated datasets (git-ignored)
```

---

## Deployment to GitHub Pages

This repository is pre-configured with a zero-config GitHub Actions deployment workflow:

1. **Enable GitHub Pages in your repository settings**:
   - Go to **Settings** > **Pages** in your GitHub repository.
   - Under **Build and deployment** > **Source**, select **GitHub Actions**.
2. **Push to `main`**:
   - Any commit pushed to the `main` branch will automatically trigger the workflow in `.github/workflows/deploy.yml`.
   - The workflow packages the static files and publishes them to `https://<username>.github.io/homewebpage/`.

### Other Static Hosts

The site consists entirely of standard HTML, CSS, and vanilla JS with relative asset paths, making it directly hostable on:
- **Cloudflare Pages**: Set build output directory to `/` (root).
- **Vercel**: Set root directory to `/`, no build command required.
- **Netlify**: Set publish directory to `/`, no build command required.

---

## Local Development & Preview

Because the site uses standard web technologies, no build step or node installation is required. Run any static HTTP server from the project directory:

### Option 1: Python (Built-in)
```bash
python3 -m http.server 8000
```
Then open `http://localhost:8000` in your web browser.

### Option 2: Node / npx
```bash
npx serve .
```

---

## Updating Publications

The publication list is stored statically in `scripts/publications_data.js` for instant, offline-capable client loading.

To update publications from your CV LaTeX source:
```bash
python3 scripts/convert_publications_tex.py --input ../Latex/CV-Suraj/publications.tex
```

Or fetch the latest records directly from the INSPIRE API:
```bash
python3 scripts/update_publications.py --recid 1945401
```
