# AbbVie EDS Migration - Mandatory Rules

> These rules are **mandatory** for all migration, import, and block development work in this project.
> They are automatically loaded by Claude Code at the start of every session.

## Rule 1: Post-Import Fix Tracking (Fix-Forward Pipeline)

**Every manual fix made to content HTML or block code after import MUST be tracked and incorporated back into the import infrastructure (parsers/transformers) before any reimport.**

### How it works:

1. **Register every fix**: When a bug is found and fixed in imported content or block rendering, log it in `tools/importer/fix-registry.json` with:
   - `id`: Unique fix ID (auto-increment)
   - `date`: When the fix was made
   - `template`: Which template(s) are affected
   - `parser` or `transformer`: Which file needs updating
   - `description`: What was wrong and how it was fixed
   - `selector`: The DOM selector involved (if applicable)
   - `status`: `"pending"` (needs incorporation) or `"incorporated"` (already in parser/transformer)

2. **Before any reimport**: Check `fix-registry.json` for `"pending"` entries. If any exist:
   - Incorporate each fix into the relevant parser or transformer
   - Update the entry status to `"incorporated"`
   - Then proceed with reimport

3. **After reimport**: Verify that previously fixed issues do not regress by spot-checking affected pages.

### Fix Registry Location: `tools/importer/fix-registry.json`

## Rule 2: Always Use Existing Blocks

**NEVER create new custom blocks when an existing block from the library or project can serve the purpose.**

### Enforcement:

1. Before creating any block, check:
   - Local blocks in `/workspace/blocks/` directory
   - Sidekick library via `get_library_catalog` or `search_blocks` MCP tools
   - Block Collection via `edge-delivery-services:block-collection-and-party` skill

2. **Prefer block variants** over new blocks:
   - If content is similar but styled differently, create a variant (e.g., `cards (leader)`) not a new block
   - Variants share the same base block code with CSS modifier classes

3. **Only create a new block** when NO existing block can be adapted with a variant.
   Document the justification in the parser file header comment.

## Rule 3: All Block Content Must Be Authorable

**Every piece of visible content in a block MUST have a corresponding author field with proper field hints.**

### Requirements:

1. **Field hints in HTML comments**: Every content cell in a block table must include `<!-- field:fieldName -->` comments:
   ```html
   <!-- field:image -->    (for image/reference fields)
   <!-- field:text -->     (for richtext fields)
   <!-- field:title -->    (for heading/title fields)
   <!-- field:link -->     (for URL/link fields)
   ```

2. **Parser header documentation**: Every parser must document its UE Model fields in the JSDoc header:
   ```javascript
   /**
    * UE Model fields: image (reference), imageAlt (collapsed), text (richtext)
    */
   ```

3. **No hardcoded content**: Parsers must extract ALL visible text from the source DOM.
   Never hardcode labels, titles, or descriptions. If text exists on the source page, it must be extracted and placed in an authorable field.

4. **Background images and colors**: Section backgrounds must be authorable through `Section Metadata` block:
   - `background` field for background images
   - `style` field for background color variants (mapped to CSS classes)

## Rule 4: Analytics Data Attributes Must Be Migrated

**All analytics-related data attributes from the source AEM site MUST be preserved and made authorable.**

### What to migrate:

1. **Data attributes to preserve** (do NOT strip these in cleanup):
   - `data-cmp-data-layer` - AEM component data layer (extract and convert to EDS-compatible format)
   - `data-track-*` attributes - Click/impression tracking identifiers
   - `data-analytics-*` attributes - Analytics event labels
   - `data-content-name` - Content identification for analytics
   - `data-content-type` - Content type classification
   - `data-link-type` - Link tracking type (internal/external/download)
   - `data-link-text` - Link text for tracking
   - `data-component-title` - Component title for tracking

2. **How to handle in parsers**:
   - Extract analytics attributes from source elements
   - Store them as `data-analytics-*` attributes on the block wrapper or individual elements
   - When analytics data exists, create a dedicated comment hint: `<!-- analytics:trackingId -->`

3. **Cleanup transformer must NOT remove**:
   - `data-track`, `data-analytics`, `data-cmp-data-layer` (REVERSAL of current behavior)
   - Instead, transform them to a standardized `data-analytics-*` format

4. **Section-level analytics**: If a section container has tracking attributes, include them in `Section Metadata` as an `analytics` field.

## Rule 5: Accessibility (ARIA) Must Be Migrated and Authorable

**All accessibility attributes from the source site MUST be preserved and blocks must support authoring them.**

### What to migrate:

1. **ARIA attributes to preserve**:
   - `aria-label` - Accessible labels for interactive elements
   - `aria-labelledby` - Reference to labelling element
   - `aria-describedby` - Reference to describing element
   - `aria-expanded` - Expansion state (accordions, dropdowns)
   - `aria-controls` - Control relationships
   - `aria-hidden` - Hidden state for decorative elements
   - `role` attributes - Semantic roles (when not implied by HTML element)
   - `alt` text on images - Always extract and preserve

