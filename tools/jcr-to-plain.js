#!/usr/bin/env node

/**
 * JCR XML to plain.html Converter
 *
 * Converts AEM Edge Delivery Services (Franklin) JCR XML content
 * into .plain.html format used by the EDS local preview server.
 *
 * Supports three input modes:
 *   1. AEM JCR zip package (.zip) - extracts and converts all .content.xml files
 *   2. Directory of .xml files - converts all .xml files recursively
 *   3. Single .xml or .content.xml file - converts one file
 *
 * Usage:
 *   node tools/jcr-to-plain.js <zip|dir|file> [--output <dir>] [--content-root <path>] [--dry-run] [--verbose]
 *
 * Examples:
 *   # Convert from AEM JCR zip package
 *   node tools/jcr-to-plain.js package.zip --output content
 *
 *   # Convert with explicit content root (auto-detected by default)
 *   node tools/jcr-to-plain.js package.zip --content-root jcr_root/content/myproject/mysite/us/en
 *
 *   # Convert all XML files in jcr-content/ to content/
 *   node tools/jcr-to-plain.js migration-work/jcr-content --output content
 *
 *   # Convert a single file
 *   node tools/jcr-to-plain.js migration-work/jcr-content/science.xml --output content
 *
 *   # Dry run (show what would be generated, no writes)
 *   node tools/jcr-to-plain.js package.zip --dry-run --verbose
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

// ─── XML Parsing (lightweight, no dependencies) ──────────────────────────────

/**
 * Minimal XML parser for JCR content XML.
 * Handles namespaced attributes, self-closing tags, and CDATA-free content.
 */
function parseXML(xmlStr) {
  let pos = 0;

  function skipWhitespace() {
    while (pos < xmlStr.length && /\s/.test(xmlStr[pos])) pos++;
  }

  function parseProcessingInstruction() {
    // Skip <?xml ... ?>
    const end = xmlStr.indexOf('?>', pos);
    if (end === -1) throw new Error('Unterminated processing instruction');
    pos = end + 2;
  }

  function parseAttributeValue() {
    const quote = xmlStr[pos];
    if (quote !== '"' && quote !== "'") throw new Error(`Expected quote at pos ${pos}`);
    pos++;
    let val = '';
    while (pos < xmlStr.length && xmlStr[pos] !== quote) {
      val += xmlStr[pos];
      pos++;
    }
    pos++; // skip closing quote
    return val;
  }

  function parseAttributes() {
    const attrs = {};
    skipWhitespace();
    while (pos < xmlStr.length && xmlStr[pos] !== '>' && xmlStr[pos] !== '/') {
      // Read attribute name
      let name = '';
      while (pos < xmlStr.length && !/[\s=>/]/.test(xmlStr[pos])) {
        name += xmlStr[pos];
        pos++;
      }
      if (!name) break;
      skipWhitespace();
      if (xmlStr[pos] === '=') {
        pos++;
        skipWhitespace();
        attrs[name] = parseAttributeValue();
      } else {
        attrs[name] = '';
      }
      skipWhitespace();
    }
    return attrs;
  }

  function parseElement() {
    skipWhitespace();
    if (pos >= xmlStr.length) return null;

    // Skip processing instructions
    if (xmlStr.startsWith('<?', pos)) {
      parseProcessingInstruction();
      skipWhitespace();
    }

    if (xmlStr[pos] !== '<') return null;
    pos++; // skip <

    // Read tag name
    let tagName = '';
    while (pos < xmlStr.length && !/[\s/>]/.test(xmlStr[pos])) {
      tagName += xmlStr[pos];
      pos++;
    }

    const attrs = parseAttributes();
    const children = [];

    if (xmlStr[pos] === '/') {
      // Self-closing tag
      pos++; // skip /
      if (xmlStr[pos] === '>') pos++; // skip >
      return { tagName, attrs, children };
    }

    pos++; // skip >

    // Parse children
    while (pos < xmlStr.length) {
      skipWhitespace();
      if (xmlStr.startsWith('</', pos)) {
        // Closing tag
        const closeEnd = xmlStr.indexOf('>', pos);
        pos = closeEnd + 1;
        break;
      }
      if (xmlStr[pos] === '<') {
        const child = parseElement();
        if (child) children.push(child);
      } else {
        // Text content (skip for JCR XML)
        while (pos < xmlStr.length && xmlStr[pos] !== '<') pos++;
      }
    }

    return { tagName, attrs, children };
  }

  return parseElement();
}

