# CSS & JavaScript Best Practices for EDS Migration

## Overview
This document provides detailed guidelines for CSS and JavaScript development during EDS migration, with special emphasis on **preserving the exact look, feel, and functionality** of the original pages.

## Core Principle: Pixel-Perfect Migration

### 🎯 Goal
**Migrate pages to maintain 100% visual and functional parity with source pages**
- Same layout and spacing
- Same colors and typography
- Same animations and transitions
- Same interactive behaviors
- Same responsive breakpoints

---

## CSS Best Practices

### 1. Visual Parity Rules

#### Match Exact Styles
✅ **DO**: Extract and replicate exact CSS from source
```css
/* Source page styles */
.leadership-card {
  padding: 24px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  background: #ffffff;
}

/* EDS migration - match exactly */
.cards .card {
  padding: 24px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  background: #ffffff;
}
```

❌ **DON'T**: Approximate or guess values
```css
/* Wrong - different values */
.cards .card {
  padding: 20px; /* Should be 24px */
  border-radius: 10px; /* Should be 8px */
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15); /* Wrong shadow */
}
```

#### Preserve Color Schemes
```css
/* Extract exact colors from source */
:root {
  --color-primary: #071D49; /* AbbVie Navy */
  --color-secondary: #00A3E0; /* AbbVie Blue */
  --color-text: #333333;
  --color-text-light: #666666;
  --color-background: #FFFFFF;
  --color-background-alt: #F5F5F5;
  --color-border: #E0E0E0;
  --color-error: #D32F2F;
  --color-success: #388E3C;
}

/* Use variables consistently */
.hero {
  background-color: var(--color-primary);
  color: var(--color-background);
}
```

#### Match Typography Exactly
```css
/* Extract font specifications from source */
:root {
  --font-family-primary: 'F37 Lineca', Arial, sans-serif;
  --font-family-secondary: 'Roboto', Arial, sans-serif;
  
  /* Exact font sizes from source */
  --font-size-h1: 48px;
  --font-size-h2: 36px;
  --font-size-h3: 28px;
  --font-size-body: 16px;
  --font-size-small: 14px;
  
  /* Exact line heights */
  --line-height-heading: 1.2;
  --line-height-body: 1.6;
  
  /* Exact font weights */
  --font-weight-light: 300;
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-bold: 700;
}

/* Apply consistently */
h1 {
  font-family: var(--font-family-primary);
  font-size: var(--font-size-h1);
  line-height: var(--line-height-heading);
  font-weight: var(--font-weight-medium);
}
```

### 2. Layout & Spacing Rules

#### Preserve Exact Spacing
```css
/* Extract exact spacing values from source using browser DevTools */
.section {
  padding-top: 80px;    /* Exact from source */
  padding-bottom: 80px; /* Exact from source */
}

.container {
  max-width: 1200px;    /* Exact from source */
  margin: 0 auto;
  padding: 0 24px;      /* Exact from source */
}

.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 32px;            /* Exact from source */
}

.card {
  padding: 24px;        /* Exact from source */
  margin-bottom: 24px;  /* Exact from source */
}
```

#### Match Responsive Breakpoints
```css
/* Use source page breakpoints exactly */
/* Mobile first approach */
.cards {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

/* Tablet - match source breakpoint */
@media (min-width: 768px) {
  .cards {
    grid-template-columns: repeat(2, 1fr);
    gap: 24px;
  }
}

/* Desktop - match source breakpoint */
@media (min-width: 1024px) {
  .cards {
    grid-template-columns: repeat(3, 1fr);
    gap: 32px;
  }
}

/* Large desktop - match source breakpoint */
@media (min-width: 1440px) {
  .cards {
    grid-template-columns: repeat(4, 1fr);
    gap: 40px;
  }
}
```

### 3. Animation & Transition Rules

#### Replicate Exact Animations
```css
/* Extract animation timings from source */
:root {
  --transition-fast: 150ms ease-in-out;
  --transition-normal: 300ms ease-in-out;
  --transition-slow: 500ms ease-in-out;
}

/* Match hover effects exactly */
.card {
  transition: transform var(--transition-normal),
              box-shadow var(--transition-normal);
}

.card:hover {
  transform: translateY(-4px); /* Exact from source */
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15); /* Exact from source */
}

/* Match fade-in animations */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.fade-in {
  animation: fadeIn 600ms ease-out; /* Match source timing */
}
```

