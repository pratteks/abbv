/*
 * Rinvoq Hero — Brand-specific decorator
 * Source: https://www.rinvoq.com/resources/save-on-rinvoq-costs
 *
 * 3-row authored structure:
 *   Row 1: Background image (hero photo)
 *   Row 2: Overlay content (ribbon logo + "Save" image + h1) — positioned ON the bg image
 *   Row 3: Content panel below (h2 "$0 a month" + body + CTA)
 *
 * Source DOM mapping:
 *   Row 1 → .abbv-background-container (bg image, bottom-positioned)
 *   Row 2 → .abbv-background-container-content (overlaid on bg, desktop only, mobile above)
 *   Row 3 → .abv-custom-bgcolor-light-grey2 (content area below)
 */

export default function decorate(block) {
  const rows = [...block.children];

  /* ---- Row 1: Background image → set as CSS background-image on .hero-bg ---- */
  const bgRow = rows[0];
  if (bgRow) {
    bgRow.classList.add('hero-bg');

    // Extract image src from <img> or <a> reference, apply as background-image
    let bgSrc = null;
    const img = bgRow.querySelector('img');
    if (img?.src) {
      bgSrc = img.src;
    } else {
      const link = bgRow.querySelector('a');
      if (link?.href) {
        bgSrc = link.href;
      }
    }

    if (bgSrc) {
      bgRow.style.backgroundImage = `url('${bgSrc}')`;
      // Remove the picture/img/link elements — bg is now CSS
      const inner = bgRow.querySelector(':scope > div');
      if (inner) inner.innerHTML = '';
    }
  }

  /* ---- Row 2: Overlay (ribbon + headline, positioned on bg image) ---- */
  const overlayRow = rows[1];
  if (overlayRow) {
    overlayRow.classList.add('hero-overlay');
  }

  /* ---- Row 3: Content panel ---- */
  const contentRow = rows[2];
  if (contentRow) {
    contentRow.classList.add('hero-content');
    const contentInner = contentRow.querySelector(':scope > div');
    if (contentInner) {
      contentInner.classList.add('hero-content-inner');
    }
  }

  /* ---- Rinvoq-specific: yellow stroke on <em> ---- */
  block.querySelectorAll('em').forEach((em) => {
    em.classList.add('yellow-stroke');
  });

  /* ---- Rinvoq-specific: fade-in animation on content images ---- */
  if (contentRow) {
    const contentImages = contentRow.querySelectorAll('img');
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
  }

  /* ---- Analytics data attribute passthrough ---- */
  rows.forEach((row) => {
    Object.keys(row.dataset).forEach((key) => {
      if (key.startsWith('analytics') || key.startsWith('track')) {
        block.dataset[key] = row.dataset[key];
      }
    });
  });
}
