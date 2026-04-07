/*
 * Rinvoq Hero — Brand-specific decorator
 *
 * Loaded by multi-theme.js when brand=rinvoq (replaces base hero.js).
 * Includes base hero logic (breadcrumb, image promotion, text panel)
 * plus Rinvoq-only enhancements:
 *   - Yellow stroke decoration on <em> tags
 *   - Fade-in animation on content images
 *   - Analytics data attribute passthrough
 */

export default function decorate(block) {
  const section = block.closest('.section');

  /* ---- Base hero logic (shared across brands) ---- */

  const textPanel = block.querySelector(':scope > div:nth-child(2) > div');
  if (textPanel) {
    textPanel.parentElement.classList.add('hero-text-container');
    textPanel.classList.add('cmp-container-x-large');
  }

  // Breadcrumb absorption
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

  // Image promotion
  if (section) {
    const imgCell = block.querySelector(':scope > div:first-child');
    const img = imgCell?.querySelector('img');
    if (img?.src) {
      img.loading = 'eager';
    }
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

  /* ---- Rinvoq-only: yellow stroke on <em> ---- */

  if (textPanel) {
    textPanel.querySelectorAll('em').forEach((em) => {
      em.classList.add('yellow-stroke');
    });
  }

  /* ---- Rinvoq-only: fade-in animation on content images ---- */

  const contentImages = block.querySelectorAll(':scope > div:nth-child(2) img');
  if (contentImages.length > 0 && 'IntersectionObserver' in window) {
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
    contentImages.forEach((img) => observer.observe(img));
  }

  /* ---- Rinvoq-only: analytics data attribute passthrough ---- */

  block.querySelectorAll(':scope > div').forEach((row) => {
    Object.keys(row.dataset).forEach((key) => {
      if (key.startsWith('analytics') || key.startsWith('track')) {
        block.dataset[key] = row.dataset[key];
      }
    });
  });
}
