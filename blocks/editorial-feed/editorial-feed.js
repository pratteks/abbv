import { decorateIcons } from '../../scripts/aem.js';
import indexUtils from '../../scripts/index-utils.js';
import { fetchPlaceholders } from '../../scripts/placeholders.js';
import {
  isUEAuthorSurface, applyCommonProps, createIcon, extractIconSource,
} from '../../scripts/utils.js';
import { getConfigValue } from '../../scripts/config.js';

const CARDS_PER_PAGE = 5;

/**
 * Row indices matching the xwalk template field order (tabs excluded).
 *
 *  Row  0  – listSource
 *  Row  1  – parentPage
 *  Row  2  – hideDescription
 *  Row  3  – hideTags
 *  Row  4  – hideImage
 *  Row  5  – hideDate
 *  Row  6  – hideFilters
 *  Row  7  – categoryTags
 *  Row  8  – match
 *  Row  9  – storyPagesToExclude
 *  Row 10  – browseCategoriesPlaceholderText
 *  Row 11  – searchPlaceholderText
 *  Row 12  – searchIconType
 *  Row 13  – searchFontIcon
 *  Row 14  – searchImageIcon
 *  (classes – Styles tab, handled by framework, not a row)
 *  Row 15  – ariaLabel
 *  Row 16+ – common properties (blockId, customClass, language — via applyCommonProps)
 *
 *  Category items (editorial-feed-category-item block/items) appear as additional
 *  rows after common props, each with two cells: title (col 0) and pagePath (col 1).
 */
const ROW = {
  LIST_SOURCE: 0,
  PARENT_PAGE: 1,
  HIDE_DESCRIPTION: 2,
  HIDE_TAGS: 3,
  HIDE_IMAGE: 4,
  HIDE_DATE: 5,
  HIDE_FILTERS: 6,
  CATEGORY_TAGS: 7,
  MATCH: 8,
  STORY_PAGES_TO_EXCLUDE: 9,
  BROWSE_CATEGORIES_PLACEHOLDER: 10,
  SEARCH_PLACEHOLDER: 11,
  SEARCH_ICON_TYPE: 12,
  SEARCH_FONT_ICON: 13,
  SEARCH_IMAGE_ICON: 14,
  // classes: handled by framework, not a row
  ARIA_LABEL: 15,
  // Row 16+: common properties (blockId, customClass, language — via applyCommonProps)
  CATEGORY_ITEMS_START: 19,
};

// ─── config readers ──────────────────────────────────────────────────────────

function parseBoolean(value, fallback = false) {
  const normalized = `${value || ''}`.trim().toLowerCase();
  if (['true', 'yes', '1'].includes(normalized)) return true;
  if (['false', 'no', '0'].includes(normalized)) return false;
  return fallback;
}

function parseExcludedPages(raw) {
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { /* noop */ }
  return raw.split(',').map((p) => p.trim()).filter(Boolean);
}

/**
 * Reads config from sequential div rows (delivery / preview mode).
 */
function readSequentialConfig(block) {
  const rows = [...block.querySelectorAll(':scope > div')];
  const cells = rows.map((row) => row.querySelector(':scope > div') || row);
  const textAt = (i) => cells[i]?.textContent?.trim() || '';
  const linkAt = (i) => cells[i]?.querySelector('a[href]')?.getAttribute('href') || textAt(i);

  return {
    listSource: textAt(ROW.LIST_SOURCE) || 'news-and-pr',
    parentPage: linkAt(ROW.PARENT_PAGE) || window.location.pathname,
    hideDescription: parseBoolean(textAt(ROW.HIDE_DESCRIPTION)),
    hideTags: parseBoolean(textAt(ROW.HIDE_TAGS)),
    hideImage: parseBoolean(textAt(ROW.HIDE_IMAGE)),
    hideDate: parseBoolean(textAt(ROW.HIDE_DATE)),
    hideFilters: parseBoolean(textAt(ROW.HIDE_FILTERS)),
    categoryTags: textAt(ROW.CATEGORY_TAGS),
    match: textAt(ROW.MATCH) || 'any',
    excludedPages: parseExcludedPages(linkAt(ROW.STORY_PAGES_TO_EXCLUDE)),
    browseCategoriesPlaceholderText: textAt(ROW.BROWSE_CATEGORIES_PLACEHOLDER),
    searchPlaceholderText: textAt(ROW.SEARCH_PLACEHOLDER),
    searchIconType: textAt(ROW.SEARCH_ICON_TYPE) || 'none',
    searchFontIcon: textAt(ROW.SEARCH_FONT_ICON),
    searchImageIcon: extractIconSource(cells[ROW.SEARCH_IMAGE_ICON]),
    ariaLabel: textAt(ROW.ARIA_LABEL),
  };
}

