---
name: create-block
description: Guide for creating new EDS blocks or enhancing existing blocks with proper documentation. MANDATORY protocol enforcement for all new components.
---

# Create Block

This skill guides you through creating new EDS blocks or enhancing existing blocks following AbbVie's architecture and mandatory documentation protocol.

## When to Use This Skill

Use this skill when:
- Creating a completely new block
- Adding significant enhancements to existing blocks
- Need to implement functionality not covered by existing blocks

**CRITICAL**: Only create new blocks after confirming no existing block can be reused or enhanced.

## Prerequisites

Before creating a new block:
- [x] Verified no existing block can be reused (checked all 24 blocks)
- [x] Verified CSS enhancements cannot solve the need
- [x] Verified block combinations cannot solve the need
- [x] Have clear requirements and acceptance criteria
- [x] Dev server running (`npm start`)

## Related Documentation

- **rules/02-block-reuse-strategy.md** - MUST read before creating new blocks
- **rules/04-css-js-best-practices.md** - CSS/JS implementation patterns
- **rules/05-cms-component-architecture.md** - Component architecture principles
- **rules/06-component-documentation-protocol.md** - 🔴 MANDATORY protocol

## Block Creation Workflow

Track your progress:
- [ ] Step 1: Verify Block is Needed
- [ ] Step 2: Design Block Structure
- [ ] Step 3: Create Block Files
- [ ] Step 4: Implement JavaScript
- [ ] Step 5: Implement CSS
- [ ] Step 6: Create Block Documentation
- [ ] Step 7: 🔴 MANDATORY: Update Rules Documentation
- [ ] Step 8: Test and Verify

---

## Step 1: Verify Block is Needed

### 1.1 Check Existing Blocks

```bash
# List all available blocks
ls -la blocks/

# Review similar blocks
cat blocks/cards/cards.js
cat blocks/columns/columns.js
```

**Available blocks (24):**
accordion, cards, carousel, columns, embed, embed-form, eds-form, footer, form, fragment, header, hero, modal, navigation-content, press-releases, quote, search, separator, social-media, stock-ticker, story-card, table, tabs, video

### 1.2 Block Reuse Decision Tree

From `rules/02-block-reuse-strategy.md`:

```
Can existing block do EXACTLY what you need?
├─ YES → Use it, STOP HERE
└─ NO → Can CSS classes/variants solve it?
    ├─ YES → Enhance with CSS, STOP HERE
    └─ NO → Can you combine existing blocks?
        ├─ YES → Use combination, STOP HERE
        └─ NO → New block may be justified, CONTINUE
```

### 1.3 Document Justification

Before proceeding, document:

```
Why new block is needed:
- Functionality not possible with existing blocks: [explain]
- CSS enhancements insufficient because: [explain]
- Block combinations don't work because: [explain]
- Specific requirements: [list]
```

---

## Step 2: Design Block Structure

### 2.1 Define Block Purpose

Clearly define:
```
Block Name: [kebab-case-name]
Purpose: [Single clear purpose]
Use Cases:
  1. [Primary use case]
  2. [Secondary use case]
  3. [Additional use case if any]
```

### 2.2 Design Content Model

Define how authors will structure content:

```markdown
## Example Usage in Markdown

BlockName (variant-class)
Property 1: Value 1
Property 2: Value 2
Content: Main content here
```

### 2.3 Plan Variations

Identify variants needed:

```
Variants:
- centered: Center-aligned content
- dark: Dark theme
- compact: Reduced spacing

Implementation:
- CSS-only variants: Use classes
- Behavior variants: JavaScript detection
```

### 2.4 Follow Architecture Principles

From `rules/05-cms-component-architecture.md`:

✅ **Author-First Flexibility**
- Configuration over code
- Authors can customize without developer

✅ **Multi-Brand Scalability**
- Single base implementation
- Brand themes via CSS only

✅ **Token-Driven Styling**
- Use CSS custom properties
- No hard-coded values

---

## Step 3: Create Block Files

### 3.1 Create Directory Structure

```bash
# Create block directory
mkdir -p blocks/my-block

# Create core files
touch blocks/my-block/my-block.js
touch blocks/my-block/my-block.css
touch blocks/my-block/README.md
```

### 3.2 File Structure