// ─── HTML Entity Decoding ────────────────────────────────────────────────────

/**
 * Decode HTML entities in JCR attribute values.
 * JCR stores HTML as double-encoded entities in XML attributes.
 */
function decodeEntities(str) {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x3D;/g, '=')
    .replace(/&#x26;/g, '&')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(parseInt(n, 16)));
}

/**
 * Full decode: handles double-encoded values (common in JCR XML).
 * e.g., &amp;#x26; -> &#x26; -> &
 */
function fullDecode(str) {
  if (!str) return '';
  // First pass: decode XML-level entities
  let decoded = decodeEntities(str);
  // Second pass: decode HTML-level entities that were nested
  decoded = decodeEntities(decoded);
  return decoded;
}

// ─── JCR Array Value Parsing ─────────────────────────────────────────────────

/**
 * Parse JCR array values like "[value1,value2]" into clean arrays.
 * Returns space-separated string for style values.
 */
function parseJcrArray(val) {
  if (!val) return '';
  const trimmed = val.trim();
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    return trimmed.slice(1, -1).split(',').map(s => s.trim()).filter(Boolean);
  }
  return [trimmed];
}

function parseJcrArrayToString(val) {
  const arr = parseJcrArray(val);
  return Array.isArray(arr) ? arr.join(', ') : arr;
}

// ─── JCR System Attribute Filters ───────────────────────────────────────────

/**
 * Attributes that are JCR/CQ system metadata and should never appear in content output.
 */
const JCR_SYSTEM_PREFIXES = [
  'jcr:', 'cq:', 'sling:', 'mix:', 'xmlns:'
];

const JCR_SYSTEM_ATTRS = new Set([
  'model', 'modelFields', 'name', 'classes', 'rows', 'columns',
  'filter', 'aueComponentId', 'initialContentRefTarget', 'unsetTitle',
  'hideFromNavigation', 'pageTitle',
  // Boolean flags
  'enableBreadcrumb', 'enableCurrentPage', 'enableHiddenItems', 'enableRedirectTitle',
  // MSM-specific
  'homePagePath', 'homeTitle',
  // Classes-prefixed styling
  'alignment', 'desktopWidth', 'margin', 'theme', 'language',
]);

function isSystemAttribute(key) {
  if (JCR_SYSTEM_ATTRS.has(key)) return true;
  for (const prefix of JCR_SYSTEM_PREFIXES) {
    if (key.startsWith(prefix)) return true;
  }
  // classes_* are styling metadata, not content
  if (key.startsWith('classes_')) return true;
  return false;
}

// ─── Ghost Component Detection ──────────────────────────────────────────────

/**
 * Check if a node is an MSM ghost (deleted/hidden component).
 */
function isGhostComponent(node) {
  return getResourceType(node) === 'wcm/msm/components/ghost';
}

// ─── JCR Node Type Helpers ──────────────────────────────────────────────────

function getResourceType(node) {
  return node.attrs['sling:resourceType'] || '';
}

function getNodeName(node) {
  return node.tagName;
}

function isComponentType(node, type) {
  return getResourceType(node).includes(`/components/${type}/`);
}

// ─── Component Renderers ────────────────────────────────────────────────────

/**
 * Render a text component to HTML.
 */
function renderText(node) {
  const text = fullDecode(node.attrs.text || '');
  return text;
}

/**
 * Render a title component to HTML.
 */
function renderTitle(node) {
  const title = fullDecode(node.attrs.title || '');
  const type = node.attrs.titleType || 'h2';
  if (!title) return '';
  return `<${type}>${title}</${type}>`;
}

/**
 * Render an image component to HTML.
 */
function renderImage(node) {
  const src = fullDecode(node.attrs.image || '');
  const alt = fullDecode(node.attrs.imageAlt || '');
  if (!src) return '';
  return `<p><img src="${src}" alt="${alt}"></p>`;
}

/**
 * Render a button/link component to HTML.
 */
