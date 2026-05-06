/**
 * Block: tag-utility-nav
 * AEM Source Component: TagsUtilityNav (com.abbvie.abbviecom2.core.models.TagsUtilityModel)
 *
 * Provides in-page search and category filtering for lists.
 * Reads configuration from block rows (cell-based in publish mode):
 *   classes_searchIconType → CSS class on block element (no-icon | icon-font | image)
 *   Row 0: Search placeholder text
 *   Row 1: Search font icon name (conditional)
 *   Row 2: Search image icon (conditional)
 *   Row 3: Search target ID (optional – if empty, searches adjacent <ul>)
 *   Row 4: Browse categories placeholder (optional)
 *   Row 5: Clear categories text (optional)
 *   Rows 6+: Category items (child rows), each with 3 cells:
 *     Cell 0 = categoryTag, Cell 1 = categoryLink, Cell 2 = categoryTitle
 *
 * UE Model fields: searchIcon (reference), searchPlaceholder (text),
 *   searchInID (text), browseCategories (text),
 *   clearCategories (text)
 * Child model (tag-utility-nav-category): categoryTag (text),
 *   categoryLink (aem-content), categoryTitle (text)
 * Accessibility: aria-label on search input, aria-expanded on dropdown
 */

import { moveInstrumentation, resolveImageReference } from '../../scripts/scripts.js';

/* ── constants ─────────────────────────────────────────────── */

const CONFIG_ROW_COUNT = 6; // rows 0-6 are block-level config fields

/* ── helpers ────────────────────────────────────────────────── */

function getCellText(row, col = 0) {
  const cell = row?.children?.[col];
  return cell?.textContent?.trim() ?? '';
}

function getCellImage(row, col = 0) {
  const cell = row?.children?.[col];
  if (!cell) return null;
  resolveImageReference(cell);
  const img = cell.querySelector('img');
  return img ? img.getAttribute('src') : null;
}

/**
 * Parse category child rows (rows after CONFIG_ROW_COUNT).
 * Each row has 3 cells: categoryTag | categoryLink | categoryTitle
 */
function parseCategories(rows) {
  const categories = [];
  for (let i = CONFIG_ROW_COUNT; i < rows.length; i += 1) {
    const row = rows[i];
    const tag = getCellText(row, 0);
    if (tag) {
      const link = getCellText(row, 1);
      const title = getCellText(row, 2) || tag; // fallback to tag value
      categories.push({ tag, link, title });
    }
  }
  return categories;
}

/* ── search builder ─────────────────────────────────────────── */

function buildSearch({
  iconType, iconImageSrc, iconFontName, placeholderText,
}) {
  const wrapper = document.createElement('div');
  wrapper.className = 'tag-utility-nav-search-container';

  if (iconType === 'image' && iconImageSrc) {
    const icon = document.createElement('img');
    icon.src = iconImageSrc;
    icon.alt = '';
    icon.setAttribute('aria-hidden', 'true');
    icon.className = 'tag-utility-nav-search-icon';
    icon.loading = 'lazy';
    wrapper.append(icon);
  }
  if (iconType === 'icon-font' && iconFontName) {
    const icon = document.createElement('span');
    icon.className = `tag-utility-nav-search-icon ${iconFontName}`;
    icon.setAttribute('aria-hidden', 'true');
    wrapper.append(icon);
  }

  // Field container (input + floating label)
  const fieldDiv = document.createElement('div');
  fieldDiv.className = 'tag-utility-nav-search-field';

  const input = document.createElement('input');
  input.type = 'search';
  input.className = 'tag-utility-nav-search-input';
  input.setAttribute('aria-label', placeholderText);
  input.setAttribute('name', 'search');
  input.autocomplete = 'off';

  const label = document.createElement('label');
  label.className = 'tag-utility-nav-search-label';
  label.textContent = placeholderText;

  const clearBtn = document.createElement('button');
  clearBtn.type = 'button';
  clearBtn.className = 'tag-utility-nav-search-clear hide-close-icon';
  fieldDiv.append(input);
  fieldDiv.append(label);
  wrapper.append(fieldDiv);
  wrapper.append(clearBtn);

  // Toggle 'has-value' class and show/hide clear button as user types
  input.addEventListener('input', () => {
    const hasValue = !!input.value;
    fieldDiv.classList.toggle('has-value', hasValue);
    clearBtn.classList.toggle('hide-close-icon', !hasValue);
  });

  clearBtn.addEventListener('click', () => {
    input.value = '';
    fieldDiv.classList.remove('has-value');
    clearBtn.classList.add('hide-close-icon');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.blur();
  });

  return wrapper;
}

