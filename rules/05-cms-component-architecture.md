# CMS Component System - Technical Architecture Specification

## 1. Executive Intent

This document defines the architectural standards and implementation constraints for a CMS component system within AbbVie's Edge Delivery Services (EDS).

**The goal is not to replicate prior architecture** — it is to eliminate systemic failure patterns by suggesting what has & hasn't worked well as a result of learned requirements through our products and their lifespans.

---

## 2. Strategic Objectives

### 2.1 Primary Outcomes

#### 1. Author-First Flexibility

**Objective**: Empower content authors to configure behavior and appearance without custom code.

**Implementation Requirements**:

✅ **Configuration Over Code**
```json
{
  "id": "hero",
  "template": {
    "name": "Hero",
    "model": "hero",
    "alignment": "center",
    "overlay": "dark",
    "height": "600px"
  }
}
```

**Authors can configure**:
- Layout options (alignment, spacing, columns)
- Visual styles (colors, backgrounds, borders)
- Behavioral options (animations, interactions)
- Content structure (text, images, links)

❌ **Avoid**:
- Requiring developers for style changes
- Hard-coded visual variations
- Custom CSS per instance

✅ **Brand Variation via Configuration**
```markdown
Hero (centered, dark-overlay)
Image: /path/to/image.jpg
Title: Page Title
Description: Description text
```

**Not via code divergence**:
- Each brand modifies base component
- Each site has unique implementation
- Inconsistent behavior across brands

---

#### 2. True Multi-Brand Scalability

**Objective**: Zero structural forks per brand with shared components across brands.

**Implementation Requirements**:

✅ **Shared Component Base**
```
blocks/
  hero/
    hero.js          ← Shared logic for all brands
    hero.css         ← Base styles for all brands
    abbvie/
      _hero.css      ← AbbVie theme overrides only
    botox/
      _hero.css      ← Botox theme overrides only
    rinvoq/
      _hero.css      ← Rinvoq theme overrides only
```

**Key Principles**:
1. **One codebase**: Single `hero.js` works for all brands
2. **Theme tokens**: Brand identity through CSS variables
3. **Configuration**: Behavior differences via data attributes
4. **No forks**: Never copy/modify for brand-specific needs

✅ **Brand Identity via Tokens**
```css
/* styles/abbvie/tokens.css */
:root {
  --color-primary: #071D49;
  --color-secondary: #00A3E0;
  --font-family-primary: 'F37 Lineca', Arial, sans-serif;
}

/* styles/botox/tokens.css */
:root {
  --color-primary: #6B4C9A;
  --color-secondary: #E8E4E8;
  --font-family-primary: 'Gotham', Arial, sans-serif;
}
```

❌ **Avoid**:
- Separate `hero-abbvie.js` and `hero-botox.js`
- Brand-specific business logic
- Duplicated component implementations

✅ **Theme Configuration Example**
```css
/* blocks/hero/abbvie/_hero.css */
@import url('../hero.css');

.hero {
  /* AbbVie-specific overrides */
  border-top: 4px solid var(--color-primary);
}

.hero h1 {
  font-family: var(--font-family-primary);
  color: var(--color-primary);
}
```

---

#### 3. Behavioral Consistency

**Objective**: Formal component lifecycle with explicit APIs for component manipulation.

**Implementation Requirements**:

✅ **Formal Component Lifecycle**
```javascript
// blocks/hero/hero.js
export default function decorate(block) {
  // 1. Initialization
  const config = extractConfig(block);
  
  // 2. Validation
  validateConfig(config);
  
  // 3. Structure creation
  const structure = createStructure(config);
  
  // 4. Mount
  block.innerHTML = '';
  block.appendChild(structure);
  
  // 5. Event binding
  attachEventListeners(block, config);
  
  // 6. Ready callback
  block.dispatchEvent(new CustomEvent('hero:ready', {
    detail: { config }
  }));
}

// Explicit API for external manipulation
export function updateHero(block, updates) {
  const currentConfig = block.dataset.config;
  const newConfig = { ...JSON.parse(currentConfig), ...updates };
  decorate(block); // Re-render with new config
}
```

**Lifecycle Events**:
1. `component:init` - Component initializing
2. `component:ready` - Component ready for interaction
3. `component:update` - Component state changed
4. `component:destroy` - Component cleanup

