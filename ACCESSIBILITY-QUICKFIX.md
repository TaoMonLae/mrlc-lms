# Accessibility Quick Fixes for MRLC-LMS

## Critical ARIA Labels to Add

### 1. Icon-Only Buttons (Add aria-label)

```tsx
// AppSidebar.tsx - Sidebar collapse button
<SidebarTrigger
  aria-label="Toggle sidebar navigation"
  className="md:hidden"
/>

// AppSidebar.tsx - Logout button
<DropdownMenuItem
  aria-label="Log out of application"
  onClick={handleLogout}
>
  <LogOut className="mr-2 h-4 w-4" />
  Log out
</DropdownMenuItem>

// TopBar.tsx - Theme toggle
<Button
  aria-label="Toggle theme between light and dark mode"
  variant="ghost"
  size="icon"
>
  <Sun className="h-5 w-5" />
  <Moon className="absolute h-5 w-5" />
</Button>

// TopBar.tsx - Notifications
<Button
  aria-label={`View ${activeAnnouncements.length} announcements`}
  variant="ghost"
  size="icon"
>
  <Bell className="h-5 w-5" />
</Button>

// Login.tsx - Login button
<Button
  aria-label="Sign in to dashboard"
  type="submit"
  id="login-submit-btn"
>
```

### 2. Form Accessibility

```tsx
// Add to all form inputs with errors
<Input
  id="email"
  type="email"
  aria-invalid={!!errors.email}
  aria-describedby={errors.email ? "email-error" : undefined}
  {...register("email")}
/>
{errors.email && (
  <p id="email-error" className="text-xs text-red-500" role="alert">
    {errors.email.message}
  </p>
)}

// Add required indicators
<Label htmlFor="email">
  Email Address
  <span className="text-red-500" aria-hidden="true"> *</span>
</Label>
```

### 3. Navigation Accessibility

```tsx
// AppSidebar.tsx - Add to sidebar
<Sidebar
  aria-label="Main application navigation"
  collapsible="icon"
>
  {/* Navigation content */}
</Sidebar>

// Add skip link for keyboard users
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary text-white px-4 py-2 rounded-lg"
>
  Skip to main content
</a>

// Add to main content area
<main id="main-content" tabIndex={-1}>
  {/* Page content */}
</main>
```

### 4. Table Accessibility

```tsx
// StudentsList.tsx - Add table captions
<table className="w-full text-left">
  <caption className="sr-only">
    List of all students including name, student ID, class, gender, and status
  </caption>
  <thead>
    <tr>
      <th scope="col">Student</th>
      <th scope="col">ID / Gender</th>
      {/* ... */}
    </tr>
  </thead>
  <tbody>
    {/* Table rows */}
  </tbody>
</table>
```

### 5. Live Regions for Dynamic Content

```tsx
// Add for error messages
<div
  aria-live="polite"
  aria-atomic="true"
  role="status"
  className="text-red-500"
>
  {serverError}
</div>

// Add for success toasts
<Toast
  aria-live="assertive"
  aria-atomic="true"
  role="alert"
>
  Operation completed successfully
</Toast>
```

### 6. Dialog/Modal Accessibility

```tsx
// Ensure all dialogs have proper labeling
<Dialog>
  <DialogContent
    aria-labelledby="dialog-title"
    aria-describedby="dialog-description"
  >
    <DialogTitle id="dialog-title">Delete Student</DialogTitle>
    <DialogDescription id="dialog-description">
      Are you sure you want to delete this student? This action cannot be undone.
    </DialogDescription>
  </DialogContent>
</Dialog>
```

## Focus Management

### 1. Visible Focus Indicators

Ensure all focusable elements have visible focus:

```css
/* Add to index.css if not present */
*:focus-visible {
  outline: 2px solid var(--color-aubergine-600);
  outline-offset: 2px;
}

/* Ensure focus indicators work in dark mode */
.dark *:focus-visible {
  outline: 2px solid var(--color-aubergine-400);
  outline-offset: 2px;
}
```

