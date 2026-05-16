# AbbVie EDS Migration - Technical Implementation Rules

> This document provides detailed technical guidance for implementing the mandatory rules defined in `/workspace/CLAUDE.md`.

## 1. Fix-Forward Pipeline: Detailed Workflow

### When a bug is found after import:

```
1. Fix the issue (in content HTML, block CSS/JS, or parser)
2. Log fix in fix-registry.json with status: "pending"
3. Identify root cause: is it a parser bug, transformer bug, or missing block logic?
4. Mark which file needs updating (parser/transformer)
```

### Before reimporting:

```
1. Run: node tools/importer/check-fix-registry.js
2. If pending fixes exist → incorporate each into the relevant parser/transformer
3. Update each fix entry: status → "incorporated", add incorporatedDate + incorporatedIn
4. Run check again to confirm all clear
5. Proceed with reimport
```

### Fix entry template:

```json
{
  "id": <next-id>,
  "date": "<YYYY-MM-DD>",
  "template": "<template-name>",
  "pages": ["<affected-url-1>", "<affected-url-2>"],
  "parser": "parsers/<file>.js",
  "transformer": "transformers/<file>.js",
  "description": "<What was wrong and how it was fixed>",
  "selector": "<DOM selector of the affected element>",
  "rootCause": "<parser|transformer|block-code|content-structure>",
  "fixDetails": "<Technical details of what code changed>",
  "status": "pending",
  "incorporatedDate": null,
  "incorporatedIn": null
}
```

## 2. AEM Source DOM Analysis Reference

### Container Class Mapping

| AEM Class Pattern | EDS Mapping | Notes |
|---|---|---|
| `.container.cmp-container-full-width` | Section boundary | Full-width sections |
| `.container.overlap-predecessor` | Hero block | Always paired with previous bg container |
| `.container.semi-transparent-layer` | Section with `style: dark` | Dark overlay background |
| `.container.large-radius` | Section with rounded visual | Often holds background images |
| `.container.medium-radius` | CTA/banner sections | Typically at page bottom |
| `.container.no-bottom-margin` | Adjacent section (no gap) | Sections flow together |
| `.container.height-short` | Compact section | Reduced vertical padding |
| `.container.height-default` | Standard section | Normal vertical padding |

### Grid Column Mapping

| AEM Grid | EDS Columns Variant | Usage |
|---|---|---|
| `col-with-5 + col-with-5` | `columns (50/50)` | Equal two-column |
| `col-with-4 + col-with-8` | `columns (33/66)` | Sidebar + main |
| `col-with-8 + col-with-4` | `columns (66/33)` | Main + sidebar |
| `col-with-6 + col-with-6` | `columns (50/50)` | Equal two-column |
| `col-with-3 * 4` | `columns (4-up)` | Four equal columns |
| `col-with-1 + col-with-5 + col-with-1 + col-with-5` | `columns (image-text)` | Alternating image/text |

### Background Detection Patterns

```javascript
// 1. Background image from container bg img element
element.querySelector('img.cmp-container__bg-image');
element.querySelector('img.cmp-container__bg-image[data-cmp-src]');

// 2. Background from inline style
element.style.backgroundImage; // url(...)

// 3. Background from data attribute (lazy loaded)
element.getAttribute('data-cmp-src');

// 4. Background color from class → Section Metadata style
// Dark backgrounds:
'.semi-transparent-layer' → style: 'dark'
'.container' with navy color → style: 'navy'
// Light backgrounds:
default (no class) → no style needed

// 5. In Section Metadata block:
// cells: [['style', 'dark'], ['background', imgSrc]]
```

### Component Class Patterns (cmp-*)

```javascript
// Titles - check size variant classes
'.cmp-title'                    // Base title
'.cmp-title-xx-large h1'       // XX-Large heading
'.cmp-title-x-large h2'        // X-Large heading
'.cmp-title h3'                 // Standard heading

// Text - richtext content
'.cmp-text'                     // Text component
'.cmp-text p'                   // Paragraph within text

// Images - check for lazy loading
'.cmp-image'                    // Image wrapper
'.cmp-image[data-cmp-src]'     // Lazy-loaded (copy data-cmp-src to img.src)
'.cmp-image img'                // Actual img element

// Videos - extract URL before removing player UI
'.cmp-video'                    // Video wrapper
'[data-video-id]'              // Brightcove video ID
'[data-iframesrc*="youtube"]'  // YouTube embed

// Interactive
'.cmp-accordion-large'          // Accordion
'.cmp-quote'                    // Blockquote
'.cmp-teaser'                   // Teaser/promo card
'.cardpagestory'                // Content card
'.dashboardcards'               // Stats/KPI card
```

## 3. Analytics Data Attribute Preservation

### Source attributes to extract:

```javascript
// AEM Data Layer (JSON structure)
'data-cmp-data-layer'  // Contains component ID, type, title
// Example: {"component-id": {"@type": "core/wcm/components/title/v3/title", "dc:title": "..."}}

// Click/impression tracking
'data-track'           // Tracking event identifier
'data-track-click'     // Click event name
'data-track-impression'// Impression event name
'data-analytics'       // Analytics label
'data-analytics-*'     // Various analytics attributes

// Content identification
'data-content-name'    // Content name for analytics
'data-content-type'    // Content type (e.g., "video", "article")
'data-link-type'       // Link type (internal, external, download)
'data-link-text'       // Link text for tracking
```

### How to preserve in parsers:

