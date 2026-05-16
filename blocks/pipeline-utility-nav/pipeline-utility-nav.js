/**
 * Block: pipeline-utility-nav
 * Pipeline Utility Navigation — search, sort, filter for pipeline content.
 * Matches: abbvie.com/science/pipeline.html
 *
 * Row layout (classes_ fields handled by framework):
 *   0: lastUpdatedDate
 *   1: focusAreaPath (required)
 *   2: pharmaceuticalPath (required)
 *   3: devicesPath (required)
 *   4: searchFontIcon (conditional)
 *   5: searchImageIcon (conditional)
 *   6: sortFontIcon (conditional)
 *   7: sortImageIcon (conditional)
 *   8: filterFontIcon (conditional)
 *   9: filterImageIcon (conditional)
 *   10: clearAllLabel
 *   11: applyLabel
 *   12+: common properties (id, language, analyticsId — via applyCommonProps)
 */

import { resolveImageReference } from '../../scripts/scripts.js';
import { applyCommonProps, createIcon, extractIconSource } from '../../scripts/utils.js';

const TAGS_STORAGE_KEY = 'pipeline-tags';

/**
 * Fetch tags.json — uses sessionStorage cache to avoid repeated calls.
 * @returns {Promise<Array>} Array of { tag, title } objects
 */
async function fetchTags() {
  const cached = sessionStorage.getItem(TAGS_STORAGE_KEY);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {
      sessionStorage.removeItem(TAGS_STORAGE_KEY);
    }
  }

  try {
    const resp = await fetch('/tags.json');
    if (!resp.ok) return [];
    const json = await resp.json();
    const tags = json.data || [];
    sessionStorage.setItem(TAGS_STORAGE_KEY, JSON.stringify(tags));
    return tags;
  } catch (e) {
    return [];
  }
}

/**
 * Get child tag titles under a given parent path prefix.
 * Only returns direct children (one level deep).
 * @param {Array} tags - All tags from tags.json
 * @param {string} parentPath - Parent tag path
 *   (e.g. "corporate:abbvie-com-2/pipeline/devices/phase")
 * @returns {Array<string>} Titles of child tags
 */
function getChildTags(tags, parentPath) {
  const prefix = parentPath.endsWith('/') ? parentPath : `${parentPath}/`;
  return tags
    .filter((t) => t.tag.startsWith(prefix) && !t.tag.substring(prefix.length).includes('/'))
    .map((t) => t.title);
}

/**
 * Build the filter categories array from tags.json data and authored config paths.
 * @param {Array} tags - All tags
 * @param {object} config - Block config with focusAreaPath, pharmaceuticalPath, devicesPath
 * @returns {Array} Categories for the filter panel
 */
function buildFilterCategories(tags, config) {
  // Focus Area — direct children of the focus area path
  const focusAreaItems = getChildTags(tags, config.focusAreaPath);

  // Pharmaceuticals — phase and type sub-categories
  const pharmaBase = config.pharmaceuticalPath;
  const pharmaPhaseItems = getChildTags(tags, `${pharmaBase}/phase`);
  const pharmaTypeItems = getChildTags(tags, `${pharmaBase}/type`);

  // Find parent title for Pharmaceuticals
  const pharmaParent = tags.find((t) => t.tag === pharmaBase);
  const pharmaTitle = pharmaParent?.title || 'Pharmaceuticals';

  // Find phase/type parent titles
  const pharmaPhaseParent = tags.find((t) => t.tag === `${pharmaBase}/phase`);
  const pharmaTypeParent = tags.find((t) => t.tag === `${pharmaBase}/type`);

  // Devices — phase and type sub-categories
  const devicesBase = config.devicesPath;
  const devicePhaseItems = getChildTags(tags, `${devicesBase}/phase`);
  const deviceTypeItems = getChildTags(tags, `${devicesBase}/type`);

  const devicesParent = tags.find((t) => t.tag === devicesBase);
  const devicesTitle = devicesParent?.title || 'Devices';

  const devicePhaseParent = tags.find((t) => t.tag === `${devicesBase}/phase`);
  const deviceTypeParent = tags.find((t) => t.tag === `${devicesBase}/type`);

  return [
    {
      title: 'Focus Area',
      id: 'focus-area',
      hasSelectAll: false,
      items: focusAreaItems.length > 0 ? focusAreaItems : ['Immunology', 'Neuroscience', 'Oncology', 'Eye Care', 'Aesthetics', 'Other Specialties'],
    },
    {
      title: pharmaTitle,
      id: 'pharmaceuticals',
      hasSelectAll: true,
      subs: [
        { title: pharmaPhaseParent?.title || 'Molecule/Asset Phase', items: pharmaPhaseItems.length > 0 ? pharmaPhaseItems : ['Phase 1', 'Phase 2', 'Phase 3', 'Submitted', 'Approved'] },
        { title: pharmaTypeParent?.title || 'Molecule/Asset Type', items: pharmaTypeItems.length > 0 ? pharmaTypeItems : ['Biologic', 'Small Molecule', 'Large Molecule'] },
      ],
    },
    {
      title: devicesTitle,
      id: 'devices',
      hasSelectAll: true,
      subs: [
        { title: devicePhaseParent?.title || 'Device Asset Phase', items: devicePhaseItems.length > 0 ? devicePhaseItems : ['Concept', 'Feasibility', 'Development', 'Confirmation', 'Approved', 'Launched'] },
        { title: deviceTypeParent?.title || 'Device Asset Type', items: deviceTypeItems.length > 0 ? deviceTypeItems : ['Facial Aesthetics', 'Body Contouring', 'Device'] },
      ],
    },
  ];
}