function extractConfig(block) {
  return readSequentialConfig(block);
}

function parseCategoryItems(block) {
  const rows = [...block.querySelectorAll(':scope > div')];
  const items = [];
  for (let i = ROW.CATEGORY_ITEMS_START; i < rows.length; i += 1) {
    const rowCells = [...rows[i].querySelectorAll(':scope > div')];
    const title = rowCells[0]?.textContent?.trim() || '';
    const linkEl = rowCells[1]?.querySelector('a[href]');
    const pagePath = linkEl?.getAttribute('href') || rowCells[1]?.textContent?.trim() || '';
    if (title || pagePath) items.push({ title, pagePath });
  }
  return items;
}

function parseCategoryItemsFromAue(block) {
  const items = [];
  block.querySelectorAll('[data-aue-model="category-item"]').forEach((item) => {
    const titleEl = item.querySelector('[data-aue-prop="title"]');
    const pathEl = item.querySelector('[data-aue-prop="pagePath"]');
    const title = titleEl?.textContent?.trim() || '';
    const pagePath = pathEl?.querySelector('a[href]')?.getAttribute('href')
      || pathEl?.getAttribute('data-aue-value')
      || pathEl?.textContent?.trim() || '';
    if (title || pagePath) items.push({ title, pagePath });
  });
  return items;
}

/**
 * Preserve category item rows for Universal Editor
 */
export function preserveCategoryItemRows(block) {
  const rows = [...block.querySelectorAll(':scope > div')];
  const categoryRows = [];
  for (let i = ROW.CATEGORY_ITEMS_START; i < rows.length; i += 1) {
    categoryRows.push(rows[i].cloneNode(true));
  }
  return categoryRows;
}

// ─── data fetching ────────────────────────────────────────────────────────────

async function getAllIndexData() {
  try {
    await indexUtils.getIndexData();
    const rawData = sessionStorage.getItem('abbvie-index-data-raw');
    if (!rawData) return [];
    const indexData = JSON.parse(rawData);
    return indexData?.data || [];
  } catch (error) {
    return [];
  }
}

async function fetchChildPages(parentPath) {
  const all = await getAllIndexData();
  const contentBasePath = await getConfigValue('contentBasePath') || '';
  let normalizedParent = parentPath.replace(/\.html$/, '').replace(/\/$/, '');
  if (contentBasePath && normalizedParent.startsWith(contentBasePath)) {
    normalizedParent = normalizedParent.slice(contentBasePath.length);
  }
  return all.filter((page) => {
    const pagePath = page.path.replace(/\/$/, '');
    return pagePath.startsWith(normalizedParent) && pagePath !== normalizedParent;
  });
}

function filterPagesByCategory(pages, categoryTagsStr, matchMode) {
  const tags = categoryTagsStr.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
  if (tags.length === 0) return pages;

  return pages.filter((page) => {
    const raw = (page.tags || '').toLowerCase();
    const pageTags = raw.split(',').map((t) => t.trim()).filter(Boolean);
    return matchMode === 'all'
      ? tags.every((tag) => pageTags.some((pt) => pt.includes(tag)))
      : tags.some((tag) => pageTags.some((pt) => pt.includes(tag)));
  });
}

/**
 * Sorts pages by publication date in descending order (most recent first)
 * @param {Array} pages - Array of page objects
 * @returns {Array} Sorted array of pages
 */
function sortByPublicationDate(pages) {
  return pages.sort((a, b) => {
    const dateA = a.publicationdate ? new Date(a.publicationdate).getTime() : 0;
    const dateB = b.publicationdate ? new Date(b.publicationdate).getTime() : 0;
    return dateB - dateA; // Descending order (most recent first)
  });
}

// ─── rendering ───────────────────────────────────────────────────────────────