#### Preserve Scroll Behaviors
```css
/* Match smooth scroll from source */
html {
  scroll-behavior: smooth;
  scroll-padding-top: 80px; /* Account for fixed header height */
}

/* Match parallax effects if present */
.hero-background {
  background-attachment: fixed;
  background-position: center;
  background-size: cover;
}
```

### 4. Component-Specific CSS

#### Hero Block Styling
```css
/* blocks/hero/hero.css */
/* Replicate exact hero styling from source */
.hero {
  position: relative;
  min-height: 600px; /* Match source height */
  display: flex;
  align-items: center;
  justify-content: center;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

.hero::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to right,
    rgba(7, 29, 73, 0.8) 0%,
    rgba(7, 29, 73, 0.4) 100%
  ); /* Match exact overlay from source */
}

.hero-content {
  position: relative;
  z-index: 1;
  max-width: 800px;
  color: white;
  padding: 48px 24px;
}

.hero h1 {
  font-size: 48px; /* Match source */
  line-height: 1.2;
  margin-bottom: 24px;
  font-weight: 500;
}

.hero p {
  font-size: 20px; /* Match source */
  line-height: 1.6;
  margin-bottom: 32px;
}
```

#### Cards Block Styling
```css
/* blocks/cards/cards.css */
/* Replicate exact card styling from source */
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 32px;
  padding: 80px 0;
}

.cards .card {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 300ms ease, box-shadow 300ms ease;
}

.cards .card:hover {
  transform: translateY(-8px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15);
}

.cards .card img {
  width: 100%;
  height: 240px; /* Match source image height */
  object-fit: cover;
  display: block;
}

.cards .card-content {
  padding: 24px;
}

.cards .card h3 {
  font-size: 24px;
  line-height: 1.3;
  margin-bottom: 12px;
  color: var(--color-primary);
}

.cards .card p {
  font-size: 16px;
  line-height: 1.6;
  color: var(--color-text-light);
  margin-bottom: 16px;
}
```

### 5. Brand-Specific Styles

#### Theme Structure
```
blocks/
  cards/
    cards.css              (base styles)
    cards.js               (base functionality)
    abbvie/
      _cards.css           (AbbVie brand overrides)
    botox/
      _cards.css           (Botox brand overrides)
    rinvoq/
      _cards.css           (Rinvoq brand overrides)
```

#### Brand Override Pattern
```css
/* blocks/cards/abbvie/_cards.css */
@import url('../cards.css');

/* AbbVie-specific overrides */
.cards .card {
  border-top: 4px solid var(--color-primary); /* AbbVie brand element */
}

.cards .card h3 {
  color: #071D49; /* AbbVie Navy */
}

.cards .card-content {
  padding: 28px 24px; /* Slightly more padding for AbbVie */
}

/* blocks/cards/botox/_cards.css */
@import url('../cards.css');

/* Botox-specific overrides */
.cards {
  background: linear-gradient(135deg, #F5F5F5 0%, #FFFFFF 100%);
}

.cards .card {
  border: 1px solid #E8E4E8; /* Botox brand color */
}
```

### 6. CSS Architecture

#### File Organization
```
styles/
  styles.css           (main entry point)
  reset.css            (CSS reset)
  fonts.css            (font declarations)
  tokens.css           (design tokens/variables)
  utils.css            (utility classes)
  button.css           (button styles)
  section.css          (section styles)
  container-helper.css (container styles)
  lazy-styles.css      (non-critical styles)
  
  abbvie/              (AbbVie theme)
    styles.css         (theme-specific)
  botox/               (Botox theme)
    styles.css         (theme-specific)
  rinvoq/              (Rinvoq theme)
    styles.css         (theme-specific)
```

#### Import Order (Critical)
```css
/* styles/styles.css */
/* 1. Reset - removes browser defaults */
@import url('reset.css');

/* 2. Fonts - load custom fonts */
@import url('fonts.css');

/* 3. Tokens - CSS variables */
@import url('tokens.css');

/* 4. Base elements - typography, links */
/* ... base styles ... */

/* 5. Layout - containers, grids */
@import url('container-helper.css');
@import url('section.css');

/* 6. Components - buttons, forms */
@import url('button.css');

/* 7. Utilities - helper classes */
@import url('utils.css');

/* 8. Lazy styles - non-critical (loaded separately) */
/* @import url('lazy-styles.css'); */
```

