# EDS Migration Best Practices Summary

## Quick Reference Guide

This document provides a quick reference for best practices when migrating AbbVie pages to Adobe Edge Delivery Services (EDS).

## Golden Rules

### 🔑 Rule 1: Block Reuse First
**ALWAYS check existing blocks before creating new ones.**
- Review `/blocks` directory
- Check if CSS classes can handle variations
- Consider combining blocks for complex layouts
- Only create new blocks for fundamentally different functionality

### 🔑 Rule 2: Preserve External Links
**Keep all external links exactly as they appear.**
- ✅ `https://pubmed.ncbi.nlm.nih.gov/12345678/`
- ✅ `https://www.linkedin.com/in/username`
- ✅ `https://youtube.com/watch?v=VIDEO_ID`
- ❌ Don't modify or shorten external URLs

### 🔑 Rule 3: Convert Internal Links
**Use relative paths for internal AbbVie links.**
- ✅ `/science/our-people/our-rd-leaders`
- ❌ `https://www.abbvie.com/science/our-people/our-rd-leaders.html`
- ❌ `our-rd-leaders.html`

### 🔑 Rule 4: Semantic Markup
**Use proper HTML semantics and accessibility.**
- Proper heading hierarchy (h1 → h2 → h3)
- Descriptive alt text for all images
- Keyboard navigation support
- ARIA labels where needed

### 🔑 Rule 5: Performance First
**Optimize for speed and user experience.**
- Lazy load images (use EDS built-in)
- Optimize image sizes (WebP format)
- Minimize JavaScript
- Target < 2 second page load

## Content Migration Checklist

### Before Starting
- [ ] Review source page structure
- [ ] Identify content sections
- [ ] Map to existing EDS blocks
- [ ] Document custom requirements
- [ ] Get stakeholder approval

### During Migration
- [ ] Preserve all content accurately
- [ ] Convert internal links to relative paths
- [ ] Keep external links unchanged
- [ ] Optimize images (WebP, appropriate sizes)
- [ ] Maintain heading hierarchy
- [ ] Add proper alt text
- [ ] Test responsive behavior

### After Migration
- [ ] Verify all links work
- [ ] Check responsive design (mobile/tablet/desktop)
- [ ] Test accessibility (keyboard, screen reader)
- [ ] Validate SEO metadata
- [ ] Check page load performance (< 2 seconds)
- [ ] Cross-browser testing
- [ ] Get approval before publishing

## Block Selection Guide

### For Text + Images
**Use**: hero, cards, columns
```markdown
Hero
Image: /path/to/image.jpg
Title: Heading
Description: Supporting text
```

### For Grids/Lists
**Use**: cards, table
```markdown
Cards
Card
Image: /path/to/image.jpg
Title: Card title
Description: Card description
Link: Read more | /path/to/page
```

### For Profiles/Bios
**Use**: hero + columns + quote
```markdown
Hero
Image: /images/person.jpg
Title: Name, Credentials
Description: Title/Position
---
Columns (2-1)
Biography content...
---
Details...
---
Quote
Text: "Quote text"
Author: Name
```

### For Collapsible Content
**Use**: accordion, tabs
```markdown
Accordion
Accordion Item
Summary: Question
Text: Answer
```

### For Videos
**Use**: video block
```markdown
Video
URL: https://youtube.com/watch?v=VIDEO_ID
```

### For Forms
**Use**: form, eds-form, embed-form
```markdown
EDS Form
Form Path: /forms/contact-form
```

## Image Guidelines

### Sizes & Formats
| Image Type | Dimensions | Format |
|------------|------------|--------|
| Hero Images | 1920x1080px min | WebP |
| Card Images | 400x300px | WebP |
| Profile Photos | 800x800px | WebP |
| Thumbnails | 300x200px | WebP |
| Icons | SVG preferred | SVG |

### Alt Text Rules
- **Profile photos**: `[Name], [Title] at AbbVie`
- **Content images**: Descriptive text about content
- **Decorative images**: Empty alt `alt=""`
- **Complex diagrams**: Provide detailed description

### Optimization
- Use WebP format for photos
- Use SVG for icons and logos
- Compress images before upload
- Leverage EDS lazy loading
- Use responsive images

## Link Handling

### Internal Links
```markdown
✅ /science/our-people
✅ /about/leadership
✅ /contact
❌ https://www.abbvie.com/science/our-people.html
❌ science/our-people.html
```

### External Links
```markdown
✅ https://pubmed.ncbi.nlm.nih.gov/12345678/
✅ https://external-site.com/article
✅ https://www.linkedin.com/in/username
❌ Don't modify external URLs
```

### Email Links
```markdown
✅ mailto:contact@abbvie.com
```

### Download Links
```markdown
✅ /media/document.pdf
```

## Accessibility Standards

### WCAG 2.1 AA Requirements
- [ ] Alt text for all images
- [ ] Color contrast ratio ≥ 4.5:1
- [ ] Keyboard navigation functional
- [ ] Focus indicators visible
- [ ] Proper heading hierarchy (no skipped levels)
- [ ] Form labels present
- [ ] Link text descriptive (no "click here")

### Testing Tools
- **Automated**: Lighthouse, axe DevTools
- **Screen Readers**: VoiceOver (Mac), NVDA (Windows)
- **Keyboard**: Tab through entire page
- **Color**: Contrast checker tools

## SEO Essentials

### Required Metadata
```markdown
---
Title: Page Title (50-60 characters)
Description: Meta description (150-160 characters)
Keywords: keyword1, keyword2, keyword3
---
```