✅ **Explicit APIs**
```javascript
// Public API for component manipulation
export const HeroAPI = {
  create: (container, config) => { },
  update: (block, updates) => { },
  destroy: (block) => { },
  getState: (block) => { },
};
```

❌ **Avoid**:
- Direct DOM manipulation from outside
- Global selectors (`document.querySelector('.hero')`)
- Implicit state management
- Side effects without clear API

✅ **No Global DOM Manipulation**
```javascript
// ❌ BAD: Global DOM manipulation
function updateAllHeros() {
  document.querySelectorAll('.hero').forEach((hero) => {
    hero.style.backgroundColor = 'red'; // Direct manipulation
  });
}

// ✅ GOOD: Use component API
function updateAllHeros() {
  document.querySelectorAll('.hero').forEach((hero) => {
    HeroAPI.update(hero, { backgroundColor: 'red' });
  });
}
```

---

#### 4. Styling Governance

**Objective**: Token-driven system with strict specificity controls and no override-heavy brand CSS layers.

**Implementation Requirements**:

✅ **Token-Driven System**
```css
/* styles/tokens.css */
:root {
  /* Spacing tokens */
  --spacing-xs: 8px;
  --spacing-sm: 16px;
  --spacing-md: 24px;
  --spacing-lg: 32px;
  --spacing-xl: 48px;
  
  /* Typography tokens */
  --font-size-h1: 48px;
  --font-size-h2: 36px;
  --font-size-body: 16px;
  --line-height-heading: 1.2;
  --line-height-body: 1.6;
  
  /* Color tokens */
  --color-primary: var(--brand-primary);
  --color-text: #333333;
  --color-background: #FFFFFF;
  
  /* Transition tokens */
  --transition-fast: 150ms ease-in-out;
  --transition-normal: 300ms ease-in-out;
}
```

✅ **Use Tokens Consistently**
```css
/* blocks/hero/hero.css */
.hero {
  padding: var(--spacing-xl) var(--spacing-md);
  background-color: var(--color-primary);
}

.hero h1 {
  font-size: var(--font-size-h1);
  line-height: var(--line-height-heading);
  margin-bottom: var(--spacing-md);
}

.hero-cta {
  transition: transform var(--transition-normal);
}
```

❌ **Avoid Magic Numbers**
```css
/* ❌ BAD: Hard-coded values */
.hero {
  padding: 48px 24px; /* What do these numbers mean? */
  font-size: 36px;    /* Why 36px? */
}

/* ✅ GOOD: Token-based */
.hero {
  padding: var(--spacing-xl) var(--spacing-md);
  font-size: var(--font-size-h2);
}
```

✅ **Strict Specificity Controls**
```css
/* Keep specificity low and predictable */

/* ✅ GOOD: Single class selectors */
.hero { }
.hero-content { }
.hero-title { }

/* ✅ GOOD: BEM-style for variants */
.hero--centered { }
.hero--dark { }

/* ❌ BAD: High specificity */
div.hero .content h1.title { }  /* Specificity: 0,2,3 */

/* ❌ BAD: !important overuse */
.hero {
  color: red !important;
}
```

**Specificity Rules**:
1. Maximum specificity: `0,2,0` (two classes)
2. No `!important` except for utilities
3. No element selectors combined with classes
4. Use CSS custom properties for overrides

✅ **No Override-Heavy Brand Layers**
```css
/* ❌ BAD: Heavy override pattern */
/* blocks/hero/abbvie/_hero.css */
.hero {
  padding: 60px 30px !important;
  background: linear-gradient(...) !important;
  border: 2px solid blue !important;
}

.hero h1 {
  font-size: 52px !important;
  color: navy !important;
  margin: 20px 0 !important;
}

/* ✅ GOOD: Token-based theming */
/* styles/abbvie/tokens.css */
:root {
  --brand-primary: #071D49;
  --brand-hero-padding: var(--spacing-xl);
}

/* blocks/hero/abbvie/_hero.css */
.hero {
  border-top: 4px solid var(--brand-primary);
  /* Minimal overrides, leverage tokens */
}
```

---

## 3. Implementation Patterns

### 3.1 Component Structure Template

Every component should follow this structure:

