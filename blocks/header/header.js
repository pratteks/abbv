import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';
// eslint-disable-next-line import/no-named-as-default
import IndexUtils from '../../scripts/index-utils.js';
import { fetchDashboardCardData } from '../../scripts/cfUtil.js';
import decorateExternalLinksUtility from '../../scripts/utils.js';

// Constants for maintainability
const DESKTOP_BREAKPOINT = '(min-width: 1024px)';
const SCROLL_THRESHOLD_DEFAULT = 200;

// Cached state and selectors
let lastScrollTop = 0;
const navigationCache = new Map();
let scrollThrottleId = null;

// Media query for desktop
const isDesktop = window.matchMedia(DESKTOP_BREAKPOINT);

/**
 * Utility: Throttles a function using requestAnimationFrame.
 * @param {Function} callback - The function to throttle.
 */
function throttleRAF(callback) {
  if (scrollThrottleId) return;
  scrollThrottleId = requestAnimationFrame(() => {
    callback();
    scrollThrottleId = null;
  });
}

/**
 * Utility: Creates an element with optional attributes, classes, and content.
 * @param {string} tag - The HTML tag.
 * @param {Object} options - Options for the element.
 * @returns {Element} The created element.
 */
/* eslint-disable-next-line object-curly-newline */
function createElement(tag, { className, attributes = {}, textContent, innerHTML } = {}) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  Object.entries(attributes).forEach(([key, value]) => el.setAttribute(key, value));
  if (textContent) el.textContent = textContent;
  if (innerHTML) el.innerHTML = innerHTML;
  return el;
}

/**
 * Toggles all nav sections.
 * @param {boolean} expanded - Whether sections should be expanded.
 */
function toggleAllNavSections(expanded = false) {
  const nav = document.querySelector('nav');
  const isSearchOpen = [...nav.querySelectorAll('.nav-sections ul > li')]
    .some((li) => li.getAttribute('aria-expanded') === 'true');
  if (nav && !isDesktop.matches && isSearchOpen) {
    nav.classList.remove('second-level-active');
  }

  document.querySelectorAll('.nav-item-level-0 .default-content-wrapper > ul > li').forEach((section) => {
    section.setAttribute('aria-expanded', expanded);
    section.querySelector('button')?.setAttribute('aria-expanded', expanded);
  });
}

/**
 * Toggles the entire nav menu.
 * @param {Element} nav - The nav element.
 * @param {Element} navSections - The nav sections.
 * @param {boolean|null} forceExpanded - Force expansion state.
 */
function toggleMenu(nav, navSections, forceExpanded = null) {
  if (forceExpanded === null) {
    const isSearchOpen = nav.querySelector('.menu-search')?.getAttribute('aria-expanded') === 'true';
    const expanded = forceExpanded !== null ? forceExpanded : (isSearchOpen || nav.getAttribute('aria-expanded') === 'true');
    const button = nav.querySelector('.nav-hamburger button');
    document.body.style.overflowY = (expanded || isDesktop.matches) ? '' : 'hidden';
    nav.setAttribute('aria-expanded', expanded ? 'false' : 'true');
    toggleAllNavSections(false); // Fixed: Pass boolean, not string
    button.setAttribute('aria-label', expanded ? 'Open navigation' : 'Close navigation');
    const backdrop = document.getElementById('nav-backdrop');
    backdrop?.setAttribute('aria-hidden', expanded ? 'true' : 'false');
  }
}

/**
 * Creates a submenu wrapper with a close button.
 * @param {string} label - The submenu label.
 * @returns {Object} - { submenu, closeBtn }
 */
function createSubmenuWrapper(label) {
  const slug = label.toLowerCase().replace(/\s+/g, '-');
  const submenu = createElement('div', {
    className: 'submenu-level-1',
    attributes: { id: `submenu-${slug}`, role: 'menu', 'data-label': label },
  });
  const closeWrapper = createElement('div', { className: 'close-btn-wrapper' });
  const closeBtn = createElement('button', {
    className: 'close-btn',
    attributes: { type: 'button' },
    textContent: 'CLOSE',
  });
  closeBtn.addEventListener('click', () => {
    toggleAllNavSections(false);
    document.getElementById('nav-backdrop')?.setAttribute('aria-hidden', 'true');
  });
  closeWrapper.appendChild(closeBtn);
  submenu.appendChild(closeWrapper);
  return { submenu, closeBtn };
}