### 2. Focus Trapping in Modals

```tsx
// Dialog components should trap focus
<DialogContent
  onPointerDownOutside={(e) => e.preventDefault()}
  onInteractOutside={(e) => e.preventDefault()}
>
  {/* Modal content */}
</DialogContent>
```

## Keyboard Navigation

### 1. Add Keyboard Shortcuts

```tsx
// Add keyboard navigation hints
const keyboardShortcuts = {
  'Ctrl/Cmd + K': 'Open search',
  'Ctrl/Cmd + /': 'View shortcuts',
  'Esc': 'Close modal',
};

// Display in help dialog
<KeyboardShortcutDialog shortcuts={keyboardShortcuts} />
```

### 2. Ensure Custom Components Are Keyboard Accessible

```tsx
// Custom dropdowns should work with keyboard
<div
  role="combobox"
  aria-expanded={isOpen}
  aria-haspopup="listbox"
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      toggleDropdown();
    }
  }}
  tabIndex={0}
>
  {/* Dropdown content */}
</div>
```

## Color Contrast Fixes

### Check and Fix Low Contrast Areas

```css
/* Ensure these contrast ratios are met */
/* Text on background: 4.5:1 for normal text, 3:1 for large text */
/* Interactive elements: 3:1 against adjacent colors */

/* Fix low contrast badges */
.badge-on-leave {
  background-color: #fef3c7; /* darker for contrast */
  color: #92400e; /* darker text */
}

/* Fix dark mode sidebar text */
.sidebar-text {
  color: rgba(255, 255, 255, 0.9); /* Increased from 0.8 */
}
```

## Screen Reader Testing Checklist

Test with these screen readers:

### Windows
- [ ] NVDA (Free) - http://www.nvaccess.org/
- [ ] JAWS (Paid) - https://www.freedomscientific.com/

### Mac
- [ ] VoiceOver (Built-in) - Cmd + F5 to toggle

### Mobile
- [ ] TalkBack (Android) - Accessibility settings
- [ ] VoiceOver (iOS) - Accessibility settings

## Automated Testing

### Run Lighthouse Audit

```bash
# Install Lighthouse CLI
npm install -g lighthouse

# Run accessibility audit
lighthouse https://gedmrlc.monrefugeelc.com --only-categories=accessibility --view
```

### Add to CI/CD

```json
// package.json
{
  "scripts": {
    "test:a11y": "lighthouse http://localhost:8000 --only-categories=accessibility --chrome-flags='--headless'"
  }
}
```

## ESLint Rule for Accessibility

```json
// .eslintrc.json
{
  "extends": ["plugin:jsx-a11y/recommended"],
  "plugins": ["jsx-a11y"],
  "rules": {
    "jsx-a11y/anchor-is-valid": "error",
    "jsx-a11y/aria-props": "error",
    "jsx-a11y/aria-proptypes": "error",
    "jsx-a11y/aria-unsupported-elements": "error",
    "jsx-a11y/role-has-required-aria-props": "error",
    "jsx-a11y/role-supports-aria-props": "error"
  }
}
```

Install dependencies:
```bash
npm install --save-dev eslint-plugin-jsx-a11y
```

## Priority Implementation Order

1. **Add aria-label to all icon-only buttons** (30 min)
2. **Add form error ARIA attributes** (1 hour)
3. **Add skip navigation link** (15 min)
4. **Add table captions** (30 min)
5. **Test with screen reader** (2 hours)
6. **Fix keyboard navigation** (2 hours)
7. **Run Lighthouse audit** (30 min)
8. **Fix color contrast issues** (1 hour)

Total estimated time: ~7 hours

## Success Criteria

- [ ] Lighthouse Accessibility Score: 95+
- [ ] All icon-only buttons have aria-label
- [ ] All form errors have role="alert"
- [ ] All modals trap focus
- [ ] Keyboard can navigate all features
- [ ] Screen reader can announce all important information
- [ ] Color contrast ratios meet WCAG AA standards
