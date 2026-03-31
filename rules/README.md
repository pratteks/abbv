# EDS Migration Rules & Guidelines

## Overview
This directory contains comprehensive guidelines and rules for migrating AbbVie website pages to Adobe Edge Delivery Services (EDS) using the Franklin framework.

## Documentation Structure

### 📘 [00-migration-guidelines.md](./00-migration-guidelines.md)
**Comprehensive migration guidelines and best practices**
- Core principles for EDS migration
- Block reuse strategy overview
- Content preservation rules
- Migration workflow (4 phases)
- Best practices for HTML, performance, accessibility, SEO
- Block usage guidelines with examples
- Quality checklist
- Common patterns and troubleshooting

**Start here** if you're new to EDS migration or need a comprehensive reference.

---

### 📗 [01-page-templates.md](./01-page-templates.md)
**Generic page templates for all AbbVie.com migrations**
- Applicable to ANY page type across abbvie.com
- Page type classifications (landing, list, profile, content)
- Individual templates for each page type
- Link handling rules
- Image optimization requirements
- Accessibility & SEO requirements
- Quality assurance checklist
- Migration priority phases

**Use this** when migrating ANY pages from abbvie.com, including:
- Leadership/Executive pages
- Team directory pages
- Individual profile/biography pages
- Product pages
- Feature/article pages
- Landing pages
- Any content page

---

### 📙 [02-block-reuse-strategy.md](./02-block-reuse-strategy.md)
**Strategy for reusing and enhancing existing EDS blocks**
- Complete inventory of available blocks (24 blocks)
- Decision tree for block selection
- Block enhancement patterns
- Common reuse scenarios
- Enhancement vs new block criteria
- Block combination patterns
- Anti-patterns to avoid
- Performance and testing requirements

**Consult this** before creating any new blocks or when unsure which block to use.

---

### 📕 [03-best-practices-summary.md](./03-best-practices-summary.md)
**Quick reference guide for migration best practices**
- Golden rules summary
- Content migration checklist
- Block selection guide
- Image guidelines
- Link handling rules
- Accessibility standards
- SEO essentials
- Performance targets
- Common patterns
- Troubleshooting guide
- Quality gates

**Use this** as a quick reference while actively migrating pages.

---

### 📘 [04-css-js-best-practices.md](./04-css-js-best-practices.md)
**CSS & JavaScript best practices for pixel-perfect migration**
- Pixel-perfect migration principles
- CSS visual parity rules (exact colors, typography, spacing)
- Layout and responsive breakpoints
- Animation and transition replication
- Component-specific styling patterns
- Brand-specific theme structure
- JavaScript functionality preservation
- Block decoration patterns
- Interactive features (accordion, tabs, forms)
- Performance optimization techniques
- Verification checklists and tools

**Use this** when implementing CSS/JS to maintain exact look, feel, and functionality from source pages.

---

### 📕 [05-cms-component-architecture.md](./05-cms-component-architecture.md)
**CMS Component System Technical Architecture Specification**
- Executive intent and strategic objectives
- Author-first flexibility (configuration over code)
- True multi-brand scalability (zero structural forks)
- Behavioral consistency (formal lifecycle, explicit APIs)
- Styling governance (token-driven, low specificity)
- Component structure templates
- CSS architecture patterns
- Brand theme patterns
- Anti-patterns to avoid
- Implementation checklists
- Migration strategy

**Use this** to understand and implement the architectural principles for scalable, maintainable, multi-brand component systems.

---

### 🔴 [06-component-documentation-protocol.md](./06-component-documentation-protocol.md)
**MANDATORY: Component Documentation Protocol**
- **Critical rule**: Update documentation when creating components
- Documentation update protocol (step-by-step)
- Component README template
- AI assistant instructions
- Update checklist (14 items)
- Component registry
- Version control guidelines
- Enforcement rules

**⚠️ CRITICAL**: All AI assistants and developers MUST follow this protocol when creating new components. No exceptions.

**AI Response Pattern**: When creating a component, announce updates and list all files modified.

---