/**
 * Fetches navigation data by path with caching.
 * @param {string} path - The navigation path.
 * @returns {Promise<Object>} - Navigation data.
 */
async function getNavigationByPath(path) {
  if (navigationCache.has(path)) return navigationCache.get(path);
  try {
    const item = await IndexUtils.findIndexItem(path);
    navigationCache.set(path, item);
    return item;
  } catch (error) {
    return { children: [] };
  }
}

// Recursive function to parse UL into JSON-like structure
function parseUl(ul) {
  const children = [];
  Array.from(ul.children).forEach((li) => {
    let textTitle = '';
    let link = '#';
    let subChildren = [];
    let hasP = false;

    Array.from(li.childNodes).forEach((node) => {
      if (node.tagName === 'P') {
        // Top-level item: extract title from <p>
        textTitle = node.textContent.trim();
        hasP = true;
      } else if (node.tagName === 'UL') {
        // Recurse for nested UL
        subChildren = parseUl(node);
      }
    });

    if (!hasP) {
      // Sub-level item: check for <a> or use text content
      const a = li.querySelector('a');
      if (a) {
        textTitle = a.textContent.trim() || a.getAttribute('title') || '';
        link = a.getAttribute('href') || '#';
      } else {
        textTitle = li.textContent.trim();
      }
    }

    const child = {
      title: textTitle,
      path: link,
      children: subChildren,
    };
    children.push(child);
  });
  return children;
}

// get card data
async function getSecondCardData(url) {
  if (!url) return false;

  try {
    const response = await fetchDashboardCardData(url);
    return response?.data?.dashboardCardByPath?.item || { children: [] };
  } catch (error) {
    return { children: [] };
  }
}

/**
 * Builds mega menu.
 * @param {Element} block - The block element.
 */