const ROW = {
  LAST_UPDATED: 0,
  FOCUS_AREA_PATH: 1,
  PHARMACEUTICAL_PATH: 2,
  DEVICES_PATH: 3,
  SEARCH_FONT_ICON: 4,
  SEARCH_IMAGE_ICON: 5,
  SORT_FONT_ICON: 6,
  SORT_IMAGE_ICON: 7,
  FILTER_FONT_ICON: 8,
  FILTER_IMAGE_ICON: 9,
  CLEAR_LABEL: 10,
  APPLY_LABEL: 11,
};

function getCellText(row) {
  return row?.firstElementChild?.textContent?.trim() ?? '';
}

function getCellIconSource(row) {
  if (!row) return '';
  const cell = row.firstElementChild || row;
  resolveImageReference(cell);
  return extractIconSource(cell);
}

function buildIcon(type, fontName, imageSrc, cls) {
  if ((type === 'search-icon-font' || type === 'sort-icon-font' || type === 'filter-icon-font') && fontName) {
    return createIcon(fontName, 'icon-font', {
      additionalClasses: ['pipeline-nav-icon', cls],
    });
  }
  if ((type === 'search-image' || type === 'sort-image' || type === 'filter-image') && imageSrc) {
    return createIcon(imageSrc, 'image', {
      additionalClasses: cls,
    });
  }
  return null;
}

/* ── eyebrow: title + last updated + search ──────────────── */

function buildEyebrow(config) {
  const eyebrow = document.createElement('div');
  eyebrow.className = 'pipeline-nav-eyebrow';

  const titleContainer = document.createElement('div');
  titleContainer.className = 'pipeline-nav-title-container';

  const title = document.createElement('h2');
  title.className = 'pipeline-nav-title';
  title.textContent = 'Pipeline';
  titleContainer.append(title);

  if (config.lastUpdated) {
    const updated = document.createElement('p');
    updated.className = 'pipeline-nav-last-updated';
    try {
      const date = new Date(config.lastUpdated);
      const formatted = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: '2-digit' });
      updated.textContent = `Updated ${formatted}`;
    } catch (e) {
      updated.textContent = `Updated ${config.lastUpdated}`;
    }
    titleContainer.append(updated);
  }

  eyebrow.append(titleContainer);

  // Search
  const searchContainer = document.createElement('div');
  searchContainer.className = 'pipeline-nav-search';

  const searchIcon = buildIcon(config.searchIconType, config.searchFontIcon, config.searchImageIcon, 'pipeline-nav-search-icon');
  if (searchIcon) searchContainer.append(searchIcon);

  const form = document.createElement('form');
  form.method = 'GET';
  form.setAttribute('role', 'search');

  const input = document.createElement('input');
  input.type = 'search';
  input.className = 'pipeline-nav-search-input';
  input.setAttribute('aria-label', 'Search Pipeline');
  input.autocomplete = 'off';

  const label = document.createElement('span');
  label.className = 'pipeline-nav-search-label';
  label.textContent = 'Search Pipeline';

  form.append(input, label);
  searchContainer.append(form);
  eyebrow.append(searchContainer);

  input.addEventListener('input', () => searchContainer.classList.toggle('has-value', !!input.value));
  input.addEventListener('focus', () => searchContainer.classList.add('focused'));
  input.addEventListener('blur', () => searchContainer.classList.remove('focused'));

  return eyebrow;
}