### 7. CSS Performance

#### Critical CSS
```css
/* Include in head for above-the-fold content */
/* Inline critical CSS for hero, navigation, typography */
<style>
  /* Reset basics */
  * { margin: 0; padding: 0; box-sizing: border-box; }
  
  /* Font face declarations */
  @font-face {
    font-family: 'F37 Lineca';
    src: url('/fonts/F37Lineca-Medium.woff2') format('woff2');
    font-display: swap;
  }
  
  /* Above-the-fold styles */
  body {
    font-family: 'F37 Lineca', Arial, sans-serif;
    line-height: 1.6;
    color: #333;
  }
  
  .header {
    position: fixed;
    top: 0;
    width: 100%;
    background: white;
    z-index: 1000;
  }
  
  .hero {
    min-height: 600px;
    /* ... hero critical styles ... */
  }
</style>
```

#### Lazy Load Non-Critical CSS
```javascript
// scripts/delayed.js
// Load non-critical CSS after page load
function loadCSS(href) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

// Load after page interactive
if (document.readyState === 'complete') {
  loadCSS('/styles/lazy-styles.css');
} else {
  window.addEventListener('load', () => {
    loadCSS('/styles/lazy-styles.css');
  });
}
```

---

## JavaScript Best Practices

### 1. Functionality Preservation Rules

#### Replicate Exact Behaviors
✅ **DO**: Analyze and replicate source page interactions
```javascript
// Source page behavior: Card click navigates to detail page
// blocks/cards/cards.js

export default function decorate(block) {
  const cards = [...block.children];
  
  cards.forEach((card) => {
    const link = card.querySelector('a');
    if (link) {
      const href = link.getAttribute('href');
      
      // Replicate exact click behavior from source
      card.style.cursor = 'pointer';
      card.setAttribute('role', 'link');
      card.setAttribute('tabindex', '0');
      
      // Click handler
      card.addEventListener('click', (e) => {
        if (e.target.tagName !== 'A') {
          window.location.href = href;
        }
      });
      
      // Keyboard handler (match source accessibility)
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          window.location.href = href;
        }
      });
    }
  });
}
```

#### Match Animation Triggers
```javascript
// Replicate scroll-triggered animations from source
// scripts/utils.js

export function initScrollAnimations() {
  const animatedElements = document.querySelectorAll('.fade-in, .slide-in');
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        // Match exact class name from source
        entry.target.classList.add('visible');
        // Don't re-trigger
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1, // Match source threshold
    rootMargin: '0px 0px -100px 0px' // Match source offset
  });
  
  animatedElements.forEach((el) => observer.observe(el));
}
```

### 2. Block Decoration Pattern

#### Standard Block Structure
```javascript
/**
 * Block decoration pattern
 * @param {HTMLElement} block - The block element
 */
export default function decorate(block) {
  // 1. Extract data from block
  const data = extractBlockData(block);
  
  // 2. Create semantic HTML structure
  const content = createBlockStructure(data);
  
  // 3. Replace block content
  block.innerHTML = '';
  block.appendChild(content);
  
  // 4. Attach event listeners
  attachEventListeners(block);
  
  // 5. Initialize any required functionality
  initializeBlock(block);
}

function extractBlockData(block) {
  // Extract data maintaining source structure
  const rows = [...block.children];
  return rows.map((row) => {
    const cells = [...row.children];
    return {
      image: cells[0]?.querySelector('img'),
      title: cells[1]?.textContent,
      description: cells[2]?.textContent,
      link: cells[3]?.querySelector('a'),
    };
  });
}

function createBlockStructure(data) {
  const container = document.createElement('div');
  container.className = 'block-container';
  
  data.forEach((item) => {
    const card = document.createElement('div');
    card.className = 'block-item';
    
    // Build structure matching source
    if (item.image) {
      card.appendChild(item.image);
    }
    
    if (item.title) {
      const title = document.createElement('h3');
      title.textContent = item.title;
      card.appendChild(title);
    }
    
    if (item.description) {
      const desc = document.createElement('p');
      desc.textContent = item.description;
      card.appendChild(desc);
    }
    
    if (item.link) {
      card.appendChild(item.link);
    }
    
    container.appendChild(card);
  });
  
  return container;
}
```

