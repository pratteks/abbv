# Component Documentation Protocol

## Overview
This document defines the **mandatory protocol** for documenting any new components, blocks, or patterns created during EDS migration. **All AI assistants and developers must follow this protocol.**

---

## Core Principle

### 🔴 CRITICAL RULE
**When creating ANY new component, block, or pattern, you MUST immediately update the relevant documentation files.**

This ensures:
- Documentation stays current
- Other team members can discover and reuse new components
- Knowledge is not lost
- AI assistants have up-to-date context

---

## Documentation Update Protocol

### Step 1: Create the Component

When you create a new block/component:

```
blocks/
  new-component/
    new-component.js
    new-component.css
    README.md  ← Document the component
```

### Step 2: Update Rules Documentation

**IMMEDIATELY after creating a component**, update these files:

#### A. Update `02-block-reuse-strategy.md`

Add the new component to the **Available Blocks Inventory** section:

```markdown
### Content Blocks (or appropriate category)
1. **accordion** - Collapsible content sections
2. **cards** - Grid-based content display
...
25. **new-component** - [Brief description of what it does]
```

Add a reuse scenario if applicable:

```markdown
### Scenario N: [Use Case Name]

**Requirements**: [What this addresses]

**Solution**: Use existing **new-component block**
```markdown
New Component
Property 1: value
Property 2: value
```

**Why not create different block?**
- [Explanation of why this component was needed]
```

#### B. Update `00-migration-guidelines.md`

Add to the **Block Usage Guidelines** section:

```markdown
### New Component Block
Use for: [Primary use cases]
```markdown
New Component
Property: Value
Content: Text here
```
```

#### C. Update `03-best-practices-summary.md`

Add to **Block Selection Guide**:

```markdown
### For [Use Case Type]
**Use**: new-component, [other relevant blocks]
```markdown
New Component
...
```
```

#### D. Update `README.md`

Add to **Available Blocks Reference** under appropriate category:

```markdown
### Content Display (or appropriate category)
- **new-component** - [Brief description]
```

Update the count if mentioned (e.g., "24 blocks" becomes "25 blocks")

---

## Component Documentation Template

### Required Files

#### 1. Component README (`blocks/new-component/README.md`)

```markdown
# New Component Block

## Purpose
[Brief description of what this component does]

## Use Cases
- [Use case 1]
- [Use case 2]
- [Use case 3]

## Block Structure

```markdown
New Component
Property 1: Value 1
Property 2: Value 2
Content: Content here
```

## Configuration Options

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| property1 | string | Yes | - | Description |
| property2 | boolean | No | false | Description |

## Variations

### Variation 1: [Name]
```markdown
New Component (variant-class)
...
```

## Examples

### Example 1: Basic Usage
```markdown
New Component
...
```

### Example 2: Advanced Usage
```markdown
New Component (advanced)
...
```

## CSS Classes

- `.new-component` - Base component class
- `.new-component--variant` - Variant modifier
- `.new-component-content` - Content container

## JavaScript API

```javascript
// Public methods
export const NewComponentAPI = {
  update: (block, config) => { },
  destroy: (block) => { },
};
```

## Accessibility

- [ARIA attribute 1]
- [ARIA attribute 2]
- [Keyboard interaction]

## Browser Support

- Chrome: ✅
- Firefox: ✅
- Safari: ✅
- Edge: ✅

## Related Components

- [Related component 1]
- [Related component 2]

## Created

- **Date**: 2026-02-27
- **Author**: [Name]
- **Reason**: [Why this component was created]
```

#### 2. Component Code Comments

**JavaScript (`blocks/new-component/new-component.js`)**:

```javascript
/**
 * New Component Block
 * 
 * @description [What this component does]
 * @use-cases
 *   - [Use case 1]
 *   - [Use case 2]
 * 
 * @configuration
 *   - property1: [description]
 *   - property2: [description]
 * 
 * @example
 * New Component
 * Property 1: Value
 * Property 2: Value
 * 
 * @created 2026-02-27
 * @author [Name]
 */

export default function decorate(block) {
  // Implementation
}
```

**CSS (`blocks/new-component/new-component.css`)**:

```css
/**
 * New Component Block Styles
 * 
 * Description: [What this styles]
 * Use Cases: [Primary use cases]
 * 
 * Created: 2026-02-27
 * Author: [Name]
 */

.new-component {
  /* Styles */
}
```

---

## Update Checklist

When creating a new component, verify you've updated:

- [ ] Created `blocks/new-component/new-component.js`
- [ ] Created `blocks/new-component/new-component.css`
- [ ] Created `blocks/new-component/README.md`
- [ ] Added JSDoc comments in JavaScript
- [ ] Added CSS comments
- [ ] Updated `02-block-reuse-strategy.md` (Available Blocks Inventory)
- [ ] Updated `02-block-reuse-strategy.md` (Common Reuse Scenarios if applicable)
- [ ] Updated `00-migration-guidelines.md` (Block Usage Guidelines)
- [ ] Updated `03-best-practices-summary.md` (Block Selection Guide)
- [ ] Updated `README.md` (Available Blocks Reference)
- [ ] Updated block count in all documents (if mentioned)
- [ ] Created usage examples in component README
- [ ] Documented configuration options
- [ ] Documented accessibility requirements
- [ ] Documented any JavaScript API

