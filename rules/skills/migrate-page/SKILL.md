---
name: migrate-page
description: Guide for migrating AbbVie pages to EDS following established templates and maintaining pixel-perfect visual parity. Use this skill when migrating pages from existing AbbVie sites to Edge Delivery Services.
---

# Migrate Page

This skill guides you through migrating AbbVie pages to Adobe Edge Delivery Services while maintaining pixel-perfect visual and functional parity with source pages.

## When to Use This Skill

Use this skill when:
- Migrating existing AbbVie pages to EDS
- Converting leadership/team/profile pages
- Migrating content pages with specific structures
- Ensuring exact look and feel preservation from source

## Prerequisites

Before starting:
- [ ] Source page URL available
- [ ] Access to source page for analysis
- [ ] Understanding of page type (Landing, List, Profile, Content)
- [ ] Dev server running (`npm start`)
- [ ] Familiarity with available blocks (see rules/02-block-reuse-strategy.md)

## Related Documentation

- **rules/00-migration-guidelines.md** - Overall migration framework
- **rules/01-leadership-team-pages-migration.md** - Page-specific templates
- **rules/02-block-reuse-strategy.md** - Block selection guide
- **rules/03-best-practices-summary.md** - Quick reference checklist
- **rules/04-css-js-best-practices.md** - Pixel-perfect implementation
- **rules/06-component-documentation-protocol.md** - MANDATORY when creating new components

## Migration Workflow

Track your progress:
- [ ] Step 1: Analyze Source Page
- [ ] Step 2: Identify Page Type and Select Template
- [ ] Step 3: Map Content to EDS Blocks
- [ ] Step 4: Create Page Structure
- [ ] Step 5: Implement Pixel-Perfect CSS/JS
- [ ] Step 6: Verify and Test
- [ ] Step 7: Quality Assurance

---

## Step 1: Analyze Source Page

### 1.1 Examine Page Structure

Visit the source page and analyze:

```
1. Page sections (header, hero, content sections, footer)
2. Content types (text, images, cards, forms, etc.)
3. Interactive elements (accordions, tabs, carousels, etc.)
4. Visual elements (colors, spacing, typography, animations)
5. Responsive behavior at different breakpoints
```

### 1.2 Extract Key Information

Use browser DevTools to extract:

```javascript
// In browser console on source page
const extractPageInfo = () => {
  return {
    title: document.title,
    metaDescription: document.querySelector('meta[name="description"]')?.content,
    h1: document.querySelector('h1')?.textContent,
    sections: document.querySelectorAll('section, .section, [class*="section"]').length,
    images: document.querySelectorAll('img').length,
    links: {
      internal: [...document.querySelectorAll('a')].filter(a => a.hostname === location.hostname).length,
      external: [...document.querySelectorAll('a')].filter(a => a.hostname !== location.hostname).length
    }
  };
};
console.log(extractPageInfo());
```

### 1.3 Extract Exact CSS Values

For pixel-perfect migration, extract exact values:

```javascript
// Extract computed styles for specific element
const element = document.querySelector('.your-selector');
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

**Document these values** - you'll need them for CSS implementation.

---

## Step 2: Identify Page Type and Select Template

### Page Type Classification

Based on analysis, identify the page type:

#### Type 1: Landing Page
**Characteristics:**
- Overview/hub page
- Navigation to sub-sections
- Multiple content sections
- Call-to-action elements

**Template:** See `rules/01-leadership-team-pages-migration.md` Section: Landing Page

#### Type 2: List Page  
**Characteristics:**
- Directory/grid of items
- Team members, products, articles
- Consistent item layout

**Template:** See `rules/01-leadership-team-pages-migration.md` Section: List Page

#### Type 3: Profile Page
**Characteristics:**
- Individual person/item details
- Photo + biographical information
- Detailed content sections

**Template:** See `rules/01-leadership-team-pages-migration.md` Section: Profile Page

#### Type 4: Content Page
**Characteristics:**
- Article or feature content
- Text-heavy with images
- May include multimedia

**Template:** See `rules/01-leadership-team-pages-migration.md` Section: Content Page

---

## Step 3: Map Content to EDS Blocks

### 3.1 Review Available Blocks

Check available blocks:
```bash
ls blocks/
```

**Available blocks (24 total):**
- Content: accordion, cards, carousel, columns, hero, quote, separator, story-card, table, tabs
- Interactive: embed, embed-form, eds-form, form, modal, search, video
- Navigation: footer, fragment, header, navigation-content
- Specialized: press-releases, social-media, stock-ticker

### 3.2 Block Selection Decision Tree

Use the decision tree from `rules/02-block-reuse-strategy.md`:

```
Is there an existing block that does EXACTLY what you need?
├─ YES → Use it
└─ NO → Can an existing block be enhanced with CSS?
    ├─ YES → Use existing block + custom CSS
    └─ NO → Can you combine multiple blocks?
        ├─ YES → Use combination
        └─ NO → Only now consider creating new block
```

### 3.3 Create Content Mapping

Map each source page section to EDS blocks:

```markdown
Source Section 1: Page Header with Image
→ EDS Block: Hero
  - Image: /path/to/image.jpg
  - Title: [Page Title]
  - Description: [Description]

Source Section 2: Team Grid (12 members)
→ EDS Block: Cards
  - Each card: image, name, title, link
  - 3 columns on desktop
  - 2 columns on tablet
  - 1 column on mobile

Source Section 3: Biography Content
→ EDS Block: Columns (2-1 layout)
  - Left: Main bio text
  - Right: Quick facts, education
```

---

## Step 4: Create Page Structure

### 4.1 Create Markdown File

Create the page file:
```bash
# For main branch structure:
# {your-site}/en/{section}/{page}.md

# Example:
mkdir -p science/our-people
touch science/our-people/our-rd-leaders.md
```

### 4.2 Add Metadata

```markdown
---
Title: Page Title Here
Description: Meta description (150-160 characters)
Keywords: keyword1, keyword2, keyword3
---
```

### 4.3 Add Block Structure

Following your mapping, add blocks:

```markdown
---
Title: Our R&D Leaders
Description: Meet the visionary leaders advancing AbbVie's research and development
---

Hero
Image: /science/images/rd-leaders-hero.jpg
Title: Our R&D Leaders
Description: Meet the visionary leaders advancing AbbVie's research and development
---
Text Section
Content: Introduction about the R&D leadership team...
---
Cards
Card (Andrew Campbell)
Image: /science/images/leaders/andrew-campbell.jpg
Title: Andrew Campbell, Ph.D.
Description: Chief Scientific Officer
Link: Read Bio | /science/our-people/our-rd-leaders/andrew-campbell
---
Card (Darin Messina)
Image: /science/images/leaders/darin-messina.jpg
Title: Darin Messina, Ph.D.
Description: VP of Research
Link: Read Bio | /science/our-people/our-rd-leaders/darin-messina
```

### 4.4 Handle Links Properly

**CRITICAL RULES:**

✅ **Internal links - Convert to relative paths:**
```markdown
Link: View Profile | /science/our-people/profile-name
NOT: https://www.abbvie.com/science/our-people/profile-name.html
```

✅ **External links - Keep exactly as is:**
```markdown
Link: PubMed | https://pubmed.ncbi.nlm.nih.gov/12345678/
Link: LinkedIn | https://www.linkedin.com/in/username
```

---

## Step 5: Implement Pixel-Perfect CSS/JS

### 5.1 Reference CSS Guidelines

**MANDATORY**: Read `rules/04-css-js-best-practices.md` for:
- Extracting exact CSS values from source
- Matching typography (font family, size, weight, line-height)
- Preserving spacing (padding, margin, gap)
- Replicating animations (timing, easing, transforms)

### 5.2 Create Brand-Specific Styles (if needed)

If using brand-specific styles:

```
blocks/
  cards/
    cards.css              (base styles)
    cards.js               (base functionality)
    abbvie/
      _cards.css           (AbbVie brand overrides)