```
blocks/
  my-block/
    my-block.js          ← JavaScript decoration
    my-block.css         ← Base styles
    README.md            ← Block documentation
    abbvie/              ← Brand-specific (if needed)
      _my-block.css
    botox/
      _my-block.css
    rinvoq/
      _my-block.css
```

---

## Step 4: Implement JavaScript

### 4.1 Basic Template

```javascript
/**
 * My Block
 * 
 * @description [What this block does]
 * @use-cases
 *   - [Use case 1]
 *   - [Use case 2]
 * 
 * @configuration
 *   - property1: [description]
 *   - property2: [description]
 * 
 * @example
 * My Block
 * Property 1: Value
 * Property 2: Value
 * 
 * @created 2026-02-27
 * @author [Your Name]
 */

/**
 * Extract configuration from block
 * @param {Element} block - The block element
 * @returns {Object} Configuration object
 */
function extractConfig(block) {
  return {
    variant: block.classList.contains('centered') ? 'centered' : 'default',
    // Add other configuration extraction
  };
}

/**
 * Validate configuration
 * @param {Object} config - Configuration object
 * @returns {Object} Validated configuration
 */
function validateConfig(config) {
  const validVariants = ['default', 'centered', 'dark'];
  if (!validVariants.includes(config.variant)) {
    console.warn(`Invalid variant: ${config.variant}`);
    config.variant = 'default';
  }
  return config;
}

/**
 * Create block structure
 * @param {Object} config - Configuration object
 * @param {Object} content - Content object
 * @returns {Element} Block structure
 */
function createStructure(config, content) {
  const container = document.createElement('div');
  container.className = 'my-block-container';
  container.dataset.variant = config.variant;
  
  // Build structure
  // ... implementation ...
  
  return container;
}

/**
 * Attach event listeners
 * @param {Element} block - The block element
 * @param {Object} config - Configuration object
 */
function attachEventListeners(block, config) {
  // Add event listeners
  // ... implementation ...
}

/**
 * Decorate the block
 * @param {Element} block - The block element
 */
export default async function decorate(block) {
  // 1. Extract configuration
  const config = extractConfig(block);
  
  // 2. Validate configuration
  validateConfig(config);
  
  // 3. Extract content
  const content = {
    // Extract content from block
  };
  
  // 4. Create structure
  const structure = createStructure(config, content);
  
  // 5. Replace block content
  block.innerHTML = '';
  block.appendChild(structure);
  
  // 6. Attach event listeners
  attachEventListeners(block, config);
  
  // 7. Emit ready event
  block.dispatchEvent(new CustomEvent('my-block:ready', {
    detail: { config },
  }));
}

/**
 * Public API for external manipulation
 */
export const MyBlockAPI = {
  update: (block, updates) => {
    const config = extractConfig(block);
    Object.assign(config, updates);
    decorate(block);
  },
  getConfig: (block) => extractConfig(block),
};
```

### 4.2 Follow Best Practices

From `rules/04-css-js-best-practices.md`:

✅ **Component Lifecycle**
- Initialization
- Validation
- Structure creation
- Event binding
- Ready callback

✅ **Explicit APIs**
- Public methods for manipulation
- Event-driven architecture
- No global DOM manipulation

---

## Step 5: Implement CSS

### 5.1 Base Styles Template

```css
/**
 * My Block Styles
 * 
 * Description: [What this styles]
 * Use Cases: [Primary use cases]
 * 
 * Created: 2026-02-27
 * Author: [Your Name]
 */

/* Base component styles */
.my-block {
  /* Use tokens */
  padding: var(--spacing-xl) var(--spacing-md);
  background-color: var(--color-background);
  max-width: var(--max-content-width);
  margin: 0 auto;
  
  /* Mobile-first */
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.my-block-container {
  /* Container styles */
}

/* Component elements */
.my-block h2 {
  font-family: var(--font-family-primary);
  font-size: var(--font-size-h2);
  line-height: var(--line-height-heading);
  margin-bottom: var(--spacing-md);
  color: var(--color-text);
}

.my-block p {
  font-size: var(--font-size-body);
  line-height: var(--line-height-body);
  color: var(--color-text);
}

/* Responsive */
@media (min-width: 768px) {
  .my-block {
    flex-direction: row;
    padding: var(--spacing-xl);
  }
}

@media (min-width: 1024px) {
  .my-block {
    gap: var(--spacing-xl);
  }
}

/* Variants */
.my-block.centered {
  text-align: center;
  align-items: center;
}

.my-block.dark {
  background-color: var(--color-primary);
  color: var(--color-background);
}

.my-block.compact {
  padding: var(--spacing-md);
  gap: var(--spacing-sm);
}
```

