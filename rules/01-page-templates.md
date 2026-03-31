# Leadership & Team Pages Migration Rules

## Overview
This document provides migration instructions for leadership, team, and people-focused pages. These page types are common across websites and showcase teams, leadership, research initiatives, and organizational structure.

**This guide is generic and applicable to any similar page types**, including but not limited to:
- Leadership/Executive team pages
- R&D/Scientific team pages
- Department team pages
- Individual profile/biography pages
- Feature stories about people
- Community/culture pages
- Video/media galleries featuring people

## Migration Strategy

### Page Type Classification

#### Type 1: Landing Page (our-people.html)
**Purpose**: Overview page with navigation to sub-sections
**EDS Blocks to Use**:
- **Hero block**: Page header with main image and title
- **Cards block**: Grid of sections/categories
- **Columns block**: Introduction text with supporting images
- **Fragment block**: Reusable header/footer

#### Type 2: List Page (our-rd-leaders.html)
**Purpose**: Directory/grid of leadership team members
**EDS Blocks to Use**:
- **Hero block**: Section header
- **Cards block**: Leadership team member grid
- **Text sections**: Introduction and context
- **Fragment block**: Navigation or related links

#### Type 3: Profile Pages (individual leader pages)
**Purpose**: Detailed biography and information about a specific leader
**EDS Blocks to Use**:
- **Hero block**: Profile header with photo
- **Columns block**: Bio content and details side-by-side
- **Quote block**: Notable quotes or statements
- **Accordion block**: Expandable sections (publications, achievements)
- **Cards block**: Related content or team members

#### Type 4: Content Pages (behind-the-science, community-of-science, etc.)
**Purpose**: Feature articles, stories, or multimedia content
**EDS Blocks to Use**:
- **Hero block**: Article header
- **Text sections**: Body content
- **Video block**: Embedded videos (for science-in-60-seconds)
- **Columns block**: Text with images
- **Cards block**: Related articles
- **Separator block**: Section breaks

## Detailed Migration Rules

### 1. Main Landing Page: /science/our-people

**Block Structure**:
```markdown
Hero
Image: /science/images/our-people-hero.jpg
Title: Our People
Description: Meet the scientists and leaders driving innovation at AbbVie
---
Text Section
Heading: Advancing Science Through People
Content: Introduction paragraph about AbbVie's scientific team...
---
Cards
Card (Our R&D Leaders)
Image: /science/images/rd-leaders-thumb.jpg
Title: Our R&D Leaders
Description: Meet the leadership team advancing our research and development
Link: View Leaders | /science/our-people/our-rd-leaders
---
Card (Behind the Science)
Image: /science/images/behind-science-thumb.jpg
Title: Behind the Science
Description: Stories from our scientists and their groundbreaking work
Link: Read Stories | /science/our-people/behind-the-science
---
Card (Community of Science)
Image: /science/images/community-thumb.jpg
Title: Community of Science
Description: Our collaborative approach to scientific discovery
Link: Learn More | /science/our-people/community-of-science
---
Card (Discovery Files)
Image: /science/images/discovery-thumb.jpg
Title: Discovery Files
Description: In-depth look at our research and discoveries
Link: Explore | /science/our-people/discovery-files
---
Card (Lab of the Future)
Image: /science/images/lab-future-thumb.jpg
Title: Lab of the Future
Description: Innovation in our research facilities and methodologies
Link: Discover | /science/our-people/lab-of-the-future
---
Card (Science in 60 Seconds)
Image: /science/images/science-60-thumb.jpg
Title: Science in 60 Seconds
Description: Quick insights into complex scientific concepts
Link: Watch Now | /science/our-people/science-in-60-seconds
```

**Content Rules**:
- Preserve hero image quality (minimum 1920px width)
- Keep all card images consistent size (recommended 400x300px)
- Maintain consistent card descriptions (2-3 sentences each)
- Convert all internal links to relative paths
- Keep external links (if any) exactly as is

