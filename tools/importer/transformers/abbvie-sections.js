/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: AbbVie section breaks and section-metadata.
 *
 * Post-parsing, flatten-first approach:
 * - Does NOTHING in beforeTransform (no wrappers/markers needed)
 * - afterTransform (runs AFTER cleanup and ALL parsers):
 *   1. Flatten DOM to remove all intermediate nesting
 *   2. Find block tables by class name in DOM order
 *   3. Map blocks to sections using template definition
 *   4. Insert HR + Section Metadata between section groups
 */
export default function transform(hookName, element, payload) {
  if (hookName !== 'afterTransform') return;

  const { template } = payload || {};
  const sections = template && template.sections;
  if (!sections || sections.length < 2) return;

  const document = element.ownerDocument;

  // Step 1: Flatten DOM — remove all structural wrappers
  flattenDOM(element);

  console.log(`[sections] afterTransform: flattened to ${element.children.length} direct children`);

  // Step 2: Find block tables and map to sections
  const boundaries = findSectionBoundaries(element, sections);
  console.log(`[sections] found ${boundaries.length} section boundaries`);

  // Step 3: Insert HR and SM between sections
  insertSectionBreaks(element, document, boundaries);
}

/**
 * Extract the block name from a table created by WebImporter.Blocks.createBlock.
 * The block name is stored in the first row's first cell.
 * Returns lowercase name, or null if not a block table.
 */
function getBlockNameFromTable(table) {
  if (!table.rows || !table.rows[0]) return null;
  const firstRow = table.rows[0];
  const firstCell = firstRow.cells && firstRow.cells[0];
  if (!firstCell) return null;
  // The header cell contains only the block name (no other content)
  // Get just the direct text, ignoring nested content
  const name = firstCell.textContent.trim().split('\n')[0].trim();
  return name ? name.toLowerCase() : null;
}

/**
 * Flatten DOM by recursively unwrapping structural wrapper elements
 * (div, section, article, etc.) so all content elements become
 * direct children of root.
 */
function flattenDOM(root) {
  let iterations = 0;
  const MAX_ITER = 500;

  while (iterations++ < MAX_ITER) {
    let unwrapped = false;
    const children = Array.from(root.children);

    for (const child of children) {
      if (shouldUnwrap(child)) {
        while (child.firstChild) {
          root.insertBefore(child.firstChild, child);
        }
        child.remove();
        unwrapped = true;
        break; // Restart scan after DOM modification
      }
    }

    if (!unwrapped) break;
  }

  // Remove empty text nodes and whitespace-only elements
  for (const child of Array.from(root.childNodes)) {
    if (child.nodeType === 3 && !child.textContent.trim()) {
      child.remove();
    }
  }
}

/**
 * Determine if an element is a structural wrapper that should be unwrapped.
 * Content elements and block tables are preserved.
 */
function shouldUnwrap(el) {
  const tag = el.tagName.toLowerCase();

  // Never unwrap these
  if (tag === 'table') return false;
  if (tag === 'hr') return false;

  // Keep content elements at their current level
  if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'ul', 'ol', 'li',
    'blockquote', 'pre', 'img', 'picture', 'video', 'audio',
    'figure', 'figcaption', 'a', 'strong', 'em', 'br'].includes(tag)) {
    return false;
  }

  // Unwrap structural wrappers (div, section, article, nav, header, footer, span, etc.)
  return true;
}

/**
 * Find section boundaries by matching block tables to template sections.
 *
 * Two-pass DOM-order-aware approach:
 * Pass 1: Forward scan — only claim a block table if there are no intervening
 *   unclaimed tables of types needed by future sections between scan position
 *   and the candidate. This prevents jumping over other sections' anchors.
 * Pass 2: Position unanchored styled sections in the gap between neighbors.
 *
 * Returns array of { sectionIdx, sectionName, anchorElement, sectionStart, style }
 */
