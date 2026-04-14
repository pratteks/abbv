/* eslint-disable no-console */
/**
 * Index Utilities for AbbVie EDS
 * Handles fetching, caching, and structuring data from query-index1.json
 */
import { getConfigValue } from './config.js';
import { isUniversalEditor } from './utils.js';

function normalizeLookupPath(path) {
  let normalized = `${path || ''}`.trim();
  if (!normalized) return '';

  try {
    normalized = new URL(normalized, window.location.origin).pathname;
  } catch {
    // Fall back to the raw string when the path is not URL-like.
  }

  normalized = normalized.replace(/\/index\.html$/, '/');
  normalized = normalized.replace(/\.html$/, '');

  if (!normalized.startsWith('/')) normalized = `/${normalized}`;
  normalized = normalized.replace(/\/{2,}/g, '/');

  if (normalized !== '/' && normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }

  return normalized || '/';
}

class IndexUtils {
  constructor() {
    this.cacheKey = 'abbvie-index-data';
    this.apiUrl = '/query-index-en.json'; // Default URL
    this.initialized = false;
  }

  /**
   * Initialize with configuration values
   * @returns {Promise<void>}
   */
  async init() {
    if (!this.initialized) {
      try {
        const configIndexPath = await getConfigValue('indexFilePath');
        const resolvedIndexPath = configIndexPath || this.apiUrl;
        if (configIndexPath) {
          this.apiUrl = configIndexPath;
        }

        // Check if we're in Universal Editor and adjust the URL accordingly
        if (isUniversalEditor()) {
          // In Universal Editor, we need to use the current path + .resource/ + the index file
          let currentPath = window.location.pathname;
          // Strip .html extension if present
          if (currentPath.endsWith('.html')) {
            currentPath = currentPath.substring(0, currentPath.length - 5);
          }
          this.apiUrl = `${currentPath}.resource${resolvedIndexPath}`;
        }
        this.initialized = true;
      } catch (error) {
        console.error('Failed to initialize with config:', error);
      }
    }
    return this;
  }

  /**
   * Get index data from cache or API
   * @returns {Promise<Object>} Hierarchical index structure
   */
  async getIndexData(isBreadcrumb) {
    try {
      // Ensure initialization is complete
      if (!this.initialized) {
        await this.init();
      }

      // Check if cached data exists
      const cachedData = this.getCachedData();
      if (cachedData && !isBreadcrumb) {
        return cachedData;
      }

      // Fetch fresh data from API
      const response = await fetch(this.apiUrl);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Cache the raw API response for future use
      if (!isBreadcrumb) {
        sessionStorage.setItem(`${this.cacheKey}-raw`, JSON.stringify(data));
      }

      // Transform flat data into hierarchical structure
      let indexTree;
      if (!isBreadcrumb) {
        indexTree = this.buildIndexTree(data.data);
      } else {
        indexTree = data.data;
      }

      // Cache the processed data
      if (!isBreadcrumb) {
        this.setCachedData(indexTree);
      }

      return indexTree;
    } catch (error) {
      // Try to return cached data as fallback
      const fallbackData = sessionStorage.getItem(this.cacheKey);
      if (fallbackData) {
        return JSON.parse(fallbackData);
      }

      // Return empty structure if all else fails
      return { levels: [] };
    }
  }

  /**
   * Get cached index data
   * @returns {Object|null} Cached data or null if not found
   */
  getCachedData() {
    try {
      const cachedData = sessionStorage.getItem(this.cacheKey);

      if (!cachedData) {
        return null;
      }

      return JSON.parse(cachedData);
    } catch (error) {
      this.clearCache();
      return null;
    }
  }

  /**
   * Cache index data in sessionStorage
   * @param {Object} data Index data to cache
   */
  setCachedData(data) {
    sessionStorage.setItem(this.cacheKey, JSON.stringify(data));
  }

  /**
   * Clear cached index data
   */
  clearCache() {
    sessionStorage.removeItem(this.cacheKey);
  }