### Best Practices
- Unique title per page
- Compelling meta descriptions
- Proper heading hierarchy with keywords
- Internal linking structure
- Fast page load (< 2 seconds)
- Mobile-friendly responsive design

### Structured Data
Add for relevant content types:
- Person schema (leader profiles)
- Organization schema (company pages)
- Article schema (blog posts)
- Video schema (video content)

## Performance Targets

### Core Web Vitals
- **LCP** (Largest Contentful Paint): < 2.5s
- **FID** (First Input Delay): < 100ms
- **CLS** (Cumulative Layout Shift): < 0.1

### Page Speed
- **Target**: < 2 seconds total load time
- **Lighthouse Score**: ≥ 90

### Optimization Techniques
- Lazy load images
- Minimize JavaScript
- Use CSS for animations
- Leverage browser caching
- Optimize font loading

## Common Patterns

### Landing Page Pattern
```markdown
Hero (main header)
---
Text Section (introduction)
---
Cards (features/sections)
---
Separator
---
Columns (detailed info)
```

### Profile Page Pattern
```markdown
Hero (person photo + name)
---
Columns (bio + details)
---
Quote (notable quote)
---
Accordion (additional info)
---
Cards (related content)
```

### Content Page Pattern
```markdown
Hero (article header)
---
Text Section (body content)
---
Columns (text + images)
---
Separator
---
Cards (related articles)
```

## Troubleshooting

### Issue: Content doesn't fit blocks
**Solution**: 
1. Check if CSS classes can help
2. Try combining multiple blocks
3. Consider block enhancement
4. Last resort: create new block

### Issue: Links not working
**Solution**:
1. Verify internal links are relative paths
2. Check external links are complete URLs
3. Test in published environment
4. Clear cache and retest

### Issue: Images not loading
**Solution**:
1. Verify image paths are correct
2. Check image format (prefer WebP)
3. Ensure images are uploaded to media library
4. Test in published environment

### Issue: Performance problems
**Solution**:
1. Check image sizes (compress if needed)
2. Review JavaScript usage
3. Test with Lighthouse
4. Optimize lazy loading

### Issue: Accessibility failures
**Solution**:
1. Add missing alt text
2. Fix heading hierarchy
3. Check color contrast
4. Test keyboard navigation
5. Run automated tools

## Quality Gates

### Before Submitting for Review
- [ ] All content migrated accurately
- [ ] Images optimized and loading
- [ ] Links working correctly
- [ ] Responsive on all devices
- [ ] Accessibility tested
- [ ] Performance targets met
- [ ] SEO metadata complete
- [ ] No console errors
- [ ] Cross-browser tested

### Review Criteria
- [ ] Stakeholder approval on content
- [ ] Technical review passed
- [ ] Accessibility audit passed
- [ ] Performance metrics met
- [ ] SEO requirements met
- [ ] Brand guidelines followed

### Pre-Launch Checklist
- [ ] Final stakeholder sign-off
- [ ] Production URLs configured
- [ ] Analytics tracking verified
- [ ] Forms tested (if applicable)
- [ ] Social media previews checked
- [ ] Structured data validated
- [ ] Redirect mapping complete

## Code Standards

### CSS
- Use design tokens/CSS variables
- Follow BEM naming (if applicable)
- Keep specificity low
- Mobile-first responsive design
- Comment complex selectors

### JavaScript
- Use ES6+ features
- Keep functions small and focused
- Add JSDoc comments
- Handle errors gracefully
- Avoid global variables

### HTML
- Semantic markup
- Proper nesting
- Close all tags
- Validate with W3C validator
- Accessible attributes

## Documentation Requirements

### For Each Migration
1. **Migration Plan**:
   - Source URL
   - Target URL
   - Block mapping
   - Special requirements

2. **Testing Results**:
   - Accessibility report
   - Performance metrics
   - Cross-browser results
   - Device testing results

3. **Launch Notes**:
   - Changes from original
   - Known limitations
   - Future enhancements

## Resources

### Internal Documentation
- [Migration Guidelines](./00-migration-guidelines.md)
- [Science Pages Migration](./01-science-people-pages-migration.md)
- [Block Reuse Strategy](./02-block-reuse-strategy.md)
- [Component Library](../component-definition.json)
- [Block Examples](../blocks/)

### External Resources
- [EDS Documentation](https://www.aem.live/docs/)
- [Franklin GitHub](https://github.com/adobe/franklin)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Schema.org](https://schema.org/)
- [Core Web Vitals](https://web.dev/vitals/)

### Tools
- **Development**: VS Code, Local Server
- **Testing**: Lighthouse, axe DevTools, BrowserStack
- **Validation**: W3C Validator, Schema Validator
- **Performance**: PageSpeed Insights, WebPageTest

## Quick Commands

### Start Development Server
```bash
npm start
```

### Build JSON Files
```bash
npm run build:json
```

### Run Linting
```bash
npm run lint
```

### Fix Linting Issues
```bash
npm run lint:fix
```

### Create Brand CSS
```bash
npm run gulp createBrandCSS
```

## Support & Contact

### Questions?
- Check documentation first
- Review existing examples
- Ask technical lead
- Consult EDS community

### Found a Bug?
- Document the issue
- Provide reproduction steps
- Share screenshots/videos
- Report to technical team

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-02-27 | Initial best practices guide |

---

**Last Updated**: 2026-02-27  
**Version**: 1.0  
**Maintained By**: EDS Migration Team