```javascript
/**
 * Component Name: Hero Block
 * Purpose: Page header with image, title, description, CTA
 * Configuration: Supports alignment, overlay, height options
 */

// 1. Configuration extraction
function extractConfig(block) {
  // Parse block data into configuration object
  const config = {
    alignment: block.classList.contains('centered') ? 'center' : 'left',
    overlay: block.classList.contains('dark-overlay') ? 'dark' : 'light',
    height: block.dataset.height || '600px',
  };
  return config;
}

// 2. Configuration validation
function validateConfig(config) {
  const validAlignments = ['left', 'center', 'right'];
  if (!validAlignments.includes(config.alignment)) {
    console.warn(`Invalid alignment: ${config.alignment}`);
    config.alignment = 'left';
  }
  return config;
}

// 3. Structure creation
function createStructure(config, content) {
  const container = document.createElement('div');
  container.className = 'hero-container';
  
  // Apply configuration
  container.style.minHeight = config.height;
  container.dataset.alignment = config.alignment;
  container.dataset.overlay = config.overlay;
  
  // Build content structure
  if (content.image) {
    const imageContainer = document.createElement('div');
    imageContainer.className = 'hero-image';
    imageContainer.appendChild(content.image);
    container.appendChild(imageContainer);
  }
  
  const contentContainer = document.createElement('div');
  contentContainer.className = 'hero-content';
  
  if (content.title) {
    const title = document.createElement('h1');
    title.textContent = content.title;
    contentContainer.appendChild(title);
  }
  
  if (content.description) {
    const desc = document.createElement('p');
    desc.textContent = content.description;
    contentContainer.appendChild(desc);
  }
  
  container.appendChild(contentContainer);
  return container;
}

// 4. Event handling
function attachEventListeners(block, config) {
  // Add component-specific event listeners
  const cta = block.querySelector('.hero-cta');
  if (cta) {
    cta.addEventListener('click', (e) => {
      block.dispatchEvent(new CustomEvent('hero:cta-click', {
        detail: { href: cta.href }
      }));
    });
  }
}

// 5. Main decoration function
export default function decorate(block) {
  // Extract configuration
  const config = extractConfig(block);
  
  // Validate configuration
  validateConfig(config);
  
  // Extract content
  const content = extractContent(block);
  
  // Create structure
  const structure = createStructure(config, content);
  
  // Replace block content
  block.innerHTML = '';
  block.appendChild(structure);
  
  // Attach event listeners
  attachEventListeners(block, config);
  
  // Emit ready event
  block.dispatchEvent(new CustomEvent('hero:ready', {
    detail: { config }
  }));
}

// 6. Public API
export const HeroAPI = {
  update: (block, updates) => {
    const config = extractConfig(block);
    Object.assign(config, updates);
    decorate(block);
  },
  getConfig: (block) => extractConfig(block),
};
```

### 3.2 CSS Architecture Pattern

```css
/* blocks/hero/hero.css */

/* Base component styles - no brand-specific code */
.hero {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: var(--hero-height, 600px);
  padding: var(--spacing-xl) var(--spacing-md);
  background-color: var(--color-background);
  background-size: cover;
  background-position: center;
}

/* Configuration-based variants */
.hero[data-alignment="left"] {
  justify-content: flex-start;
}

.hero[data-alignment="center"] {
  justify-content: center;
  text-align: center;
}

.hero[data-alignment="right"] {
  justify-content: flex-end;
  text-align: right;
}

/* Overlay variants */
.hero[data-overlay="dark"]::before {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
}

.hero[data-overlay="light"]::before {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.5);
}

/* Component structure */
.hero-content {
  position: relative;
  z-index: 1;
  max-width: 800px;
}

.hero h1 {
  font-size: var(--font-size-h1);
  line-height: var(--line-height-heading);
  margin-bottom: var(--spacing-md);
  color: var(--color-text);
}

.hero p {
  font-size: var(--font-size-body);
  line-height: var(--line-height-body);
  margin-bottom: var(--spacing-lg);
  color: var(--color-text);
}

/* Responsive using tokens */
@media (max-width: 768px) {
  .hero {
    min-height: calc(var(--hero-height, 600px) * 0.6);
    padding: var(--spacing-lg) var(--spacing-sm);
  }
}
```

### 3.3 Brand Theme Pattern

