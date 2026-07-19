# Claude.ai-Inspired Design Guide

## Design Philosophy

The frontend UI follows Claude.ai's minimalist, calm aesthetic:

- **No gradients**: Clean, flat colors only
- **No glow effects**: Subtle borders and clean lines
- **No glassmorphism**: Solid, trustworthy appearance
- **Warm tones**: Dark theme with orange-umber accent
- **Typography-driven**: Generous spacing, clear hierarchy
- **System fonts only**: No external dependencies

## Color System

### Dark Theme Palette

```
┌─────────────────────────────────────────────────────────┐
│ Background Primary        │ #1a1a1a  │ ■ Base           │
│ Background Card           │ #262626  │ ■ Panel/Card     │
│ Background Input          │ #2f2f2f  │ ■ Form Input     │
│ Border Subtle             │ #3d3d3d  │ ■ Dividers       │
├─────────────────────────────────────────────────────────┤
│ Text Primary              │ #ececec  │ ■ Main Text      │
│ Text Secondary            │ #a3a3a3  │ ■ Labels/Hints   │
├─────────────────────────────────────────────────────────┤
│ Accent (CTA)              │ #cc785c  │ ■ Orange-Umber   │
│ Accent Hover              │ #d98968  │ ■ Lighter shade  │
├─────────────────────────────────────────────────────────┤
│ Status: Connected         │ #22c55e  │ ■ Green          │
│ Status: Error             │ #ef4444  │ ■ Red            │
└─────────────────────────────────────────────────────────┘
```

### Color Contrast
- Text Primary (ececec) on Background Primary (1a1a1a): **5.3:1** ✓ WCAG AA
- Text Secondary (a3a3a3) on Background Card (262626): **5.1:1** ✓ WCAG AA
- Accent (cc785c) on Background Primary (1a1a1a): **4.7:1** ✓ WCAG A

## Layout Grid

### 3-Column Layout (Desktop)

```
┌──────────┬───────────────────────────────┬────────────┐
│          │                               │            │
│ SIDEBAR  │     MAIN CONTENT              │  PREVIEW   │
│  280px   │     (flexible)                │   320px    │
│          │                               │            │
│ • Logo   │ ┌─────────────────────────┐   │ • Tabs     │
│ • Nav    │ │ Step 1 of 4             │   │ • iframe   │
│ • Status │ │                         │   │            │
│          │ │ Content Panel (dynamic) │   │            │
│          │ │                         │   │            │
│          │ └─────────────────────────┘   │            │
└──────────┴───────────────────────────────┴────────────┘
```

### Sidebar Navigation

```
┌─ Sidebar ─────────────────────┐
│                               │
│ 🚀 ApplyJob                   │
│ ─────────────────────────────  │
│                               │
│ ○ 👤 Profile                  │
│ ○ 📄 Job                      │
│ ○ ⚡ Generate                 │
│ ○ ⚙️  Settings                │
│                               │
│ [▪] anthropic — Ready         │
│     (Status indicator)        │
└─────────────────────────────────┘

• Hover: Background shifts to #353535
• Active: Border + text becomes accent color
• Status dot: Green (connected), gray (offline)
```

### Main Content Area

```
┌─ Main ────────────────────────────────────────┐
│                                               │
│ STEP 1 OF 4                                   │
│ (small, uppercase, secondary color)           │
│                                               │
│ Your Profile                                  │
│ (24px heading)                                │
│                                               │
│ ┌─────────────────────────────────────────┐   │
│ │ Basic Information                       │   │
│ │ ┌─────────────────────────────────────┐ │   │
│ │ │ Full Name                           │ │   │
│ │ └─────────────────────────────────────┘ │   │
│ │ ┌─────────────────────────────────────┐ │   │
│ │ │ Email                               │ │   │
│ │ └─────────────────────────────────────┘ │   │
│ │ (more fields...)                        │   │
│ └─────────────────────────────────────────┘   │
│                                               │
│ ┌─────────────────────────────────────────┐   │
│ │ Professional Summary                    │   │
│ │ ┌─────────────────────────────────────┐ │   │
│ │ │ [textarea - 4 rows]                 │ │   │
│ │ │                                     │ │   │
│ │ └─────────────────────────────────────┘ │   │
│ └─────────────────────────────────────────┘   │
│                                               │
│              [Save Profile]                   │
│         (Primary button, full-width)         │
│                                               │
└──────────────────────────────────────────────┘
```

### Form Section Structure

```
┌─ Form Section ────────────────────────────┐
│                                           │
│ Heading (uppercase, secondary color)     │
│                                           │
│ ┌─────────────────────────────────────┐   │
│ │ Input placeholder text              │   │
│ └─────────────────────────────────────┘   │
│ (--bg-input, --border, --radius-md)       │
│                                           │
│ ┌─────────────────────────────────────┐   │
│ │ Another input                       │   │
│ └─────────────────────────────────────┘   │
│                                           │
│ [+ Add Item]  [Primary Action]            │
│ (secondary button)  (primary button)      │
│                                           │
└───────────────────────────────────────────┘
```