### 3. Interactive Features

#### Accordion (Match Source Behavior)
```javascript
// blocks/accordion/accordion.js
export default function decorate(block) {
  const items = [...block.children];
  
  items.forEach((item, index) => {
    const summary = item.children[0];
    const content = item.children[1];
    
    // Match source structure
    summary.classList.add('accordion-summary');
    content.classList.add('accordion-content');
    
    // Add ARIA attributes (match source accessibility)
    const id = `accordion-${index}`;
    summary.setAttribute('role', 'button');
    summary.setAttribute('aria-expanded', 'false');
    summary.setAttribute('aria-controls', id);
    summary.setAttribute('tabindex', '0');
    
    content.setAttribute('id', id);
    content.setAttribute('role', 'region');
    content.setAttribute('aria-labelledby', summary.id);
    content.style.display = 'none';
    
    // Match exact toggle behavior from source
    const toggle = () => {
      const isExpanded = summary.getAttribute('aria-expanded') === 'true';
      
      // Close all others (if source has this behavior)
      items.forEach((otherItem) => {
        const otherSummary = otherItem.children[0];
        const otherContent = otherItem.children[1];
        if (otherSummary !== summary) {
          otherSummary.setAttribute('aria-expanded', 'false');
          otherContent.style.display = 'none';
        }
      });
      
      // Toggle current
      summary.setAttribute('aria-expanded', !isExpanded);
      content.style.display = isExpanded ? 'none' : 'block';
      
      // Match animation from source
      if (!isExpanded) {
        content.style.animation = 'slideDown 300ms ease-out';
      }
    };
    
    // Click handler
    summary.addEventListener('click', toggle);
    
    // Keyboard handler (match source)
    summary.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggle();
      }
    });
  });
}
```

#### Tabs (Match Source Behavior)
```javascript
// blocks/tabs/tabs.js
export default function decorate(block) {
  const tabList = document.createElement('div');
  tabList.className = 'tab-list';
  tabList.setAttribute('role', 'tablist');
  
  const tabPanels = document.createElement('div');
  tabPanels.className = 'tab-panels';
  
  const items = [...block.children];
  
  items.forEach((item, index) => {
    const title = item.children[0]?.textContent;
    const content = item.children[1];
    
    // Create tab button (match source style)
    const tab = document.createElement('button');
    tab.className = 'tab';
    tab.textContent = title;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-selected', index === 0 ? 'true' : 'false');
    tab.setAttribute('aria-controls', `panel-${index}`);
    tab.setAttribute('id', `tab-${index}`);
    tab.setAttribute('tabindex', index === 0 ? '0' : '-1');
    
    // Create panel (match source structure)
    const panel = document.createElement('div');
    panel.className = 'tab-panel';
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('id', `panel-${index}`);
    panel.setAttribute('aria-labelledby', `tab-${index}`);
    panel.style.display = index === 0 ? 'block' : 'none';
    panel.appendChild(content);
    
    // Match exact tab switching behavior from source
    tab.addEventListener('click', () => {
      // Deactivate all tabs
      tabList.querySelectorAll('.tab').forEach((t) => {
        t.setAttribute('aria-selected', 'false');
        t.setAttribute('tabindex', '-1');
        t.classList.remove('active');
      });
      
      // Hide all panels
      tabPanels.querySelectorAll('.tab-panel').forEach((p) => {
        p.style.display = 'none';
      });
      
      // Activate clicked tab
      tab.setAttribute('aria-selected', 'true');
      tab.setAttribute('tabindex', '0');
      tab.classList.add('active');
      panel.style.display = 'block';
      
      // Match fade animation from source
      panel.style.animation = 'fadeIn 300ms ease-in';
    });
    
    // Keyboard navigation (match source)
    tab.addEventListener('keydown', (e) => {
      let newTab;
      if (e.key === 'ArrowRight') {
        newTab = tab.nextElementSibling || tabList.firstElementChild;
      } else if (e.key === 'ArrowLeft') {
        newTab = tab.previousElementSibling || tabList.lastElementChild;
      }
      
      if (newTab) {
        newTab.click();
        newTab.focus();
      }
    });
    
    tabList.appendChild(tab);
    tabPanels.appendChild(panel);
  });
  
  block.innerHTML = '';
  block.appendChild(tabList);
  block.appendChild(tabPanels);
}
```