```css
/* styles/abbvie/tokens.css */
:root {
  /* Brand colors */
  --brand-primary: #071D49;
  --brand-secondary: #00A3E0;
  
  /* Component-specific tokens */
  --hero-height: 700px;
  
  /* Override base tokens */
  --color-primary: var(--brand-primary);
  --color-secondary: var(--brand-secondary);
  --font-family-primary: 'F37 Lineca', Arial, sans-serif;
}

/* blocks/hero/abbvie/_hero.css */
@import url('../hero.css');

/* Minimal brand-specific overrides */
.hero {
  border-top: 4px solid var(--brand-primary);
}

.hero h1 {
  font-family: var(--font-family-primary);
}

/* Brand-specific variant if needed */
.hero.abbvie-corporate {
  background: linear-gradient(
    135deg,
    var(--brand-primary) 0%,
    var(--brand-secondary) 100%
  );
}
```

---

## 4. Anti-Patterns to Avoid

### ❌ 4.1 Brand-Specific Forks
```javascript
// ❌ BAD: Separate files per brand
blocks/
  hero-abbvie/
    hero-abbvie.js
    hero-abbvie.css
  hero-botox/
    hero-botox.js
    hero-botox.css
```

### ❌ 4.2 Hard-Coded Configuration
```javascript
// ❌ BAD: Hard-coded values
function decorate(block) {
  block.style.height = '600px';
  block.style.padding = '48px 24px';
  block.style.backgroundColor = '#071D49';
}
```

### ❌ 4.3 Global DOM Manipulation
```javascript
// ❌ BAD: Global queries
document.querySelectorAll('.hero').forEach((hero) => {
  hero.style.backgroundColor = 'red';
});
```

### ❌ 4.4 High Specificity CSS
```css
/* ❌ BAD: High specificity */
div.section .hero-container .hero-content h1.title {
  color: blue !important;
}
```

### ❌ 4.5 Override-Heavy Theming
```css
/* ❌ BAD: Heavy !important usage */
.hero {
  padding: 60px !important;
  margin: 40px !important;
  background: red !important;
}
```

---

## 5. Implementation Checklist

### For Each Component

- [ ] **Configuration-Driven**: Authors can customize without code
- [ ] **Brand-Agnostic Base**: Single implementation for all brands
- [ ] **Token-Based Styling**: Uses design tokens, not hard-coded values
- [ ] **Explicit Lifecycle**: Clear init, render, update, destroy phases
- [ ] **Public API**: Documented methods for external manipulation
- [ ] **Event-Driven**: Emits events for state changes
- [ ] **Low Specificity**: CSS selectors kept simple (max 0,2,0)
- [ ] **Minimal Overrides**: Brand themes extend, don't replace
- [ ] **Responsive**: Uses token-based breakpoints
- [ ] **Accessible**: WCAG 2.1 AA compliant

### For Each Brand Theme

- [ ] **Token Definitions**: All brand colors, fonts, spacing in tokens
- [ ] **Minimal CSS**: Only true brand-specific overrides
- [ ] **No !important**: Unless absolutely necessary for utilities
- [ ] **Extends Base**: Imports and extends, doesn't replace
- [ ] **Documented**: Clear explanation of overrides and why

### For Overall System

- [ ] **Shared Components**: Zero structural forks between brands
- [ ] **Token System**: Complete design token library
- [ ] **Style Guide**: Documented patterns and usage
- [ ] **Component Catalog**: All components documented with examples
- [ ] **API Documentation**: Public APIs for each component
- [ ] **Testing**: Component behavior tested across brands

---

## 6. Migration Strategy

### Phase 1: Token System Setup
1. Define core design tokens
2. Create brand-specific token files
3. Update existing components to use tokens
4. Document token usage patterns

### Phase 2: Component Refactoring
1. Identify components with brand forks
2. Extract common logic to base component
3. Move brand-specific code to theme overrides
4. Validate across all brands

### Phase 3: API Standardization
1. Define component lifecycle
2. Create public APIs for manipulation
3. Replace global DOM queries with APIs
4. Document all public interfaces

### Phase 4: Styling Governance
1. Audit CSS specificity
2. Remove !important usage
3. Refactor override-heavy brand layers
4. Implement token-based theming

---

## 7. Success Metrics

### Author Experience
- Time to create page variant: < 5 minutes (no developer needed)
- Configuration options per component: ≥ 5
- Training time for new authors: < 1 hour

### Developer Experience
- New brand setup time: < 1 day
- Component reuse across brands: 100%
- Code duplication: 0% (except theme files)

### System Health
- CSS specificity average: < 0,2,0
- !important usage: < 1% of declarations
- Build time: < 30 seconds
- Bundle size growth per brand: < 10KB

---

**Last Updated**: 2026-02-27  
**Version**: 1.0  
**Maintained By**: EDS Architecture Team