async function buildMegaMenu(block) {
  if (!block) return null;
  const innerDivs = block.querySelectorAll(':scope > div');
  if (innerDivs.length <= 1) return null;
  const allTags = Array.from(innerDivs).slice(1);
  const tagsValues = allTags.map((div) => {
    const ul = div.querySelector('ul');
    if (ul) return ul;

    const a = div.querySelector('a');
    if (a) return a;

    const p = div.querySelector('p');
    const heading = div.querySelector('h1, h2, h3, h4, h5, h6');

    // If both heading AND p exist → return both together
    if (heading && p) {
      return {
        heading: heading.textContent.trim(),
        paragraph: p.textContent.trim(),
      };
    }
    // If only heading exists
    if (heading) return heading.textContent.trim();

    // If only p exists
    if (p) return p.textContent.trim();

    return ''; // empty div
  });
  const [
    megaMenuTitle,
    megaMenuDescription,
    megaMenuCta,
    megaMenuDashboardLinks,
    megaMenuCardTitle,
    megaMenuCardContent,
    megaMenuCardCta,
    megaMenuDashboardCard,
    dashboardCardType,
  ] = tagsValues;

  const primaryCardData = {
    title: megaMenuCardTitle,
    cardContent: megaMenuCardContent,
    link: megaMenuCardCta,
  };
  // get card data
  const secondaryCardData = await getSecondCardData(megaMenuDashboardCard?.title);
  const dashboardLinks = megaMenuDashboardLinks?.querySelectorAll('li');
  const wrapper = document.createElement('div');
  wrapper.className = 'mega-menu-wrapper';

  // -----------------------
  // LEFT SECTION
  // -----------------------
  const left = document.createElement('div');
  left.className = 'mega-menu-left';
  left.innerHTML = `
    <h4 class="mega-menu-title">${megaMenuTitle}</h4>
    <div class="mega-menu-description">${megaMenuDescription}</div>
    <p class="button-container">
      <a href="${megaMenuCta?.href || '#'}" class="button">${megaMenuCta?.textContent || ''}</a>
    </p>
  `;

  // Dashboard links
  if (dashboardLinks) {
    const ul = document.createElement('ul');
    ul.className = 'dashboard-links';
    dashboardLinks.forEach((li) => {
      const link = li.querySelector('a');
      if (!link) return;
      const liClone = document.createElement('li');
      liClone.innerHTML = `
        <a href="${link.href}" class="dashboard-list-link" title="${link.title}">
          ${link.textContent.trim()}
        </a>
      `;
      ul.appendChild(liClone);
    });
    left.appendChild(ul);
  }

  // -----------------------
  // CARD GENERATOR
  // -----------------------
  function createCard(data, cardType, isPrimary = false) {
    const cardWrapper = document.createElement('div');
    cardWrapper.className = `mega-menu-card ${isPrimary ? 'mega-card-primary' : 'mega-card-secondary'} ${cardType}`;
    const card = document.createElement('div');
    card.className = 'mega-card';
    const appendIfExists = (parent, tag, classType, content) => {
      if (content) {
        parent.appendChild(createElement(tag, { className: classType, textContent: content }));
      }
    };

    if (isPrimary) {
      appendIfExists(card, 'p', 'mega-card-title', data?.title);
      if (data?.cardContent?.heading || data?.cardContent?.paragraph) {
        const content = createElement('div', { className: 'mega-card-content' });
        appendIfExists(content, 'h4', 'mega-card-heading', data.cardContent.heading);
        appendIfExists(content, 'p', 'card-description', data.cardContent.paragraph);
        card.appendChild(content);
      } else {
        const contentP = createElement('div', { className: 'mega-card-content' });
        appendIfExists(contentP, 'h4', 'mega-card-heading', data.cardContent);
        card.appendChild(contentP);
      }
      if (data?.link?.textContent) {
        const btnWrap = createElement('p', { className: 'button-container' });
        btnWrap.appendChild(createElement('span', {
          className: 'card-cta',
          textContent: data.link.textContent,
        }));
        card.appendChild(btnWrap);
      }

      // Wrap in anchor if link exists
      const container = data?.link ? (() => {
        const anchor = createElement('a', { className: 'card-link' });
        anchor.href = data.link.href;
        return anchor;
      })() : cardWrapper;
      container.appendChild(card);
      if (data?.link) cardWrapper.appendChild(container);
    } else {
      // Eyebrow
      appendIfExists(card, 'p', 'mega-card-title', data?.eyebrow);

      // Count + Suffix
      if (data?.dataPoint || data?.dataPointSufix) {
        const countWrap = createElement('div', { className: 'mega-card-count' });
        appendIfExists(countWrap, 'div', 'count', data.dataPoint);
        appendIfExists(countWrap, 'div', 'count-unit', data.dataPointSufix);
        card.appendChild(countWrap);
      }

      // Description
      appendIfExists(card, 'p', 'card-description', data?.description?.plaintext);

      cardWrapper.appendChild(card);
    }

    return cardWrapper;
  }

  // -----------------------
  // APPEND BOTH CARDS
  // -----------------------
  const primaryCard = createCard(primaryCardData, dashboardCardType, true);
  const secondaryCard = createCard(secondaryCardData, dashboardCardType, false);

  wrapper.appendChild(left);
  wrapper.appendChild(primaryCard);
  wrapper.appendChild(secondaryCard);

  wrapper.addEventListener('click', () => {
    document.querySelector('.mega-menu-minimize')?.classList.remove('mega-menu-minimize');
  });

  return wrapper;
}

/**
 * Builds level-two navigation and submenu.
 * @param {Element} block - The block element.
 */
