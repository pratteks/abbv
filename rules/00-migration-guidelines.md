# EDS Migration Guidelines

## Overview
This document provides comprehensive guidelines for migrating AbbVie website pages to Adobe Edge Delivery Services (EDS) using the Franklin framework.

## Core Principles

### 1. Block Reuse Strategy
- **ALWAYS check existing blocks first** before creating new ones
- Review the available blocks in `/blocks` directory:
  - accordion
  - cards
  - carousel
  - columns
  - embed
  - embed-form
  - eds-form
  - footer
  - form
  - fragment
  - header
  - hero
  - modal
  - navigation-content
  - press-releases
  - quote
  - search
  - separator
  - social-media
  - stock-ticker
  - story-card
  - table
  - tabs
  - video

### 2. Block Enhancement Over Creation
- If an existing block is similar but lacks specific features:
  - **First Option**: Enhance the existing block with variations
  - **Use CSS classes** for styling variations (e.g., `cards dark`, `hero centered`)
  - **Add data attributes** for behavioral variations
  - **Only create new block** if functionality is fundamentally different

### 3. Block Variation Pattern
When creating variations of existing blocks:
```
blocks/
  cards/
    cards.css       (base styles)
    cards.js        (base functionality)
    abbvie/
      _cards.css    (brand-specific styles)
    botox/
      _cards.css    (brand-specific styles)
    rinvoq/
      _cards.css    (brand-specific styles)
```

### 4. Content Preservation Rules
- **External Links**: Keep all external links exactly as they are (do not modify URLs)
- **Internal Links**: Convert to relative paths (e.g., `/science/our-people`)
- **Images**: Optimize and serve from EDS media library
- **Videos**: Use video block or embed block based on source
- **Forms**: Use eds-form or embed-form blocks

## Migration Workflow

### Phase 1: Analysis
1. Review the source page structure
2. Identify content sections and their purpose
3. Map sections to existing EDS blocks
4. Document any custom requirements

### Phase 2: Block Mapping
1. Create a block mapping document for each page
2. List all sections with their corresponding EDS blocks
3. Note any required enhancements or new blocks
4. Get approval before proceeding

### Phase 3: Content Migration
1. Extract content from source page
2. Structure content according to block requirements
3. Preserve all metadata (titles, descriptions, alt text)
4. Maintain proper heading hierarchy (h1, h2, h3, etc.)

### Phase 4: Styling & Testing
1. Apply brand-specific styles if needed
2. Test responsive behavior (mobile, tablet, desktop)
3. Verify all links and interactions
4. Check accessibility (WCAG 2.1 AA compliance)

## Best Practices

### Semantic HTML
- Use proper heading levels (h1 → h2 → h3)
- Use semantic tags (article, section, nav, aside)
- Add proper ARIA labels where needed
- Ensure keyboard navigation works

### Performance
- Lazy load images (use EDS built-in lazy loading)
- Optimize image sizes (use WebP format)
- Minimize JavaScript execution
- Use CSS for animations where possible

### Accessibility
- Add alt text to all images
- Ensure sufficient color contrast
- Provide keyboard navigation
- Add ARIA labels for interactive elements
- Test with screen readers

### SEO
- Maintain proper heading hierarchy
- Keep metadata (title, description)
- Preserve URL structure where possible
- Add proper schema markup
- Ensure fast loading times

### Content Structure
- Keep paragraphs concise (2-3 sentences)
- Use bullet points for lists
- Add white space for readability
- Break long pages into sections
- Use meaningful section names

## Block Usage Guidelines

### Hero Block
Use for: Page headers, featured content, main call-to-action sections
```
Hero
Image: /path/to/image.jpg
Title: Main heading
Description: Supporting text
CTA: Learn More | /path/to/page
```

### Cards Block
Use for: Content grids, feature lists, team members, product showcases
```
Cards
Card
Image: /path/to/image.jpg
Title: Card title
Description: Card description
Link: Read more | /path/to/page
```

### Columns Block
Use for: Side-by-side content, text with images, multi-column layouts
```
Columns (2-1)
Column 1 content here
---
Column 2 content here
```

### Accordion Block
Use for: FAQs, collapsible content, long lists
```
Accordion
Accordion Item
Summary: Question or title
Text: Answer or content
```

### Tabs Block
Use for: Grouped content, category navigation
```
Tabs
Tabs Item
Title: Tab name
Content: Tab content here
```

### Table Block
Use for: Data presentation, comparison charts, pricing tables
```
Table
| Column 1 | Column 2 | Column 3 |
| Data 1   | Data 2   | Data 3   |
```

### Quote Block
Use for: Testimonials, highlighted quotes, pull quotes
```
Quote
Text: The quote text here
Author: Author name
Title: Author title
```

### Video Block
Use for: Video embeds, multimedia content
```
Video
URL: https://www.youtube.com/watch?v=VIDEO_ID
```

### Fragment Block
Use for: Reusable content sections (headers, footers, common sections)
```
Fragment
Path: /fragments/header
```

## Quality Checklist

Before considering a page migration complete:

- [ ] All content migrated accurately
- [ ] External links preserved exactly
- [ ] Internal links converted to relative paths
- [ ] Images optimized and loading correctly
- [ ] Responsive design works on all devices
- [ ] Accessibility tested (keyboard navigation, screen reader)
- [ ] Page loads in under 2 seconds
- [ ] No console errors
- [ ] SEO metadata present
- [ ] Brand styles applied correctly
- [ ] All interactions working as expected
- [ ] Cross-browser tested (Chrome, Safari, Firefox, Edge)

## Common Patterns

### Team/People Pages
- Use **cards block** for team member grids
- Use **hero block** for department/team headers
- Use **columns block** for individual bios
- Add structured data for person schema

### Leadership Profile Pages
- Use **hero block** for profile header with image
- Use **columns block** for bio and details
- Use **quote block** for notable quotes
- Use **cards block** for related content

### Content/Article Pages
- Use **hero block** for article header
- Use **text sections** for body content
- Use **columns block** for sidebars
- Use **cards block** for related articles
- Use **separator block** between major sections

### Landing Pages
- Use **hero block** for main header
- Use **cards block** for features/benefits
- Use **columns block** for detailed information
- Use **form/embed-form** for lead capture
- Use **social-media block** for social links

## Troubleshooting

### Issue: Content doesn't fit existing blocks
**Solution**: First try block variations with CSS classes, then consider creating a new block

### Issue: Complex layouts
**Solution**: Break into multiple simpler blocks rather than one complex block

### Issue: Performance problems
**Solution**: Review image sizes, lazy loading, and JavaScript execution

### Issue: Styling inconsistencies
**Solution**: Use brand-specific theme files in block subdirectories

## Resources

- [EDS Documentation](https://www.aem.live/docs/)
- [Franklin GitHub](https://github.com/adobe/franklin)
- [Component Library](../component-definition.json)
- [Block Examples](../blocks/)
- [Style Guide](../styles/)

---

**Last Updated**: 2026-02-27
**Version**: 1.0