/**
 * Extracts and formats the first tag from a comma-separated tags string.
 * Example: "corporate:abbvie-com-2/categories/well-being, ..." → "WELL BEING"
 * @param {string} tagsString - Comma-separated tags string
 * @returns {string} Formatted tag label in uppercase
 */
/**
 * Composes read/watch time string based on page metadata
 * @param {Object} pageData - Page metadata object
 * @param {Object} placeholders - Placeholders object for translations
 * @returns {Promise<string>} Formatted read/watch time string
 */
async function composeReadTime(pageData, placeholders) {
  const type = pageData.readwatchtime || pageData.readWatchTime || '';
  const minutes = type === 'watchTime'
    ? pageData.storywatchtime || pageData.storyWatchTime
    : pageData.storyreadtime || pageData.storyReadTime;

  if (!minutes) return '';

  const minutesNum = parseInt(minutes, 10);
  if (Number.isNaN(minutesNum)) return '';

  const label = type === 'watchTime'
    ? placeholders?.['storyCard.minuteWatch'] || placeholders?.minuteWatch || 'Minute Watch'
    : placeholders?.['storyCard.minuteRead'] || placeholders?.minuteRead || 'Minute Read';

  return `${minutesNum} ${label}`;
}

function extractTagLabel(tagsString) {
  if (!tagsString) return '';

  // Get first tag only (split by comma)
  const firstTag = tagsString.split(',')[0].trim();
  if (!firstTag) return '';

  // Extract last segment after final '/'
  const segments = firstTag.split('/');
  const lastSegment = segments[segments.length - 1];

  // Replace hyphens with spaces and uppercase
  return lastSegment.replace(/-/g, ' ').toUpperCase();
}

function formatPublicationDate(dateString) {
  if (!dateString) return '';
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'long', day: 'numeric', year: 'numeric',
    }).format(new Date(dateString)).toUpperCase();
  } catch {
    return dateString.toUpperCase();
  }
}

async function buildStoryCard(pageData, hideOptions = {}, placeholders = {}) {
  const {
    hideDescription = false, hideTags = false,
    hideImage = false, hideDate = false,
  } = hideOptions;

  const rawTitle = pageData.cardtitle || pageData.navtitle || pageData.title || '';
  const description = pageData.carddescription || pageData.description || '';
  const title = rawTitle || description;
  const tagLabel = extractTagLabel(pageData.tags || '');
  const image = pageData.cardimage || pageData.image || '';
  const imageAlt = pageData.cardimagealt || pageData.pageimagealt || title;
  const publicationDate = pageData.publicationdate || '';
  const readTime = await composeReadTime(pageData, placeholders);
  const path = pageData.path || '';

  const li = document.createElement('li');
  li.className = 'editorial-feed-card-item';
  li.dataset.title = title.toLowerCase();
  li.dataset.description = description.toLowerCase();
  li.dataset.eyebrow = tagLabel.toLowerCase();
  li.dataset.category = (pageData.category || tagLabel || '').toLowerCase();

  const cardLink = document.createElement('a');
  cardLink.href = path;
  cardLink.className = 'editorial-feed-card-link';
  cardLink.setAttribute('aria-label', `Read more about ${title}`);

  const card = document.createElement('div');
  card.className = 'editorial-feed-card';

  if (image && !hideImage) {
    const imageContainer = document.createElement('div');
    imageContainer.className = 'editorial-feed-card-image';
    const img = document.createElement('img');
    img.src = image;
    img.alt = imageAlt;
    img.loading = 'lazy';
    imageContainer.appendChild(img);
    card.appendChild(imageContainer);
  }

  const content = document.createElement('div');
  content.className = 'editorial-feed-card-content';

  const meta = document.createElement('div');
  meta.className = 'editorial-feed-card-meta';

  if (publicationDate && !hideDate) {
    const date = document.createElement('time');
    date.className = 'editorial-feed-card-date';
    date.textContent = formatPublicationDate(publicationDate);
    meta.appendChild(date);
  }

  if (tagLabel && !hideTags) {
    const tagEl = document.createElement('span');
    tagEl.className = 'editorial-feed-card-eyebrow';
    tagEl.textContent = tagLabel;
    meta.appendChild(tagEl);
  }

  if (meta.children.length > 0) content.appendChild(meta);

  if (title) {
    const titleEl = document.createElement('h4');
    titleEl.className = 'editorial-feed-card-title';
    titleEl.textContent = title;
    content.appendChild(titleEl);
  }

  if (description && !hideDescription) {
    const descEl = document.createElement('p');
    descEl.className = 'editorial-feed-card-description';
    descEl.textContent = description;
    content.appendChild(descEl);
  }

  if (readTime) {
    const footer = document.createElement('div');
    footer.className = 'editorial-feed-card-footer';
    const readTimeEl = document.createElement('span');
    readTimeEl.className = 'editorial-feed-card-readtime';

    const clockIcon = createIcon('clock', 'icon-font');

    readTimeEl.appendChild(clockIcon);
    readTimeEl.appendChild(document.createTextNode(` ${readTime}`));
    footer.appendChild(readTimeEl);
    content.appendChild(footer);
  }

  card.appendChild(content);
  cardLink.appendChild(card);
  li.appendChild(cardLink);
  return li;
}