function renderButton(node) {
  const link = fullDecode(node.attrs.link || '');
  const text = fullDecode(node.attrs.linkText || '');
  if (!link || !text) return '';
  return `<p><a href="${link}">${text}</a></p>`;
}

/**
 * Render a block component (hero, cards, accordion, embed, quote, etc.) to HTML.
 */
function renderBlock(node) {
  const model = node.attrs.model || '';
  const filter = node.attrs.filter || '';
  const blockName = node.attrs.name || model || 'block';
  const classesRaw = node.attrs.classes || '';

  // Parse classes array: "[col-widht-5]" -> "col-widht-5"
  const classesArr = parseJcrArray(classesRaw);
  const classes = classesArr.length > 0 ? classesArr.join(', ') : '';

  // Build CSS class: prefer filter (canonical block ID), then model, then name
  // filter="cards-leader" -> "cards-leader" (already kebab-case)
  // name="Cards Leader" -> "cards leader" (space-separated, less reliable)
  let cssClass = filter || model || blockName.toLowerCase();
  if (classes) {
    cssClass = `${cssClass} (${classes})`;
  }

  // Determine block type and render accordingly
  // Check model first, then detect by filter prefix or item model
  const blockType = model || deriveBlockType(node, filter);

  switch (blockType) {
    case 'hero':
      return renderHeroBlock(node, cssClass);
    case 'cards':
      return renderCardsBlock(node, cssClass);
    case 'accordion':
      return renderAccordionBlock(node, cssClass);
    case 'embed':
      return renderEmbedBlock(node, cssClass);
    case 'quote':
      return renderQuoteBlock(node, cssClass);
    case 'breadcrumb':
      return renderBreadcrumbBlock(node, cssClass);
    case 'text-container':
      return renderTextContainerBlock(node, cssClass);
    default:
      return renderGenericBlock(node, cssClass);
  }
}

/**
 * Derive block type from filter attribute or child item models.
 * Used when the block node has no `model` attribute.
 */
function deriveBlockType(node, filter) {
  // Check filter prefix: "cards-leader" -> "cards", "hero-profile" -> "hero"
  if (filter) {
    const base = filter.split('-')[0];
    if (['cards', 'hero', 'accordion', 'embed', 'quote', 'breadcrumb'].includes(base)) {
      return base;
    }
  }

  // Check child item models: if items have model="card", treat as cards block
  const items = node.children.filter(c => getResourceType(c).includes('/block/v1/block/item'));
  if (items.length > 0) {
    const firstItemModel = items[0].attrs.model || '';
    if (firstItemModel === 'card') return 'cards';
    if (firstItemModel === 'accordion-item') return 'accordion';
  }

  return '';
}

function renderHeroBlock(node, cssClass) {
  const image = fullDecode(node.attrs.image || '');
  const imageAlt = fullDecode(node.attrs.imageAlt || '');
  const text = fullDecode(node.attrs.text || '');

  let html = `<div class="${cssClass}">`;
  // Row 1: image cell + text cell
  html += '<div>';
  html += '<div><!-- field:image -->';
  if (image) {
    html += `<p><img src="${image}" alt="${imageAlt}"></p>`;
  }
  html += '</div>';
  html += '</div>';
  html += '<div>';
  html += `<div><!-- field:text -->${text}</div>`;
  html += '</div>';
  html += '</div>';
  return html;
}

function renderCardsBlock(node, cssClass) {
  const items = node.children.filter(c => getResourceType(c).includes('/block/v1/block/item'));
  let html = `<div class="${cssClass}">`;
  for (const item of items) {
    const image = fullDecode(item.attrs.image || '');
    const imageAlt = fullDecode(item.attrs.imageAlt || '');
    const text = fullDecode(item.attrs.text || '');
    html += '<div>';
    html += '<div><!-- field:image -->';
    if (image) {
      html += `<p><img src="${image}" alt="${imageAlt}"></p>`;
    }
    html += '</div>';
    html += `<div><!-- field:text -->${text}</div>`;
    html += '</div>';
  }
  html += '</div>';
  return html;
}