/* ── empty results message ─────────────────────────────────── */

function buildEmptyResults() {
  const container = document.createElement('div');
  container.className = 'tag-utility-nav-empty-results';
  container.setAttribute('aria-live', 'polite');
  container.hidden = true;

  const title = document.createElement('span');
  title.className = 'tag-utility-nav-empty-results-title';
  title.textContent = 'No results found';

  const br = document.createElement('br');

  const quote = document.createElement('span');
  quote.className = 'tag-utility-nav-empty-results-quote';
  quote.textContent = 'Change your search criteria.';

  container.append(title, br, quote);
  return container;
}

/* ── category dropdown ──────────────────────────────────────── */

function buildCategoryDropdown(placeholderText, categories) {
  const container = document.createElement('div');
  container.className = 'tag-utility-nav-dropdown-container';

  const label = document.createElement('h2');
  label.className = 'tag-utility-nav-title';
  label.textContent = 'View:';

  const btnWrap = document.createElement('div');
  btnWrap.className = 'tag-utility-nav-dropdown';

  const btn = document.createElement('button');
  btn.className = 'tag-utility-nav-dropdown-btn';
  btn.type = 'button';
  btn.setAttribute('aria-expanded', 'false');
  btn.innerHTML = `<span class="tag-utility-nav-label-text">${placeholderText}</span>`;

  const modal = document.createElement('ul');
  modal.className = 'tag-utility-nav-dropdown-modal';
  modal.setAttribute('aria-label', 'Browse Categories List');
  modal.hidden = true;

  /*  // "All" option (resets category filter)
  const allLi = document.createElement('li');
  const allBtn = document.createElement('button');
  allBtn.type = 'button';
  allBtn.textContent = placeholderText;
  allBtn.dataset.categoryTag = '';
  allBtn.classList.add('option-selected');
  allLi.append(allBtn);
  modal.append(allLi); */

  // If any category has a link, render all items as <a>; otherwise all as <button>
  const useLinks = categories.some((c) => c.link);

  categories.forEach(({ tag, link, title }) => {
    const li = document.createElement('li');
    if (useLinks) {
      const optLink = document.createElement('a');
      optLink.href = link || '#';
      optLink.textContent = title;
      optLink.dataset.categoryTag = tag;
      li.append(optLink);
    } else {
      const optBtn = document.createElement('button');
      optBtn.type = 'button';
      optBtn.textContent = title;
      optBtn.dataset.categoryTag = tag;
      li.append(optBtn);
    }
    modal.append(li);
  });

  // Toggle dropdown
  btn.addEventListener('click', () => {
    const expanded = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!expanded));
    modal.hidden = expanded;
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!container.contains(e.target)) {
      btn.setAttribute('aria-expanded', 'false');
      modal.hidden = true;
    }
  });

  btnWrap.append(btn, modal);
  container.append(label, btnWrap);
  return container;
}

/* ── clear / reset button ───────────────────────────────────── */

function buildClearButton(text) {
  const wrapper = document.createElement('div');
  wrapper.className = 'tag-utility-nav-clear-container';
  wrapper.hidden = true;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'tag-utility-nav-reset-btn';
  btn.textContent = text;

  wrapper.append(btn);
  return wrapper;
}

/**
 * Find the filterable content container near the block.
 * Discovery order:
 *   1. By explicit ID (searchInID field)
 *   2. Next sibling element right after the block
 *   3. Next sibling after the block's wrapper (EDS wraps blocks in {name}-wrapper)
 */