function findSectionBoundaries(root, sections) {
  const children = Array.from(root.children);

  // Build ordered list of block tables (excluding section metadata and metadata)
  const blockTables = [];
  children.forEach((child, idx) => {
    if (child.tagName === 'TABLE') {
      const blockName = getBlockNameFromTable(child);
      if (blockName && blockName !== 'section metadata' && blockName !== 'metadata') {
        blockTables.push({ element: child, name: blockName, pos: idx, claimed: false });
      }
    }
  });

  // Build queues per block type for logging and lookup
  const blockTableQueues = {};
  blockTables.forEach((bt) => {
    if (!blockTableQueues[bt.name]) blockTableQueues[bt.name] = [];
    blockTableQueues[bt.name].push(bt);
  });

  Object.keys(blockTableQueues).forEach((name) => {
    console.log(`[sections]   block tables: "${name}" x${blockTableQueues[name].length}`);
  });

  // --- Pass 1: Forward matching with intervening-table check ---
  const consumedIdx = {};
  const boundaries = [];
  let lastClaimedPos = -1;

  sections.forEach((section, sIdx) => {
    const hasBlocks = section.blocks && section.blocks.length > 0;
    const hasDefaultContent = section.defaultContent && section.defaultContent.length > 0;

    // Text-only section (defaultContent but no blocks) → create unanchored boundary
    if (!hasBlocks) {
      if (hasDefaultContent || section.style) {
        boundaries.push({
          sectionIdx: sIdx, sectionName: section.name,
          anchorElement: null, sectionStart: null,
          style: section.style, unanchored: true,
        });
        console.log(`[sections]   section ${sIdx} (${section.name}): text-only, unanchored`);
      } else {
        console.log(`[sections]   section ${sIdx} (${section.name}): no blocks/content, skipping`);
      }
      return;
    }

    const primaryBlock = section.blocks[0];
    if (!consumedIdx[primaryBlock]) consumedIdx[primaryBlock] = 0;

    const queue = blockTableQueues[primaryBlock] || [];
    const instIdx = consumedIdx[primaryBlock];

    if (instIdx >= queue.length) {
      // No more instances of this block type available
      if (section.style || hasDefaultContent) {
        boundaries.push({
          sectionIdx: sIdx, sectionName: section.name,
          anchorElement: null, sectionStart: null,
          style: section.style, unanchored: true,
        });
        console.log(`[sections]   section ${sIdx} (${section.name}): no ${primaryBlock} table, unanchored`);
      } else {
        console.log(`[sections]   section ${sIdx} (${section.name}): no ${primaryBlock} table, skipped`);
      }
      return;
    }

    const candidate = queue[instIdx];

    // Collect block types needed by remaining (future) sections
    const remainingBlockTypes = new Set();
    for (let j = sIdx + 1; j < sections.length; j++) {
      if (sections[j].blocks && sections[j].blocks.length > 0) {
        remainingBlockTypes.add(sections[j].blocks[0]);
      }
    }

    // Check if there are unclaimed tables of future-needed types between
    // lastClaimedPos and the candidate — if so, we'd be jumping over them
    const hasIntervening = blockTables.some((bt) =>
      !bt.claimed
      && bt.pos > lastClaimedPos
      && bt.pos < candidate.pos
      && remainingBlockTypes.has(bt.name));

    if (hasIntervening) {
      if (section.style || hasDefaultContent) {
        boundaries.push({
          sectionIdx: sIdx, sectionName: section.name,
          anchorElement: null, sectionStart: null,
          style: section.style, unanchored: true,
        });
        console.log(`[sections]   section ${sIdx} (${section.name}): skipped ${primaryBlock}[${instIdx}] (intervening), unanchored`);
      } else {
        console.log(`[sections]   section ${sIdx} (${section.name}): skipped ${primaryBlock}[${instIdx}] (intervening)`);
      }
      return;
    }

    // Claim the candidate
    candidate.claimed = true;
    consumedIdx[primaryBlock] = instIdx + 1;

    let sectionStart = candidate.element;

    // Walk backward ONLY if the section declares default content.
    // Sections with empty defaultContent start exactly at the block table,
    // preventing them from absorbing preceding text that belongs to earlier sections.
    if (hasDefaultContent) {
      let prev = sectionStart.previousElementSibling;
      while (prev) {
        const tag = prev.tagName.toLowerCase();
        if (tag === 'table' || tag === 'hr') break;
        if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'ul', 'ol', 'a',
          'img', 'picture', 'blockquote', 'figure'].includes(tag)) {
          sectionStart = prev;
        } else {
          break;
        }
        prev = prev.previousElementSibling;
      }
    }

    boundaries.push({
      sectionIdx: sIdx, sectionName: section.name,
      anchorElement: candidate.element, sectionStart,
      style: section.style, unanchored: false,
    });
    lastClaimedPos = candidate.pos;
    console.log(`[sections]   section ${sIdx} (${section.name}): anchored to ${primaryBlock}[${instIdx}] at pos ${candidate.pos}`);
  });

  // --- Pass 2: Position unanchored styled sections ---
  for (let i = 0; i < boundaries.length; i++) {
    const boundary = boundaries[i];
    if (!boundary.unanchored) continue;

    // Find previous anchored boundary's anchor position
    let prevAnchorPos = -1;
    for (let j = i - 1; j >= 0; j--) {
      if (boundaries[j].anchorElement) {
        prevAnchorPos = children.indexOf(boundaries[j].anchorElement);
        break;
      }
    }

    // Scan forward from after previous anchor, skip tables, find first content element
    let startElement = null;
    for (let k = prevAnchorPos + 1; k < children.length; k++) {
      const child = children[k];
      if (child.tagName === 'TABLE') continue;
      const tag = child.tagName.toLowerCase();
      if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'ul', 'ol', 'a',
        'img', 'picture', 'blockquote', 'figure'].includes(tag)) {
        startElement = child;
        break;
      }
    }

    if (startElement) {
      boundary.sectionStart = startElement;
      console.log(`[sections]   section ${boundary.sectionIdx} (${boundary.sectionName}): unanchored, start at <${startElement.tagName.toLowerCase()}>`);
    } else {
      console.warn(`[sections]   section ${boundary.sectionIdx} (${boundary.sectionName}): unanchored, no content — removed`);
      boundaries.splice(i, 1);
      i--;
    }
  }

  // Sort boundaries by DOM position of sectionStart
  boundaries.sort((a, b) => {
    const posA = children.indexOf(a.sectionStart);
    const posB = children.indexOf(b.sectionStart);
    return posA - posB;
  });

  console.log(`[sections] found ${boundaries.length} section boundaries`);
  return boundaries;
}

