/**
 * Formats a URL segment into a human-readable title.
 * @param {string} segment - URL path segment
 * @returns {string} Formatted title
 */
function formatSegment(segment) {
  return segment
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Builds the breadcrumb trail as a <nav> element.
 * Dynamically resolves page titles from the AEM content hierarchy.
 * @param {Object} config - Breadcrumb configuration
 * @returns {Promise<HTMLElement|null>} The breadcrumb nav element or null
 */
export async function buildBreadcrumbTrail(config) {
  const {
    homePagePath,
    homeTitle,
    enableCurrentPage,
  } = config;

  const currentPath = window.location.pathname
    .replace(/^\/content/, '') // remove /content only
    .replace(/\.html$/, ''); // remove .html

  const segments = currentPath.split('/').filter(Boolean);

  if (segments.length <= 1) {
    return null;
  }

  // Determine the start index based on homePagePath
  let startIndex = 0;

  if (homePagePath) {
    const cleanHome = homePagePath
      .replace(/^\/content/, '')
      .replace(/^\//, '')
      .replace(/\.html$/, '');

    const homeParts = cleanHome.split('/').filter(Boolean);

    startIndex = Math.max(0, homeParts.length - 1);
  }

  const nav = document.createElement('nav');
  nav.className = 'breadcrumb-nav';
  nav.setAttribute('aria-label', 'Breadcrumb');

  const ol = document.createElement('ol');

  const totalSegments = enableCurrentPage ? segments.length : segments.length - 1;

  for (let i = startIndex; i < totalSegments; i += 1) {
    const itemPath = `/${segments.slice(0, i + 1).join('/')}`;

    const li = document.createElement('li');
    let title;

    // Use current document title for the last segment
    const isLast = i === totalSegments - 1;
    if (isLast && enableCurrentPage) {
      title = document.title || formatSegment(segments[i]);
      li.textContent = title;
      li.setAttribute('aria-current', 'page');
    } else {
      title = formatSegment(segments[i]);
      const a = document.createElement('a');
      a.href = itemPath;
      a.textContent = title;
      li.append(a);
    }

    // Override home title for the first breadcrumb item
    if (i === startIndex && homeTitle) {
      const firstChild = li.querySelector('a') || li;
      firstChild.textContent = homeTitle;
    }

    ol.append(li);
  }

  nav.append(ol);
  return nav;
}

/**
 * Extracts breadcrumb configuration from the block.
 * Supports both xwalk (data-aue-prop attributes) and document-based content.
 * @param {Element} block - The breadcrumb block element
 * @returns {Object} Configuration object
 */
function extractConfig(block) {
  // xwalk: fields have data-aue-prop attributes
  const propElements = block.querySelectorAll('[data-aue-prop]');
  if (propElements.length > 0) {
    const getField = (name) => {
      const el = block.querySelector(`[data-aue-prop="${name}"]`);
      return el || null;
    };
    const getTextVal = (name, defaultVal = '') => {
      const el = getField(name);
      return el?.textContent?.trim() || defaultVal;
    };
    const getBoolVal = (name, defaultVal) => {
      const val = getTextVal(name, '').toLowerCase();
      if (val === 'true') return true;
      if (val === 'false') return false;
      return defaultVal;
    };
    const getLinkVal = (name) => {
      const el = getField(name);
      const a = el?.querySelector('a');
      return a?.getAttribute('href') || el?.textContent?.trim() || '';
    };

    return {
      id: getTextVal('id'),
      customClass: getTextVal('customClass'),
      homePagePath: getLinkVal('homePagePath'),
      homeTitle: getTextVal('homeTitle'),
      enableBreadcrumb: getBoolVal('enableBreadcrumb', true),
      enableHiddenItems: getBoolVal('enableHiddenItems', false),
      enableCurrentPage: getBoolVal('enableCurrentPage', true),
      enableRedirectTitle: getBoolVal('enableRedirectTitle', true),
    };
  }

  // Document-based fallback: fields in sequential cells
  const rows = [...block.querySelectorAll(':scope > div')];
  const cells = rows.flatMap((row) => [...row.querySelectorAll(':scope > div')]);

  const getText = (idx) => cells[idx]?.textContent?.trim() || '';
  const getBool = (idx, defaultVal) => {
    const val = getText(idx).toLowerCase();
    if (val === 'true') return true;
    if (val === 'false') return false;
    return defaultVal;
  };
  const getLink = (idx) => {
    const a = cells[idx]?.querySelector('a');
    return a?.getAttribute('href') || getText(idx) || '';
  };

  return {
    id: getText(0),
    customClass: getText(1),
    homePagePath: getLink(2),
    homeTitle: getText(3),
    enableBreadcrumb: getBool(4, true),
    enableHiddenItems: getBool(5, false),
    enableCurrentPage: getBool(6, true),
    enableRedirectTitle: getBool(7, true),
  };
}

/**
 * Decorates the breadcrumb block.
 * @param {Element} block - The breadcrumb block element
 */
export default async function decorate(block) {
  const config = extractConfig(block);

  // Apply optional id and custom class
  if (config.id) block.id = config.id;
  if (config.customClass) {
    block.classList.add(...config.customClass.split(' ').filter(Boolean));
  }

  // Clear authored configuration cells
  block.textContent = '';

  // If breadcrumb is disabled, hide the block
  if (!config.enableBreadcrumb) {
    block.style.display = 'none';
    return;
  }

  const breadcrumbNav = await buildBreadcrumbTrail(config);
  if (breadcrumbNav) {
    block.append(breadcrumbNav);
  }
}