### 5.2 Follow CSS Architecture

From `rules/05-cms-component-architecture.md`:

✅ **Token-Driven**
- Use CSS custom properties
- No magic numbers

✅ **Low Specificity**
- Maximum specificity: 0,2,0
- Single class selectors
- BEM-style for variants

✅ **Mobile-First**
- Base styles for mobile
- Media queries for larger screens

---

## Step 6: Create Block Documentation

### 6.1 README.md Template

```markdown
# My Block

## Purpose
[Brief description of what this block does]

## Use Cases
- [Use case 1]
- [Use case 2]
- [Use case 3]

## Block Structure

\```markdown
My Block (variant-class)
Property 1: Value 1
Property 2: Value 2
Content: Content here
\```

## Configuration Options

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| property1 | string | Yes | - | Description |
| property2 | boolean | No | false | Description |

## Variations

### Centered
\```markdown
My Block (centered)
...
\```

### Dark Theme
\```markdown
My Block (dark)
...
\```

## Examples

### Example 1: Basic Usage
\```markdown
My Block
Property: Value
Content: Basic content
\```

### Example 2: With Variants
\```markdown
My Block (centered, dark)
Property: Value
Content: Centered dark content
\```

## CSS Classes

- `.my-block` - Base block class
- `.my-block--centered` - Centered variant
- `.my-block--dark` - Dark theme variant
- `.my-block-container` - Container element

## JavaScript API

\```javascript
import { MyBlockAPI } from './blocks/my-block/my-block.js';

// Update block
MyBlockAPI.update(blockElement, { variant: 'centered' });

// Get configuration
const config = MyBlockAPI.getConfig(blockElement);
\```

## Accessibility

- [ARIA attribute 1]
- [ARIA attribute 2]
- [Keyboard navigation support]

## Browser Support

- Chrome: ✅
- Firefox: ✅
- Safari: ✅
- Edge: ✅

## Related Blocks

- [Related block 1]
- [Related block 2]

## Created

- **Date**: 2026-02-27
- **Author**: [Your Name]
- **Reason**: [Why this block was created]

## Changelog

### v1.0.0 (2026-02-27)
- Initial release
```

---

## Step 7: 🔴 MANDATORY: Update Rules Documentation

### 7.1 Protocol Requirements

From `rules/06-component-documentation-protocol.md`:

**YOU MUST update ALL these files:**

1. **rules/02-block-reuse-strategy.md**
   - Add to Available Blocks Inventory
   - Add usage scenario if applicable

2. **rules/00-migration-guidelines.md**
   - Add to Block Usage Guidelines section

3. **rules/03-best-practices-summary.md**
   - Add to Block Selection Guide

4. **rules/README.md**
   - Add to Available Blocks Reference
   - Update block count

### 7.2 Announcement Pattern

After updating documentation, announce:

```
I've created a new block 'my-block'. I will now update the documentation.

Files Created:
✅ blocks/my-block/my-block.js
✅ blocks/my-block/my-block.css
✅ blocks/my-block/README.md

Documentation Updated:
✅ rules/02-block-reuse-strategy.md
   - Added to Available Blocks Inventory (Content Blocks section)
   - Added Scenario 25 for [use case]
✅ rules/00-migration-guidelines.md
   - Added Block Usage Guidelines section for my-block
✅ rules/03-best-practices-summary.md
   - Added to Block Selection Guide
✅ rules/README.md
   - Added to Available Blocks Reference
   - Updated block count from 24 to 25

The my-block component is now fully documented and ready to use.
```

### 7.3 Verification Checklist

- [ ] Added to block inventory in rules/02-block-reuse-strategy.md
- [ ] Added usage example in rules/00-migration-guidelines.md
- [ ] Added to selection guide in rules/03-best-practices-summary.md
- [ ] Updated count and reference in rules/README.md
- [ ] Created comprehensive block README.md
- [ ] Added JSDoc comments in JavaScript
- [ ] Added CSS comments
- [ ] Announced all updates

