# Custom Image Block

A flexible image block supporting Adobe Dynamic Media image presets, smart crop renditions, optional captions, link wrapping, and analytics/accessibility authoring.

## Features

- Single authorable image with full alt text control
- Adobe DM image preset support (`?$PresetName$` URL format)
- Smart crop rendition support (`?smartcrop=RenditionName` URL format)
- Raw image modifier parameters (width, height, etc.)
- Optional caption — overlaid on the image or displayed below
- Optional link wrapping with configurable click behavior (same tab, new tab, modal, hidden panel)
- Warn-on-leave modal integration
- Link aria label for accessibility
- Analytics interaction ID
- Shape variants: `circle`, `logo`

## Authoring Fields

Fields are organized into tabs in the Universal Editor.

### Overview Tab

| Field | Type | Description |
|---|---|---|
| Image | Reference | The image asset |
| Preset Type | Select | `None`, `Image Preset`, or `Smart Crop` |
| Image Preset | Select | Adobe DM preset (e.g. `Feature`, `Hero`). Visible when Preset Type = Image Preset |
| Rendition | Select | Smart crop rendition (e.g. `Square`, `Tall`). Visible when Preset Type = Smart Crop |
| Image Modifiers | Text | Additional query string parameters (e.g. `wid=500&hei=300`) |
| Alternative Text | Text | Alt text for the image (required) |
| Get alternative text from DAM | Boolean | Spike — no implementation |
| Image is decorative | Boolean | Sets `alt=""` on the image |
| Caption | Text | Caption text displayed on or below the image |
| Get caption from DAM | Boolean | Spike — no implementation |
| Enable caption as text under image | Boolean | Positions caption below the image instead of overlaid |
| Enable Link | Boolean | Wraps the image in an anchor tag |
| Target | AEM Content | Link target path or URL. Visible when Enable Link = true |
| Click Behavior | Select | `Same Tab`, `New Tab`, `Modal`, `Hidden Panel`. Visible when Enable Link = true |
| Modal/Hidden Panel ID | Text | ID of the modal or panel to trigger. Visible when Click Behavior = Modal or Hidden Panel |
| Enable Warn on Leave Modal | Boolean | Shows a warning when the user navigates away. Visible when Enable Link = true |
| Warn on leave modal path | AEM Content | Path of the warn-on-leave modal. Visible when both Enable Link and Enable Warn on Leave are true |

### Accessibility Tab

| Field | Type | Description |
|---|---|---|
| Link Aria Label | Text | `aria-label` applied to the image link |

### Analytics Tab

| Field | Type | Description |
|---|---|---|
| Analytics Interaction ID | Text | Stored as `data-analytics-interaction-id` on the block element |

### Styles Tab

| Field | Type | Description |
|---|---|---|
| Shape | Select | `Default`, `Circle` (50% border-radius), `Logo` (constrained height/width) |

## Block Variants

### Circle

Crops the image into a circle with a 1:1 aspect ratio.

```html
<div class="custom-image circle">...</div>
```

### Logo

Constrains the image to logo dimensions (height `1.6rem`, max-width `8.8rem` on mobile; scales up on larger breakpoints).

```html
<div class="custom-image logo">...</div>
```

## Image URL Building

The `buildImageUrl` utility appends the appropriate query parameters based on `presetType`:

| Preset Type | URL format |
|---|---|
| `image-preset` | `{baseUrl}?$PresetName$[&modifiers]` |
| `smart-crop` | `{baseUrl}?smartcrop=RenditionName[&modifiers]` |
| None / empty | `{baseUrl}[?modifiers]` |

## Caption Behavior

- By default, `<figcaption>` is absolutely positioned over the bottom of the image.
- When **Enable caption as text under image** is `true`, the `caption-below` class is added to `<figure>`, switching `<figcaption>` to `position: static` (below the image).

## Link Behavior

When **Enable Link** is `true` and a **Target** is provided, the `<picture>` element is wrapped in an `<a>` tag.

| Click Behavior | Effect |
|---|---|
| `_self` | Opens in the same tab (default) |
| `_blank` | Opens in a new tab |
| `modal` | Sets `data-modal` on the anchor (modal logic TBD) |
| `hidden-panel` | Sets `data-hidden-panel` on the anchor (logic TBD) |

When **Enable Warn on Leave** is `true` and a path is provided, `data-warn-on-leave` is set on the anchor (logic TBD).

## Analytics

When `analyticsInteractionId` is authored, the value is stored as `data-analytics-interaction-id` on the block's root element, making it available for tracking scripts.

## Breakpoints (Logo variant)

| Breakpoint | Height | Max Width |
|---|---|---|
| Mobile (< 744px) | `1.6rem` | `8.8rem` |
| Tablet (≥ 744px) | `1.4rem` | `8rem` |
| Desktop (≥ 1024px) | `2rem` | `11.2rem` |