/* ── sort / filter row ───────────────────────────────────── */

function buildSortFilter(config) {
  const row = document.createElement('div');
  row.className = 'pipeline-nav-sort-filter';

  // Sort
  const sortWrap = document.createElement('div');
  sortWrap.className = 'pipeline-nav-sort';

  const sortIcon = buildIcon(config.sortIconType, config.sortFontIcon, config.sortImageIcon, 'pipeline-nav-sort-icon');
  if (sortIcon) sortWrap.append(sortIcon);

  const sortLabel = document.createElement('span');
  sortLabel.className = 'pipeline-nav-sort-label';
  sortLabel.textContent = 'SORT BY';
  sortWrap.append(sortLabel);

  const sortBtn = document.createElement('button');
  sortBtn.className = 'pipeline-nav-sort-btn';
  sortBtn.type = 'button';
  sortBtn.setAttribute('aria-expanded', 'false');

  const sortCurrent = document.createElement('span');
  sortCurrent.className = 'pipeline-nav-sort-current';
  sortCurrent.textContent = 'Focus Area';
  sortBtn.append(sortCurrent);
  sortWrap.append(sortBtn);

  const sortModal = document.createElement('ul');
  sortModal.className = 'pipeline-nav-sort-modal';
  sortModal.hidden = true;

  ['Focus Area', 'Alphabetical'].forEach((opt, idx) => {
    const li = document.createElement('li');
    const optBtn = document.createElement('button');
    optBtn.type = 'button';
    optBtn.textContent = opt;
    if (idx === 0) optBtn.classList.add('selected');
    li.append(optBtn);
    sortModal.append(li);
  });

  sortWrap.append(sortModal);

  sortBtn.addEventListener('click', () => {
    const expanded = sortBtn.getAttribute('aria-expanded') === 'true';
    sortBtn.setAttribute('aria-expanded', String(!expanded));
    sortModal.hidden = expanded;
  });

  sortModal.addEventListener('click', (e) => {
    const opt = e.target.closest('button');
    if (!opt) return;
    sortModal.querySelectorAll('button').forEach((b) => b.classList.remove('selected'));
    opt.classList.add('selected');
    sortCurrent.textContent = opt.textContent;
    sortBtn.setAttribute('aria-expanded', 'false');
    sortModal.hidden = true;
  });

  document.addEventListener('click', (e) => {
    if (!sortWrap.contains(e.target)) {
      sortBtn.setAttribute('aria-expanded', 'false');
      sortModal.hidden = true;
    }
  });

  row.append(sortWrap);

  // Filter button
  const filterBtn = document.createElement('button');
  filterBtn.className = 'pipeline-nav-filter-btn';
  filterBtn.type = 'button';
  filterBtn.setAttribute('aria-expanded', 'false');

  const filterIcon = buildIcon(config.filterIconType, config.filterFontIcon, config.filterImageIcon, 'pipeline-nav-filter-icon');
  if (filterIcon) filterBtn.append(filterIcon);

  const filterLabel = document.createElement('span');
  filterLabel.className = 'pipeline-nav-filter-label';
  filterLabel.textContent = 'FILTER';
  filterBtn.append(filterLabel);
  row.append(filterBtn);

  // Filter chips area (hidden until selections made)
  const chipsArea = document.createElement('div');
  chipsArea.className = 'pipeline-nav-chips';
  chipsArea.hidden = true;

  const chipsButtons = document.createElement('div');
  chipsButtons.className = 'pipeline-nav-chips-buttons';

  const chipsClear = document.createElement('button');
  chipsClear.type = 'button';
  chipsClear.className = 'pipeline-nav-chips-clear';
  chipsClear.textContent = 'Clear All';
  chipsClear.hidden = true;

  chipsArea.append(chipsButtons, chipsClear);
  row.append(chipsArea);

  return row;
}

/* ── filter panel ────────────────────────────────────────── */

function buildCheckboxOption(name, value) {
  const option = document.createElement('div');
  option.className = 'pipeline-nav-panel-option';
  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.value = value;
  cb.name = name;
  cb.id = `filter-${name}-${value.replace(/[\s/]+/g, '-').toLowerCase()}`;
  const lbl = document.createElement('label');
  lbl.setAttribute('for', cb.id);
  lbl.textContent = value;
  option.append(cb, lbl);
  return option;
}