2. **How to handle in parsers**:
   - Extract `aria-label` from source elements and include as visible text or field hint
   - For links/buttons: preserve the accessible name in the link/button text
   - For images: ALWAYS extract `alt` text (never use empty alt unless source is decorative)
   - For interactive blocks (accordion, tabs): preserve `aria-expanded`, `aria-controls` relationships

3. **Authorable accessibility fields**:
   - Every image field must have a companion `imageAlt` field (collapsed in UE)
   - Every link must preserve its accessible name
   - Accordion items must preserve their heading semantics (h2/h3/h4)
   - Navigation blocks must preserve `aria-label` on the nav container

4. **Block JS/CSS requirements**:
   - Block decoration JS must add appropriate ARIA attributes
   - Accordion: `aria-expanded`, `role="button"`, `aria-controls`
   - Tabs: `role="tablist"`, `role="tab"`, `role="tabpanel"`, `aria-selected`
   - Cards with links: ensure focusable, keyboard navigable

## Rule 6: AEM Source DOM Analysis (cmp-* Class Inspection)

**Since the source site is AEM, ALL DOM analysis must systematically inspect AEM component classes (`cmp-*`), grid layouts, and container structures.**

### Mandatory DOM inspection checklist:

1. **Container analysis** (always check these classes):
   - `.container` - AEM container component
   - `.cmp-container-full-width` - Full-width layout
   - `.cmp-container-*` - Size variants (xx-large, x-large, large, etc.)
   - `.height-*` - Height variants (default, short, tall)
   - `.no-bottom-margin`, `.no-padding` - Spacing overrides
   - `.large-radius`, `.medium-radius`, `.default-radius` - Border radius
   - `.overlap-predecessor` - Overlap layout pattern (hero blocks)
   - `.semi-transparent-layer` - Overlay/dark background pattern

2. **Grid layout analysis** (always check):
   - `.grid` - AEM responsive grid
   - `.grid-row` - Grid row container
   - `.grid-row__col-with-*` - Column width (1-12 grid system)
   - `.cmp-grid-*` - Grid variants (full-page-5-v1, custom, etc.)
   - `.aem-Grid`, `.aem-GridColumn` - AEM grid columns
   - `.aem-GridColumn--default--*` - Responsive column widths
   - Map grid column ratios to EDS `columns` block variants

3. **Background detection** (always extract):
   - `.cmp-container__bg-image` - Container background images
   - `img.cmp-container__bg-image[data-cmp-src]` - Lazy-loaded backgrounds
   - Inline `background-image` styles on containers
   - Background COLOR from container classes → map to `Section Metadata` style values:
     - Dark/navy containers → `style: dark` or `style: navy`
     - Transparent overlays → `style: dark` with opacity
     - Light/white → no style (default)
     - Custom colors → descriptive style name (e.g., `highlight`, `accent`)

4. **Component identification** (cmp-* class patterns):
   - `.cmp-title` → heading (check size: `cmp-title-xx-large`, `cmp-title-x-large`, etc.)
   - `.cmp-text` → paragraph/richtext
   - `.cmp-image` → image component (check `data-cmp-src` for lazy loading)
   - `.cmp-video` → video embed (extract Brightcove/YouTube URLs)
   - `.cmp-teaser` → teaser/card component
   - `.cmp-quote` → quote/blockquote
   - `.cmp-accordion-*` → accordion component
   - `.cmp-experiencefragment--*` → experience fragment (header/footer/nav)
   - `.cardpagestory` → card component
   - `.dashboardcards` → dashboard/stats card

5. **Section boundary rules**:
   - Every full-width container (`.cmp-container-full-width`) is typically a section boundary
   - Background color/image changes indicate section boundaries
   - `.overlap-predecessor` combined with previous container = hero section pattern
   - Map each section's background to `Section Metadata` style value

### Template JSON requirements:

When creating `page-templates.json` entries:
- `blocks[].instances[]` must use **AEM cmp-* class selectors** (not generic tag selectors)
- `sections[].selector` must reference AEM container/grid classes
- `sections[].style` must reflect the visual background (dark, navy, highlight, etc.)

---

## Quick Reference: Parser Template

```javascript
/**
 * Parser: <block-name>
 * Base block: <base-block>
 * Source: <source-url>
 * Generated: <date>
 *
 * <Description of source DOM structure and what cmp-* classes are used>
 *
 * Library structure: <rows x cols description>
 * UE Model fields: <field1> (<type>), <field2> (<type>), ...
 * Analytics: <what data-* attributes are extracted>
 * Accessibility: <what aria-* attributes are preserved>
 */
```

## Quick Reference: Fix Registry Entry

```json
{
  "id": 1,
  "date": "2026-03-12",
  "template": "landing-page",
  "parser": "parsers/hero.js",
  "description": "Hero image alt text was missing",
  "selector": ".container.overlap-predecessor img",
  "status": "incorporated"
}
```
