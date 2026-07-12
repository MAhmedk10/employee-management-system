# Linkage Digital — Design System

> Extracted from **Stitch project**: `projects/1145583925317207266`
> Screens: **Admin Portal Login - Refined** (`screens/57cf2ed2f91b49ef909c18452860a4b6`) · **Admin Dashboard - Final Responsive Refinements** (`screens/2b77c7b11fd94f60ada1d40e4add3eb6`)
> Device: Desktop · Mode: Light

---

## Brand

**Personality:** High-end, precise, profoundly technical. Built for organizations that value clarity and technological sophistication in employee management. Balances a calm, professional core with vibrant, high-energy accents.

**Style:** Corporate / Modern with subtle Technological accents. Inspired by SaaS platforms like Linear — heavy whitespace, crisp borders, circuit-line flourishes, and pixel-cluster accents that echo the brand mark.

---

## Color Palette

### Semantic Colors (Login Page)

| Token | Hex | Usage |
|---|---|---|
| `background` | `#FAFAFB` | App canvas / page background |
| `surface` | `#FFFFFF` | Cards, modals, form containers |
| `surface-container` | `#F8FAFC` | Secondary surface layer |
| `surface-container-lowest` | `#FFFFFF` | Highest contrast surface |
| `surface-container-highest` | `#DCE2F3` | Lowest contrast surface |
| `on-surface` | `#0F172A` | Primary text on any surface |
| `on-surface-variant` | `#64748B` | Secondary / muted text |
| `outline` | `#94A3B8` | Default icon / placeholder color |
| `outline-variant` | `#E2E8F0` | Borders, dividers |
| `primary` | `#0F172A` | Primary brand / headings |
| `on-primary` | `#FFFFFF` | Text on primary background |
| `secondary` | `#2E9BF0` | Interactive accent, links, focus |
| `on-secondary` | `#FFFFFF` | Text on secondary background |
| `error` | `#EF4444` | Error states |
| `error-container` | `#FEE2E2` | Error background |
| `on-error-container` | `#93000A` | Error text on error container |
| `inverse-surface` | `#2A313D` | Dark backgrounds |
| `inverse-on-surface` | `#EBF1FF` | Light text on dark backgrounds |

### Dashboard-specific Color Extensions

> New tokens added from **Admin Dashboard - Final Responsive Refinements** design.

| Token | Hex | Usage |
|---|---|---|
| `surface-container-low` | `#F0F3FF` | Sidebar hover / secondary surface |
| `surface-container-high` | `#E2E8F8` | Table header bg, progress track |
| `surface-variant` | `#DCE2F3` | Sidebar active bg |
| `secondary-container` | `#43A9FF` | Focus rings, sidebar active border |
| `on-secondary-container` | `#003C64` | Text on secondary container |
| `status-present` | `#10B981` | Present badge (emerald-500) |
| `status-present-bg` | `#D1FAE5` | Present badge background |
| `status-late` | `#F97316` | Late badge (orange-500) |
| `status-late-bg` | `#FFEDD5` | Late badge background |
| `status-absent` | `#EF4444` | Absent badge |
| `status-absent-bg` | `#FEE2E2` | Absent badge background |
| `status-leave` | `#8B5CF6` | On Leave badge (violet-500) |
| `status-leave-bg` | `#EDE9FE` | On Leave badge background |
| `status-pending` | `#475569` | Pending badge |
| `status-pending-bg` | `#F1F5F9` | Pending badge background |

### Brand Accent Gradient

| Role | Value |
|---|---|
| Gradient Start | `#2E9BF0` (Cyan-Blue) |
| Gradient End | `#9B30E0` (Violet) |
| CSS | `linear-gradient(135deg, #2E9BF0 0%, #9B30E0 100%)` |
| Usage | Primary CTA buttons, active state top-borders, brand highlights |

### Override Colors (Stitch Design System)

| Override | Hex |
|---|---|
| Primary | `#12121A` |
| Secondary | `#2E9BF0` |
| Tertiary | `#9B30E0` |
| Neutral | `#6B7280` |

---

## Typography

**Strategy:** Tri-font system — each font has a distinct role.

| Font | Role | Rationale |
|---|---|---|
| **Space Grotesk** | Headlines, brand moments | Geometric, technical feel |
| **Inter** | Body text, UI labels, inputs | Neutral, highly legible |
| **JetBrains Mono** | Numeric data, IDs, tables | Digital aesthetic, perfect alignment |

