# homewebpage

Source of my academic website: https://sprasadphy.github.io/homewebpage/

Plain HTML and CSS, no build step. Pushing to `main` deploys to GitHub Pages through `.github/workflows/deploy.yml`.

## Updating the publication list

The list on `publications.html` is generated from the publications section of my LaTeX CV
(`../Latex/CV-Suraj/publications.tex`). After adding a paper there:

```bash
python3 scripts/build_publications.py
```

This rewrites `scripts/publications_data.js`. The citation numbers on the Publications and CV pages are typed in by hand
from INSPIRE-HEP, so update them at the same time.

## Local preview

```bash
python3 -m http.server 8000
```
