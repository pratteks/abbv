# Block Reuse Strategy

## Overview
This document outlines the strategy for reusing and enhancing existing EDS blocks before creating new ones. Following this strategy ensures consistency, maintainability, and faster development.

## Available Blocks Inventory

### Content Blocks
1. **accordion** - Collapsible content sections
2. **cards** - Grid-based content display
3. **carousel** - Sliding content panels
4. **columns** - Multi-column layouts
5. **hero** - Page headers and featured content
6. **quote** - Pull quotes and testimonials
7. **separator** - Visual section dividers
8. **story-card** - Enhanced card with click-through
9. **table** - Tabular data display
10. **tabs** - Tabbed content organization

### Interactive Blocks
11. **embed** - Generic content embedding
12. **embed-form** - AEM form embedding
13. **eds-form** - Native EDS forms
14. **form** - Standard form block
15. **modal** - Popup/overlay content
16. **search** - Search functionality
17. **video** - Video player

### Navigation & Layout
18. **footer** - Site footer
19. **fragment** - Reusable content sections
20. **header** - Site header
21. **navigation-content** - Navigation with content

### Specialized Blocks
22. **press-releases** - Press release listings
23. **social-media** - Social media links
24. **stock-ticker** - Stock information display

## Decision Tree for Block Usage

### Step 1: Identify Content Type
Ask: "What type of content am I displaying?"

- **Text + Image**: → cards, columns, hero
- **List of Items**: → cards, table, accordion
- **Profile/Bio**: → hero, columns, quote
- **Video/Media**: → video, embed, carousel
- **Interactive Form**: → form, eds-form, embed-form
- **Navigation**: → tabs, accordion, navigation-content
- **Data/Comparison**: → table, columns
- **Quote/Testimonial**: → quote, columns

### Step 2: Check Existing Block Capabilities
Before creating a new block, verify:

1. **Can an existing block handle this with CSS classes?**
   - Example: `cards dark` vs creating `dark-cards` block
   
2. **Can I use a variation with data attributes?**
   - Example: `data-columns="3"` vs creating `three-column-cards`
   
3. **Can I combine multiple blocks?**
   - Example: hero + cards + separator vs one complex block

4. **Would a block enhancement serve multiple use cases?**
   - If yes: enhance existing block
   - If no: consider new block

### Step 3: Enhancement vs New Block
Create a **new block** only if:
- Functionality is fundamentally different
- Logic cannot be shared with existing blocks
- Performance would be significantly impacted by enhancement
- The feature is widely reused across many pages

**Enhance existing block** if:
- It's a visual variation only
- Logic is 80%+ similar
- It serves a specific brand or use case
- Performance impact is minimal

## Block Enhancement Patterns

### Pattern 1: CSS-Based Variations

**Use Case**: Visual styling differences

**Example**: Card variations
```css
/* blocks/cards/cards.css */
.cards.dark {
  background-color: var(--color-dark);
  color: var(--color-light);
}

.cards.centered {
  text-align: center;
}

.cards.compact .card {
  padding: 1rem;
}
```

**Usage**:
```markdown
Cards (dark, centered)
Card
...
```

### Pattern 2: Brand-Specific Variations

**Use Case**: Brand-specific styling

**Structure**:
```
blocks/
  cards/
    cards.css          (base styles)
    cards.js           (base functionality)
    abbvie/
      _cards.css       (AbbVie-specific overrides)
    botox/
      _cards.css       (Botox-specific overrides)
    rinvoq/
      _cards.css       (Rinvoq-specific overrides)
```

**Gulpfile** automatically processes these variations.

### Pattern 3: Data Attribute Variations

**Use Case**: Behavioral or structural differences

**Example**: Column counts
```javascript
// blocks/cards/cards.js
export default function decorate(block) {
  const columns = block.dataset.columns || '3';
  block.style.setProperty('--card-columns', columns);
}
```

**CSS**:
```css
.cards {
  grid-template-columns: repeat(var(--card-columns), 1fr);
}
```

**Usage**:
```markdown
Cards
Columns: 4
Card
...
```

### Pattern 4: Combining Blocks

**Use Case**: Complex layouts

**Instead of creating one complex block**, combine simpler blocks:

```markdown
Hero
Image: hero-image.jpg
Title: Page Title
---
Separator
---
Cards
Card 1...
---
Columns (2-1)
Column 1 content
---
Column 2 content
---
Separator
---
Quote
Text: Quote text...
```