function renderAccordionBlock(node, cssClass) {
  const items = node.children.filter(c => getResourceType(c).includes('/block/v1/block/item'));
  let html = `<div class="${cssClass}">`;
  for (const item of items) {
    const summary = fullDecode(item.attrs.summary || '');
    const text = fullDecode(item.attrs.text || '');
    html += '<div>';
    html += `<div><!-- field:summary --><p>${summary}</p></div>`;
    html += `<div><!-- field:text -->${text}</div>`;
    html += '</div>';
  }
  html += '</div>';
  return html;
}

function renderEmbedBlock(node, cssClass) {
  const placeholder = fullDecode(node.attrs.embed_placeholder || '');
  const placeholderAlt = fullDecode(node.attrs.embed_placeholderAlt || '');
  const uri = fullDecode(node.attrs.embed_uri || '');
  const title = fullDecode(node.attrs.embed_title || '');
  const description = fullDecode(node.attrs.embed_description || '');
  const buttonLabel = fullDecode(node.attrs.embed_buttonLabel || '');

  let html = `<div class="${cssClass}"><div><div>`;
  html += '<!-- field:embed_placeholder -->';
  if (placeholder) {
    html += `<p><img src="${placeholder}" alt="${placeholderAlt}"></p>`;
  }
  if (title) html += `<!-- field:embed_title --><h2>${title}</h2>`;
  if (description) html += `<!-- field:embed_description --><p>${description}</p>`;
  if (buttonLabel) html += `<!-- field:embed_buttonLabel -->`;
  html += '<!-- field:embed_uri -->';
  if (uri) html += `<p><a href="${uri}">${uri}</a></p>`;
  html += '</div></div></div>';
  return html;
}

function renderQuoteBlock(node, cssClass) {
  const quotation = fullDecode(node.attrs.quotation || '');
  const name = fullDecode(node.attrs.attributionName || '');
  const title = fullDecode(node.attrs.attributionTitle || '');
  const image = fullDecode(node.attrs.attributionImage || '');
  const imageAlt = fullDecode(node.attrs.attributionImageAlt || '');
  const quoteType = node.attrs.quoteType || '';

  // Add quoteType as variant if present
  const finalClass = quoteType && quoteType !== 'basic' ? `${cssClass} (${quoteType})` : cssClass;

  let html = `<div class="${finalClass}"><div>`;
  html += '<div><!-- field:quotation -->';
  if (quotation) html += `<blockquote>${quotation}</blockquote>`;
  html += '</div>';
  html += '<div><!-- field:attributionName -->';
  if (name) html += `<p>${name}</p>`;
  if (title) html += `<p>${title}</p>`;
  if (image) html += `<p><img src="${image}" alt="${imageAlt}"></p>`;
  html += '</div>';
  html += '</div></div>';
  return html;
}

function renderBreadcrumbBlock(node, cssClass) {
  // Breadcrumb is a config-only block with no visible content cells
  // Render as an empty block marker (the JS decorator handles rendering)
  return `<div class="${cssClass}"></div>`;
}

function renderTextContainerBlock(node, cssClass) {
  // Text container wraps text items - render child text items as default content
  let html = '';
  for (const child of node.children) {
    const resType = getResourceType(child);
    if (resType.includes('/block/v1/block/item')) {
      const text = fullDecode(child.attrs.text || '');
      if (text) html += text;
    }
  }
  // Text container content is rendered as default content, not as a block table
  return html;
}

function renderGenericBlock(node, cssClass) {
  // For unknown block types, render content attributes only (skip system attrs)
  let html = `<div class="${cssClass}">`;

  const contentAttrs = Object.entries(node.attrs)
    .filter(([k]) => !isSystemAttribute(k));

  if (contentAttrs.length > 0) {
    html += '<div>';
    for (const [key, val] of contentAttrs) {
      html += `<div><!-- field:${key} -->${fullDecode(val)}</div>`;
    }
    html += '</div>';
  }

  // Render child items
  for (const child of node.children) {
    if (getResourceType(child).includes('/block/v1/block/item')) {
      html += '<div>';
      const childAttrs = Object.entries(child.attrs)
        .filter(([k]) => !isSystemAttribute(k));
      for (const [key, val] of childAttrs) {
        html += `<div><!-- field:${key} -->${fullDecode(val)}</div>`;
      }
      html += '</div>';
    }
  }

  html += '</div>';
  return html;
}