### 4. Form Handling

#### Match Source Form Behavior
```javascript
// blocks/form/form.js
export default function decorate(block) {
  const form = block.querySelector('form');
  if (!form) return;
  
  // Match source validation behavior
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Clear previous errors (match source)
    form.querySelectorAll('.error').forEach((el) => el.remove());
    
    // Validate (match source validation rules)
    const isValid = validateForm(form);
    if (!isValid) return;
    
    // Show loading state (match source)
    const submitButton = form.querySelector('[type="submit"]');
    const originalText = submitButton.textContent;
    submitButton.textContent = 'Submitting...';
    submitButton.disabled = true;
    
    try {
      // Submit form (match source endpoint and method)
      const formData = new FormData(form);
      const response = await fetch(form.action, {
        method: form.method || 'POST',
        body: formData,
      });
      
      if (response.ok) {
        // Success handling (match source)
        showSuccessMessage(form);
        form.reset();
      } else {
        // Error handling (match source)
        showErrorMessage(form, 'Submission failed. Please try again.');
      }
    } catch (error) {
      showErrorMessage(form, 'Network error. Please try again.');
    } finally {
      // Restore button state
      submitButton.textContent = originalText;
      submitButton.disabled = false;
    }
  });
  
  // Real-time validation (if present in source)
  form.querySelectorAll('input, textarea, select').forEach((field) => {
    field.addEventListener('blur', () => {
      validateField(field);
    });
  });
}

function validateForm(form) {
  let isValid = true;
  
  // Match source validation rules exactly
  form.querySelectorAll('[required]').forEach((field) => {
    if (!field.value.trim()) {
      showFieldError(field, 'This field is required');
      isValid = false;
    }
  });
  
  // Email validation (match source pattern)
  form.querySelectorAll('[type="email"]').forEach((field) => {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (field.value && !emailPattern.test(field.value)) {
      showFieldError(field, 'Please enter a valid email address');
      isValid = false;
    }
  });
  
  return isValid;
}
```

### 5. Scroll Behaviors

#### Match Source Scroll Effects
```javascript
// scripts/utils.js

// Smooth scroll to anchor (match source behavior)
export function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (href === '#') return;
      
      e.preventDefault();
      const target = document.querySelector(href);
      
      if (target) {
        // Match source scroll behavior
        const headerHeight = document.querySelector('header')?.offsetHeight || 0;
        const targetPosition = target.offsetTop - headerHeight - 20;
        
        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth',
        });
        
        // Update URL (if source does this)
        history.pushState(null, '', href);
      }
    });
  });
}

// Sticky header (match source behavior)
export function initStickyHeader() {
  const header = document.querySelector('header');
  if (!header) return;
  
  let lastScroll = 0;
  
  window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    
    // Match exact behavior from source
    if (currentScroll > 100) {
      header.classList.add('scrolled');
      
      // Hide on scroll down, show on scroll up (if source has this)
      if (currentScroll > lastScroll) {
        header.classList.add('hidden');
      } else {
        header.classList.remove('hidden');
      }
    } else {
      header.classList.remove('scrolled', 'hidden');
    }
    
    lastScroll = currentScroll;
  });
}
```

### 6. Performance Optimization

#### Lazy Loading
```javascript
// scripts/delayed.js

// Lazy load images (match source lazy loading behavior)
export function lazyLoadImages() {
  const images = document.querySelectorAll('img[data-src]');
  
  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
        img.classList.add('loaded');
        observer.unobserve(img);
      }
    });
  }, {
    rootMargin: '50px', // Match source preload distance
  });
  
  images.forEach((img) => imageObserver.observe(img));
}

// Defer non-critical JavaScript
export function loadDelayedScripts() {
  // Load analytics, social widgets, etc. after page interactive
  const scripts = [
    { src: '/scripts/analytics.js', async: true },
    { src: '/scripts/social-widgets.js', defer: true },
  ];
  
  scripts.forEach(({ src, async, defer }) => {
    const script = document.createElement('script');
    script.src = src;
    if (async) script.async = true;
    if (defer) script.defer = true;
    document.body.appendChild(script);
  });
}
```