```javascript
// Extract analytics from source element
const cmpDataLayer = element.getAttribute('data-cmp-data-layer');
const trackId = element.getAttribute('data-track');

// Parse AEM data layer JSON
if (cmpDataLayer) {
  try {
    const layerData = JSON.parse(cmpDataLayer);
    const componentId = Object.keys(layerData)[0];
    const componentData = layerData[componentId];
    // Store as standardized data attributes on block elements
    blockElement.setAttribute('data-analytics-type', componentData['@type'] || '');
    blockElement.setAttribute('data-analytics-title', componentData['dc:title'] || '');
  } catch (e) { /* ignore malformed JSON */ }
}

// Preserve tracking IDs
if (trackId) {
  blockElement.setAttribute('data-analytics-track', trackId);
}
```

### Links with tracking:

```javascript
// When creating links in parsers, preserve tracking attributes:
const sourceLink = col.querySelector('a[data-track]');
if (sourceLink) {
  const newLink = document.createElement('a');
  newLink.href = sourceLink.href;
  newLink.textContent = sourceLink.textContent;
  // Preserve analytics
  if (sourceLink.getAttribute('data-track')) {
    newLink.setAttribute('data-analytics-track', sourceLink.getAttribute('data-track'));
  }
  if (sourceLink.getAttribute('data-link-type')) {
    newLink.setAttribute('data-analytics-link-type', sourceLink.getAttribute('data-link-type'));
  }
}
```

## 4. Accessibility Preservation Guide

### ARIA attributes extraction:

```javascript
// Always extract these from source elements:
const ariaLabel = element.getAttribute('aria-label');
const ariaDescribedBy = element.getAttribute('aria-describedby');
const role = element.getAttribute('role');
const alt = element.querySelector('img')?.getAttribute('alt');

// For interactive components:
const ariaExpanded = element.getAttribute('aria-expanded');
const ariaControls = element.getAttribute('aria-controls');
```

### Image alt text - MANDATORY:

```javascript
// ALWAYS preserve alt text. Never use empty alt unless source is decorative.
const img = element.querySelector('img');
const alt = img?.getAttribute('alt') || '';
const isDecorative = img?.getAttribute('role') === 'presentation'
  || img?.getAttribute('aria-hidden') === 'true';

// In parser output:
newImg.alt = alt;
if (isDecorative) {
  newImg.alt = ''; // Only for confirmed decorative images
  newImg.setAttribute('role', 'presentation');
}
```

### Heading hierarchy - MANDATORY:

```javascript
// Preserve heading levels from source. Never change h2 to h3 without reason.
const heading = element.querySelector('h1, h2, h3, h4, h5, h6');
if (heading) {
  const level = heading.tagName; // Preserve original level
  const newHeading = document.createElement(level);
  newHeading.textContent = heading.textContent;
  // Preserve ID for anchor linking
  if (heading.id) newHeading.id = heading.id;
}
```

### Accordion accessibility:

```javascript
// Accordion parsers must preserve:
// - Heading semantics (h2/h3) for each item title
// - The panel content structure
// Block decoration JS must add:
// - role="button" on accordion triggers
// - aria-expanded="true|false"
// - aria-controls="panel-id"
// - role="region" on panels
// - aria-labelledby="trigger-id" on panels
```

### Link accessibility:

```javascript
// Preserve accessible names on links
const link = element.querySelector('a');
const ariaLabel = link?.getAttribute('aria-label');
const title = link?.getAttribute('title');

const newLink = document.createElement('a');
newLink.href = link.href;
newLink.textContent = link.textContent;
if (ariaLabel) newLink.setAttribute('aria-label', ariaLabel);
if (title) newLink.setAttribute('title', title);

// For links that open in new window - preserve the indicator
if (link?.getAttribute('target') === '_blank') {
  newLink.setAttribute('target', '_blank');
  newLink.setAttribute('rel', 'noopener noreferrer');
  // Ensure accessible indication of new window
  if (!ariaLabel) {
    newLink.setAttribute('aria-label', `${link.textContent} (opens in new window)`);
  }
}
```

## 5. Block Authoring Fields Checklist

Every block parser must ensure these field types are properly annotated:

| Field Type | Comment Hint | UE Type | Notes |
|---|---|---|---|
| Image | `<!-- field:image -->` | reference | Must have companion alt field |
| Image Alt | (collapsed with image) | text | Auto-paired with image |
| Rich Text | `<!-- field:text -->` | richtext | Headings, paragraphs, lists |
| Title | `<!-- field:title -->` | text | Plain text heading |
| Link/CTA | `<!-- field:link -->` | URL | Href + link text |
| Video | `<!-- field:video -->` | URL | YouTube/Brightcove embed URL |
| Background | In Section Metadata | reference | Via Section Metadata `background` row |
| Style | In Section Metadata | text | Via Section Metadata `style` row |
| Analytics ID | `<!-- analytics:id -->` | text | Tracking identifier |

## 6. Pre-Reimport Checklist

Before running any reimport, verify:

- [ ] `node tools/importer/check-fix-registry.js` exits 0 (no pending fixes)
- [ ] All parsers have proper field hints (`<!-- field:* -->` comments)
- [ ] All parsers document UE Model fields in JSDoc header
- [ ] Analytics attributes are preserved (not stripped) in cleanup transformer
- [ ] ARIA/accessibility attributes are preserved in parsers
- [ ] Image alt text is always extracted (never empty unless decorative)
- [ ] Background images/colors are mapped to Section Metadata
- [ ] AEM cmp-* classes are used as selectors in page-templates.json