### 📗 [07-eds-skills-competencies.md](./07-eds-skills-competencies.md)
**EDS Skills & Competencies Guide**
- Skill levels (Beginner, Intermediate, Advanced)
- Core technical skills (HTML, CSS, JavaScript, Git, Command Line)
- EDS-specific skills (Fundamentals, Development Workflow, Component Architecture)
- Soft skills (Problem Solving, Performance, Accessibility, SEO, Responsive Design)
- Tool proficiency
- Learning paths (Frontend → EDS, Backend → EDS)
- Skill assessment checklist
- Training resources
- Career development roadmap

**Use this** for training, hiring, skill assessment, onboarding, and career development planning.

---

### 🚫 [08-no-empty-elements-rule.md](./08-no-empty-elements-rule.md)
**No Empty Elements in AI-Generated Code**
- Core principle: Never generate empty HTML elements
- Accessibility, performance, and maintenance impacts
- Prohibited patterns (empty sections, divs, semantic elements)
- Correct patterns with content validation
- Special cases and exceptions (self-closing elements, placeholders)
- Implementation guidelines for blocks, HTL templates, CSS
- AI assistant instructions and validation checklist
- Enforcement through linting and code review

**Use this** to ensure AI tools and developers don't create empty HTML elements that cause accessibility issues, validation errors, or technical debt.

---

## 🎯 Task-Specific Skills

The `/skills` directory contains Adobe-style task-specific skills for Claude to perform EDS operations.

### 📘 [migrate-page](./skills/migrate-page/SKILL.md)
**Guide for migrating AbbVie pages to EDS**
- 7-step migration workflow
- Source page analysis with DevTools scripts
- Page type identification and templates
- Content mapping to EDS blocks
- Pixel-perfect CSS/JS implementation
- Comprehensive testing and QA checklists
- Troubleshooting guide

**Use this skill** when migrating existing pages to maintain exact visual and functional parity.

### 📘 [create-block](./skills/create-block/SKILL.md)
**Guide for creating new EDS blocks with mandatory documentation**
- 8-step block creation workflow
- Block verification and justification
- Component architecture patterns
- JavaScript and CSS templates
- MANDATORY documentation protocol enforcement
- Brand-specific theming guide
- Testing and verification checklists

**Use this skill** when creating new blocks after verifying no existing block can be reused.

---

## Quick Start

### For First-Time Migrators
1. Read [00-migration-guidelines.md](./00-migration-guidelines.md) thoroughly
2. Review [02-block-reuse-strategy.md](./02-block-reuse-strategy.md) to understand available blocks
3. Bookmark [03-best-practices-summary.md](./03-best-practices-summary.md) for quick reference

### For Any AbbVie.com Pages
1. Read [01-page-templates.md](./01-page-templates.md)
2. Identify your page type (Landing, List, Profile, or Content)
3. Follow the specific template for your page type
4. Use [03-best-practices-summary.md](./03-best-practices-summary.md) for checklist items

### Alternative Approach
1. Use [00-migration-guidelines.md](./00-migration-guidelines.md) as comprehensive guide
2. Refer to [02-block-reuse-strategy.md](./02-block-reuse-strategy.md) for block selection
3. Follow templates from [01-page-templates.md](./01-page-templates.md) for structured approach

---

## Key Principles

### 🎯 Always Follow These Rules

#### 1. Block Reuse First
✅ **Always check existing blocks before creating new ones**
- Review the 24 available blocks in `/blocks` directory
- Check if CSS classes can handle variations
- Consider combining blocks for complex layouts
- Only create new blocks for fundamentally different functionality

#### 2. Preserve External Links
✅ **Keep all external links exactly as they appear**
```markdown
✅ https://pubmed.ncbi.nlm.nih.gov/12345678/
✅ https://www.linkedin.com/in/username
✅ https://youtube.com/watch?v=VIDEO_ID
❌ Don't modify external URLs
```

#### 3. Convert Internal Links
✅ **Use relative paths for internal links**
```markdown
✅ /science/our-people/our-rd-leaders
❌ https://www.abbvie.com/science/our-people/our-rd-leaders.html
❌ our-rd-leaders.html
```

#### 4. Optimize Images
✅ **Use WebP format and appropriate sizes**
- Hero images: 1920x1080px
- Card images: 400x300px
- Profile photos: 800x800px
- All with descriptive alt text