/**
 * Render a columns component to HTML.
 */
function renderColumns(node) {
  let html = '<div class="columns">';

  // Columns have row children (row1, row2, ...) each with col children
  const rows = node.children
    .filter(c => c.tagName.startsWith('row'))
    .sort((a, b) => {
      const aNum = parseInt(a.tagName.replace('row', ''), 10);
      const bNum = parseInt(b.tagName.replace('row', ''), 10);
      return aNum - bNum;
    });

  for (const row of rows) {
    html += '<div>';
    const cols = row.children
      .filter(c => c.tagName.startsWith('col'))
      .sort((a, b) => {
        const aNum = parseInt(a.tagName.replace('col', ''), 10);
        const bNum = parseInt(b.tagName.replace('col', ''), 10);
        return aNum - bNum;
      });

    for (const col of cols) {
      html += '<div>';
      html += renderChildren(col);
      html += '</div>';
    }
    html += '</div>';
  }

  html += '</div>';
  return html;
}

/**
 * Render all child components of a node.
 */
function renderChildren(node) {
  let html = '';
  for (const child of node.children) {
    html += renderNode(child);
  }
  return html;
}

/**
 * Render any JCR node based on its sling:resourceType.
 */
function renderNode(node) {
  // Skip ghost components (MSM deleted/hidden)
  if (isGhostComponent(node)) {
    return '';
  }

  if (isComponentType(node, 'text')) {
    return renderText(node);
  }
  if (isComponentType(node, 'title')) {
    return renderTitle(node);
  }
  if (isComponentType(node, 'image')) {
    return renderImage(node);
  }
  if (isComponentType(node, 'button')) {
    return renderButton(node);
  }
  if (isComponentType(node, 'block')) {
    return renderBlock(node);
  }
  if (isComponentType(node, 'columns')) {
    return renderColumns(node);
  }

  // For unknown types, try to render children
  if (node.children && node.children.length > 0) {
    return renderChildren(node);
  }

  return '';
}

// ─── Section & Page Rendering ────────────────────────────────────────────────

/**
 * Render a section element with all its components.
 */
function renderSection(node) {
  const styleRaw = node.attrs.style || '';
  const classesContainer = node.attrs.classes_container || '';
  const backgroundColor = node.attrs.backgroundColor || '';
  const bgColor = node.attrs['classes_bg-color'] || '';
  const background = node.attrs.background || '';
  const backgroundAlt = node.attrs.backgroundAlt || '';

  let html = '';

  // Render all child components
  for (const child of node.children) {
    html += renderNode(child);
  }

  // Collect section metadata rows
  const metaRows = [];

  // Parse style array: "[navy-overlap,large-radius]" -> "navy-overlap, large-radius"
  if (styleRaw) {
    const styles = parseJcrArray(styleRaw);
    metaRows.push({ key: 'style', value: styles.join(', ') });
  }

  // classes_container adds additional style context (highlight, none, etc.)
  if (classesContainer && classesContainer !== 'none') {
    // If we already have style, check if container class should be appended
    const existing = metaRows.find(r => r.key === 'style');
    if (existing) {
      existing.value += `, ${classesContainer}`;
    } else {
      metaRows.push({ key: 'style', value: classesContainer });
    }
  }

  // Background color
  if (bgColor) {
    metaRows.push({ key: 'background-color', value: bgColor });
  } else if (backgroundColor) {
    metaRows.push({ key: 'background-color', value: backgroundColor });
  }

  // Background image
  if (background) {
    metaRows.push({ key: 'background', value: fullDecode(background) });
  }

  if (metaRows.length > 0) {
    html += '<div class="section-metadata">';
    for (const row of metaRows) {
      html += `<div><div>${row.key}</div><div>${row.value}</div></div>`;
    }
    html += '</div>';
  }

  return html;
}

/**
 * Render page metadata as a metadata block.
 */
function renderMetadata(jcrContent) {
  const title = fullDecode(jcrContent.attrs['jcr:title'] || '');
  const description = fullDecode(jcrContent.attrs['jcr:description'] || '');

  if (!title && !description) return '';

  let html = '<div class="metadata">';
  if (title) {
    html += `<div><div>Title</div><div>${title}</div></div>`;
  }
  if (description) {
    html += `<div><div>Description</div><div>${description}</div></div>`;
  }
  html += '</div>';
  return html;
}

