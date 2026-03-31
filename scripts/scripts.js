import {
  loadHeader,
  loadFooter,
  decorateButtons,
  decorateIcons,
  decorateSections,
  decorateBlocks,
  decorateTemplateAndTheme,
  getMetadata,
  waitForFirstImage,
  loadSection,
  loadSections,
  loadCSS,
} from './aem.js';

/**
 * Moves all the attributes from a given elmenet to another given element.
 * @param {Element} from the element to copy attributes from
 * @param {Element} to the element to copy attributes to
 */
export function moveAttributes(from, to, attributes) {
  if (!attributes) {
    // eslint-disable-next-line no-param-reassign
    attributes = [...from.attributes].map(({ nodeName }) => nodeName);
  }
  attributes.forEach((attr) => {
    const value = from.getAttribute(attr);
    if (value) {
      to?.setAttribute(attr, value);
      from.removeAttribute(attr);
    }
  });
}

/**
 * Move instrumentation attributes from a given element to another given element.
 * @param {Element} from the element to copy attributes from
 * @param {Element} to the element to copy attributes to
 */
export function moveInstrumentation(from, to) {
  moveAttributes(
    from,
    to,
    [...from.attributes]
      .map(({ nodeName }) => nodeName)
      .filter((attr) => attr.startsWith('data-aue-') || attr.startsWith('data-richtext-')),
  );
}

/**
 * Resolve AEM reference links to proper <img> elements.
 * On AEM Author, component "reference" fields render as <a> links instead of
 * <img> tags. This utility detects image-like links and replaces them with
 * <img> elements so that downstream block code can find images normally.
 * @param {Element} container - The container element to scan
 */
export function resolveImageReference(container) {
  if (!container || container.querySelector('picture, img')) return;
  const link = container.querySelector('a');
  if (!link?.href) return;
  const { href } = link;
  if (!/\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(href)
    && !href.includes('scene7.com')
    && !href.includes('/is/image/')) return;
  const img = document.createElement('img');
  img.src = href;
  const text = link.textContent.trim();
  // When EDS backend converts <img> to <a>, the alt text may be preserved as link
  // text. But sometimes the link text is the URL itself — detect that and derive a
  // human-readable alt from the URL path instead.
  const isUrl = /^https?:\/\//.test(text);
  if (link.title) {
    img.alt = link.title;
  } else if (text && !isUrl) {
    img.alt = text;
  } else {
    // Extract filename from URL path and convert to readable text
    try {
      const { pathname } = new URL(href);
      const filename = pathname.split('/').pop().split('.')[0];
      img.alt = filename.replace(/[-_]+/g, ' ').trim();
    } catch {
      img.alt = '';
    }
  }
  img.loading = 'lazy';
  const wrapper = link.closest('.button-container') || link.closest('p') || link;
  wrapper.replaceWith(img);
}

/**
 * load fonts.css and set a session storage flag
 */
async function loadFonts() {
  await loadCSS(`${window.hlx.codeBasePath}/styles/fonts.css`);
  try {
    if (!window.location.hostname.includes('localhost')) sessionStorage.setItem('fonts-loaded', 'true');
  } catch (e) {
    // do nothing
  }
}

function autolinkModals(doc) {
  doc.addEventListener('click', async (e) => {
    const origin = e.target.closest('a');
    if (origin && origin.href && origin.href.includes('/modals/')) {
      e.preventDefault();
      const { openModal } = await import(`${window.hlx.codeBasePath}/blocks/modal/modal.js`);
      openModal(origin.href);
    }
  });
}

/**
 * Build breadcrumb navigation from the current URL path.
 * Used for pages that don't have a hero block (hero.js builds its own).
 */
// function buildBreadcrumbs() {
//   const path = window.location.pathname.replace(/^\/content/, '').replace(/\.html$/, '');
//   const segments = path.split('/').filter(Boolean);
//   if (segments.length <= 1) return null;

//   const nav = document.createElement('nav');
//   nav.className = 'section-breadcrumbs';
//   nav.setAttribute('aria-label', 'Breadcrumb');

//   const ol = document.createElement('ol');
//   let currentPath = '';

//   segments.forEach((segment, i) => {
//     currentPath += `/${segment}`;
//     const li = document.createElement('li');
//     const title = segment
//       .split('-')
//       .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
//       .join(' ');

//     if (i < segments.length - 1) {
//       const a = document.createElement('a');
//       a.href = currentPath;
//       a.textContent = title;
//       li.append(a);
//     } else {
//       // Use the page's h1 text for the current page label when available
//       const h1 = document.querySelector('h1');
//       li.textContent = h1 ? h1.textContent.trim() : title;
//       li.setAttribute('aria-current', 'page');
//     }
//     ol.append(li);
//   });

//   nav.append(ol);
//   return nav;
// }

/**
 * Builds all synthetic blocks in a container element.
 * @param {Element} main The container element
 */
function buildAutoBlocks() {
  try {
    // TODO: add auto block, if needed
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Auto Blocking failed', error);
  }
}

function a11yLinks(main) {
  const links = main.querySelectorAll('a');
  links.forEach((link) => {
    let label = link.textContent;
    if (!label && link.querySelector('span.icon')) {
      const icon = link.querySelector('span.icon');
      label = icon ? icon.classList[1]?.split('-')[1] : label;
    }
    link.setAttribute('aria-label', label);
  });
}