async function buildLevelTwoNavigations(block, languageLinkData, element) {
  const selector = languageLinkData ? 'span:last-child' : 'span';
  const label = block.querySelector(selector)?.textContent?.trim() || '';
  if (!label) return;
  const navigation = label.toLowerCase().replace(/\s+/g, '-');
  let navigationData;
  if (languageLinkData) {
    navigationData = { children: parseUl(languageLinkData) };
    languageLinkData.remove();
  } else {
    const anchor = block.querySelector('a');
    const href = anchor?.href ?? null;
    const path = href ? new URL(href).pathname : `/${navigation}`;
    navigationData = await getNavigationByPath(path);
  }
  const level2Container = document.querySelector(`#submenu-${navigation}`);
  if (!level2Container) return;

  // build mega nev
  const isMegaMenu = level2Container.querySelector('.mega-menu-wrapper');
  if (isDesktop.matches) {
    level2Container.classList.add('mega-menu-minimize');
  }
  if (isMegaMenu) {
    isMegaMenu.remove();
  }
  const megaMenu = await buildMegaMenu(element);
  // Modified code to use parsed data
  const data = navigationData;
  // Remove existing navigation group
  level2Container.querySelector('.navigation-group')?.remove();

  const fragment = document.createDocumentFragment(); // Batch DOM changes
  const ul = createElement('ul', { className: 'navigation-group' });
  const pageRedirectText = megaMenu.querySelector('.mega-menu-left .button-container a').textContent.trim();
  (data?.children || []).forEach((child) => {
    const li = createElement('li', { className: 'navigation-item navigation-item-level-1' });
    if (child.children?.length) {
      // Submenu with dropdown
      const levelTwoMenu = createElement('div', { className: 'level-two-menu' });
      const button = createElement('button', {
        className: 'root-two-dropdown-btn',
        attributes: {
          'aria-expanded': 'false',
        },
        textContent: child.title,
      });
      button.appendChild(createElement('span', { className: 'accordion-icon' }));
      const menuItems = createElement('div', { className: 'level-two-menu-items' });
      button.addEventListener('click', () => {
        const isExpanded = button.getAttribute('aria-expanded') === 'true';
        button.setAttribute('aria-expanded', !isExpanded);
        menuItems.classList.toggle('show-child');
      });
      const goToPageLink = createElement('a', {
        className: 'go-to-page-btn',
        attributes: {
          href: child.path,
          'aria-label': pageRedirectText,
          'data-warn-on-departure': 'false',
        },
        textContent: pageRedirectText,
      });
      const subUl = createElement('ul', { className: 'navigation-group' });
      child.children.forEach((subChild) => {
        const subLi = createElement('li', { className: 'navigation-item navigation-item-level-2' });
        const subLink = createElement('a', {
          className: 'navigation-item-link',
          attributes: { href: subChild.path, 'data-warn-on-departure': 'false' },
          textContent: subChild.title,
        });
        subLi.appendChild(subLink);
        subUl.appendChild(subLi);
      });
      menuItems.appendChild(goToPageLink);
      menuItems.appendChild(subUl);
      levelTwoMenu.appendChild(button);
      levelTwoMenu.appendChild(menuItems);
      li.appendChild(levelTwoMenu);
    } else {
      // Simple link
      const link = createElement('a', {
        className: 'level-two-link-adjustment',
        attributes: { href: child.path, 'data-warn-on-departure': 'false' },
        textContent: child.title,
      });
      li.appendChild(link);
    }
    ul.appendChild(li);
  });

  fragment.appendChild(ul);
  if (megaMenu) level2Container.appendChild(megaMenu);
  level2Container.appendChild(fragment);
}

/**
 * Builds level-two items for More and Global.
 * @param {Element} selector - The selector element.
 * @returns {Element|null} - The accordion element.
 */