function buildSearchIcon(searchIconType, searchFontIcon, searchImageIcon) {
  const iconSrc = searchIconType === 'icon-font' ? searchFontIcon : searchImageIcon;
  if (iconSrc) {
    return createIcon(iconSrc, searchIconType === 'icon-font' ? 'svg' : searchIconType, {
      additionalClasses: 'editorial-feed-search-icon',
    });
  }
  return null;
}

function buildFilterUI(config = {}, placeholders = {}) {
  const {
    browseCategoriesPlaceholderText = '',
    searchPlaceholderText = '',
    searchIconType = 'none',
    searchFontIcon = '',
    searchImageIcon = '',
    categoryItems = [],
  } = config;

  const filtersContainer = document.createElement('div');
  filtersContainer.className = 'editorial-feed-filters';

  const filterView = document.createElement('div');
  filterView.className = 'editorial-feed-filter-view';

  const viewLabel = document.createElement('span');
  viewLabel.className = 'editorial-feed-filter-label';
  viewLabel.textContent = placeholders?.['editorialFeed.viewLabel'] || 'View:';

  const dropdown = document.createElement('div');
  dropdown.className = 'editorial-feed-category-dropdown';

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'editorial-feed-category-trigger';
  trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-expanded', 'false');

  const triggerLabel = document.createElement('span');
  triggerLabel.className = 'editorial-feed-category-label';
  triggerLabel.textContent = browseCategoriesPlaceholderText || 'BY CATEGORIES';

  const triggerChevron = createIcon('chevron-down', 'icon-font', {
    additionalClasses: 'editorial-feed-category-chevron',
  });

  trigger.appendChild(triggerLabel);
  trigger.appendChild(triggerChevron);

  const list = document.createElement('ul');
  list.className = 'editorial-feed-category-list';
  list.setAttribute('role', 'listbox');

  categoryItems.forEach(({ title, pagePath }) => {
    if (!title && !pagePath) return;
    const li = document.createElement('li');
    li.setAttribute('role', 'option');
    const a = document.createElement('a');
    a.href = pagePath || '#';
    a.textContent = title;
    li.appendChild(a);
    list.appendChild(li);
  });

  trigger.addEventListener('click', () => {
    const isOpen = dropdown.classList.toggle('is-open');
    trigger.setAttribute('aria-expanded', String(isOpen));
  });

  document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target)) {
      dropdown.classList.remove('is-open');
      trigger.setAttribute('aria-expanded', 'false');
    }
  });

  dropdown.appendChild(trigger);
  dropdown.appendChild(list);

  filterView.appendChild(viewLabel);
  filterView.appendChild(dropdown);

  const searchContainer = document.createElement('div');
  searchContainer.className = 'editorial-feed-filter-search';

  const searchInput = document.createElement('input');
  searchInput.type = 'search';
  searchInput.className = 'editorial-feed-search-input';
  searchInput.placeholder = searchPlaceholderText || 'Search Stories';
  searchInput.setAttribute('aria-label', 'Search stories');

  const clearButton = document.createElement('button');
  clearButton.type = 'button';
  clearButton.className = 'editorial-feed-search-clear';
  clearButton.setAttribute('aria-label', 'Clear search');
  clearButton.style.display = 'none';
  const clearIcon = createIcon('cross', 'icon-font');
  clearButton.appendChild(clearIcon);

  const searchIconEl = buildSearchIcon(searchIconType, searchFontIcon, searchImageIcon);
  if (searchIconEl) searchContainer.appendChild(searchIconEl);
  searchContainer.appendChild(searchInput);
  searchContainer.appendChild(clearButton);
  filtersContainer.appendChild(filterView);
  filtersContainer.appendChild(searchContainer);
  return filtersContainer;
}