---

### 2. R&D Leaders List Page: /science/our-people/our-rd-leaders

**Block Structure**:
```markdown
Hero
Image: /science/images/rd-leaders-hero.jpg
Title: Our R&D Leaders
Description: Meet the visionary leaders advancing AbbVie's research and development
---
Text Section
Content: Introduction about the R&D leadership team and their collective vision...
---
Cards
Card (Andrew Campbell)
Image: /science/images/leaders/andrew-campbell.jpg
Title: Andrew Campbell, Ph.D.
Description: [Title/Role from source page]
Link: Read Bio | /science/our-people/our-rd-leaders/andrew-campbell
---
Card (Darin Messina)
Image: /science/images/leaders/darin-messina.jpg
Title: Darin Messina, Ph.D.
Description: [Title/Role from source page]
Link: Read Bio | /science/our-people/our-rd-leaders/darin-messina
---
Card (Jonathon Sedgwick)
Image: /science/images/leaders/jonathon-sedgwick.jpg
Title: Jonathon Sedgwick, M.D., Ph.D.
Description: [Title/Role from source page]
Link: Read Bio | /science/our-people/our-rd-leaders/jonathon-sedgwick
---
Card (Linda Scarazzini)
Image: /science/images/leaders/linda-scarazzini.jpg
Title: Linda Scarazzini, M.D.
Description: [Title/Role from source page]
Link: Read Bio | /science/our-people/our-rd-leaders/linda-scarazzini
---
Card (Mitchell Brin)
Image: /science/images/leaders/mitchell-brin.jpg
Title: Mitchell Brin, M.D.
Description: [Title/Role from source page]
Link: Read Bio | /science/our-people/our-rd-leaders/mitchell-brin
```

**Content Rules**:
- Use professional headshots (minimum 400x400px)
- Include full titles and credentials
- Maintain alphabetical or hierarchical order from source
- Ensure consistent card layout
- Add proper alt text for accessibility

---

### 3. Individual Leader Profile Pages

**Template for all leader pages** (example: Andrew Campbell):

**Block Structure**:
```markdown
Hero
Image: /science/images/leaders/andrew-campbell-large.jpg
Title: Andrew Campbell, Ph.D.
Description: [Official Title/Position]
---
Columns (2-1)
### Biography

[Full biography text from source page - maintain paragraph breaks]

Key areas of expertise:
- [Area 1]
- [Area 2]
- [Area 3]

---

### Quick Facts

**Education:**
- [Degree, Institution, Year]
- [Degree, Institution, Year]

**Experience:**
- [Previous role/company]
- [Previous role/company]

**Publications:**
[Number] peer-reviewed publications

---
Quote (if available)
Text: "[Notable quote from the leader]"
Author: Andrew Campbell, Ph.D.
Title: [Position]
---
Accordion (if needed for lengthy content)
Accordion Item
Summary: Publications & Research
Text: [Detailed publications list]
---
Accordion Item
Summary: Awards & Recognition
Text: [Awards and recognition details]
---
Cards (related leaders or content)
Card
Title: Related Content
Description: Explore more from our R&D leadership
Link: View All Leaders | /science/our-people/our-rd-leaders
```

**Apply this template to**:
- andrew-campbell.html
- darin-messina.html
- jonathon-sedgwick.html
- linda-scarazzini.html
- mitchell-brin.html

**Content Rules for Profile Pages**:
- Use high-quality portrait images (minimum 800x800px)
- Preserve all credentials exactly as shown
- Keep external links to publications unchanged
- Convert internal AbbVie links to relative paths
- Maintain proper heading hierarchy (h2, h3)
- Add structured data for Person schema

---

### 4. Behind the Science: /science/our-people/behind-the-science