function buildLevelTwoLanguageLinks(selector) {
  const menu = selector.querySelector('ul');
  if (!menu) return null;
  const items = Array.from(menu.querySelectorAll(':scope > li'));
  if (!items.length) return null;
  items[0].classList.add('open');
  const accordion = createElement('div', { className: 'accordion' });

  items.forEach((item) => {
    const childUL = item.querySelector('ul');
    item.classList.add('menu-item');
    const label = item.querySelector('p')?.textContent.trim() || item.firstChild?.textContent.trim();
    if (item.querySelector('p')) item.querySelector('p').remove();
    if (item.firstChild?.nodeType === 3) item.firstChild.remove();

    const textSpan = createElement('span', { className: 'menu-label', textContent: label });
    item.prepend(textSpan);

    if (childUL) {
      const wrapper = createElement('div', { className: 'submenu-wrapper' });
      wrapper.appendChild(childUL);
      item.appendChild(wrapper);
      item.classList.add('has-arrow');

      textSpan.addEventListener('click', (e) => {
        e.stopPropagation();
        if (item.classList.contains('open')) return;
        items.forEach((i) => i.classList.remove('open'));
        item.classList.add('open');
      });
    }
  });

  accordion.appendChild(menu);
  return accordion;
}

/**
 * Creates a search form.
 * @param {Element} block - The block element.
 * @returns {Element} - The search form element.
 */
function createSearchForm(block) {
  const text = block.querySelector('p:last-child')?.textContent.trim();
  const maindiv = createElement('div', { className: 'search-main-wrapper' });
  const wrapperdiv = createElement('div', { className: 'search-wrapper' });
  const form = createElement('form', {
    className: 'search-form',
    attributes: { method: 'get', role: 'search' },
  });
  const innerDiv = createElement('div', { className: 'search-inner-wrapper' });
  const input = createElement('input', {
    className: 'search-input',
    attributes: {
      type: 'search',
      autocomplete: 'off',
      spellcheck: 'false',
      size: '10',
      maxlength: '100',
      'aria-label': text,
      name: 'q',
      'aria-describedby': 'search-alert-text',
    },
  });
  const label = createElement('label', {
    className: 'search-input-label',
    attributes: { 'data-desktop-placeholder': text, 'aria-label': text },
    textContent: text,
  });
  const alertDiv = createElement('div', { className: 'search-input-alert' });
  const alertP = createElement('p', { attributes: { id: 'search-alert-text' }, textContent: 'Please enter a valid search term' });

  alertDiv.appendChild(alertP);
  innerDiv.append(input, label, alertDiv);
  form.appendChild(innerDiv);
  wrapperdiv.appendChild(form);
  maindiv.appendChild(wrapperdiv);

  // Label update logic
  const updateLabel = () => {
    label.classList.toggle('focus-out', input.value.trim() === '' && document.activeElement !== input);
  };
  input.addEventListener('focus', updateLabel);
  input.addEventListener('blur', updateLabel);
  label.addEventListener('focus', updateLabel);
  label.addEventListener('blur', updateLabel);
  updateLabel();

  return maindiv;
}

/**
 * Builds a menu item with button and submenu.
 * @param {Element} block - The block element.
 * @param {boolean} isNavigation - Whether it's a navigation item.
 * @returns {Element|null} - The li element.
 */