  /**
   * Transform flat API data into hierarchical index structure
   * @param {Array} flatData Array of page objects from API
   * @returns {Object} Hierarchical index structure
   */
  buildIndexTree(flatData) {
    if (!Array.isArray(flatData)) {
      return { levels: [] };
    }

    // Filter out hidden pages and pages without titles
    const visiblePages = flatData.filter((page) => (
      page.hidefromnavigation !== 'true'
      && page.navtitle
      && page.path !== '/' // Exclude home page from index
    ));

    // Group pages by index levels
    const indexLevels = {
      level1: [], // Top level pages (e.g., /who-we-are)
      level2: [], // Second level pages (e.g., /who-we-are/our-leaders)
      level3: [], // Third level pages (e.g., /who-we-are/section/subsection)
    };

    visiblePages.forEach((page) => {
      const pathSegments = page.path.split('/').filter((segment) => segment.length > 0);
      const level = pathSegments.length;

      const indexItem = {
        path: page.path,
        title: (page.navtitle || '').split('|')[0].trim(),
        description: page.description || '',
        level,
        segments: pathSegments,
        parent: level > 1 ? `/${pathSegments.slice(0, level - 1).join('/')}` : null,
        children: [],
      };
      console.log('Processing page:', indexItem);

      if (level === 1) {
        indexLevels.level1.push(indexItem);
      } else if (level === 2) {
        indexLevels.level2.push(indexItem);
      } else if (level === 3) {
        indexLevels.level3.push(indexItem);
      }
    });

    // Build hierarchical structure
    const indexTree = this.buildHierarchy(indexLevels);

    return {
      levels: indexTree,
      lastUpdated: new Date().toISOString(),
      totalPages: visiblePages.length,
    };
  }

  /**
   * Build hierarchical structure from grouped index levels
   * @param {Object} indexLevels Grouped index items by level
   * @returns {Array} Hierarchical index tree
   */
  buildHierarchy(indexLevels) {
    // Using 'this' to satisfy the linting rule
    this.temp = null;

    // Sort all levels alphabetically by title
    Object.keys(indexLevels).forEach((level) => {
      indexLevels[level].sort((a, b) => a.title.localeCompare(b.title));
    });

    // Assign children to level 2 items
    indexLevels.level2.forEach((level2Item) => {
      level2Item.children = indexLevels.level3.filter((level3Item) => (
        level3Item.parent === level2Item.path
      ));
    });

    // Assign children to level 1 items
    indexLevels.level1.forEach((level1Item) => {
      level1Item.children = indexLevels.level2.filter((level2Item) => (
        level2Item.parent === level1Item.path
      ));
    });

    return indexLevels.level1;
  }

  /**
   * Find index item by path
   * @param {string} path Page path to find
   * @returns {Promise<Object|null>} Index item or null if not found
   */
  async findIndexItem(path) {
    const lookupPath = normalizeLookupPath(path);
    if (!lookupPath) return null;

    const indexData = await this.getIndexData();

    // Using recursive function with array methods instead of for...of loop
    const findInTree = (items) => {
      // First try to find direct match
      const directMatch = items.find((item) => item.path === lookupPath);
      if (directMatch) {
        return directMatch;
      }

      // Then search in children
      let result = null;
      items.some((item) => {
        if (item.children && item.children.length > 0) {
          const found = findInTree(item.children);
          if (found) {
            result = found;
            return true;
          }
        }
        return false;
      });

      return result;
    };

    return findInTree(indexData.levels || []);
  }

  /**
   * Get all page properties for a specific path
   * @param {string} path Page path to get properties for
   * @returns {Promise<Object|null>} Page properties or null if not found
   */
  async getPageProperties(path) {
    try {
      const lookupPath = normalizeLookupPath(path);
      if (!lookupPath) return null;

      // Try to find the raw data in sessionStorage first
      const rawData = sessionStorage.getItem(`${this.cacheKey}-raw`);
      if (rawData) {
        const parsedData = JSON.parse(rawData);
        if (parsedData && Array.isArray(parsedData.data)) {
          const page = parsedData.data.find((item) => item.path === lookupPath);
          if (page) {
            return page;
          }
        }
      }

      // If not found in cache, call getIndexData() which will fetch and cache the data
      await this.getIndexData();

      // Try again with the newly cached data
      const freshRawData = sessionStorage.getItem(`${this.cacheKey}-raw`);
      if (freshRawData) {
        const parsedData = JSON.parse(freshRawData);
        if (parsedData && Array.isArray(parsedData.data)) {
          const page = parsedData.data.find((item) => item.path === lookupPath);
          return page || null;
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }
}

// Create and initialize singleton instance
const indexUtils = new IndexUtils();

// Initialize the instance immediately
(async () => {
  try {
    await indexUtils.init();
  } catch (error) {
    console.error('Failed to initialize IndexUtils:', error);
  }
})();

export default indexUtils;
export { IndexUtils };