**Block Structure**:
```markdown
Hero
Image: /science/images/behind-science-hero.jpg
Title: Behind the Science
Description: Stories from the scientists driving discovery at AbbVie
---
Text Section
Content: Introduction about the Behind the Science series...
---
Cards
Card (Story 1)
Image: /science/images/stories/story-1-thumb.jpg
Title: [Story Title]
Description: [Story description - 2-3 sentences]
Link: Read Story | [story-url]
---
Card (Story 2)
Image: /science/images/stories/story-2-thumb.jpg
Title: [Story Title]
Description: [Story description]
Link: Read Story | [story-url]
---
[Additional story cards...]
```

**Content Rules**:
- Feature 3-6 recent stories prominently
- Use engaging story images
- Keep descriptions compelling but concise
- Link to full story pages
- Consider using story-card block if available

---

### 5. Community of Science: /science/our-people/community-of-science

**Block Structure**:
```markdown
Hero
Image: /science/images/community-hero.jpg
Title: Community of Science
Description: Collaboration and innovation in scientific research
---
Text Section
Heading: Our Collaborative Approach
Content: [Introduction about collaboration culture...]
---
Columns (1-1)
### Global Collaboration

[Content about global scientific partnerships...]

---

### Research Networks

[Content about research networks and communities...]

---
Cards (Featured Initiatives)
Card
Image: /science/images/initiative-1.jpg
Title: [Initiative Name]
Description: [Description]
Link: Learn More | [url]
---
Separator
---
Text Section
Heading: Join Our Community
Content: [Information about careers, partnerships...]
```

**Content Rules**:
- Emphasize collaboration and community aspects
- Include diverse imagery showing teamwork
- Link to external partner sites (keep URLs unchanged)
- Add call-to-action for careers/partnerships

---

### 6. Discovery Files: /science/our-people/discovery-files

**Block Structure**:
```markdown
Hero
Image: /science/images/discovery-hero.jpg
Title: Discovery Files
Description: In-depth insights into AbbVie's scientific discoveries
---
Tabs
Tabs Item
Title: Recent Discoveries
Content:
[Cards block with recent discoveries]
---
Tabs Item
Title: Research Areas
Content:
[Cards block organized by therapeutic area]
---
Tabs Item
Title: Publications
Content:
[Table or cards with publication links]
```

**Content Rules**:
- Organize content by category using tabs
- Link to external publications (keep URLs unchanged)
- Include publication dates
- Add proper citations

---

### 7. Lab of the Future: /science/our-people/lab-of-the-future

**Block Structure**:
```markdown
Hero
Image: /science/images/lab-future-hero.jpg
Title: Lab of the Future
Description: Innovation in research facilities and methodologies
---
Columns (1-1-1)
### Advanced Technology

[Content about lab technology...]

---

### Digital Innovation

[Content about digital tools...]

---

### Sustainable Practices

[Content about sustainability...]

---
Video (if available)
URL: [YouTube/external video URL - keep unchanged]
---
Cards (Features)
[Cards highlighting specific lab features or innovations]
```

**Content Rules**:
- Highlight innovation and technology
- Use modern, tech-focused imagery
- Keep external video URLs unchanged
- Include interactive elements if available

---

### 8. Science in 60 Seconds: /science/our-people/science-in-60-seconds

**Block Structure**:
```markdown
Hero
Image: /science/images/science-60-hero.jpg
Title: Science in 60 Seconds
Description: Complex science explained in bite-sized videos
---
Text Section
Content: Introduction to the video series...
---
Cards (Video Grid)
Card (Video 1)
Image: /science/images/videos/video-1-thumb.jpg
Title: [Video Title]
Description: [Brief description]
Link: Watch | [video-page-url]
---
Card (Video 2)
Image: /science/images/videos/video-2-thumb.jpg
Title: [Video Title]
Description: [Brief description]
Link: Watch | [video-page-url]
---
[Additional video cards...]
```