/**
 * Convert a complete JCR XML tree into plain.html format.
 */
function convertJcrToPlainHtml(xmlTree) {
  // Navigate: jcr:root > jcr:content > root > section*
  const jcrContent = xmlTree.children.find(c => c.tagName === 'jcr:content');
  if (!jcrContent) {
    throw new Error('No jcr:content node found');
  }

  const root = jcrContent.children.find(c => c.tagName === 'root');
  if (!root) {
    throw new Error('No root node found under jcr:content');
  }

  const sections = root.children
    .filter(c => c.tagName.startsWith('section'))
    .sort((a, b) => {
      // section, section_1, section_2, ...
      const aIdx = a.tagName === 'section' ? 0 : parseInt(a.tagName.split('_')[1] || '0', 10);
      const bIdx = b.tagName === 'section' ? 0 : parseInt(b.tagName.split('_')[1] || '0', 10);
      return aIdx - bIdx;
    });

  const sectionHtmls = [];

  for (const section of sections) {
    const sectionHtml = renderSection(section);
    if (sectionHtml.trim()) {
      sectionHtmls.push(sectionHtml);
    }
  }

  // Build page: sections separated as <div> wrappers + metadata at end
  let pageHtml = '';
  if (sectionHtmls.length > 0) {
    pageHtml += '<div>' + sectionHtmls.join('</div>\n<div>') + '</div>';
  }

  // Metadata
  const metadataHtml = renderMetadata(jcrContent);
  if (metadataHtml) {
    pageHtml += '\n<div>' + metadataHtml + '</div>';
  }

  return pageHtml;
}

// ─── File Processing ─────────────────────────────────────────────────────────

/**
 * Process a single XML file and return the plain HTML.
 */
function processFile(xmlFilePath) {
  const xmlStr = fs.readFileSync(xmlFilePath, 'utf-8');
  const tree = parseXML(xmlStr);
  if (!tree) {
    throw new Error(`Failed to parse XML: ${xmlFilePath}`);
  }
  return convertJcrToPlainHtml(tree);
}

/**
 * Determine the output path for a given XML file.
 * migration-work/jcr-content/science/foo.xml -> content/science/foo.plain.html
 */
function getOutputPath(xmlFilePath, inputDir, outputDir) {
  const relPath = path.relative(inputDir, xmlFilePath);
  const parsed = path.parse(relPath);
  const plainPath = path.join(outputDir, parsed.dir, `${parsed.name}.plain.html`);
  return plainPath;
}

/**
 * Recursively find all .xml files in a directory.
 */
function findXmlFiles(dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findXmlFiles(fullPath));
    } else if (entry.name.endsWith('.xml')) {
      files.push(fullPath);
    }
  }
  return files;
}

// ─── AEM JCR Zip Package Support ─────────────────────────────────────────────

/**
 * Recursively find all .content.xml files in a directory.
 */
function findContentXmlFiles(dir) {
  const files = [];
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return files;
  }
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findContentXmlFiles(fullPath));
    } else if (entry.name === '.content.xml') {
      files.push(fullPath);
    }
  }
  return files;
}

/**
 * Auto-detect the content root prefix in an AEM JCR package.
 * Looks for patterns like:
 *   jcr_root/content/<project>/<site>/<country>/<lang>/
 *   jcr_root-1/content/<project>/<site>/language-masters/<lang>/
 *
 * Returns the absolute path to the content root (the language folder).
 */