function buildSelectAllTitle(catId, catTitle) {
  const wrapper = document.createElement('div');
  wrapper.className = 'pipeline-nav-panel-cat-header';
  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.id = `filter-${catId}-all`;
  cb.dataset.filterType = `${catId}-all`;
  const lbl = document.createElement('label');
  lbl.setAttribute('for', cb.id);
  lbl.setAttribute('role', 'heading');
  lbl.setAttribute('aria-level', '2');
  lbl.className = 'pipeline-nav-panel-cat-title';
  const titleText = document.createTextNode(catTitle);
  const count = document.createElement('i');
  count.className = `pipeline-nav-panel-${catId}-count`;
  lbl.append(titleText, count);
  wrapper.append(cb, lbl);

  // Select-all toggle
  cb.addEventListener('change', () => {
    const panel = wrapper.closest('.pipeline-nav-panel-cat');
    if (!panel) return;
    panel.querySelectorAll('input[type="checkbox"]:not([data-filter-type])').forEach((item) => {
      item.checked = cb.checked;
    });
  });

  return wrapper;
}

function buildFilterPanel(config, cats) {
  const panel = document.createElement('div');
  panel.className = 'pipeline-nav-panel';
  panel.hidden = true;

  const inner = document.createElement('div');
  inner.className = 'pipeline-nav-panel-inner';

  const grid = document.createElement('div');
  grid.className = 'pipeline-nav-panel-grid';

  cats.forEach((cat) => {
    const container = document.createElement('div');
    container.className = `pipeline-nav-panel-cat pipeline-nav-panel-${cat.id}`;

    // Title — with or without select-all checkbox
    if (cat.hasSelectAll) {
      container.append(buildSelectAllTitle(cat.id, cat.title));
    } else {
      const catTitle = document.createElement('h3');
      catTitle.className = 'pipeline-nav-panel-cat-title';
      catTitle.textContent = cat.title;
      container.append(catTitle);
    }

    if (cat.items) {
      const fs = document.createElement('fieldset');
      fs.className = 'pipeline-nav-panel-fieldset';
      cat.items.forEach((item) => fs.append(buildCheckboxOption(cat.id, item)));
      container.append(fs);
    } else if (cat.subs) {
      const dual = document.createElement('div');
      dual.className = 'pipeline-nav-panel-dual';
      cat.subs.forEach((sub) => {
        const sf = document.createElement('div');
        sf.className = 'pipeline-nav-panel-sub';
        const subTitle = document.createElement('h4');
        subTitle.className = 'pipeline-nav-panel-sub-title';
        subTitle.textContent = sub.title;
        sf.append(subTitle);
        sub.items.forEach((item) => sf.append(buildCheckboxOption(cat.id, item)));
        dual.append(sf);
      });
      container.append(dual);

      // Update select-all state when individual checkboxes change
      container.addEventListener('change', (e) => {
        if (e.target.dataset.filterType) return; // ignore select-all itself
        const allCb = container.querySelector(`[data-filter-type="${cat.id}-all"]`);
        if (!allCb) return;
        const items = [...container.querySelectorAll('input[type="checkbox"]:not([data-filter-type])')];
        const checkedCount = items.filter((c) => c.checked).length;
        allCb.checked = checkedCount === items.length;
        allCb.indeterminate = checkedCount > 0 && checkedCount < items.length;
        // Update count
        const countEl = container.querySelector(`.pipeline-nav-panel-${cat.id}-count`);
        if (countEl) countEl.textContent = checkedCount > 0 ? ` (${checkedCount})` : '';
      });
    }

    grid.append(container);
  });

  // Buttons row
  const btnRow = document.createElement('div');
  btnRow.className = 'pipeline-nav-panel-buttons';

  const clearBtn = document.createElement('button');
  clearBtn.type = 'button';
  clearBtn.className = 'pipeline-nav-panel-clear';
  clearBtn.textContent = config.clearLabel || 'Clear All';

  btnRow.append(clearBtn);
  grid.append(btnRow);

  // Close button
  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'pipeline-nav-panel-close';
  closeBtn.setAttribute('aria-label', 'Close filter panel');

  inner.append(grid, closeBtn);
  panel.append(inner);

  // clearBtn.addEventListener('click', () => {
  //   panel.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
  //     cb.checked = false;
  //     cb.indeterminate = false;
  //   });
  //   panel.querySelectorAll('[class$="-count"]').forEach((el) => { el.textContent = ''; });
  //   updateChips();
  // });

  closeBtn.addEventListener('click', () => {
    panel.hidden = true;
    const fb = panel.closest('.pipeline-utility-nav')?.querySelector('.pipeline-nav-filter-btn');
    if (fb) { fb.setAttribute('aria-expanded', 'false'); fb.classList.remove('active'); }
  });

  return panel;
}