```

Example override:
```css
/* blocks/cards/abbvie/_cards.css */
@import url('../cards.css');

.cards .card {
  border-top: 4px solid var(--color-primary); /* AbbVie brand element */
}

.cards .card h3 {
  font-family: var(--font-family-primary);
  color: #071D49; /* AbbVie Navy - exact from source */
}
```

### 5.3 Extract Exact Values from Source

Use DevTools on source page:

```javascript
// Get exact spacing
const card = document.querySelector('.card-selector');
const cardStyles = window.getComputedStyle(card);

console.log(`
  padding: ${cardStyles.padding};          // Use EXACT value
  margin-bottom: ${cardStyles.marginBottom}; // Use EXACT value
  border-radius: ${cardStyles.borderRadius}; // Use EXACT value
  box-shadow: ${cardStyles.boxShadow};       // Use EXACT value
`);
```

Apply these EXACT values in your CSS - don't approximate!

### 5.4 Match Animations Exactly

If source has animations:

```css
/* Extract exact timing from source */
.card {
  transition: transform 300ms ease-in-out; /* Match source exactly */
}

.card:hover {
  transform: translateY(-8px); /* Match source translation */
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15); /* Match source shadow */
}
```

---

## Step 6: Verify and Test

### 6.1 Visual Comparison

1. Open source page in one browser tab
2. Open migrated page in another tab  
3. Compare side-by-side:
   - Layout and spacing
   - Colors and fonts
   - Images and sizing
   - Hover states
   - Responsive behavior

### 6.2 Functional Testing

Test all interactions:
- [ ] Links work correctly (internal converted to relative, external preserved)
- [ ] Hover states match source
- [ ] Click behaviors match source
- [ ] Keyboard navigation works
- [ ] Forms submit correctly (if applicable)

### 6.3 Responsive Testing

Test at breakpoints:
- [ ] Mobile (320px, 375px, 414px)
- [ ] Tablet (768px, 834px)
- [ ] Desktop (1024px, 1440px, 1920px)

### 6.4 Browser Testing

Test in:
- [ ] Chrome/Edge
- [ ] Firefox
- [ ] Safari

---

## Step 7: Quality Assurance

### 7.1 Use the Complete Checklist

From `rules/03-best-practices-summary.md`:

**Content Accuracy:**
- [ ] All content migrated accurately
- [ ] No text missing or truncated
- [ ] Images present and correct

**Links:**
- [ ] External links preserved unchanged
- [ ] Internal links converted to relative paths
- [ ] All links tested and working

**Images:**
- [ ] Optimized (WebP format)
- [ ] Appropriate sizes (hero: 1920x1080, cards: 400x300, profiles: 800x800)
- [ ] Descriptive alt text added
- [ ] Images load correctly

**Responsive Design:**
- [ ] Works on mobile, tablet, desktop
- [ ] No horizontal scroll on mobile
- [ ] Touch targets appropriate size (min 44x44px)

**Accessibility (WCAG 2.1 AA):**
- [ ] Proper heading hierarchy (no skipped levels)
- [ ] Color contrast ≥ 4.5:1
- [ ] Keyboard navigation functional
- [ ] Focus indicators visible
- [ ] ARIA labels where needed
- [ ] Alt text on all images

**Performance:**
- [ ] Page loads < 2 seconds
- [ ] Images lazy load
- [ ] No console errors
- [ ] Core Web Vitals good (LCP < 2.5s, FID < 100ms, CLS < 0.1)

**SEO:**
- [ ] Title tag present and descriptive (50-60 characters)
- [ ] Meta description present (150-160 characters)
- [ ] Proper heading hierarchy
- [ ] Image alt text descriptive
- [ ] Structured data added (if applicable)

### 7.2 Lighthouse Audit

Run Lighthouse audit:
```bash
# In browser DevTools
# Lighthouse tab → Generate report
# Target scores:
# Performance: ≥ 90
# Accessibility: 100
# Best Practices: ≥ 90
# SEO: 100
```

### 7.3 Side-by-Side Screenshot Comparison

Take screenshots of both pages:
1. Full page screenshot of source
2. Full page screenshot of migrated
3. Overlay in image editor
4. Verify pixel-perfect match
5. Document any intentional differences

---

## Special Cases

### Creating New Blocks

If you need to create a new block (after confirming no existing block works):

**MANDATORY**: Follow `rules/06-component-documentation-protocol.md`

You MUST:
1. Create the block files (JS, CSS, README.md)
2. **Immediately update documentation:**
   - rules/02-block-reuse-strategy.md (add to inventory)
   - rules/00-migration-guidelines.md (add usage example)
   - rules/03-best-practices-summary.md (add to selection guide)
   - rules/README.md (update block count)
3. **Announce** what you updated
4. **Verify** all documentation is consistent

### Multi-Brand Setup

If working with multiple brands (AbbVie, Botox, Rinvoq):

See `rules/05-cms-component-architecture.md` for:
- Token-driven styling system
- Brand-specific theme structure
- Zero structural forks approach

---

## Common Patterns

### Hero with Background Image
```markdown
Hero
Image: /images/hero-bg.jpg
Title: Page Title
Description: Page description
```

### Team Member Grid
```markdown
Cards
Card (Member 1)
Image: /images/member1.jpg
Title: John Doe, Ph.D.
Description: Chief Scientific Officer
Link: View Profile | /team/john-doe
```

### Biography with Sidebar
```markdown
Columns (2-1)
### Main Biography
[Full biography text...]