**Individual Video Pages**:
```markdown
Hero
Title: [Video Title]
Description: [Description]
---
Video
URL: [YouTube/external URL - keep unchanged]
---
Text Section
Heading: About This Topic
Content: [Extended explanation...]
---
Cards (Related Videos)
[Related video cards]
```

**Content Rules**:
- Use video thumbnails as card images
- Keep YouTube/external video URLs unchanged
- Add video transcripts for accessibility
- Include video duration in description
- Link to related content

---

## Common Elements Across All Pages

### Metadata
Every page must include:
```markdown
---
Title: [Page Title]
Description: [Meta description - 150-160 characters]
Keywords: [Relevant keywords]
---
```

### Navigation
Use fragment block for consistent navigation:
```markdown
Fragment
Path: /fragments/science-nav
```

### Footer
Use fragment block for footer:
```markdown
Fragment
Path: /fragments/footer
```

## Link Handling Rules

### Internal Links
**Convert to relative paths**:
- ✅ `/science/our-people/our-rd-leaders`
- ❌ `https://www.abbvie.com/science/our-people/our-rd-leaders.html`

### External Links
**Keep exactly as is**:
- ✅ `https://external-site.com/article`
- ✅ `https://pubmed.ncbi.nlm.nih.gov/12345678/`
- ✅ `https://www.linkedin.com/in/username`

### Email Links
**Keep as mailto links**:
- ✅ `mailto:contact@abbvie.com`

## Image Optimization

### Requirements
- **Hero Images**: 1920x1080px minimum, WebP format
- **Card Images**: 400x300px, WebP format
- **Profile Photos**: 800x800px, WebP format
- **Thumbnails**: 300x200px, WebP format

### Alt Text Rules
- Profile photos: "[Name], [Title] at AbbVie"
- Generic images: Descriptive text about content
- Decorative images: Empty alt attribute `alt=""`

## Accessibility Requirements

### WCAG 2.1 AA Compliance
- [ ] All images have descriptive alt text
- [ ] Proper heading hierarchy (no skipped levels)
- [ ] Color contrast ratio minimum 4.5:1
- [ ] Keyboard navigation functional
- [ ] Focus indicators visible
- [ ] Links have descriptive text (no "click here")

### Screen Reader Testing
- Test with VoiceOver (Mac) or NVDA (Windows)
- Ensure logical reading order
- Verify ARIA labels where needed

## SEO Requirements

### On-Page SEO
- [ ] Unique, descriptive title tags (50-60 characters)
- [ ] Compelling meta descriptions (150-160 characters)
- [ ] Proper heading hierarchy with keywords
- [ ] Internal linking structure maintained
- [ ] Image alt text with relevant keywords
- [ ] Fast page load (< 2 seconds)

### Structured Data
Add Person schema for leader profiles:
```json
{
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "[Full Name]",
  "jobTitle": "[Title]",
  "worksFor": {
    "@type": "Organization",
    "name": "AbbVie"
  },
  "description": "[Bio excerpt]",
  "image": "[Profile photo URL]"
}
```

## Quality Assurance Checklist

Before marking any page as complete:

- [ ] All content migrated accurately
- [ ] Images optimized and loading
- [ ] Internal links converted to relative paths
- [ ] External links preserved unchanged
- [ ] Responsive on mobile, tablet, desktop
- [ ] Accessibility tested
- [ ] SEO metadata complete
- [ ] No console errors
- [ ] Page loads under 2 seconds
- [ ] Cross-browser tested
- [ ] Structured data validated

## Migration Priority

### Phase 1 (High Priority)
1. Main landing page (/science/our-people)
2. R&D Leaders list page
3. Individual leader profile pages

### Phase 2 (Medium Priority)
4. Behind the Science
5. Community of Science

### Phase 3 (Lower Priority)
6. Discovery Files
7. Lab of the Future
8. Science in 60 Seconds

---

**Last Updated**: 2026-02-27
**Version**: 1.0