### Type Scale

| Token | Family | Size | Weight | Line Height | Letter Spacing |
|---|---|---|---|---|---|
| `display` | Space Grotesk | 48px | 700 | 1.1 | -0.02em |
| `headline-lg` | Space Grotesk | 32px | 600 | 40px | -0.01em |
| `headline-lg-mobile` | Space Grotesk | 24px | 600 | 32px | — |
| `headline-md` | Inter | 22px | 600 | 28px | -0.01em |
| `body-lg` | Inter | 18px | 400 | 28px | — |
| `body-md` | Inter | 15px | 400 | 24px | — |
| `body-sm` | Inter | 14px | 400 | 20px | — |
| `label-md` | Inter | 14px | 500 | 16px | 0.01em |
| `data-mono` | JetBrains Mono | 14px | 500 | 20px | — |

---

## Spacing

Base unit: **4px**

| Token | Value |
|---|---|
| `xs` | 4px |
| `sm` | 8px |
| `md` | 16px |
| `lg` | 24px |
| `xl` | 40px |
| `gutter` | 24px |
| `margin` | 32px |
| `container-max` | 1440px |

### Dashboard-specific Spacing

> New tokens added from **Admin Dashboard - Final Responsive Refinements** design.

| Token | Value | Usage |
|---|---|---|
| `sidebar-width` | 256px (w-64) | Expanded sidebar |
| `sidebar-collapsed` | 80px (w-20) | Collapsed icon-only sidebar |
| `appbar-height` | 64px (h-16) | Top app bar height |

---

## Border Radius

| Token | Value | Usage |
|---|---|---|
| `DEFAULT` | 4px (0.25rem) | Tags, chips, small elements |
| `lg` | 8px (0.5rem) | Inputs, buttons, cards |
| `xl` | 12px (0.75rem) | Cards, modals, containers |
| `full` | 9999px | Avatars, pills, circles |

---

## Elevation & Depth

Visual hierarchy through tonal layers + ambient shadows. **No heavy shadows** — use 1px borders.

| Level | Surface | Shadow | Border |
|---|---|---|---|
| 0 — Canvas | `#FAFAFB` | none | none |
| 1 — Card | `#FFFFFF` | `0px 1px 3px rgba(0,0,0,0.05), 0px 20px 25px -5px rgba(0,0,0,0.02)` | `1px solid #E2E8F0` |
| 2 — Overlay | `#FFFFFF` | `0px 12px 32px rgba(0,0,0,0.08)` | `1px solid #D1D5DB` |

### Dashboard Card Shadow
```css
box-shadow: 0px 4px 12px rgba(0, 0, 0, 0.03);
```

---

## Components

### Primary Button (CTA)
```css
background: linear-gradient(135deg, #2E9BF0 0%, #9B30E0 100%);
color: #FFFFFF;
border-radius: 8px;
font-weight: 600;
transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

:hover  { filter: brightness(1.05); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(46,155,240,0.25); }
:active { transform: translateY(0); filter: brightness(0.95); }
```

### Input Fields
```css
/* Default */
background: #FFFFFF;
border: 1px solid #E2E8F0;
border-radius: 8px;
color: #0F172A;
font-size: 15px;

/* Focus */
border-color: #2E9BF0;
box-shadow: 0 0 0 3px rgba(46, 155, 240, 0.10);
transform: translateY(-1px);
```

### Cards / Form Container
```css
background: #FFFFFF;
border: 1px solid #E2E8F0;
border-radius: 12px;
box-shadow: 0px 1px 3px rgba(0,0,0,0.05), 0px 20px 25px -5px rgba(0,0,0,0.02);
padding: 40px;
max-width: 440px;
```

### Dashboard Stat Cards
```css
background: #FFFFFF;
border: 1px solid #E2E8F0;
border-radius: 12px; /* rounded-xl */
padding: 24px;
box-shadow: 0px 4px 12px rgba(0, 0, 0, 0.03);
/* Accent top stripe: 4px absolute gradient/status bar at card top */
```

