# Page Structure Guide

## Overview

This document defines the standardized structure for all pages in the TeamBalance application. Following this structure ensures consistency, maintainability, and a better user experience across the application.

## Table of Contents

- [Architecture](#architecture)
- [Page Elements](#page-elements)
- [CSS Classes](#css-classes)
- [Component Usage](#component-usage)
- [Examples](#examples)
- [Best Practices](#best-practices)

---

## Architecture

Every page in the application follows this hierarchical structure:

```html
<div class="page-layout">
  <!-- Sidebar (optional) -->
  <div class="page-layout__sidebar" id="sidebar-container"></div>

  <!-- Main Content -->
  <div class="page-layout__content">

    <!-- 1. PAGE HEADER (required) -->
    <header class="page-header">
      <h2>Page Title</h2>
      <p class="page-subtitle">Page description</p>
    </header>

    <!-- 2. PAGE INTRO (optional) -->
    <div class="page-intro">
      <!-- Welcome messages, guides, alerts -->
    </div>

    <!-- 3. PAGE CONTROLS (optional) -->
    <div class="page-controls">
      <!-- Filters, selectors, forms -->
    </div>

    <!-- 4. PAGE CONTENT (required) -->
    <div class="page-content">
      <!-- Main page content -->
    </div>

    <!-- 5. PAGE ACTIONS (optional) -->
    <div class="page-actions">
      <!-- Bottom actions, footer elements -->
    </div>

  </div>
</div>
```

---

## Page Elements

### 1. Page Header (Required)

The page header is **required** on all pages and should be the first element.

#### Structure

```html
<header class="page-header">
  <h2>Page Title</h2>
  <p class="page-subtitle">Brief description of the page's purpose</p>
</header>
```

#### With Actions

For headers that need action buttons or controls on the right:

```html
<header class="page-header page-header--with-actions">
  <div class="page-header__content">
    <h2 class="page-header__title">Page Title</h2>
    <p class="page-subtitle">Description</p>
  </div>
  <div class="page-header__actions">
    <button class="btn btn-primary">Action</button>
  </div>
</header>
```

#### Rules

- ✅ Always use semantic `<header>` tag
- ✅ Use `<h2>` for the title (h1 is reserved for app title)
- ✅ Include a `page-subtitle` to describe the page purpose
- ✅ Keep subtitle concise (1-2 sentences, max 70 characters)
- ❌ Don't add inline styles (mb-6, mt-2, etc.)
- ❌ Don't add inline classes to h2 (text-2xl, font-semibold, etc.)

---

### 2. Page Intro (Optional)

Use for welcome messages, important notices, or getting started guides.

#### Basic Structure

```html
<div class="page-intro">
  <div class="welcome-guide">
    <h3>Welcome!</h3>
    <p>Getting started instructions...</p>
  </div>
</div>
```

#### Variants

```html
<!-- Welcome style (with background) -->
<div class="page-intro page-intro--welcome">
  <!-- Content -->
</div>

<!-- Alert style (yellow/warning) -->
<div class="page-intro page-intro--alert">
  <!-- Important notice -->
</div>

<!-- Info style (blue/informational) -->
<div class="page-intro page-intro--info">
  <!-- Informational content -->
</div>
```

#### When to Use

- First-time user guides
- Important announcements
- Prerequisite information
- Contextual help

---

### 3. Page Controls (Optional)

Container for filters, selectors, forms, and configuration controls.

#### Basic Structure

```html
<div class="page-controls">
  <div class="activity-selector-container"></div>
  <div class="filter-container"></div>
</div>
```

#### Multiple Sections

```html
<div class="page-controls">
  <div class="page-controls__section">
    <h3 class="page-controls__section-title">Filters</h3>
    <!-- Filter controls -->
  </div>
  <div class="page-controls__section">
    <h3 class="page-controls__section-title">Settings</h3>
    <!-- Setting controls -->
  </div>
</div>
```

#### Horizontal Layout

```html
<div class="page-controls page-controls--horizontal">
  <label>Filter:</label>
  <select>...</select>
  <button>Apply</button>
</div>
```

---

### 4. Page Content (Required)

The main content area of the page. This is **required** on all pages.

#### Basic Structure

```html
<div class="page-content">
  <!-- Your main content here -->
  <div class="rankings-grid">...</div>
  <div class="teams-display">...</div>
  <div class="player-list">...</div>
</div>
```

#### With Sections

```html
<div class="page-content">
  <div class="page-content__section">
    <h3 class="page-content__section-title">Section 1</h3>
    <!-- Section content -->
  </div>
  <div class="page-content__section">
    <h3 class="page-content__section-title">Section 2</h3>
    <!-- Section content -->
  </div>
</div>
```

#### Empty State

```html
<div class="page-content page-content--empty">
  <div class="empty-state">
    <p>No data to display</p>
  </div>
</div>
```

---

### 5. Page Actions (Optional)

Container for bottom page actions, like export, save, or navigation buttons.

#### Basic Structure

```html
<div class="page-actions">
  <button class="btn btn-secondary">Cancel</button>
  <button class="btn btn-primary">Save</button>
</div>
```

#### Layout Variants

```html
<!-- Right-aligned (default) -->
<div class="page-actions page-actions--horizontal">
  <button>Export</button>
  <button>Print</button>
</div>

<!-- Centered -->
<div class="page-actions page-actions--centered">
  <button>Continue</button>
</div>

<!-- Space between -->
<div class="page-actions page-actions--space-between">
  <button>Back</button>
  <button>Next</button>
</div>
```

---

## CSS Classes

### Core Structure Classes

| Class | Purpose | Required |
|-------|---------|----------|
| `.page-header` | Page header container | ✅ Yes |
| `.page-header__title` | Page title | ✅ Yes |
| `.page-subtitle` | Page description | Recommended |
| `.page-intro` | Introduction/guide section | Optional |
| `.page-controls` | Filters and controls | Optional |
| `.page-content` | Main content area | ✅ Yes |
| `.page-actions` | Bottom actions | Optional |

### Modifier Classes

| Class | Purpose |
|-------|---------|
| `.page-header--with-actions` | Header with right-side actions |
| `.page-intro--welcome` | Welcome style (background) |
| `.page-intro--alert` | Alert/warning style |
| `.page-intro--info` | Informational style |
| `.page-controls--horizontal` | Horizontal controls layout |
| `.page-actions--horizontal` | Right-aligned actions |
| `.page-actions--centered` | Centered actions |
| `.page-actions--space-between` | Space between actions |
| `.page-content--empty` | Empty state styling |

### Utility Classes

| Class | Purpose |
|-------|---------|
| `.page-divider` | Horizontal divider between sections |
| `.page-divider--thick` | Thicker divider |
| `.page-section` | Generic section spacing |
| `.page-section--compact` | Reduced section spacing |
| `.page-section--spacious` | Increased section spacing |

---

## Component Usage

### PageHeader Component

For JavaScript-based rendering, use the `PageHeader` component:

```javascript
import PageHeader from '../components/base/PageHeader.js';

// In your page component
const headerContainer = this.$('.page-header-container');
const pageHeader = new PageHeader(headerContainer, {
  title: 'Player Rankings',
  subtitle: 'View and compare player skill ratings'
});
pageHeader.mount();
```

#### With Actions

```javascript
const pageHeader = new PageHeader(headerContainer, {
  title: 'Player Rankings',
  subtitle: 'View and compare player skill ratings',
  withActions: true,
  actions: `
    <button class="btn btn-primary">Export</button>
    <button class="btn btn-secondary">Print</button>
  `
});
```

---

## Examples

### Example 1: Simple Page (Rankings)

```javascript
render() {
  return this.renderPageWithSidebar(`
    <header class="page-header">
      <h2>Player Rankings</h2>
      <p class="page-subtitle">View and compare player skill ratings across all positions</p>
    </header>

    <div class="page-content">
      <div class="rankings-grid">
        <!-- Rankings content -->
      </div>
    </div>
  `);
}
```

### Example 2: Page with Controls (Compare)

```javascript
render() {
  return this.renderPageWithSidebar(`
    <header class="page-header">
      <h2>Compare Players</h2>
      <p class="page-subtitle">Build accurate ratings through head-to-head comparisons</p>
    </header>

    <div class="page-controls">
      <div class="position-selector-container"></div>
    </div>

    <div class="page-content">
      <div class="comparison-area-container"></div>
    </div>
  `);
}
```

### Example 3: Page with Intro (Settings)

```javascript
render() {
  const hasPlayers = this.playerService.getAll().length > 0;

  return this.renderPageWithSidebar(`
    <header class="page-header">
      <h2>Player Management</h2>
      <p class="page-subtitle">Add players and manage your roster</p>
    </header>

    ${!hasPlayers ? `
      <div class="page-intro">
        <div class="welcome-guide">
          <h3>Welcome to TeamBalance!</h3>
          <p>Get started by adding your first player...</p>
        </div>
      </div>
    ` : ''}

    <div class="page-controls">
      <div class="add-player-form-container"></div>
    </div>

    <div class="page-content">
      <div class="player-list-container"></div>
    </div>
  `);
}
```

### Example 4: Page with Actions (Teams)

```javascript
render() {
  return this.renderPageWithSidebar(`
    <header class="page-header">
      <h2>Create Balanced Teams</h2>
      <p class="page-subtitle">Generate optimally balanced teams</p>
    </header>

    <div class="page-controls">
      <div class="team-builder-container"></div>
    </div>

    <div class="page-content">
      <div class="teams-display-container"></div>
    </div>

    <div class="page-actions page-actions--horizontal">
      <button class="btn btn-secondary">Reset</button>
      <button class="btn btn-primary">Export Teams</button>
    </div>
  `);
}
```

---

## Best Practices

### ✅ Do

- Always include a `page-header` as the first element
- Use semantic HTML tags (`<header>`, `<section>`, `<article>`)
- Keep subtitles concise and descriptive
- Use `page-content` for the main content area
- Group related controls in `page-controls`
- Use modifier classes for layout variants
- Follow the established hierarchy

### ❌ Don't

- Don't use inline spacing classes (mb-6, mt-2, etc.) on structural elements
- Don't override header typography with inline classes
- Don't skip the `page-header`
- Don't nest page structure elements incorrectly
- Don't create custom spacing when standard classes exist
- Don't use div when semantic tags are appropriate

### Accessibility

- Use semantic HTML elements
- Include ARIA labels where appropriate
- Ensure proper heading hierarchy (h2 for page titles)
- Provide descriptive subtitles
- Use role attributes for custom widgets

### Responsive Design

All page structure elements are responsive by default:

- Headers stack on mobile (title + actions become vertical)
- Controls wrap appropriately
- Content adapts to viewport
- Spacing reduces on smaller screens

### Maintainability

- Use the defined structure consistently
- Leverage the `PageHeader` component when possible
- Keep CSS classes semantic and purpose-driven
- Document any deviations from the standard structure
- Update this guide when patterns evolve

---

## Migration Checklist

When updating an existing page to the new structure:

- [ ] Replace `<div class="page-header">` with `<header class="page-header">`
- [ ] Remove inline spacing classes (mb-6, mt-2, etc.)
- [ ] Use `page-subtitle` class instead of inline text-secondary
- [ ] Wrap controls in `<div class="page-controls">`
- [ ] Wrap main content in `<div class="page-content">`
- [ ] Add `<div class="page-intro">` for guides/alerts
- [ ] Add `<div class="page-actions">` for bottom actions
- [ ] Test responsive behavior
- [ ] Verify accessibility

---

## Related Documentation

- [Component Architecture](./COMPONENTS.md)
- [CSS Architecture](./CSS_ARCHITECTURE.md)
- [Accessibility Guidelines](./ACCESSIBILITY.md)

---

**Last Updated:** 2025-11-22
**Maintained by:** TeamBalance Development Team