/* ── decorate ────────────────────────────────────────────── */

export default async function decorate(block) {
  // Apply common properties (id, language) from _common-properties.json
  applyCommonProps(block, 12);

  const rows = [...block.children];

  // Icon types from framework classes
  let searchIconType = 'search-no-icon';
  if (block.classList.contains('search-image')) searchIconType = 'search-image';
  else if (block.classList.contains('search-icon-font')) searchIconType = 'search-icon-font';

  let sortIconType = 'sort-no-icon';
  if (block.classList.contains('sort-image')) sortIconType = 'sort-image';
  else if (block.classList.contains('sort-icon-font')) sortIconType = 'sort-icon-font';

  let filterIconType = 'filter-no-icon';
  if (block.classList.contains('filter-image')) filterIconType = 'filter-image';
  else if (block.classList.contains('filter-icon-font')) filterIconType = 'filter-icon-font';

  const config = {
    lastUpdated: getCellText(rows[ROW.LAST_UPDATED]),
    focusAreaPath: getCellText(rows[ROW.FOCUS_AREA_PATH]),
    pharmaceuticalPath: getCellText(rows[ROW.PHARMACEUTICAL_PATH]),
    devicesPath: getCellText(rows[ROW.DEVICES_PATH]),
    searchFontIcon: getCellText(rows[ROW.SEARCH_FONT_ICON]),
    searchImageIcon: getCellIconSource(rows[ROW.SEARCH_IMAGE_ICON]),
    sortFontIcon: getCellText(rows[ROW.SORT_FONT_ICON]),
    sortImageIcon: getCellIconSource(rows[ROW.SORT_IMAGE_ICON]),
    filterFontIcon: getCellText(rows[ROW.FILTER_FONT_ICON]),
    filterImageIcon: getCellIconSource(rows[ROW.FILTER_IMAGE_ICON]),
    clearLabel: getCellText(rows[ROW.CLEAR_LABEL]),
    applyLabel: getCellText(rows[ROW.APPLY_LABEL]),
    searchIconType,
    sortIconType,
    filterIconType,
  };

  block.textContent = '';

  const nav = document.createElement('div');
  nav.className = 'pipeline-nav';

  nav.append(buildEyebrow(config));
  nav.append(buildSortFilter(config));

  // Fetch tags and build filter categories dynamically
  const tags = await fetchTags();
  const cats = buildFilterCategories(tags, config);

  const filterPanel = buildFilterPanel(config, cats);
  nav.append(filterPanel);

  block.append(nav);

  // Wire filter toggle
  const filterBtn = block.querySelector('.pipeline-nav-filter-btn');
  if (filterBtn) {
    filterBtn.addEventListener('click', () => {
      const expanded = filterBtn.getAttribute('aria-expanded') === 'true';
      filterBtn.setAttribute('aria-expanded', String(!expanded));
      filterBtn.classList.toggle('active', !expanded);
      filterPanel.hidden = expanded;
    });
  }

  // Wire chips: when checkboxes change in filter panel, update chips in sort/filter bar
  const chipsArea = block.querySelector('.pipeline-nav-chips');
  const chipsButtons = block.querySelector('.pipeline-nav-chips-buttons');
  const chipsClear = block.querySelector('.pipeline-nav-chips-clear');
  const navPanelClear = block.querySelector('.pipeline-nav-panel-clear');

  function updateChips() {
    if (!chipsButtons) return;
    chipsButtons.textContent = '';
    const checked = [...filterPanel.querySelectorAll('input[type="checkbox"]:checked:not([data-filter-type])')];
    checked.forEach((cb) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'pipeline-nav-chip';
      chip.setAttribute('aria-label', `Remove: ${cb.value}`);
      chip.textContent = cb.value;
      chip.addEventListener('click', () => {
        cb.checked = false;
        cb.dispatchEvent(new Event('change', { bubbles: true }));
        updateChips();
      });
      chipsButtons.append(chip);
    });
    if (chipsArea) {
      chipsArea.hidden = checked.length === 0;
      chipsClear.hidden = checked.length === 0;
    }
  }

  filterPanel.addEventListener('change', updateChips);

  [chipsClear, navPanelClear].forEach((btn) => {
    if (btn) {
      btn.addEventListener('click', () => {
        filterPanel.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
          cb.checked = false;
          cb.indeterminate = false;
        });

        filterPanel.querySelectorAll('[class$="-count"]').forEach((el) => {
          el.textContent = '';
        });

        updateChips();
      });
    }
  });
}
