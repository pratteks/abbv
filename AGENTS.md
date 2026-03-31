# Agent context — AbbVie Next-Gen EDS

This repository is an **Adobe Edge Delivery Services (EDS)** / Franklin project (AEM Crosswalk, vanilla JS/CSS blocks). Do not confuse it with classic AEM Sites (Java/JCR/OSGi).

## Documentation and search

- For platform behavior, APIs, and patterns, prefer **https://www.aem.live** (e.g. search or fetch `https://www.aem.live/docs/`). Say **“Edge Delivery”** or **“AEM Edge Delivery”** in prompts; the abbreviation **“EDS”** alone is ambiguous on the web.
- Adobe publishes **https://www.aem.live/llms.txt** for AI-oriented doc pointers; mention it in rules or prompts when you want doc-grounded answers.

## Project skills (Adobe)

Official **AEM Edge Delivery Services** agent skills from [adobe/skills](https://github.com/adobe/skills) are installed here:

| Location | Purpose |
|----------|---------|
| `.cursor/skills/` | **Cursor** project skills (one folder per skill, each with `SKILL.md`) |
| `.skills/aem/edge-delivery-services/` | Same bundle, **Adobe / gh-upskill** layout (`.claude-plugin`, nested `skills/`) |

**Orchestrators** (use for end-to-end workflows):

- `content-driven-development` — content-first block and styling work; sub-skills for modeling, implementation, testing, review.
- `page-import` — migrate/import pages into EDS; coordinates scraping, structure, HTML, preview.

**Research / support skills:** `docs-search`, `block-collection-and-party`, `block-inventory`, `find-test-content`, `analyze-and-plan`, `authoring-analysis`, `building-blocks`, `content-modeling`, `testing-blocks`, `code-review`, plus page-import pipeline steps (`scrape-webpage`, `identify-page-structure`, `page-decomposition`, `generate-import-html`, `preview-import`).

**When working in this repo:** Read the relevant `SKILL.md` under `.cursor/skills/<skill-name>/` before large changes, especially `content-driven-development` for block/CSS/JS work and `page-import` for migrations.

## AbbVie-specific guidance

- Migration and component rules: **`rules/`** (start with `rules/README.md`).
- To refresh Adobe skills (requires [GitHub CLI](https://cli.github.com/) and [gh-upskill](https://github.com/ai-ecoverse/gh-upskill)):  
  `gh extension install ai-ecoverse/gh-upskill` then  
  `gh upskill adobe/skills --path skills/aem/edge-delivery-services --all`

## Local development

- `npm install` then `npm start` (scaffold + `aem up`). Merge CMS JSON: `npm run build:json`.