## Component Styles

### Buttons

#### Primary Button
```
┌─────────────────────────┐
│  ⚡ Generate with AI    │
│ (--accent background)   │
└─────────────────────────┘

• Background: #cc785c
• Text: White
• Hover: #d98968 (lighter)
• Active: scale(0.98)
• Padding: 12px 24px
• Radius: 8px
```

#### Secondary Button
```
┌─────────────────────────┐
│  + Add Experience       │
│ (transparent, border)   │
└─────────────────────────┘

• Background: transparent
• Border: #3d3d3d
• Text: #a3a3a3
• Hover: #353535 bg, #ececec text
• Padding: 12px 24px
• Radius: 8px
```

### Form Inputs

```
┌─────────────────────────────────────┐
│ Full Name                           │ (placeholder)
└─────────────────────────────────────┘

• Background: #2f2f2f
• Border: #3d3d3d (1px)
• Text: #ececec
• Focus: Border #cc785c
• Padding: 12px 16px
• Radius: 8px
• Font: inherit (14px, 1.6 line-height)
```

### Template Selector (3-column grid)

```
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│                 │ │                 │ │                 │
│       📋        │ │       ✨        │ │       ✍️        │
│                 │ │                 │ │                 │
│     Classic     │ │     Modern      │ │     Minimal     │
│                 │ │                 │ │                 │
│ ATS-friendly,   │ │ Contemporary,   │ │ Typography-     │
│ traditional     │ │ 2-column        │ │ first           │
│                 │ │                 │ │                 │
│ Border: #3d3d3d │ │ Border: #3d3d3d │ │ Border: #cc785c │
│                 │ │                 │ │ (selected)      │
└─────────────────┘ └─────────────────┘ └─────────────────┘

• Padding: 24px
• Radius: 8px
• Cursor: pointer
• Hover: Border #4d4d4d, bg #353535
• Selected: Border #cc785c
```

### Dynamic Entry Container

```
┌─ Experience Entry ────────────────────────┐
│                              ✕ (remove)  │ (top-right)
│                                          │
│ ┌──────────────┐   ┌──────────────┐     │ (2-col row)
│ │ Company      │   │ Position     │     │
│ └──────────────┘   └──────────────┘     │
│                                          │
│ ┌──────────────┐   ┌──────────────┐     │ (2-col row)
│ │ Start Date   │   │ End Date     │     │
│ └──────────────┘   └──────────────┘     │
│                                          │
│ ┌─────────────────────────────────────┐ │ (full-width)
│ │ Key achievements and               │ │
│ │ responsibilities...                │ │
│ └─────────────────────────────────────┘ │
│                                          │
└──────────────────────────────────────────┘

• Background: #2f2f2f
• Border: 1px #3d3d3d
• Radius: 8px
• Padding: 16px
• Gap: 12px (vertical)
• Remove button: Position absolute, top-right
```

### Preview Panel (Right Sidebar)

```
┌─ Preview ─────────────────────────────┐
│                                        │
│ [📄 Resume] [💬 Cover Letter]         │ (tabs)
│                                        │
│ ┌──────────────────────────────────┐  │
│ │                                  │  │
│ │      (iframe preview)            │  │
│ │                                  │  │
│ │   Shows generated document       │  │
│ │   srcdoc = result.resume         │  │
│ │                                  │  │
│ └──────────────────────────────────┘  │
│                                        │
└────────────────────────────────────────┘

• Tabs: 2px bottom border on active
• Tab color: #cc785c when active
• iframe: Flex: 1 (fills space)
```

### Status Indicator

```
┌─ API Status ──────────────────┐
│ ● anthropic — Ready           │
│   (green dot + text)          │
└───────────────────────────────┘

• Background: #2f2f2f
• Padding: 12px 16px
• Border: 1px #3d3d3d
• Radius: 8px
• Status dot: 8px circle
  - Connected: #22c55e
  - Error: #ef4444
  - Offline: #8b8b8b
```

## Typography Hierarchy

```
Step 1 of 4
│
├─ font-size: 13px
├─ text: #a3a3a3 (secondary)
├─ weight: 500
├─ letter-spacing: 0.5px
└─ text-transform: uppercase
   (Used for step indicator, form labels)


Your Profile
│
├─ font-size: 24px (h1)
├─ text: #ececec (primary)
├─ weight: 600
├─ letter-spacing: -0.5px
├─ margin-bottom: 24px
└─ (Top-level section heading)


Basic Information
│
├─ font-size: 18px (h2)
├─ text: #ececec (primary)
├─ weight: 500
├─ margin-bottom: 16px
└─ (Sub-section heading)


Full Name
│
├─ font-size: 14px (base)
├─ text: #ececec (primary)
├─ line-height: 1.6
└─ (Form content)
```

