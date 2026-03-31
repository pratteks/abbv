# Rule 08: No Empty Elements in AI-Generated Code

## Overview

This rule establishes strict guidelines to prevent AI tools from generating empty HTML elements, which can cause accessibility issues, validation errors, and degraded user experience.

## Core Principle

**Never generate empty `<section>`, `<div>`, or any other HTML elements without meaningful content.**

## Why This Rule Matters

### 1. **Accessibility Issues**
- Screen readers announce empty elements, creating confusion for users with disabilities
- Empty landmarks (sections, nav, etc.) violate WCAG guidelines
- Can break keyboard navigation patterns

### 2. **Performance Impact**
- Increases DOM size unnecessarily
- Adds overhead to rendering and layout calculations
- Creates technical debt in the codebase

### 3. **Maintenance Problems**
- Difficult to debug why elements exist
- Can mask actual missing content issues
- Makes code reviews harder

### 4. **Validation Errors**
- May fail HTML validation
- Can cause CSS layout issues
- Breaks semantic HTML structure

## Prohibited Patterns

### ❌ DO NOT Generate:

```html
<!-- Empty sections -->
<section></section>
<section class="hero"></section>

<!-- Empty divs -->
<div></div>
<div class="container"></div>

<!-- Empty semantic elements -->
<article></article>
<aside></aside>
<nav></nav>
<header></header>
<footer></footer>

<!-- Empty blocks -->
<div class="block">
  <div class="wrapper"></div>
</div>
```

## Correct Patterns

### ✅ DO Generate:

```html
<!-- Section with content -->
<section class="hero">
  <div class="hero-content">
    <h1>Welcome to AbbVie</h1>
    <p>Discover remarkable medicine</p>
  </div>
</section>

<!-- Div with child elements -->
<div class="container">
  <div class="content">
    <h2>Our Science</h2>
    <p>Innovation drives our research</p>
  </div>
</div>

<!-- Semantic elements with purpose -->
<nav class="nav">
  <ul>
    <li><a href="/home">Home</a></li>
    <li><a href="/about">About</a></li>
  </ul>
</nav>
```

## Special Cases

### Self-Closing Elements (Allowed)
These elements are inherently empty and acceptable:

```html
<img src="logo.svg" alt="AbbVie Logo">
<input type="text" placeholder="Search">
<hr>
<br>
<meta name="description" content="...">
<link rel="stylesheet" href="styles.css">
```

### Placeholder Elements (Use Data Attributes)
If you must create a container for dynamic content, mark it explicitly:

```html
<!-- Acceptable with clear intent -->
<div class="dynamic-content" data-source="api" data-endpoint="/articles">
  <!-- Content loaded via JavaScript -->
</div>

<!-- Better: Include loading state -->
<div class="dynamic-content" data-source="api">
  <div class="loading">
    <p>Loading content...</p>
  </div>
</div>
```

## Parser & Transformer Guidelines

### Critical Rule for Content Generation

**NEVER generate empty section blocks during content transformation or parsing.**

### For Importer Parsers (`tools/importer/parsers/*.js`)

```javascript
// ❌ BAD: Parser creates empty section
export default {
  transform: ({ document }) => {
    const main = document.createElement('main');
    
    // BAD: Creates empty section
    const section = document.createElement('div');
    main.append(section);
    
    return main;
  }
};

// ✅ GOOD: Only create sections with content
export default {
  transform: ({ document }) => {
    const main = document.createElement('main');
    
    const heroContent = document.querySelector('.hero-content');
    if (heroContent && heroContent.textContent.trim()) {
      const section = document.createElement('div');
      section.append(heroContent);
      main.append(section);
    }
    
    return main;
  }
};
```

### Section Block Validation

Before creating any section block, parsers MUST validate:

```javascript
function shouldCreateSection(content) {
  // Check 1: Content exists
  if (!content) return false;
  
  // Check 2: Has text content
  if (!content.textContent?.trim()) return false;
  
  // Check 3: Has child elements
  if (content.children.length === 0) return false;
  
  return true;
}

// Use in parser
export default {
  transform: ({ document }) => {
    const main = document.createElement('main');
    const sourceContent = document.querySelector('.content');
    
    if (shouldCreateSection(sourceContent)) {
      const section = document.createElement('div');
      section.append(sourceContent);
      main.append(section);
    }
    
    return main;
  }
};
```

### Parser Best Practices

1. **Always Validate Before Creating Sections**
```javascript
// Helper function for parsers
function createSectionIfValid(main, selector, document) {
  const content = document.querySelector(selector);
  if (content && content.textContent.trim()) {
    const section = document.createElement('div');
    section.append(content);
    main.append(section);
    return section;
  }
  return null;
}
```

2. **Remove Empty Sections After Processing**
```javascript
export default {
  transform: ({ document }) => {
    const main = document.createElement('main');
    
    // ... transform logic ...
    
    // Clean up: Remove any empty sections
    main.querySelectorAll('div').forEach(section => {
      if (!section.textContent.trim() && section.children.length === 0) {
        section.remove();
      }
    });
    
    return main;
  }
};
```

3. **Log When Skipping Empty Content**
```javascript
const content = document.querySelector('.section');
if (!content || !content.textContent.trim()) {
  console.log('[Parser] Skipping empty section:', selector);
  return main;
}
```

### Transformer Rules

For any content transformation tool:

```javascript
// ❌ BAD: Transform creates placeholder sections
function transform(content) {
  const sections = [];
  for (let i = 0; i < 5; i++) {
    sections.push(createSection()); // Creates empty sections
  }
  return sections;
}

// ✅ GOOD: Only transform actual content
function transform(content) {
  const sections = [];
  content.forEach(item => {
    if (item.content && item.content.trim()) {
      sections.push(createSection(item));
    }
  });
  return sections;
}
```