/**
 * Apply background images from section-metadata data-background attributes.
 * Uses a <style> tag so backgrounds persist even if UE resets inline styles.
 * @param {Element} main The main element
 */
function decorateSectionBackgrounds(main) {
  const rules = [];
  main.querySelectorAll('.section[data-background]').forEach((section, idx) => {
    const bg = section.dataset.background;
    if (bg) {
      const id = `section-bg-${idx}`;
      section.id = section.id || id;
      section.style.backgroundImage = `url('${bg}')`;
      rules.push(`#${section.id} { background-image: url('${bg}'); }`);
    }
  });
  if (rules.length) {
    const style = document.createElement('style');
    style.textContent = rules.join('\n');
    document.head.appendChild(style);
  }
}

/**
 * Handle fragment visibility in hero sections that contain multiple fragments.
 * - If the section has the "onlyone" class: show only the first fragment.
 * - Otherwise: rotate through fragments in authored order across page loads,
 *   showing one per visit.
 * Only applies to hero sections (data-section-type="hero").
 * @param {Element} main The main element
 */
function decorateFragmentRotation(main) {
  main.querySelectorAll('.section[data-section-type="hero"]').forEach((section) => {
    const fragmentWrappers = [...section.querySelectorAll(':scope > .fragment-wrapper')];
    if (fragmentWrappers.length < 2) return;

    if (section.classList.contains('onlyone')) {
      // Show only the first fragment, remove the rest
      fragmentWrappers.slice(1).forEach((fw) => fw.remove());
    } else {
      // Rotate fragments in authored order across page loads
      const pagePath = window.location.pathname;
      const sectionIndex = [...main.querySelectorAll('.section')].indexOf(section);
      const storageKey = `fragment-rotation-${pagePath}-${sectionIndex}`;

      const lastIndex = parseInt(sessionStorage.getItem(storageKey) ?? '-1', 10);
      const nextIndex = (lastIndex + 1) % fragmentWrappers.length;
      sessionStorage.setItem(storageKey, nextIndex.toString());

      fragmentWrappers.forEach((fw, i) => {
        if (i !== nextIndex) fw.remove();
      });
    }
  });
}

/**
 * Decorates the main element.
 * @param {Element} main The main element
 */
// eslint-disable-next-line import/prefer-default-export
export function decorateMain(main) {
  // hopefully forward compatible button decoration
  decorateButtons(main);
  decorateIcons(main);
  buildAutoBlocks(main);
  decorateSections(main);
  decorateSectionBackgrounds(main);
  decorateBlocks(main);
  // Run after decorateBlocks (which assigns fragment-wrapper class) but before loadSection
  decorateFragmentRotation(main);
  // add aria-label to links
  a11yLinks(main);
}

/**
 * Loads everything needed to get to LCP.
 * @param {Element} doc The container element
 */
async function loadEager(doc) {
  document.documentElement.lang = 'en';
  loadCSS(`${window.hlx.codeBasePath}/styles/section.css`);
  decorateTemplateAndTheme();
  if (getMetadata('breadcrumbs').toLowerCase() === 'true') {
    doc.body.dataset.breadcrumbs = true;
  }
  const main = doc.querySelector('main');
  if (main) {
    decorateMain(main);

    // Inject breadcrumbs for pages without a hero block
    if (!main.querySelector('.hero') && getMetadata('breadcrumbs').toLowerCase() !== 'false') {
      // const breadcrumbs = buildBreadcrumbs();
      // if (breadcrumbs) {
      //   const firstWrapper = main.querySelector('.section > .default-content-wrapper');
      //   if (firstWrapper) {
      //     firstWrapper.prepend(breadcrumbs);
      //   }
      // }
    }

    document.body.classList.add('appear');
    await loadSection(main.querySelector('.section'), waitForFirstImage);
  }

  try {
    /* if desktop (proxy for fast connection) or fonts already loaded, load fonts.css */
    if (window.innerWidth >= 900 || sessionStorage.getItem('fonts-loaded')) {
      loadFonts();
    }
  } catch (e) {
    // do nothing
  }
}

/**
 * Loads everything that doesn't need to be delayed.
 * @param {Element} doc The container element
 */
async function loadLazy(doc) {
  autolinkModals(doc);

  const main = doc.querySelector('main');
  await loadSections(main);

  const { hash } = window.location;
  const element = hash ? doc.getElementById(hash.substring(1)) : false;
  if (hash && element) element.scrollIntoView();

  loadHeader(doc.querySelector('header'));
  loadFooter(doc.querySelector('footer'));

  loadCSS(`${window.hlx.codeBasePath}/styles/lazy-styles.css`);
  loadFonts();
}

/**
 * Loads everything that happens a lot later,
 * without impacting the user experience.
 */
function loadDelayed() {
  // eslint-disable-next-line import/no-cycle
  window.setTimeout(() => import('./delayed.js'), 3000);
  // load anything that can be postponed to the latest here
}

async function loadPage() {
  await loadEager(document);
  await loadLazy(document);
  loadDelayed();
}

loadPage();