---

## AI Assistant Instructions

### For Claude, GPT, and other AI assistants:

**When you create a new block/component**, you MUST:

1. **Immediately announce**: "I've created a new component '[name]'. I will now update the documentation."

2. **Update all required files** using the checklist above

3. **Provide summary**: List all files you updated

4. **Verify**: Confirm all documentation is consistent

### Example AI Response Pattern:

```
I've created a new component 'testimonial-card'. I will now update the documentation.

Files Created:
✅ blocks/testimonial-card/testimonial-card.js
✅ blocks/testimonial-card/testimonial-card.css
✅ blocks/testimonial-card/README.md

Documentation Updated:
✅ rules/02-block-reuse-strategy.md
   - Added to Available Blocks Inventory
   - Added Scenario for testimonial display
✅ rules/00-migration-guidelines.md
   - Added Block Usage Guidelines section
✅ rules/03-best-practices-summary.md
   - Added to Block Selection Guide
✅ rules/README.md
   - Added to Available Blocks Reference
   - Updated block count from 24 to 25

The testimonial-card component is now fully documented and ready to use.
```

---

## Documentation Maintenance

### Weekly Review
- Verify all components have documentation
- Check for outdated information
- Update examples if needed

### Monthly Audit
- Review all component READMEs
- Update usage statistics
- Consolidate similar components if needed
- Archive deprecated components

### Quarterly Updates
- Major documentation review
- Update best practices based on learnings
- Refactor outdated patterns
- Training session on new components

---

## Version Control

### Component Versioning

When modifying an existing component:

1. Document changes in component README
2. Update version number
3. Note breaking changes clearly
4. Provide migration guide if breaking

Example:

```markdown
## Changelog

### v2.0.0 (2026-03-01)
**Breaking Changes:**
- Changed property 'align' to 'alignment'
- Removed support for 'legacy-mode'

**Migration Guide:**
- Replace `align="center"` with `alignment="center"`
- Remove any `legacy-mode` configurations

### v1.1.0 (2026-02-15)
**New Features:**
- Added dark mode support
- Added animation options
```

---

## Enforcement

### Code Review
- PRs with new components MUST include documentation updates
- Automated checks should verify documentation exists
- Reject PRs that don't follow this protocol

### AI Assistant Behavior
- AI MUST update documentation when creating components
- AI should verify documentation completeness
- AI should report what was updated

### Consequences of Non-Compliance
- Component may not be discovered by others
- Duplication of effort
- Knowledge loss
- Maintenance difficulties

---

## Quick Reference Card

```
┌─────────────────────────────────────────┐
│  NEW COMPONENT CREATED?                 │
│                                         │
│  ✅ Update These Files:                 │
│     • 02-block-reuse-strategy.md        │
│     • 00-migration-guidelines.md        │
│     • 03-best-practices-summary.md      │
│     • README.md                         │
│     • blocks/[name]/README.md           │
│                                         │
│  ✅ Include:                             │
│     • Purpose & use cases               │
│     • Configuration options             │
│     • Code examples                     │
│     • Accessibility notes               │
│     • API documentation                 │
│                                         │
│  ⚠️  NO EXCEPTIONS                      │
└─────────────────────────────────────────┘
```

---

## Component Registry

Maintain an up-to-date registry of all components:

### Current Component Count: 24

Last Updated: 2026-02-27

| Component | Category | Status | Created | Author |
|-----------|----------|--------|---------|--------|
| accordion | Content | Active | - | - |
| cards | Content | Active | - | - |
| carousel | Content | Active | - | - |
| columns | Content | Active | - | - |
| embed | Interactive | Active | - | - |
| embed-form | Interactive | Active | - | - |
| eds-form | Interactive | Active | - | - |
| footer | Navigation | Active | - | - |
| form | Interactive | Active | - | - |
| fragment | Navigation | Active | - | - |
| header | Navigation | Active | - | - |
| hero | Content | Active | - | - |
| modal | Interactive | Active | - | - |
| navigation-content | Navigation | Active | - | - |
| press-releases | Specialized | Active | - | - |
| quote | Content | Active | - | - |
| search | Interactive | Active | - | - |
| separator | Content | Active | - | - |
| social-media | Specialized | Active | - | - |
| stock-ticker | Specialized | Active | - | - |
| story-card | Content | Active | - | - |
| table | Content | Active | - | - |
| tabs | Content | Active | - | - |
| video | Interactive | Active | - | - |

### Status Values:
- **Active**: Currently in use and maintained
- **Deprecated**: No longer recommended, use alternative
- **Archived**: No longer in use, kept for reference

---

**Last Updated**: 2026-02-27  
**Version**: 1.0  
**Maintained By**: EDS Documentation Team

**REMEMBER: This is not optional. Documentation is part of development.**
