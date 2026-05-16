/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: Section boundaries and section-metadata.
 * Supports landing-page, content-series, leaders-listing, leader-profile, clinical-trials templates, and science-hub templates.
 *
 * Uses template name to select the right section definitions.
 */
const TransformHook = { beforeTransform: 'beforeTransform', afterTransform: 'afterTransform' };

const LANDING_PAGE_SECTIONS = [
  {
    // Hero section: after hero parser, .overlap-predecessor is replaced and its
    // prev sibling (bg image container) is removed. Insert navy-overlap break
    // BEFORE the featured video container so the hero gets its own section.
    selector: '.container.cmp-container-full-width.height-short:not(.no-bottom-margin):not(.medium-radius)',
    position: 'before',
    style: 'navy-overlap',
  },
  {
    // Separate unstyled content (featured video, cards) from dark quote section
    selector: '.container.semi-transparent-layer',
    fallback: '.container.semi-transparent-layer.large-radius',
    position: 'before',
    style: null,
  },
  {
    // End dark section after quote
    selector: '.container.semi-transparent-layer',
    fallback: '.container.semi-transparent-layer.large-radius',
    style: 'dark',
  },
  {
    // Separate unstyled content (explore, embed, FAQ) from navy CTA
    selector: '.container.medium-radius.cmp-container-full-width.height-short.no-bottom-margin:last-of-type',
    position: 'before',
    style: null,
  },
  {
    // End navy section after CTA
    selector: '.container.medium-radius.cmp-container-full-width.height-short.no-bottom-margin:last-of-type',
    fallback: null,
    style: 'navy',
  },
];

const LEADERS_LISTING_SECTIONS = [
  {
    // Hero section: navy background bar + overlap predecessor with title/paragraph
    selector: '.overlap-predecessor',
    fallback: '.container.large-radius.cmp-container-full-width.height-short.no-bottom-margin',
    style: 'navy-overlap',
  },
];

const LEADER_PROFILE_SECTIONS = [
  {
    // Hero section: navy background bar + overlap predecessor with name/title
    selector: '.overlap-predecessor',
    fallback: '.container.medium-radius.cmp-container-full-width.height-short.no-bottom-margin',
    style: 'navy-overlap',
  },
];

const CORPORATE_LEADER_PROFILE_SECTIONS = [
  {
    // Hero section: navy background bar + overlap predecessor with breadcrumb/name/title
    selector: '.overlap-predecessor',
    fallback: '.container.large-radius.cmp-container-full-width.height-short.no-bottom-margin',
    style: 'navy-overlap',
  },
];

const PUBLICATIONS_SECTIONS = [
  {
    // Hero section: purple background bar + overlap predecessor with H1/subtitle
    // After overlap-predecessor, insert section break + metadata before the grid content
    selector: '.grid.cmp-grid-custom',
    position: 'before',
    style: 'purple-overlap',
  },
];

const CONTENT_SERIES_SECTIONS = [
  {
    // Hero section: .overlap-predecessor is replaced by hero parser,
    // so insert hero section break BEFORE the featured video container
    selector: '.container.cmp-container-full-width.height-short:not(.medium-radius)',
    position: 'before',
    style: 'navy-overlap',
  },
  {
    // Featured video + video cards section (dark background)
    selector: '.container.cmp-container-full-width.height-short:not(.medium-radius)',
    style: 'dark',
  },
  {
    // Dive deeper navigation section (no style, just a section break)
    selector: '.container.no-bottom-margin:not(.cmp-container-full-width):not(.height-short):not(.overlap-predecessor)',
    style: null,
  },
  {
    // CTA banner
    selector: '.container.medium-radius.cmp-container-full-width.height-short.no-bottom-margin:last-of-type',
    style: 'navy',
  },
];