function filterCards(cards, searchTerm) {
  // If search term is less than 2 characters, return all cards (per acceptance criteria)
  if (!searchTerm || searchTerm.length < 2) return Array.from(cards);
  const q = searchTerm.toLowerCase();
  return Array.from(cards).filter((card) => card.dataset.title.includes(q)
    || card.dataset.description.includes(q)
    || card.dataset.eyebrow.includes(q));
}

function updateCardDisplay(
  filteredCards,
  displayCount,
  loadMoreBtn,
  cardsContainer,
  placeholders = {},
) {
  cardsContainer?.querySelectorAll('.editorial-feed-card-item')?.forEach((card) => {
    card.style.display = 'none';
  });
  filteredCards.slice(0, displayCount).forEach((card) => {
    card.style.display = 'block';
  });

  if (loadMoreBtn) {
    loadMoreBtn.style.display = displayCount >= filteredCards.length ? 'none' : 'block';
  }

  let emptyState = cardsContainer.querySelector(
    '.editorial-feed-empty-results',
  );
  if (filteredCards.length === 0) {
    if (!emptyState) {
      emptyState = document.createElement('li');
      emptyState.className = 'editorial-feed-empty-results';

      const noResultsText = placeholders?.['editorialFeed.noResultsFound'] || 'No results found';
      const changeSearchText = placeholders?.['editorialFeed.changeSearchCriteria']
        || 'Change your search criteria.';

      const title = document.createElement('p');
      title.className = 'empty-results-title';
      title.textContent = noResultsText;

      const subtitle = document.createElement('p');
      subtitle.className = 'empty-results-subtitle';
      subtitle.textContent = changeSearchText;

      emptyState.appendChild(title);
      emptyState.appendChild(subtitle);
      cardsContainer.appendChild(emptyState);
    }
    emptyState.style.display = 'block';
  } else if (emptyState) {
    emptyState.style.display = 'none';
  }
}

// ─── main ─────────────────────────────────────────────────────────────────────