/**
 * Insert HR elements and Section Metadata blocks between section groups.
 * Process from last boundary to first to maintain DOM position accuracy.
 */
function insertSectionBreaks(root, document, boundaries) {
  if (boundaries.length === 0) return;

  // Process from last to first (skip index 0 — no HR before first section)
  for (let i = boundaries.length - 1; i >= 1; i--) {
    const boundary = boundaries[i];
    const prevBoundary = boundaries[i - 1];

    // Insert SM for PREVIOUS section's style (end of previous section, before HR)
    if (prevBoundary.style) {
      const sm = WebImporter.Blocks.createBlock(document, {
        name: 'Section Metadata',
        cells: { style: prevBoundary.style },
      });
      root.insertBefore(sm, boundary.sectionStart);
    }

    // Insert HR (section break)
    const hr = document.createElement('hr');
    root.insertBefore(hr, boundary.sectionStart);

    console.log(`[sections]   HR before section ${boundary.sectionIdx} (${boundary.sectionName})`);
  }

  // Handle last section's style (append SM at the very end)
  const lastBoundary = boundaries[boundaries.length - 1];
  if (lastBoundary.style) {
    const sm = WebImporter.Blocks.createBlock(document, {
      name: 'Section Metadata',
      cells: { style: lastBoundary.style },
    });
    root.appendChild(sm);
    console.log(`[sections]   SM(${lastBoundary.style}) appended for last section ${lastBoundary.sectionIdx}`);
  }
}