function findTargetContainer(block, targetId) {
  // 1. Explicit ID
  if (targetId) {
    const el = document.getElementById(targetId);
    if (el) return el;
  }

  // 2. Direct next sibling (when block content sits right after)
  let next = block.nextElementSibling;

  // 3. If no direct sibling, check the wrapper's next sibling
  //    (EDS wraps blocks in .tag-utility-nav-wrapper when inside a section)
  if (!next) {
    const wrapper = block.closest('.tag-utility-nav-wrapper');
    if (wrapper) next = wrapper.nextElementSibling;
  }

  if (!next) return null;
  if (next.tagName === 'UL') return next;
  return next.querySelector('ul') || null;
}

/**
 * Get filterable child items from a container.
 * Supports <ul> (<li> children), or generic containers (<p>, <div> direct children).
 */
function getFilterableItems(container) {
  if (!container) return [];
  // <ul> — filter <li> items
  if (container.tagName === 'UL') {
    return [...container.querySelectorAll(':scope > li')];
  }
  // Generic container (text block, div) — filter direct child elements
  return [...container.children].filter((el) => el.textContent.trim());
}

/* ── in-page search + category filter logic ────────────────── */

function attachFilterBehavior(
  block,
  searchInput,
  emptyContainer,
  targetId,
  categories,
) {
  // Container/items resolved lazily so async-decorated siblings are handled correctly
  let targetContainer = findTargetContainer(block, targetId);
  let activeCategory = ''; // empty = all

  function getItems() {
    if (!targetContainer) targetContainer = findTargetContainer(block, targetId);
    return targetContainer ? getFilterableItems(targetContainer) : [];
  }

  const clearContainer = block.querySelector('.tag-utility-nav-clear-container');

  // Combined filter: applies both search text and active category
  function applyFilters() {
    const items = getItems();
    if (!items.length) return;

    const query = searchInput.value.toLowerCase().trim();
    const hasCategory = activeCategory !== '';
    const hasQuery = query !== '';

    if (!hasCategory && !hasQuery) {
      items.forEach((li) => { li.hidden = false; });
      emptyContainer.hidden = true;
      if (clearContainer) clearContainer.hidden = true;
      return;
    }

    let visibleCount = 0;
    items.forEach((li) => {
      const text = li.textContent.toLowerCase();
      const matchesSearch = !hasQuery || text.includes(query);
      const matchesCategory = !hasCategory || text.includes(activeCategory.toLowerCase());
      const visible = matchesSearch && matchesCategory;
      li.hidden = !visible;
      if (visible) visibleCount += 1;
    });

    const noResults = visibleCount === 0;
    emptyContainer.hidden = !noResults;
    if (clearContainer) clearContainer.hidden = !noResults;
  }

  // Search input listener
  searchInput.addEventListener('input', applyFilters);

  // Clear on Escape
  searchInput.addEventListener('keyup', (e) => {
    if (e.key === 'Escape') {
      searchInput.value = '';
      const field = searchInput.closest('.tag-utility-nav-search-field');
      if (field) field.classList.remove('has-value');
      applyFilters();
      searchInput.blur();
    }
  });

  // Category dropdown listener
  if (categories.length > 0) {
    const dropdownModal = block.querySelector('.tag-utility-nav-dropdown-modal');
    const labelText = block.querySelector('.tag-utility-nav-label-text');
    const defaultLabel = labelText?.textContent || '';

    if (dropdownModal) {
      dropdownModal.addEventListener('click', (e) => {
        const optBtn = e.target.closest('button, a[data-category-tag]');
        if (!optBtn) return;

        // Links navigate to their page — just close the dropdown
        if (optBtn.tagName === 'A') {
          const btn = block.querySelector('.tag-utility-nav-dropdown-btn');
          if (btn) btn.setAttribute('aria-expanded', 'false');
          dropdownModal.hidden = true;
          return;
        }

        // Update selected state
        dropdownModal.querySelectorAll('button').forEach((b) => b.classList.remove('option-selected'));
        optBtn.classList.add('option-selected');

        // Update active category
        activeCategory = optBtn.dataset.categoryTag || '';

        // Update dropdown button text
        if (labelText) {
          labelText.textContent = activeCategory ? optBtn.textContent : defaultLabel;
        }

        // Close dropdown
        const btn = block.querySelector('.tag-utility-nav-dropdown-btn');
        if (btn) btn.setAttribute('aria-expanded', 'false');
        dropdownModal.hidden = true;

        // Show/hide clear button
        if (clearContainer) {
          clearContainer.hidden = !activeCategory && !searchInput.value;
        }

        applyFilters();
      });
    }

    // Clear/reset button
    if (clearContainer) {
      clearContainer.querySelector('button')?.addEventListener('click', () => {
        searchInput.value = '';
        activeCategory = '';
        const field = searchInput.closest('.tag-utility-nav-search-field');
        if (field) field.classList.remove('has-value');

        // Reset dropdown selection
        if (dropdownModal) {
          dropdownModal.querySelectorAll('button').forEach((b) => b.classList.remove('option-selected'));
          const firstOpt = dropdownModal.querySelector('button');
          if (firstOpt) firstOpt.classList.add('option-selected');
        }
        if (labelText) labelText.textContent = defaultLabel;

        clearContainer.hidden = true;
        applyFilters();
      });
    }
  }
}