---

## Step 8: Test and Verify

### 8.1 Create Test Content

Create test content in markdown:

```markdown
---
Title: My Block Test
---

My Block
Property 1: Test Value
Property 2: Another Value
Content: Test content here
---

My Block (centered)
Property 1: Centered Test
Content: This should be centered
---

My Block (dark)
Property 1: Dark Test
Content: This should have dark theme
```

### 8.2 Visual Testing

1. Start dev server: `npm start`
2. Navigate to test page
3. Verify:
   - [ ] Block renders correctly
   - [ ] Configuration options work
   - [ ] Variants apply correctly
   - [ ] Responsive behavior correct
   - [ ] No console errors

### 8.3 Functional Testing

Test all functionality:
- [ ] Click behaviors work
- [ ] Keyboard navigation works
- [ ] Animations/transitions smooth
- [ ] API methods work
- [ ] Events fire correctly

### 8.4 Cross-Browser Testing

Test in:
- [ ] Chrome/Edge
- [ ] Firefox
- [ ] Safari

### 8.5 Accessibility Testing

- [ ] WCAG 2.1 AA compliant
- [ ] Keyboard accessible
- [ ] Screen reader friendly
- [ ] Proper ARIA attributes
- [ ] Color contrast ≥ 4.5:1

### 8.6 Performance Testing

- [ ] No layout shift
- [ ] Fast rendering
- [ ] Lazy loading if needed
- [ ] Optimized images
- [ ] No unnecessary re-renders

---

## Brand-Specific Themes (Optional)

If brand-specific styles needed:

### AbbVie Theme

```css
/* blocks/my-block/abbvie/_my-block.css */
@import url('../my-block.css');

.my-block {
  border-top: 4px solid var(--brand-primary);
}

.my-block h2 {
  font-family: var(--font-family-primary);
  color: #071D49; /* AbbVie Navy */
}
```

### Follow Multi-Brand Principles

From `rules/05-cms-component-architecture.md`:

✅ **Zero Structural Forks**
- Single JS file for all brands
- Brand differences via CSS only

✅ **Token-Driven**
- Brand identity through tokens
- Minimal overrides

---

## Common Patterns

### Pattern 1: Content Grid

```javascript
export default async function decorate(block) {
  const items = [...block.children];
  
  const grid = document.createElement('div');
  grid.className = 'my-block-grid';
  
  items.forEach((item) => {
    const card = document.createElement('div');
    card.className = 'my-block-item';
    card.innerHTML = item.innerHTML;
    grid.appendChild(card);
  });
  
  block.innerHTML = '';
  block.appendChild(grid);
}
```

### Pattern 2: Configuration via Classes

```javascript
function extractConfig(block) {
  return {
    centered: block.classList.contains('centered'),
    dark: block.classList.contains('dark'),
    compact: block.classList.contains('compact'),
  };
}
```

### Pattern 3: Event-Driven Architecture

```javascript
function attachEventListeners(block, config) {
  block.querySelectorAll('.clickable').forEach((el) => {
    el.addEventListener('click', (e) => {
      block.dispatchEvent(new CustomEvent('my-block:item-click', {
        detail: { target: e.target, config },
      }));
    });
  });
}
```

---

## Troubleshooting

### Issue: Block not rendering
- Check block name matches file name exactly (case-sensitive)
- Verify decorate function is default export
- Check console for JavaScript errors
- Ensure dev server is running

### Issue: Styles not applying
- Check CSS file name matches block name
- Verify selectors are scoped to block
- Check for CSS syntax errors
- Clear browser cache

### Issue: Variants not working
- Verify class detection logic
- Check CSS variant selectors
- Test with different class combinations
- Verify classList usage is correct

---

## Success Criteria

Block creation complete when:

✅ Block renders correctly
✅ All configurations work
✅ All variants functional
✅ Responsive behavior correct
✅ Accessibility compliant
✅ Performance targets met
✅ 🔴 ALL documentation updated
✅ Test content created
✅ Team review complete

---

## Reference Materials

- `rules/02-block-reuse-strategy.md` - Block reuse strategy
- `rules/04-css-js-best-practices.md` - Implementation patterns
- `rules/05-cms-component-architecture.md` - Architecture principles
- `rules/06-component-documentation-protocol.md` - 🔴 MANDATORY protocol