### 7. Error Handling

#### Robust Error Handling
```javascript
// Match source error handling patterns

export function handleError(error, context) {
  // Log error (match source logging)
  console.error(`Error in ${context}:`, error);
  
  // Show user-friendly message (match source UI)
  showNotification('An error occurred. Please try again.', 'error');
  
  // Report to analytics (if source does this)
  if (window.dataLayer) {
    window.dataLayer.push({
      event: 'error',
      errorContext: context,
      errorMessage: error.message,
    });
  }
}

// Graceful degradation
export function initFeature(feature, fallback) {
  try {
    feature();
  } catch (error) {
    handleError(error, 'Feature initialization');
    if (fallback) fallback();
  }
}
```

---

## Migration Verification Checklist

### Visual Parity Verification
- [ ] Compare side-by-side with source page
- [ ] Match colors exactly (use color picker)
- [ ] Match fonts and sizes exactly
- [ ] Match spacing and padding exactly
- [ ] Match border radius and shadows exactly
- [ ] Match hover states and transitions
- [ ] Verify responsive breakpoints match
- [ ] Check all device sizes (mobile, tablet, desktop)

### Functional Parity Verification
- [ ] All clicks work as in source
- [ ] All forms submit correctly
- [ ] All animations trigger correctly
- [ ] All scroll behaviors match
- [ ] All keyboard navigation works
- [ ] All accessibility features present
- [ ] All error states match
- [ ] All loading states match

### Performance Verification
- [ ] Page loads as fast or faster than source
- [ ] Images lazy load correctly
- [ ] No console errors
- [ ] No layout shift (CLS score good)
- [ ] Smooth animations (60fps)
- [ ] JavaScript executes without blocking
- [ ] Core Web Vitals meet targets

### Code Quality Verification
- [ ] CSS follows project architecture
- [ ] JavaScript follows ESLint rules
- [ ] No deprecated CSS properties
- [ ] Proper ARIA attributes added
- [ ] Comments explain complex logic
- [ ] Code is DRY (Don't Repeat Yourself)

---

## Tools for Verification

### Browser DevTools
Use Chrome/Firefox DevTools to:
1. **Inspect Elements**: Compare computed styles
2. **Network Tab**: Check resource loading
3. **Performance Tab**: Analyze rendering performance
4. **Console**: Check for errors
5. **Lighthouse**: Run performance/accessibility audits

### CSS Extraction
```javascript
// Extract computed styles from source page
const element = document.querySelector('.selector');
const styles = window.getComputedStyle(element);
console.log({
  padding: styles.padding,
  margin: styles.margin,
  fontSize: styles.fontSize,
  color: styles.color,
  backgroundColor: styles.backgroundColor,
  borderRadius: styles.borderRadius,
  boxShadow: styles.boxShadow
});
```

### Visual Comparison
1. Open source page and migrated page side-by-side
2. Take screenshots at same scroll position
3. Overlay screenshots in image editor
4. Check for pixel differences
5. Verify at multiple breakpoints

---

## Summary

### Key Principles for Pixel-Perfect Migration

1. **Extract Exact Values**: Use DevTools to get exact CSS values
2. **Match Typography**: Font family, size, weight, line-height
3. **Preserve Spacing**: Padding, margin, gap - all exact
4. **Replicate Animations**: Timing, easing, transforms
5. **Maintain Behaviors**: Click, hover, scroll, keyboard interactions
6. **Test Thoroughly**: Visual comparison, functional testing, performance testing

### Development Workflow

1. **Analyze Source**: Study source page thoroughly
2. **Extract Styles**: Get exact CSS values
3. **Document Behaviors**: Note all interactions
4. **Implement**: Build EDS version matching source
5. **Compare**: Side-by-side visual comparison
6. **Test**: Functional and performance testing
7. **Iterate**: Fix any discrepancies
8. **Validate**: Get stakeholder approval

---

**Last Updated**: 2026-02-27  
**Version**: 1.0  
**Maintained By**: EDS Migration Team
