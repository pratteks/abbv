/*
 * Rinvoq Hero Block
 * Extracted behavior from: https://www.rinvoq.com/resources/save-on-rinvoq-costs
 *
 * Source AEM components:
 *   .abbv-background-container (hero background image)
 *   .abbv-image-text-v2 (logo/ribbon overlay)
 *   .abbv-rich-text (headings, body text)
 *   .cta-brush-arrow-yellow-left (CTA button)
 *   .text-yellow-stroke-129 (yellow underline decoration)
 *
 * Rinvoq-specific behavior:
 *   - Responsive background image swap (desktop JPG → mobile PNG)
 *   - Yellow stroke decoration on emphasis text
 *   - Fade-in animations on content images (IntersectionObserver)
 *   - Gold decorative top/bottom borders via CSS pseudo-elements
 *
 * Library structure: 2 rows (image | text)
 * UE Model fields: image (reference), imageAlt (text), text (richtext),
 *                  backgroundImage (reference), ctaLabel (text), ctaLink (text)
 * Accessibility: alt text on images, semantic headings, keyboard-accessible CTAs
 */

export default function decorate(block) {
  const section = block.closest('.section');

  // --- Absorb breadcrumb (same logic as base hero) ---
  const textPanel = block.querySelector(':scope > div:nth-child(2) > div');
  if (textPanel) {
    textPanel.parentElement.classList.add('hero-text-container');
  }

  if (section && textPanel) {
    let breadcrumbWrapper = section.querySelector('.breadcrumb-wrapper');
    if (!breadcrumbWrapper) {
      const prevSection = section.previousElementSibling;
      if (prevSection?.classList.contains('section')) {
        breadcrumbWrapper = prevSection.querySelector('.breadcrumb-wrapper');
      }
    }
    if (breadcrumbWrapper) {
      const breadcrumbBlock = breadcrumbWrapper.querySelector('.breadcrumb');
      if (breadcrumbBlock) {
        textPanel.prepend(breadcrumbBlock);
        breadcrumbWrapper.remove();
        const prevSection = section.previousElementSibling;
        if (prevSection?.classList.contains('section') && !prevSection.children.length) {
          prevSection.remove();
        }
      }
    }
  }

  // --- Promote hero image to background ---
  if (section) {
    const imgCell = block.querySelector(':scope > div:first-child');
    const img = imgCell?.querySelector('img');
    if (img?.src) {
      // Keep the img for proper aspect-ratio sizing
      img.loading = 'eager';
    }

    // AEM Author case: reference link → spacer img
    if (!img?.src) {
      const link = imgCell?.querySelector('a');
      if (link?.href) {
        const spacer = document.createElement('img');
        spacer.src = link.href;
        spacer.alt = link.title || link.textContent || '';
        spacer.loading = 'eager';
        const container = link.closest('.button-container') || link.closest('p') || link;
        container.replaceWith(spacer);
      }
    }
  }

  // --- Yellow stroke decoration on <em> tags ---
  // Source uses .text-yellow-stroke-129 span with ::after background-image
  // In EDS, authors use <em> to mark emphasized text; we add the class for CSS
  if (textPanel) {
    textPanel.querySelectorAll('em').forEach((em) => {
      em.classList.add('yellow-stroke');
    });
  }

  // --- Fade-in animation on images via IntersectionObserver ---
  const animatedImages = block.querySelectorAll('.hero-text-container img');
  if (animatedImages.length > 0 && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2 },
    );
    animatedImages.forEach((img) => observer.observe(img));
  }

  // --- Preserve analytics data attributes ---
  const rows = block.querySelectorAll(':scope > div');
  rows.forEach((row) => {
    Object.keys(row.dataset).forEach((key) => {
      if (key.startsWith('analytics') || key.startsWith('track')) {
        block.dataset[key] = row.dataset[key];
      }
    });
  });
}