### EDS Importer Integration

When using the EDS importer framework:

```javascript
import { createSection } from './utils.js';

export default {
  transform: ({ document, url }) => {
    const main = document.createElement('main');
    
    // Get all content blocks
    const blocks = document.querySelectorAll('.block');
    
    blocks.forEach(block => {
      // CRITICAL: Validate before creating section
      const hasContent = block.textContent.trim().length > 0;
      const hasImages = block.querySelectorAll('img').length > 0;
      const hasLinks = block.querySelectorAll('a').length > 0;
      
      if (hasContent || hasImages || hasLinks) {
        const section = createSection(block);
        main.append(section);
      } else {
        console.warn('[Parser] Skipped empty block:', block.className);
      }
    });
    
    return main;
  }
};
```

### Validation Checklist for Parsers

Before committing parser code, verify:

- [ ] No `document.createElement('div')` without content validation
- [ ] All sections have `.textContent.trim()` check
- [ ] Empty sections are removed in cleanup phase
- [ ] Console warnings for skipped empty content
- [ ] Test with pages that have missing content
- [ ] Test with pages that have only whitespace
- [ ] Verify no empty `<div>` tags in output HTML

### Testing Empty Section Handling

```javascript
// Test case for parser
describe('Parser Empty Section Handling', () => {
  it('should not create section for empty content', () => {
    const doc = createMockDocument(`
      <div class="content">
        <div class="empty"></div>
      </div>
    `);
    
    const result = parser.transform({ document: doc });
    const sections = result.querySelectorAll('div');
    
    // Should have no empty sections
    sections.forEach(section => {
      expect(section.textContent.trim()).not.toBe('');
    });
  });
});
```

## Implementation Guidelines

### For Block Development

```javascript
// ❌ BAD: Creates empty wrapper
export default function decorate(block) {
  const wrapper = document.createElement('div');
  wrapper.className = 'wrapper';
  block.append(wrapper);
}

// ✅ GOOD: Only create if there's content
export default function decorate(block) {
  const items = block.querySelectorAll('.item');
  if (items.length > 0) {
    const wrapper = document.createElement('div');
    wrapper.className = 'wrapper';
    items.forEach(item => wrapper.append(item));
    block.innerHTML = '';
    block.append(wrapper);
  }
}
```

### For HTL Templates

```html
<!-- ❌ BAD: Empty section -->
<section class="hero">
  <div data-sly-test="${properties.title}">
    ${properties.title}
  </div>
</section>

<!-- ✅ GOOD: Conditional section -->
<section data-sly-test="${properties.title || properties.description}" class="hero">
  <h1 data-sly-test="${properties.title}">${properties.title}</h1>
  <p data-sly-test="${properties.description}">${properties.description}</p>
</section>
```

### For CSS

```css
/* ❌ BAD: Styling empty elements */
.empty-wrapper {
  padding: 20px;
  margin: 10px;
}

/* ✅ GOOD: Style only when content exists */
.wrapper:not(:empty) {
  padding: 20px;
  margin: 10px;
}

/* Or use has() selector */
.wrapper:has(> *) {
  padding: 20px;
  margin: 10px;
}
```

## AI Assistant Instructions

When generating code, AI assistants must:

1. **Check for content** before creating container elements
2. **Use conditional logic** to only render elements when they have children
3. **Validate output** to ensure no empty `<section>` or `<div>` tags
4. **Add comments** explaining why an element exists if its purpose isn't obvious
5. **Prefer semantic elements** with clear meaning over generic divs

### Example AI Prompt Pattern

```
Generate a hero block for EDS.
IMPORTANT: Do not create any empty <section> or <div> elements.
Every element must contain content, child elements, or have a clear documented purpose.
```

## Validation Checklist

Before committing code, verify:

- [ ] No `<section></section>` tags without content
- [ ] No `<div></div>` tags without children
- [ ] All container elements have a clear purpose
- [ ] Empty states have explicit loading/error messages
- [ ] Self-closing elements use proper syntax
- [ ] CSS doesn't rely on empty elements for spacing

## Exceptions

This rule may be relaxed only when:

1. **Framework Requirements**: The framework explicitly requires empty containers (document this)
2. **Third-Party Integration**: External libraries need specific empty elements (document this)
3. **Progressive Enhancement**: Elements populated by JavaScript (use `data-` attributes to indicate purpose)

In all exception cases, add a comment explaining why the element must be empty:

```html
<!-- Required by ExMod AI for dynamic content injection -->
<div id="exmod-content-target" data-purpose="ai-injection-point"></div>
```

## Related Rules

- **Rule 03**: Best Practices Summary - Semantic HTML
- **Rule 04**: CSS/JS Best Practices - DOM Manipulation
- **Rule 05**: CMS Component Architecture - Component Structure

## References

- [WCAG 2.1 - Parsing](https://www.w3.org/WAI/WCAG21/Understanding/parsing.html)
- [HTML Spec - Empty Elements](https://html.spec.whatwg.org/multipage/syntax.html#void-elements)
- [MDN - Empty Elements](https://developer.mozilla.org/en-US/docs/Glossary/Empty_element)

## Enforcement

- **Linting**: Configure HTMLHint to flag empty non-void elements
- **Code Review**: Mandatory check for empty elements
- **CI/CD**: Automated validation in build pipeline
- **AI Training**: Include this rule in all AI assistant contexts

---

**Last Updated**: March 3, 2026  
**Rule Owner**: Development Team  
**Severity**: ⚠️ Warning (should be avoided) / 🚫 Error (for accessibility violations)
