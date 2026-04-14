# CSS pull request checklist

Use this when reviewing or authoring changes under `blocks/**/*.css`. For full conventions, see `.cursor/skills/building-blocks/resources/css-guidelines.md` and the CSS section in `.cursor/skills/code-review/resources/review-checklist.md`.

---

## Blocking (do not merge until addressed)

- [ ] **Stylelint passes** for touched files (and related config).
- [ ] **Selectors stay block-scoped** per project rules (see css-guidelines: avoid styling other blocks or global elements).
- [ ] **Visual regression**: preview URL checked on mobile, tablet, and desktop for affected pages.
- [ ] **No accidental production inclusion** of preview-only or experimental rules (e.g. clearly labeled “preview” styles mixed into live block CSS without a guard).

---

## High priority

- [ ] **Design tokens**: spacing, color, and typography use `var(--…)` from the shared token set where the design system provides them. Raw hex (`#dadada`, `#0662BB`, etc.) and magic `px` values need a comment or token follow-up.
- [ ] **Breakpoints**: consistent with the rest of the file and team norms. Prefer the same numeric ladder the block already uses; avoid mixing `@media (--bp-*)` and raw `(width …)` in the same feature without a documented reason. Use spaces in queries: `(width <= 744px)` not `(width <=744px)`. Watch **743 vs 744** and **`<=` vs `<`** so layouts do not shift one pixel off from siblings.
- [ ] **`!important`**: absent, or justified in a PR comment (overriding third-party UI, documented exception).
- [ ] **Focus visibility**: if `outline: none` is used, there is an equivalent **`:focus-visible`** (or strong `:focus`) treatment so keyboard users can see focus. Mouse-only outlines optional but keyboard must be clear.
- [ ] **Class names and BEM-like tags**: spell-checked (`width` not `widht`). If renaming, **HTML/authoring/JS** that emit the class are updated in the same PR.

---

## Medium priority

- [ ] **Selector depth**: avoid long chains like `> div:first-child > div > p:nth-of-type(2) > a` for “meaning.” Prefer classes on elements the block controls (JS-decorated or authored), especially for **eyebrow / stat / CTA** roles.
- [ ] **`nth-child` / paragraph order**: flag when styling depends on “second `p`” or similar. Authors adding a paragraph can break the layout silently; prefer explicit element classes when the model allows.
- [ ] **Specificity**: adding `main .section…` or other long prefixes is acceptable when matching existing patterns, but new rules should not escalate specificity without cause. Prefer aligning with global layers or block classes over endless chains.
- [ ] **No `@import` of Google Fonts (or other remote CSS)** inside block stylesheets unless the team explicitly loads fonts that way; prefer a single app-level font strategy (performance, CSP, FOUC).
- [ ] **Layout**: new two-column layouts use **flex or grid**, not `float`, unless matching legacy code with a migration plan.
- [ ] **Motion**: animations/transitions respect **`prefers-reduced-motion`** where motion is decorative (hero, cards, carousels).
- [ ] **Dead code**: large commented-out blocks are removed or restored; use git history instead of commented duplicates.

---

## Quick grep helpers (optional)

```bash
# Typos and brittle patterns (from repo root)
rg "widht|!important|outline:\\s*none|@import url\\(\"https?:" abbvie-nextgen-eds/blocks --glob "*.css"

# Raw media queries (spot inconsistent breakpoints)
rg "@media \\(width" abbvie-nextgen-eds/blocks --glob "*.css"
```

---

## PR description snippet

Paste under your test plan when the PR is CSS-heavy:

```markdown
## CSS
- [ ] Tokens used for new colors/spacing/type where available
- [ ] Breakpoints match surrounding file / design grid
- [ ] Focus states verified (keyboard)
- [ ] Mobile / tablet / desktop preview checked
```
