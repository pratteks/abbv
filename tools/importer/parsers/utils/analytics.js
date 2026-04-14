/* eslint-disable */

/**
 * Analytics extraction utility for parsers.
 * Rule 4: Extract analytics data attributes from AEM source elements
 * and attach standardized data-analytics-* attributes to block elements.
 */

/**
 * Extract analytics data from a source AEM element and return
 * a plain object of { attributeName: value } to set on the block.
 */
export function extractAnalytics(element) {
  if (!element) return {};
  const attrs = {};

  // 1. AEM Component Data Layer (JSON)
  const cmpDataLayer = element.getAttribute('data-cmp-data-layer');
  if (cmpDataLayer) {
    try {
      const layerData = JSON.parse(cmpDataLayer);
      const componentId = Object.keys(layerData)[0];
      if (componentId && layerData[componentId]) {
        const data = layerData[componentId];
        if (data['@type']) attrs['data-analytics-type'] = data['@type'];
        if (data['dc:title']) attrs['data-analytics-title'] = data['dc:title'];
        if (data['xdm:linkURL']) attrs['data-analytics-link'] = data['xdm:linkURL'];
      }
    } catch (e) { /* ignore malformed JSON */ }
  }

  // 2. Click/impression tracking
  const track = element.getAttribute('data-track');
  if (track) attrs['data-analytics-track'] = track;

  const trackClick = element.getAttribute('data-track-click');
  if (trackClick) attrs['data-analytics-click'] = trackClick;

  const trackImpression = element.getAttribute('data-track-impression');
  if (trackImpression) attrs['data-analytics-impression'] = trackImpression;

  // 3. Analytics labels
  const analytics = element.getAttribute('data-analytics');
  if (analytics) attrs['data-analytics-label'] = analytics;

  // 4. Content identification
  const contentName = element.getAttribute('data-content-name');
  if (contentName) attrs['data-analytics-content-name'] = contentName;

  const contentType = element.getAttribute('data-content-type');
  if (contentType) attrs['data-analytics-content-type'] = contentType;

  // 5. Link tracking
  const linkType = element.getAttribute('data-link-type');
  if (linkType) attrs['data-analytics-link-type'] = linkType;

  const linkText = element.getAttribute('data-link-text');
  if (linkText) attrs['data-analytics-link-text'] = linkText;

  // 6. Component title
  const componentTitle = element.getAttribute('data-component-title');
  if (componentTitle) attrs['data-analytics-component-title'] = componentTitle;

  return attrs;
}

/**
 * Apply extracted analytics attributes to a block DOM element.
 * Searches the source element and its immediate children for analytics data.
 */
export function applyAnalytics(sourceElement, blockElement, document) {
  if (!sourceElement || !blockElement) return;

  // Extract from the element itself
  const attrs = extractAnalytics(sourceElement);

  // Also check parent containers (AEM often puts data-layer on container)
  const container = sourceElement.closest('[data-cmp-data-layer]');
  if (container && container !== sourceElement) {
    const containerAttrs = extractAnalytics(container);
    // Container attrs are lower priority — don't overwrite
    Object.keys(containerAttrs).forEach((key) => {
      if (!attrs[key]) attrs[key] = containerAttrs[key];
    });
  }

  // Apply to block element
  Object.keys(attrs).forEach((key) => {
    blockElement.setAttribute(key, attrs[key]);
  });
}