const CLINICAL_TRIALS_SECTIONS = [
  {
    // End hero section (navy-overlap): insert break before the about section grid.
    // After hero parser runs, the overlap-predecessor is replaced and its sibling removed.
    // First .grid.cmp-grid-custom is the "About clinical trials" two-column grid.
    selector: '.grid.cmp-grid-custom',
    position: 'before',
    style: 'navy-overlap',
  },
  {
    // End about section (no style): insert break before the code-of-conduct container.
    // The full-width container with light-blue background holds image + text columns.
    selector: '.container.cmp-container-full-width.height-default:not(.large-radius):not(.no-bottom-margin)',
    position: 'before',
    style: null,
  },
  {
    // End code-of-conduct section (light-blue): insert Section Metadata + HR after container.
    selector: '.container.cmp-container-full-width.height-default:not(.large-radius):not(.no-bottom-margin)',
    style: 'light-blue',
  },
  {
    // End good-clinical-practice section (no style): insert HR after the .no-bottom-margin grid.
    // This separates the accordion from the final network + IIS columns section.
    selector: '.grid.cmp-grid-custom.no-bottom-margin',
    style: null,
  },
];

const SCIENCE_HUB_SECTIONS = [
  // Hero section: .overlap-predecessor replaced by hero parser, prev sibling removed.
  // Insert navy-overlap break BEFORE the teaser (next element after hero block).
  {
    selector: '.teaser.light-theme',
    position: 'before',
    style: 'navy-overlap',
  },
  // Separate teaser (default content) from dark dashboard section
  {
    selector: '.container.large-radius.cmp-container-full-width.height-default.no-bottom-margin',
    position: 'before',
    style: null,
  },
  // End dark dashboard + focus areas section
  {
    selector: '.container.large-radius.cmp-container-full-width.height-default.no-bottom-margin',
    style: 'dark',
  },
  // Separate video embed from explore section
  {
    selector: '.container.cmp-container-full-width.height-default.no-bottom-margin.no-padding',
    position: 'before',
    style: null,
  },
  // Separate explore from tenacity section
  {
    selector: '.container.default-radius.cmp-container-xxx-large',
    position: 'before',
    style: null,
  },
  // Separate tenacity from stories+FAQ section
  {
    selector: '.container.abbvie-container.no-bottom-margin.no-padding:not(.cmp-container-full-width)',
    position: 'before',
    style: null,
  },
  // Separate stories+FAQ from CTA section
  {
    selector: '.container.cmp-container-full-width.height-default.no-bottom-margin:last-of-type',
    position: 'before',
    style: null,
  },
];

function getSectionsForTemplate(templateName) {
  if (templateName === 'publications') return PUBLICATIONS_SECTIONS;
  if (templateName === 'science-hub') return SCIENCE_HUB_SECTIONS;
  if (templateName === 'content-series') return CONTENT_SERIES_SECTIONS;
  if (templateName === 'leaders-listing') return LEADERS_LISTING_SECTIONS;
  if (templateName === 'leader-profile') return LEADER_PROFILE_SECTIONS;
  if (templateName === 'corporate-leader-profile') return CORPORATE_LEADER_PROFILE_SECTIONS;
  if (templateName === 'clinical-trials') return CLINICAL_TRIALS_SECTIONS;
  return LANDING_PAGE_SECTIONS;
}

export default function transform(hookName, element, payload) {
  if (hookName !== TransformHook.afterTransform) return;

  const { document } = payload;
  const templateName = payload.template ? payload.template.name : 'landing-page';
  const sections = getSectionsForTemplate(templateName);

  sections.forEach(({ selector, fallback, style, position }) => {
    const sectionEl = element.querySelector(selector) || (fallback && element.querySelector(fallback));
    if (!sectionEl) return;

    if (position === 'before') {
      // Insert section-metadata + HR before the element (ends the preceding section)
      const hr = document.createElement('hr');
      if (style) {
        const cells = [['style', style]];
        const metaBlock = WebImporter.Blocks.createBlock(document, {
          name: 'Section Metadata',
          cells,
        });
        sectionEl.before(metaBlock);
        sectionEl.before(hr);
      } else {
        sectionEl.before(hr);
      }
    } else {
      // Insert section-metadata + HR after the element (default)
      let insertAfter = sectionEl;
      if (style) {
        const cells = [['style', style]];
        const metaBlock = WebImporter.Blocks.createBlock(document, {
          name: 'Section Metadata',
          cells,
        });
        insertAfter.after(metaBlock);
        insertAfter = metaBlock;
      }
      const hr = document.createElement('hr');
      insertAfter.after(hr);
    }
  });
}