## Common Reuse Scenarios

### Scenario 1: Team Member Grid

**Requirements**: Display team members with photos, names, titles, bios

**Solution**: Use existing **cards block**
```markdown
Cards
Card (Team Member 1)
Image: /images/member-1.jpg
Title: John Doe, Ph.D.
Description: Vice President of Research
Link: View Profile | /team/john-doe
---
Card (Team Member 2)
...
```

**Why not create new "team" block?**
- Cards block already handles grid layouts
- Image + title + description + link is standard card structure
- Can add `cards team` CSS class for specific styling

### Scenario 2: Product Features

**Requirements**: Display product features with icons, titles, descriptions

**Solution**: Use **columns block** or **cards block**

**Option A - Columns** (for fewer items, side-by-side):
```markdown
Columns (1-1-1)
### Feature 1
Description of feature 1
---
### Feature 2
Description of feature 2
---
### Feature 3
Description of feature 3
```

**Option B - Cards** (for many items, grid layout):
```markdown
Cards (features)
Card
Image: /icons/feature-1.svg
Title: Feature 1
Description: Description text
```

### Scenario 3: FAQ Section

**Requirements**: Collapsible questions and answers

**Solution**: Use existing **accordion block**
```markdown
Accordion
Accordion Item
Summary: What is AbbVie?
Text: AbbVie is a global biopharmaceutical company...
---
Accordion Item
Summary: Where is AbbVie located?
Text: AbbVie has offices worldwide...
```

**Why not create "faq" block?**
- Accordion perfectly handles collapsible content
- Can add `accordion faq` CSS class for specific styling
- Reuses existing accessibility and interaction patterns

### Scenario 4: Leadership Profile

**Requirements**: Photo, bio, credentials, quote

**Solution**: Combine **hero**, **columns**, and **quote blocks**
```markdown
Hero
Image: /images/leader.jpg
Title: Jane Smith, M.D.
Description: Chief Scientific Officer
---
Columns (2-1)
### Biography
Full biography text here...
---
### Education
- M.D., Harvard Medical School
- Ph.D., MIT
---
Quote
Text: "Innovation drives everything we do."
Author: Jane Smith, M.D.
```

### Scenario 5: Video Gallery

**Requirements**: Grid of videos with thumbnails

**Solution**: Use **cards block** linking to video pages
```markdown
Cards (videos)
Card
Image: /images/video-1-thumb.jpg
Title: Video Title 1
Description: Video description
Link: Watch | /videos/video-1
---
Card
Image: /images/video-2-thumb.jpg
Title: Video Title 2
Description: Video description
Link: Watch | /videos/video-2
```

**Individual video page**:
```markdown
Hero
Title: Video Title
Description: Video description
---
Video
URL: https://youtube.com/watch?v=VIDEO_ID
---
Text Section
Additional context about video...
```

## Block Enhancement Guidelines

### When to Enhance

✅ **DO enhance** when:
- Visual styling differences only
- 80%+ code reuse
- Serves specific brand needs
- Improves user experience without breaking changes
- Adding optional features (backward compatible)

❌ **DON'T enhance** when:
- Completely different functionality
- Would break existing implementations
- Performance impact is significant
- Makes block too complex/hard to maintain

### How to Enhance

#### 1. CSS-Only Enhancement
**Best for**: Visual variations

**Steps**:
1. Add CSS class variations to base CSS file
2. Document new classes in block README
3. Test with existing implementations
4. Update component definition if needed

#### 2. JavaScript Enhancement
**Best for**: Behavioral variations

**Steps**:
1. Add feature flag or data attribute
2. Check for flag before executing new code
3. Ensure backward compatibility
4. Add feature tests
5. Update documentation

#### 3. Brand-Specific Enhancement
**Best for**: Theme-specific styling

**Steps**:
1. Create brand subfolder (e.g., `blocks/cards/abbvie/`)
2. Add `_cards.css` with brand overrides
3. Gulpfile automatically processes
4. Test with brand context

### Enhancement Example

**Original cards.js**:
```javascript
export default function decorate(block) {
  const cards = [...block.children];
  cards.forEach((card) => {
    card.classList.add('card');
  });
}
```