function buildMenuItem(block, isNavigation = false) {
  let label = block.querySelector('p')?.textContent.trim();
  if (block.classList.contains('search')) {
    label = block.querySelector('p:last-child')?.textContent.trim() || 'Search';
  }
  if (!label && !block.classList.contains('search')) return null;

  const slug = label.toLowerCase().replace(/\s+/g, '-');
  const segments = window.location.pathname.split('/').filter(Boolean);
  const currentParentPage = segments[0];
  const li = createElement('li', { className: `menu-${slug}` });
  const button = createElement('button', {
    attributes: { type: 'button', 'aria-haspopup': 'true', 'aria-expanded': 'false' },
  });
  if (currentParentPage === slug) {
    button.classList.add('selected');
  }
  const icon = block.querySelector('p > span');
  const text = createElement('span', { textContent: label });
  if (icon) button.appendChild(icon.cloneNode(true));
  button.appendChild(text);
  const { submenu } = createSubmenuWrapper(label);
  const isLinkLanguageBlock = block?.classList.contains('language-links');
  if (isLinkLanguageBlock) {
    const isLinkLanguage = block.querySelector('ul');
    if (isLinkLanguage) isLinkLanguage.classList.add('navigation-group');
    if (!isLinkLanguage) {
      const a = block.querySelector('a');
      if (a) {
        a.style.display = 'none';
        button.appendChild(a);
      }
    }
    if (isLinkLanguage && isNavigation) {
      submenu.appendChild(isLinkLanguage.cloneNode(true));
    }
  }
  li.append(button, submenu);

  button.addEventListener('click', async (e) => {
    e.stopPropagation();
    const mainDiv = button.parentElement;
    const languageLinkData = mainDiv?.querySelector('.navigation-group');
    const isParsedUl = languageLinkData?.querySelector('.navigation-item');
    const subMenuContainer = mainDiv.querySelector('.submenu-level-1');
    if (subMenuContainer && isDesktop.matches) subMenuContainer.classList.add('mega-menu-minimize');
    if (isNavigation && !isParsedUl) {
      await buildLevelTwoNavigations(
        button,
        languageLinkData,
        block,
      );
    }
    const expanded = li.getAttribute('aria-expanded') === 'true';
    const nav = document.querySelector('nav');

    // Close hamburger menu if search is being opened and change hamburger to close icon
    if (block.classList.contains('search')) {
      const navSections = nav.querySelector('.nav-sections');
      const hamburgerBtn = nav.querySelector('.nav-hamburger button');

      if (!expanded) {
        // Opening search - close hamburger menu and show close icon on hamburger
        if (nav.getAttribute('aria-expanded') === 'true') {
          toggleMenu(nav, navSections, true);
        }
        // Change hamburger to close icon
        nav.setAttribute('aria-expanded', 'true');
        hamburgerBtn?.setAttribute('aria-label', 'Close navigation');
      } else {
        // Closing search - reset hamburger to menu icon
        nav.setAttribute('aria-expanded', 'false');
        hamburgerBtn?.setAttribute('aria-label', 'Open navigation');
      }
    }

    if (nav && !isDesktop.matches && isNavigation) {
      nav.classList.add('second-level-active');
    }
    toggleAllNavSections(false);
    li.setAttribute('aria-expanded', !expanded);
    button.setAttribute('aria-expanded', !expanded);
    document.getElementById('nav-backdrop')?.setAttribute('aria-hidden', expanded);
  });

  return li;
}

// Throttled scroll handler
function handleScroll() {
  throttleRAF(() => {
    const header = document.querySelector('header');
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const heroBlock = document.querySelector('.hero.block');
    const threshold = heroBlock ? heroBlock.offsetHeight - 100 : SCROLL_THRESHOLD_DEFAULT;
    if (scrollTop > lastScrollTop && scrollTop > threshold) {
      header.classList.add('hide-nav');
      header.classList.remove('show-nav');
    } else {
      header.classList.add('show-nav');
      header.classList.remove('hide-nav');
    }
    lastScrollTop = Math.max(scrollTop, 0);
  });
}

// Keydown handler for ESC
function handleKeydown(e) {
  if (e.key !== 'Escape') return;
  const navSections = document.querySelector('.nav-sections');
  if (!navSections || navSections.getAttribute('aria-expanded') === 'false') return;
  toggleAllNavSections(false);
  document.getElementById('nav-backdrop')?.setAttribute('aria-hidden', 'true');
}

// Attach global event listeners
window.addEventListener('scroll', handleScroll);
document.addEventListener('keydown', handleKeydown);

/**
 * Loads and decorates the header.
 * @param {Element} block - The header block element.
 */