### Education
- Ph.D., University Name
- M.S., University Name
```

### Accordion for Additional Info
```markdown
Accordion
Accordion Item
Summary: Publications
Text: [List of publications...]
---
Accordion Item
Summary: Awards
Text: [List of awards...]
```

---

## Troubleshooting

### Issue: Content not appearing
- Check markdown syntax (proper spacing, separators)
- Verify block names match exactly (case-sensitive)
- Check for typos in block structure

### Issue: Styles not matching source
- Extract EXACT values from source (don't approximate)
- Check CSS specificity
- Verify brand theme is loading
- Use browser DevTools to compare computed styles

### Issue: Links not working
- Verify internal links use relative paths (no domain)
- Check for typos in paths
- Ensure external links include https://

### Issue: Images not loading
- Check file paths are correct
- Verify images exist in repository
- Check image file extensions match
- Ensure images are in correct format (WebP preferred)

---

## Success Criteria

Migration is complete when:

✅ Visual parity achieved (matches source pixel-for-pixel)
✅ All functionality working (links, interactions, forms)
✅ Responsive behavior matches source
✅ Accessibility requirements met (WCAG 2.1 AA)
✅ Performance targets achieved (Core Web Vitals)
✅ Quality checklist 100% complete
✅ Stakeholder approval obtained

---

## Next Steps

After successful migration:
1. Document any learnings or patterns discovered
2. Update templates if new patterns emerged
3. Share with team for review
4. Prepare for next page migration

---

## Reference Materials

- `rules/00-migration-guidelines.md` - Complete migration framework
- `rules/01-leadership-team-pages-migration.md` - Page templates
- `rules/02-block-reuse-strategy.md` - Block selection guide
- `rules/03-best-practices-summary.md` - Quick reference
- `rules/04-css-js-best-practices.md` - CSS/JS implementation
- `rules/05-cms-component-architecture.md` - Architecture principles
- `rules/06-component-documentation-protocol.md` - MANDATORY for new components