**Enhanced cards.js** (adding hover effects):
```javascript
export default function decorate(block) {
  const cards = [...block.children];
  const enableHover = block.classList.contains('hover');
  
  cards.forEach((card) => {
    card.classList.add('card');
    
    // New enhancement - backward compatible
    if (enableHover) {
      card.addEventListener('mouseenter', () => {
        card.classList.add('card-hover');
      });
      card.addEventListener('mouseleave', () => {
        card.classList.remove('card-hover');
      });
    }
  });
}
```

**Usage**:
```markdown
Cards (hover)
Card
...
```

## Block Combination Patterns

### Pattern 1: Hero + Cards (Landing Page)
```markdown
Hero
Title: Welcome
Description: Intro text
---
Cards
Card 1...
Card 2...
Card 3...
```

### Pattern 2: Columns + Quote (Profile)
```markdown
Columns (2-1)
Bio content...
---
Details...
---
Quote
Text: Quote text...
```

### Pattern 3: Tabs + Cards (Organized Content)
```markdown
Tabs
Tabs Item
Title: Category 1
Content:
Cards
Card 1...
Card 2...
---
Tabs Item
Title: Category 2
Content:
Cards
Card 3...
Card 4...
```

### Pattern 4: Accordion + Table (Data Display)
```markdown
Accordion
Accordion Item
Summary: 2024 Data
Text:
Table
| Q1 | Q2 | Q3 | Q4 |
| -- | -- | -- | -- |
| 10 | 12 | 15 | 18 |
---
Accordion Item
Summary: 2023 Data
Text:
Table
...
```

## Anti-Patterns (What NOT to Do)

### ❌ Anti-Pattern 1: Block Proliferation
**Don't**: Create `team-cards`, `product-cards`, `feature-cards`, `leader-cards`
**Do**: Use `cards` with CSS classes: `cards team`, `cards product`, etc.

### ❌ Anti-Pattern 2: Hyper-Specific Blocks
**Don't**: Create `ceo-profile` block used only once
**Do**: Combine hero + columns + quote blocks

### ❌ Anti-Pattern 3: Duplicate Functionality
**Don't**: Create new block that does 90% of what existing block does
**Do**: Enhance existing block with new features

### ❌ Anti-Pattern 4: Monolithic Blocks
**Don't**: Create one massive block that does everything
**Do**: Break into smaller, composable blocks

### ❌ Anti-Pattern 5: Non-Semantic Classes
**Don't**: `cards red-big-bold`
**Do**: `cards featured` with semantic CSS

## Block Reuse Checklist

Before creating a new block, verify:

- [ ] I've reviewed all existing blocks
- [ ] I've checked if CSS classes can handle the variation
- [ ] I've considered data attributes for behavior changes
- [ ] I've explored combining multiple blocks
- [ ] I've verified the need isn't met by enhancement
- [ ] I've confirmed this will be reused across multiple pages
- [ ] I've documented why existing blocks don't work
- [ ] I've gotten approval from technical lead

## Documentation Requirements

When enhancing a block:

1. **Update block README**:
   - New CSS classes and their purpose
   - New data attributes and their values
   - Usage examples
   - Migration notes if breaking changes

2. **Update component-definition.json**:
   - Add new variations if needed
   - Update model properties
   - Add examples

3. **Create examples**:
   - Add example page using new features
   - Include before/after screenshots
   - Document edge cases

4. **Update this guide**:
   - Add new pattern to relevant section
   - Include in decision tree if applicable
   - Add to common scenarios if widely used

## Performance Considerations

### Lazy Loading
- Use existing lazy loading for images
- Don't create custom image loading per block
- Leverage EDS built-in optimization

### JavaScript Minimization
- Reuse common utilities
- Share event listeners where possible
- Avoid duplicate functionality

### CSS Optimization
- Use CSS variables for theming
- Leverage existing design tokens
- Minimize custom CSS per block

## Testing Requirements

When enhancing blocks:

1. **Regression Testing**:
   - Test all existing implementations
   - Verify backward compatibility
   - Check across brands/themes

2. **New Feature Testing**:
   - Test new variations
   - Verify responsive behavior
   - Check accessibility

3. **Performance Testing**:
   - Measure load time impact
   - Check Lighthouse scores
   - Verify Core Web Vitals

## Maintenance Strategy

### Regular Reviews
- Quarterly review of block usage
- Identify consolidation opportunities
- Remove unused variations
- Update documentation

### Deprecation Process
1. Mark as deprecated in docs
2. Provide migration path
3. Give 6-month notice
4. Remove in major version

---

**Last Updated**: 2026-02-27
**Version**: 1.0