function autoDetectContentRoot(xmlPaths) {
  for (const p of xmlPaths) {
    // Normalize to forward slashes for matching
    const normalized = p.replace(/\\/g, '/');

    // Pattern 1: /<country>/<lang>/ (e.g., /us/en/)
    const match = normalized.match(/(.*?\/content\/[^/]+\/[^/]+\/\w{2}\/\w{2})\//);
    if (match) return match[1].replace(/\//g, path.sep);

    // Pattern 2: /language-masters/<lang>/ (e.g., /language-masters/en/)
    const match2 = normalized.match(/(.*?\/content\/[^/]+\/language-masters\/\w{2})\//);
    if (match2) return match2[1].replace(/\//g, path.sep);
  }
  return null;
}

/**
 * Get the output path for a .content.xml file from an AEM package.
 * The parent folder name becomes the page name.
 *
 * Example:
 *   contentRoot: /tmp/jcr_root/content/myproject/mysite/us/en
 *   xmlPath:     /tmp/jcr_root/content/myproject/mysite/us/en/science/our-people/.content.xml
 *   outputDir:   content
 *   result:      content/science/our-people.plain.html
 */
function getContentXmlOutputPath(xmlPath, contentRoot, outputDir) {
  const relPath = path.relative(contentRoot, xmlPath);
  const pagePath = path.dirname(relPath); // removes /.content.xml

  // Skip root-level .content.xml (the language root itself)
  if (pagePath === '.') return null;

  return path.join(outputDir, pagePath + '.plain.html');
}

/**
 * Process an AEM JCR zip package.
 * Extracts the zip, finds .content.xml files, converts to plain.html.
 */
function processZipPackage(zipPath, outputDir, options) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jcr-convert-'));

  try {
    // Extract zip
    console.log(`[JCR→HTML] Extracting zip: ${path.basename(zipPath)}`);
    try {
      execSync(`unzip -q -o "${zipPath}" -d "${tmpDir}"`, { stdio: 'pipe' });
    } catch (err) {
      console.error(`[JCR→HTML] Failed to extract zip: ${err.message}`);
      console.error('[JCR→HTML] Make sure "unzip" is installed on your system.');
      process.exit(1);
    }

    // Find all .content.xml files
    const contentXmls = findContentXmlFiles(tmpDir);
    console.log(`[JCR→HTML] Found ${contentXmls.length} .content.xml file(s)`);

    if (contentXmls.length === 0) {
      console.error('[JCR→HTML] No .content.xml files found in the zip package.');
      process.exit(1);
    }

    // Determine content root
    let contentRoot;
    if (options.contentRoot) {
      // User-specified content root (resolve relative to extracted dir)
      contentRoot = path.resolve(tmpDir, options.contentRoot);
      if (!fs.existsSync(contentRoot)) {
        console.error(`[JCR→HTML] Content root not found: ${options.contentRoot}`);
        console.error('[JCR→HTML] Available top-level dirs:');
        fs.readdirSync(tmpDir).forEach(d => console.error(`  - ${d}`));
        process.exit(1);
      }
    } else {
      // Auto-detect content root
      contentRoot = autoDetectContentRoot(contentXmls);
      if (!contentRoot) {
        console.error('[JCR→HTML] Could not auto-detect content root.');
        console.error('[JCR→HTML] Use --content-root to specify the path to the language folder.');
        console.error('[JCR→HTML] Example: --content-root jcr_root/content/myproject/mysite/us/en');
        console.error('[JCR→HTML] Sample paths found:');
        contentXmls.slice(0, 5).forEach(p =>
          console.error(`  - ${path.relative(tmpDir, p)}`)
        );
        process.exit(1);
      }
    }

    console.log(`[JCR→HTML] Content root: ${path.relative(tmpDir, contentRoot)}`);
    if (options.dryRun) console.log('[JCR→HTML] DRY RUN - no files will be written');

    let success = 0;
    let failed = 0;
    let skipped = 0;

    for (const xmlPath of contentXmls) {
      const outPath = getContentXmlOutputPath(xmlPath, contentRoot, outputDir);
      const relDisplay = path.relative(contentRoot, xmlPath);

      if (!outPath) {
        if (options.verbose) console.log(`  [skip] ${relDisplay} (root-level)`);
        skipped++;
        continue;
      }

      try {
        const html = processFile(xmlPath);

        if (options.dryRun) {
          console.log(`  [dry-run] ${relDisplay} → ${outPath}`);
          if (options.verbose) {
            console.log(`    Content length: ${html.length} chars`);
          }
        } else {
          const outDir = path.dirname(outPath);
          fs.mkdirSync(outDir, { recursive: true });
          fs.writeFileSync(outPath, html, 'utf-8');
          if (options.verbose) {
            console.log(`  ✅ ${relDisplay} → ${outPath}`);
          }
        }
        success++;
      } catch (err) {
        if (options.verbose) {
          console.log(`  ⚠️  ${relDisplay}: ${err.message}`);
        }
        failed++;
      }
    }

    console.log(`[JCR→HTML] Done. Success: ${success}, Failed: ${failed}, Skipped: ${skipped}`);
    return failed > 0 ? 1 : 0;
  } finally {
    // Cleanup temp directory
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  }
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

function printUsage() {
  console.log(`
Usage: node tools/jcr-to-plain.js <zip|dir|file> [options]

Options:
  --output <dir>         Output directory (default: content)
  --content-root <path>  Content root path inside zip (auto-detected by default)
                         Example: jcr_root/content/myproject/mysite/us/en
  --dry-run              Show what would be generated without writing files
  --verbose              Show detailed processing info

Input modes:
  .zip file    AEM JCR package - extracts and converts .content.xml files
  directory    Converts all .xml files recursively
  .xml file    Converts a single XML file

Examples:
  # Convert from AEM JCR zip package (auto-detects content root)
  node tools/jcr-to-plain.js package.zip --output content

  # Convert with explicit content root
  node tools/jcr-to-plain.js package.zip --content-root jcr_root/content/myproject/mysite/us/en

  # Convert directory of .xml files
  node tools/jcr-to-plain.js migration-work/jcr-content --output content

  # Convert single file
  node tools/jcr-to-plain.js migration-work/jcr-content/science.xml --output content

  # Dry run with verbose output
  node tools/jcr-to-plain.js package.zip --dry-run --verbose
`);
}

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printUsage();
    process.exit(0);
  }

  const input = args[0];
  const outputIdx = args.indexOf('--output');
  const outputDir = outputIdx !== -1 ? args[outputIdx + 1] : 'content';
  const contentRootIdx = args.indexOf('--content-root');
  const contentRoot = contentRootIdx !== -1 ? args[contentRootIdx + 1] : null;
  const dryRun = args.includes('--dry-run');
  const verbose = args.includes('--verbose');

  const inputPath = path.resolve(input);

  // Mode 1: Zip package input
  if (inputPath.endsWith('.zip')) {
    if (!fs.existsSync(inputPath)) {
      console.error(`[JCR→HTML] Zip file not found: ${input}`);
      process.exit(1);
    }
    const exitCode = processZipPackage(inputPath, outputDir, { contentRoot, dryRun, verbose });
    process.exit(exitCode);
    return;
  }

  // Mode 2/3: Directory or single file input
  const stat = fs.statSync(inputPath);

  let xmlFiles;
  let baseInputDir;

  if (stat.isFile()) {
    xmlFiles = [inputPath];
    baseInputDir = path.dirname(inputPath);
  } else if (stat.isDirectory()) {
    xmlFiles = findXmlFiles(inputPath);
    baseInputDir = inputPath;
  } else {
    console.error(`Invalid input: ${input}`);
    process.exit(1);
  }

  console.log(`[JCR→HTML] Found ${xmlFiles.length} XML file(s)`);
  if (dryRun) console.log('[JCR→HTML] DRY RUN - no files will be written');

  let success = 0;
  let failed = 0;

  for (const xmlFile of xmlFiles) {
    const outPath = getOutputPath(xmlFile, baseInputDir, outputDir);
    try {
      const html = processFile(xmlFile);

      if (dryRun) {
        console.log(`  [dry-run] ${path.relative('.', xmlFile)} → ${outPath}`);
        if (verbose) {
          console.log(`    Content length: ${html.length} chars`);
        }
      } else {
        const outDir = path.dirname(outPath);
        fs.mkdirSync(outDir, { recursive: true });
        fs.writeFileSync(outPath, html, 'utf-8');
        if (verbose) {
          console.log(`  ✅ ${path.relative('.', xmlFile)} → ${outPath}`);
        }
      }
      success++;
    } catch (err) {
      console.error(`  ❌ ${path.relative('.', xmlFile)}: ${err.message}`);
      failed++;
    }
  }

  console.log(`[JCR→HTML] Done. Success: ${success}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

// Export for programmatic use
module.exports = { processFile, convertJcrToPlainHtml, parseXML, fullDecode };

// Run CLI if invoked directly
if (require.main === module) {
  main();
}