### Status Badges (Dashboard)
```css
font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase;
padding: 4px 12px; border-radius: 9999px; /* pill */
/* Present  */ background: #D1FAE5; color: #065F46;
/* Late     */ background: #FFEDD5; color: #9A3412;
/* Absent   */ background: #FEE2E2; color: #991B1B;
/* On Leave */ background: #EDE9FE; color: #5B21B6;
/* Pending  */ background: #F1F5F9; color: #475569;
```

### Sidebar Navigation
```css
/* Default nav item */
display: flex; align-items: center; gap: 12px; padding: 10px 12px;
color: #64748B; /* on-surface-variant */
border-radius: 0; /* flush with sidebar edges for full-width feel */
transition: background-color 0.15s ease;
:hover { background: #F0F3FF; } /* surface-container-low */

/* Active nav item */
color: #2E9BF0; /* secondary */
background: #E2E8F8; /* surface-container-high */
border-right: 4px solid #43A9FF; /* secondary-container */
font-weight: 600;
```

---

## Layout — Login Page

- **Container:** Centered both axes, `max-width: 440px`, full-height page
- **Background:** `#FAFAFB` with subtle fixed circuit-line SVG motifs (opacity 0.03)
- **Card padding:** `40px` (token: `xl`)
- **Form spacing:** `24px` between fields (token: `lg`)
- **Logo:** Centered, `height: 52px`, above headline
- **Headline:** "Admin Portal" — `headline-md`, centered, tight letter-spacing
- **Subtext:** "Sign in to your account to continue" — `body-sm`, `#64748B`
- **Divider:** `1px` horizontal rule, `#E2E8F0` at 60% opacity, with "or continue with" label
- **Footer:** Copyright + Privacy / Terms / Support links, `12px`, muted

---

## Layout — Admin Dashboard

> New layout tokens added from **Admin Dashboard - Final Responsive Refinements** design.

- **Shell:** Fixed sidebar (256px) + fluid main content; sidebar pushes content on desktop
- **Sidebar:** `bg-surface border-r border-outline-variant` fixed full-height, z-60
  - Logo section: `h-16` with gradient brand mark + wordmark
  - Nav items: ghost → active `bg-surface-container-high border-r-4 border-secondary-container text-secondary`
  - "New Report" gradient CTA button in nav body
  - Footer section: Account link + Sign Out (text-error, hover:bg-red-50)
  - Collapse toggle (desktop): shrinks to `w-20` icon-only
  - Mobile: off-canvas, slides in with `backdrop-blur-sm` overlay
- **Top AppBar:** `h-16` sticky, `bg-surface/80 backdrop-blur-md border-b border-outline-variant`
  - Search: rounded-full input, `focus:ring-2 focus:ring-secondary-container`
  - Notifications bell with `w-2 h-2 bg-error` pip
  - Admin avatar + name in top right
- **Stats Grid:** `grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-8`
  - Each card: absolute 4px top accent stripe in brand/status color
  - Icon badge: `w-10 h-10 rounded-lg` colored box
  - Value: `font-data-mono text-3xl font-bold`
- **Attendance Table:** Inside `rounded-xl` card, header with search + status filter
  - Table header: `font-label-md text-[11px] uppercase tracking-widest text-on-surface-variant`
  - Avatar: `w-10 h-10 rounded-full` photo or initials fallback
  - Status online dot: `w-3 h-3 rounded-full border-2 border-white` bottom-right of avatar
  - Row hover: `hover:bg-surface-container-low`
- **Sidebar Transition:**
  ```css
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1),
              transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  ```

---

## Decorative Elements

### Circuit Lines (Background)
- Fixed position, `z-index: 0`, `opacity: 0.03`, `pointer-events: none`
- SVG stepped-path motif — top-left and bottom-right corners
- Terminal points: filled circles (`r: 2.5`) and pixel squares (`4x4px`)
- Colors: `on-surface` for strokes, `brand-gradient-start/end` for pixel accents

### Pixel Clusters
- `2x2px` or `4x4px` squares grouped in clusters of 2-5
- Placed at terminal points of circuit lines
- Colors: gradient accent colors (`#2E9BF0`, `#9B30E0`)

---

## Login Page — Error State

```css
/* Error banner */
background: #FEE2E2;
border: 1px solid rgba(239, 68, 68, 0.2);
border-radius: 8px;
padding: 12px 16px;
color: #93000A;
font-size: 14px;
```

---

*Source: Stitch project `1145583925317207266` · Generated 2026-07-11*