export default async function decorate(block) {
  const placeholders = await fetchPlaceholders();
  const config = extractConfig(block);
  const isUEMode = block.querySelector('[data-aue-prop]');

  config.categoryItems = isUEMode
    ? parseCategoryItemsFromAue(block)
    : parseCategoryItems(block);

  applyCommonProps(block, 16);
  if (config.ariaLabel) block.setAttribute('aria-label', config.ariaLabel);

  // Preserve category item rows for Universal Editor BEFORE clearing
  let categoryItemElements = [];
  if (isUEMode) {
    const categoryItems = block.querySelectorAll('[data-aue-model="category-item"]');
    categoryItemElements = Array.from(categoryItems).map((item) => item.cloneNode(true));
  }

  block.innerHTML = '';

  // Conditionally add header with filters based on hideFilters setting
  if (!config.hideFilters) {
    const header = document.createElement('div');
    header.className = 'editorial-feed-header';
    header.appendChild(buildFilterUI(config, placeholders));
    block.appendChild(header);
  }

  const cardsContainer = document.createElement('ul');
  cardsContainer.className = 'editorial-feed-cards';

  const actionsContainer = document.createElement('div');
  actionsContainer.className = 'editorial-feed-actions';

  const loadMoreText = placeholders?.showMore || 'SHOW MORE';
  const loadMoreBtn = document.createElement('button');
  loadMoreBtn.className = 'editorial-feed-load-more';
  loadMoreBtn.setAttribute('aria-label', loadMoreText);

  const loadMoreLabel = document.createElement('span');
  loadMoreLabel.textContent = loadMoreText;

  const loadMoreChevron = createIcon('chevron-down', 'icon-font');

  loadMoreBtn.appendChild(loadMoreLabel);
  loadMoreBtn.appendChild(loadMoreChevron);
  actionsContainer.appendChild(loadMoreBtn);

  block.appendChild(cardsContainer);
  block.appendChild(actionsContainer);

  // Re-append category item elements for Universal Editor
  if (isUEMode && categoryItemElements.length > 0) {
    categoryItemElements.forEach((item) => {
      item.style.display = 'none';
      item.style.position = 'absolute';
      item.style.pointerEvents = 'none';
      item.classList.add('editorial-feed-ue-category-item');
      block.appendChild(item);
    });
  }

  const loadingLi = document.createElement('li');
  loadingLi.className = 'editorial-feed-loading';
  loadingLi.textContent = placeholders?.['editorialFeed.loadingStories'] || 'Loading stories...';
  cardsContainer.appendChild(loadingLi);

  // Always fetch child pages first based on parent page
  let pages = await fetchChildPages(config.parentPage);

  // If list source is category-tag, filter the child pages by category tags
  if (config.listSource === 'category-tag') {
    pages = filterPagesByCategory(pages, config.categoryTags, config.match);
  }

  if (config.excludedPages.length > 0) {
    pages = pages.filter((page) => !config.excludedPages.includes(page.path));
  }

  // Sort by publication date (most recent first)
  pages = sortByPublicationDate(pages);

  // Skip rendering block if no child pages found (only in production, not in UE author surface)
  if (pages.length === 0 && !isUEAuthorSurface()) {
    block.remove();
    return;
  }

  cardsContainer.innerHTML = '';

  // Force hide description for category-tag and story-pages list sources
  const shouldForceHideDescription = config.listSource === 'category-tag'
    || config.listSource === 'story-pages';

  const hideOptions = {
    hideDescription: shouldForceHideDescription || config.hideDescription,
    hideTags: config.hideTags,
    hideImage: config.hideImage,
    hideDate: config.hideDate,
  };
  const cardPromises = pages.map((pageData) => buildStoryCard(pageData, hideOptions, placeholders));
  const cards = await Promise.all(cardPromises);
  cards.forEach((card) => cardsContainer.appendChild(card));

  let displayedCount = CARDS_PER_PAGE;
  const searchInput = block.querySelector('.editorial-feed-search-input');

  // Only set up filter/search functionality if filters are not hidden
  if (!config.hideFilters && searchInput) {
    const clearButton = block.querySelector('.editorial-feed-search-clear');

    const applyFilters = () => {
      const allCards = cardsContainer.querySelectorAll('.editorial-feed-card-item');
      const filtered = filterCards(allCards, searchInput.value.trim());
      displayedCount = CARDS_PER_PAGE;
      updateCardDisplay(filtered, displayedCount, loadMoreBtn, cardsContainer, placeholders);
    };

    const toggleClearButton = () => {
      if (clearButton) {
        clearButton.style.display = searchInput.value.trim() ? 'flex' : 'none';
      }
    };

    let searchTimeout;
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      toggleClearButton();
      searchTimeout = setTimeout(applyFilters, 300);
    });

    if (clearButton) {
      clearButton.addEventListener('click', () => {
        searchInput.value = '';
        toggleClearButton();
        applyFilters();
        searchInput.focus();
      });
    }

    loadMoreBtn.addEventListener('click', () => {
      displayedCount += CARDS_PER_PAGE;
      const allCards = cardsContainer.querySelectorAll('.editorial-feed-card-item');
      const filtered = filterCards(allCards, searchInput.value.trim());
      updateCardDisplay(
        filtered,
        displayedCount,
        loadMoreBtn,
        cardsContainer,
        placeholders,
      );
    });

    const allCards = cardsContainer.querySelectorAll('.editorial-feed-card-item');
    updateCardDisplay(
      filterCards(allCards, ''),
      displayedCount,
      loadMoreBtn,
      cardsContainer,
      placeholders,
    );
  } else {
    // If filters are hidden, just show all cards with load more functionality
    loadMoreBtn.addEventListener('click', () => {
      displayedCount += CARDS_PER_PAGE;
      const allCards = cardsContainer.querySelectorAll('.editorial-feed-card-item');
      updateCardDisplay(
        Array.from(allCards),
        displayedCount,
        loadMoreBtn,
        cardsContainer,
        placeholders,
      );
    });

    const allCards = cardsContainer.querySelectorAll('.editorial-feed-card-item');
    updateCardDisplay(
      Array.from(allCards),
      displayedCount,
      loadMoreBtn,
      cardsContainer,
      placeholders,
    );
  }

  // Decorate icons (convert icon classes to SVG)
  decorateIcons(block);
}