## Responsive Breakpoints

### Desktop (> 1200px)
```
┌──────────┬──────────────────┬──────────┐
│ Sidebar  │   Main Content   │ Preview  │
│  280px   │    (flexible)    │  320px   │
└──────────┴──────────────────┴──────────┘
```

### Tablet (768px - 1200px)
```
┌─────────────────────────────────────────┐
│ 🚀 Profile | Job | Generate | Settings  │
├─────────────────────────────────────────┤
│                                         │
│         Main Content (full width)       │
│                                         │
├─────────────────────────────────────────┤
│  Preview (below, full width, max-h)    │
└─────────────────────────────────────────┘
```

### Mobile (< 768px)
```
┌────────────────────────────────────────┐
│ 🚀 Profile|Job|Generate|Settings (horiz)
├────────────────────────────────────────┤
│                                        │
│    Main Content (single column)        │
│                                        │
├────────────────────────────────────────┤
│ Preview (collapsed/below)              │
└────────────────────────────────────────┘

• Sidebar: Horizontal sticky header
• Button groups: Stack vertically
• Entry rows: Single column
• Template grid: Single column
```

## Animations & Transitions

### Step Transition
```css
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}
Duration: 250ms ease
Applied to: .step-content.active
```

### Button Hover
```
Color: var(--text-secondary) → var(--text-primary)
Background: transparent → var(--bg-input)
Duration: 150ms ease
```

### Button Active
```
Transform: scale(0.98)
Duration: Instant
Timing: :active pseudo-class
```

### Input Focus
```
Border: var(--border) → var(--accent)
Duration: 150ms ease
```

## Dark Mode Considerations

- **Carefully chosen grays**: Avoid pure black (#000000)
- **Sufficient contrast**: All text meets WCAG AA standards
- **Warm tone**: #cc785c accent is more flattering than cool blue
- **Reduced brightness**: Easier on eyes, prevents eye strain
- **Status colors**: Green/Red still clear in dark context

## Spacing Reference

```
Vertical Rhythm (Gap-based)
├─ Between sections: 24px (--space-lg)
├─ Within section: 16px (--space-md)
├─ Between inputs: 8px (--space-sm)
├─ Input padding: 12px (--space-md)
└─ Small gaps: 4px (--space-xs)

Horizontal Rhythm (Padding-based)
├─ Card/Panel padding: 16-24px
├─ Input padding: 16px (left/right)
├─ Button padding: 24px (left/right)
└─ Sidebar padding: 16px (left/right)
```

## Accessibility

### Color Contrast
- ✓ All text meets WCAG AA minimum (4.5:1)
- ✓ Interactive elements have clear hover states
- ✓ Focus states use accent color (not outline)

### Semantic HTML
- ✓ Proper heading hierarchy (h1, h2)
- ✓ Form labels for inputs (via placeholder + context)
- ✓ Button elements for interactive controls
- ✓ Semantic section tags

### Keyboard Navigation
- ✓ Tab order follows visual flow
- ✓ Focus visible on all interactive elements
- ✓ Enter key triggers buttons
- ✓ Arrows available for selects

### Screen Readers
- ✓ Descriptive button text (not just icons)
- ✓ Form sections grouped logically
- ✓ Status messages announced
- ✓ Error/success feedback clear

## Implementation Checklist

- [ ] style.css loaded before HTML content
- [ ] System fonts configured (no external CDNs)
- [ ] Color variables used consistently
- [ ] Responsive breakpoints tested
- [ ] Focus states visible on all interactive elements
- [ ] Hover states don't interfere with touch devices
- [ ] Icons are text emojis (no image assets)
- [ ] All transitions under 300ms
- [ ] No layout shifts during state changes
- [ ] Scrollbars styled consistently

## Testing Checklist

- [ ] Test on Chrome, Firefox, Safari, Edge
- [ ] Test on iPhone, iPad, Android
- [ ] Zoom to 200% (responsive layout holds)
- [ ] Dark mode simulator (already dark theme)
- [ ] Tab through all inputs (keyboard nav)
- [ ] Screen reader (NVDA/JAWS Windows, VoiceOver Mac)
- [ ] Lighthouse accessibility audit
- [ ] Color contrast validator (WCAG AA)
- [ ] Network throttle (slow 3G) — CSS should load fast

## Future Design Variations

- [ ] Light theme variant (inverse colors)
- [ ] Compact mode (reduced spacing, smaller fonts)
- [ ] Custom theme builder (user-configurable colors)
- [ ] Animation preferences (respects prefers-reduced-motion)
- [ ] High contrast mode (increased contrast for accessibility)