#### 5. Maintain Accessibility
✅ **WCAG 2.1 AA compliance required**
- Proper heading hierarchy
- Descriptive alt text
- Keyboard navigation
- Color contrast ≥ 4.5:1

---

## Available Blocks Reference

### Content Display
- **accordion** - Collapsible content
- **cards** - Grid-based display
- **carousel** - Sliding panels
- **columns** - Multi-column layouts
- **hero** - Page headers
- **quote** - Testimonials
- **separator** - Section dividers
- **story-card** - Enhanced cards
- **table** - Tabular data
- **tabs** - Tabbed content

### Interactive
- **embed** - Generic embedding
- **embed-form** - AEM forms
- **eds-form** - Native forms
- **form** - Standard forms
- **modal** - Popups
- **search** - Search functionality
- **video** - Video player

### Navigation
- **footer** - Site footer
- **fragment** - Reusable sections
- **header** - Site header
- **navigation-content** - Nav with content

### Specialized
- **press-releases** - Press listings
- **social-media** - Social links
- **stock-ticker** - Stock display

---

## Migration Workflow

### Phase 1: Planning
1. Review source page
2. Identify content sections
3. Map to EDS blocks
4. Document requirements
5. Get approval

### Phase 2: Content Migration
1. Extract content
2. Structure for blocks
3. Optimize images
4. Convert links
5. Add metadata

### Phase 3: Implementation
1. Create page structure
2. Add content to blocks
3. Apply brand styles
4. Test responsive design
5. Verify functionality

### Phase 4: Quality Assurance
1. Content accuracy
2. Link testing
3. Accessibility audit
4. Performance testing
5. Cross-browser testing
6. Stakeholder approval

---

## Quality Checklist

Before marking any page complete:

- [ ] All content migrated accurately
- [ ] External links preserved unchanged
- [ ] Internal links converted to relative paths
- [ ] Images optimized (WebP format)
- [ ] Alt text added to all images
- [ ] Responsive on mobile, tablet, desktop
- [ ] Accessibility tested (WCAG 2.1 AA)
- [ ] Page loads < 2 seconds
- [ ] SEO metadata complete
- [ ] No console errors
- [ ] Cross-browser tested (Chrome, Safari, Firefox, Edge)
- [ ] Structured data added (if applicable)

---

## Common Block Combinations

### Landing Page
```markdown
Hero (main header)
↓
Text Section (introduction)
↓
Cards (features/sections)
↓
Separator
↓
Columns (detailed info)
```

### Profile Page
```markdown
Hero (person photo + name)
↓
Columns (bio + details)
↓
Quote (notable quote)
↓
Accordion (additional info)
↓
Cards (related content)
```

### Content/Article Page
```markdown
Hero (article header)
↓
Text Section (body content)
↓
Columns (text + images)
↓
Separator
↓
Cards (related articles)
```

---

## Resources

### Internal
- [Component Library](../component-definition.json)
- [Component Models](../component-models.json)
- [Component Filters](../component-filters.json)
- [Block Examples](../blocks/)
- [Style Guide](../styles/)

### External
- [EDS Documentation](https://www.aem.live/docs/)
- [Franklin GitHub](https://github.com/adobe/franklin)
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Schema.org](https://schema.org/)
- [Core Web Vitals](https://web.dev/vitals/)

### Tools
- **Development**: VS Code, npm
- **Testing**: Lighthouse, axe DevTools
- **Validation**: W3C Validator
- **Performance**: PageSpeed Insights

---

## Getting Help

### Questions?
1. Check these documentation files first
2. Review existing block examples
3. Consult with technical lead
4. Refer to EDS community resources

### Found an Issue?
1. Document the problem
2. Provide reproduction steps
3. Include screenshots
4. Report to the team

---

## Version Control

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-02-27 | Initial migration rules created | EDS Migration Team |

---

## Maintenance

### Regular Updates
- Review quarterly for accuracy
- Update with new patterns discovered
- Add new block examples
- Incorporate feedback from migrations

### Feedback
Have suggestions for improving these guidelines?
- Create an issue with specific recommendations
- Propose changes via pull request
- Discuss with migration team

---

**Last Updated**: 2026-02-27  
**Maintained By**: EDS Migration Team  
**Contact**: [Technical Lead]