/* ── block decoration ───────────────────────────────────────── */

export default function decorate(block) {
  const rows = [...block.children];

  // Read config fields from rows 0-7
  // searchIconType is a classes_ field → rendered as CSS class on block, not a row
  let searchIconType = 'no-icon';
  if (block.classList.contains('image')) searchIconType = 'image';
  else if (block.classList.contains('icon-font')) searchIconType = 'icon-font';

  const searchPlaceholder = getCellText(rows[0]) || '';
  const searchFontIcon = getCellText(rows[1]) || '';
  const iconSrc = getCellImage(rows[2]) || '';
  const searchInID = getCellText(rows[3]) || '';
  const browseCategories = getCellText(rows[4]) || '';
  const clearCategories = getCellText(rows[5]) || '';

  // Read category child rows (rows 6+)
  const categories = parseCategories(rows);

  // Remove config rows (0-6) — block-level fields tracked on block element itself
  rows.slice(0, Math.min(CONFIG_ROW_COUNT, rows.length)).forEach((row) => row.remove());

  // Transform category child rows (6+) — preserve UE instrumentation
  // so Universal Editor can track and manage these items via the "+" button
  rows.slice(CONFIG_ROW_COUNT).forEach((row) => {
    const holder = document.createElement('div');
    holder.className = 'tag-utility-nav__category-data';
    holder.hidden = true;
    moveInstrumentation(row, holder);
    row.replaceWith(holder);
  });

  // Build eyebrow toolbar
  const eyebrow = document.createElement('div');
  eyebrow.className = 'tag-utility-nav-eyebrow';

  // Category dropdown (only if browseCategories label is configured)
  if (browseCategories) {
    eyebrow.append(buildCategoryDropdown(browseCategories, categories));
  }

  // Search input
  const searchWidget = buildSearch({
    iconType: searchIconType,
    iconImageSrc: iconSrc,
    iconFontName: searchFontIcon,
    placeholderText: searchPlaceholder,
  });

  eyebrow.append(searchWidget);

  block.append(eyebrow);

  // Empty results message
  const emptyWidget = buildEmptyResults();
  block.append(emptyWidget);

  // Clear button (only if configured)
  if (clearCategories) {
    block.append(buildClearButton(clearCategories));
  }

  // Attach combined search + category filter behavior after DOM settles
  requestAnimationFrame(() => {
    const input = block.querySelector('.tag-utility-nav-search-input');
    if (input) {
      attachFilterBehavior(block, input, emptyWidget, searchInID, categories);
    }
  });
}