export default async function decorate(block) {
  const navMeta = getMetadata('nav');
  const navPath = navMeta ? new URL(navMeta, window.location).pathname : '/nav';
  const fragment = await loadFragment(navPath);
  const header = fragment.querySelector('.navigation-content-container');
  if (!header) return;

  const nav = createElement('nav', { attributes: { id: 'nav', 'aria-expanded': 'false' } });

  // Brand (Logo)
  const brandBlock = header.querySelector('.navigation-content[data-type="logo"]');
  if (brandBlock) {
    const brandImg = brandBlock.querySelector('picture');
    const brand = createElement('div', { className: 'section nav-brand nav-item-level-0' });
    const wrapper = createElement('div', { className: 'default-content-wrapper' });
    const p = createElement('p');
    const a = createElement('a', { attributes: { href: '/', title: 'Button' } });
    if (brandImg) a.appendChild(brandImg);
    p.appendChild(a);
    wrapper.appendChild(p);
    brand.appendChild(wrapper);
    nav.appendChild(brand);
  }

  // Navigation Items
  const section = createElement('div', { className: 'section nav-sections nav-item-level-0' });
  const sectionWrapper = createElement('div', { className: 'default-content-wrapper' });
  const ul = createElement('ul');

  const menus = header.querySelectorAll('.navigation-content[data-type="navigation-content"], .navigation-content[data-type="language-links"]');
  menus.forEach((menu) => {
    let element = menu;
    const p = menu.querySelector('p');
    if (p && p.innerText.trim() === 'MORE') {
      const clonedBlock = menu.cloneNode(true);
      const clonedP = clonedBlock.querySelector('p');
      if (clonedP) clonedP.textContent = 'Quick Links';
      element = clonedBlock;
    }
    const li = buildMenuItem(element, true);
    if (li) ul.appendChild(li);
  });
  const sectionBackBtn = createElement('button', {
    className: 'back-btn',
    attributes: { type: 'button' },
    textContent: 'BACK',
  });
  sectionBackBtn.addEventListener('click', () => {
    toggleAllNavSections(false);
  });
  ul.prepend(sectionBackBtn);
  sectionWrapper.appendChild(ul);
  section.appendChild(sectionWrapper);
  nav.appendChild(section);

  /* ========== Language and links ========== */
  const tools = document.createElement('div');
  tools.className = 'section nav-tools nav-item-level-0';
  const toolsWrapper = document.createElement('div');
  toolsWrapper.className = 'default-content-wrapper';

  const toolsUl = document.createElement('ul');

  const toolBlocks = header.querySelectorAll('.navigation-content[data-type="language-links"], .navigation-content[data-type="search"]');
  toolBlocks.forEach((tool) => {
    const li = buildMenuItem(tool);
    let expandableMenu;
    if (tool.classList.contains('search')) {
      expandableMenu = createSearchForm(tool);
    } else {
      expandableMenu = buildLevelTwoLanguageLinks(tool);
    }
    if (expandableMenu && li) li.querySelector('.submenu-level-1').appendChild(expandableMenu);
    if (li) toolsUl.appendChild(li);
  });
  toolsWrapper.appendChild(toolsUl);
  tools.appendChild(toolsWrapper);
  nav.appendChild(tools);

  // hamburger for mobile
  const navSections = nav.querySelector('.nav-sections');
  const hamburger = document.createElement('div');
  hamburger.classList.add('nav-hamburger');
  hamburger.innerHTML = `<button type="button" aria-controls="nav" aria-label="Open navigation">
      <span></span><span></span><span></span>
    </button>`;
  hamburger.addEventListener('click', () => {
    // Close search menu if it's open
    const searchMenu = nav.querySelector('.menu-search');
    if (searchMenu?.getAttribute('aria-expanded') === 'true') {
      searchMenu.setAttribute('aria-expanded', 'false');
      searchMenu.querySelector('button')?.setAttribute('aria-expanded', 'false');
    }
    toggleMenu(nav, navSections);
  });
  nav.append(hamburger);
  nav.setAttribute('aria-expanded', 'false');
  // prevent mobile nav behavior on window resize
  isDesktop.addEventListener('change', () => toggleMenu(nav, navSections, isDesktop.matches));

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  navWrapper.append(nav);
  decorateExternalLinksUtility(navWrapper);
  block.append(navWrapper);
  // build desktop backdrop
  const backdrop = document.createElement('div');
  backdrop.id = 'nav-backdrop';
  backdrop.className = 'nav-backdrop';
  backdrop.setAttribute('aria-hidden', true);
  block.append(backdrop);
}
