---
name: Studio Workspace System
colors:
  surface: '#fff8f5'
  surface-dim: '#e0d8d5'
  surface-bright: '#fff8f5'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#faf2ee'
  surface-container: '#f4ece8'
  surface-container-high: '#eee7e3'
  surface-container-highest: '#e9e1dd'
  on-surface: '#1e1b19'
  on-surface-variant: '#464555'
  inverse-surface: '#33302d'
  inverse-on-surface: '#f7efeb'
  outline: '#777587'
  outline-variant: '#c7c4d8'
  surface-tint: '#4d44e3'
  primary: '#3525cd'
  on-primary: '#ffffff'
  primary-container: '#4f46e5'
  on-primary-container: '#dad7ff'
  inverse-primary: '#c3c0ff'
  secondary: '#a93349'
  on-secondary: '#ffffff'
  secondary-container: '#fe7488'
  on-secondary-container: '#730425'
  tertiary: '#005338'
  on-tertiary: '#ffffff'
  tertiary-container: '#006e4b'
  on-tertiary-container: '#67f4b7'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#3323cc'
  secondary-fixed: '#ffdadc'
  secondary-fixed-dim: '#ffb2b9'
  on-secondary-fixed: '#400010'
  on-secondary-fixed-variant: '#891933'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#fff8f5'
  on-background: '#1e1b19'
  surface-variant: '#e9e1dd'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '800'
    lineHeight: 48px
    letterSpacing: -0.025em
  headline-xl-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 30px
    fontWeight: '800'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 30px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
    letterSpacing: '0'
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
    letterSpacing: '0'
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0.005em
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.03em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.25rem
  gutter-mobile: 0.75rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.25rem
---

## Brand & Style

This design system embodies the ethos of a high-end physical design studio translated into a digital canvas: warm, expressive, tactile, and thoughtfully disciplined. Built for modern product squads, brand agencies, and cross-functional creative teams, it replaces sterile, clinical corporate software tropes with artisanal warmth, paper-like tactile surfaces, and spirited, purposeful color accents.

### Aesthetic Foundation
- **Tactile Warm Minimalism:** Grounded in layered porcelain cream tones instead of cold, stark blue-grays. Surfaces evoke fine stationery, warm ceramic workbenches, and soft-focus studio lighting.
- **Expressive Focus:** The interface delivers high scannability through purposeful color gating. Creative expressive accents (lavender, coral, mint, sky, honey) are reserved for team attribution, contextual workflow states, and priority tags, leaving core interaction surfaces restful and calm.
- **Micro-Delight & Utility:** Smooth micro-interactions, soft physical pill controls, floating trays, and humanized touchpoints make routine task management, sprint boards, and collaborative canvas reviews feel fluid and rewarding.

## Colors

The palette draws inspiration from atelier materials: linen paper, warm stone, raw porcelain, and intentional pigment inks.

### Primary & Functional Accents
- **Primary Canvas & Ground:** Base canvas sits on porcelain warm off-white (`#FAF9F6`), stepping to neutral container tone (`#F4F2EC`) and pristine surface white (`#FFFFFF`) for elevated cards.
- **Brand Primary:** Warm Indigo (`#4F46E5`) provides confident, grounded leadership across major actions, brand anchors, and focused active rings.
- **Text & Neutral Contrast:** Deep Warm Stone (`#1C1917`) replaces harsh pitch black for primary text, paired with stone-500 (`#78716C`) for metadata and stone-200/300 (`#E7E5E4` / `#D6D3D1`) for tactile borders.

### Multi-Accent Semantic & Role System
Accents function in unified dual pairs (tinted surface background + high-contrast ink foreground) to maximize legibility and visual scanning:
- **Lilac / Lavender (`#EDE9FE` / `#7C3AED`):** Conceptual ideation, backlog items, product strategy, and creative director roles.
- **Warm Coral (`#FFE4E6` / `#E11D48`):** Blockers, urgent sprints, and critical overdue flags (*Quá hạn*).
- **Fresh Mint / Sage (`#ECFDF5` / `#059669`):** Approved assets, shipped milestones, and completed tasks (*Hoàn thành*).
- **Electric Sky (`#E0F2FE` / `#0284C7`):** Active review cycles, ongoing development, and working state (*Đang làm*).
- **Warm Honey / Amber (`#FEF3C7` / `#D97706`):** Discovery, waiting states, and unstarted queue items (*Chưa làm*).

## Typography

The type stack is standardized on **Plus Jakarta Sans**, chosen for its geometric friendliness, generous x-height, wide apertures, and native support for intricate Vietnamese tonal marks and diacritics (`ă, â, đ, ê, ô, ơ, ư` and their compound accent marks).

### Typesetting Rules
- **Vietnamese Diacritics Safety:** Line heights maintain a minimum factor of 1.45–1.6× for body text to completely prevent stacking collision between ascending accents and descending tails in multi-line headers or Vietnamese paragraphs.
- **Rhythmic Weights:** Display headers utilize Bold (700) and ExtraBold (800) for confident character without feeling mechanical. Body text relies on Regular (400) for scannability, stepped up to Medium (500) and SemiBold (600) for metadata labels, pills, and dynamic UI counts.
- **Micro-copy Precision:** Small badges and labels maintain slight positive letter tracking (`0.01em` to `0.03em`) to keep small text sharp on high-DPI and mobile displays.

## Layout & Spacing

This design system uses a flexible, content-adaptive fluid grid structured around a base 4px/8px incremental scale, providing visual rhythm across multi-column Kanban boards, split canvas panes, and team activity streams.

### Layout Mechanics
- **Desktop (≥ 1280px):** 12-column layout with fixed-fluid dynamic ratio, 32px (`2rem`) outer margins, and 20px (`1.25rem`) gutters. Left studio navigation is anchored at 260px or collapsed to an 72px tactile icon rail.
- **Tablet (768px – 1279px):** 8-column layout with 24px outer margins and 16px gutters. Collapsible side panels convert into stacked sliding drawer surfaces.
- **Mobile (< 768px):** 4-column fluid layout with 16px (`1rem`) outer margins and 12px (`0.75rem`) gutters. Task columns reflow to swipeable snap-scroll carousels or stacked accordions.
- **Density Controls:** Card containers default to comfortable padding (`space-lg`) for creative review mode, dropping to compact padding (`space-md`) for dense spreadsheet or sprint backlog lists.

## Elevation & Depth

Visual depth is achieved through delicate tonal layering, micro-borders, and sunlit, warm-diffused ambient drop shadows that emulate raised card stock under soft daylight.

### Depth Hierarchy
1. **Canvas Base (Level 0):** Background floor tint (`#FAF9F6`). Completely flat with zero elevation.
2. **Structural Workspace Containers (Level 1):** Sub-panels, column swimlanes, and muted sidebars (`#F4F2EC`) bordered by a subtle boundary: `1px solid rgba(28, 25, 23, 0.06)`.
3. **Interactive Cards & Tiles (Level 2):** Primary cards sit on crisp white (`#FFFFFF`) featuring dual-layer tactile elevation:
   - Outer glow: `0 1px 3px rgba(28, 25, 23, 0.04), 0 6px 16px -4px rgba(79, 70, 229, 0.05)`
   - Structural edge: `1px solid rgba(231, 229, 228, 0.85)`
4. **Floating Overlays & Menus (Level 3):** Dropdown popovers, member selectors, and contextual modals use an expanded warm lift:
   - Elevation: `0 12px 32px -6px rgba(28, 25, 23, 0.12), 0 4px 12px -2px rgba(28, 25, 23, 0.04)`
   - Border: `1px solid rgba(28, 25, 23, 0.08)`
5. **Drag & Active States (Level 4):** Lifted Kanban tiles in-transit scale up by `1.02×` with shadow: `0 20px 40px -8px rgba(79, 70, 229, 0.18)` and an active brand border ring.

## Shapes

The shape system blends generous curvature with architectural discipline, creating an approachable, human, and modern product environment.

### Geometry Hierarchy
- **Base Components (`rounded-md`, 8px):** Standard input fields, select dropdowns, checkboxes, and inline code blocks.
- **Content Cards & Panels (`rounded-xl` to `rounded-2xl`, 16px – 20px):** Task cards, column wrappers, media preview containers, and collaboration whiteboards.
- **Controls & Metadata Tags (`rounded-full`, 9999px):** Filter chips, status badges, member avatar frames, tab switchers, and call-to-action buttons.

## Components

### Buttons
- **Primary:** Full warm indigo fill (`#4F46E5`), crisp white typography (`#FFFFFF`), `rounded-full`, vertical padding `10px 20px`. Hover triggers a micro-elevation and rich indigo tone (`#4338CA`). Focus rings produce a soft 3px double halo (`ring-4 ring-indigo-500/20`).
- **Secondary / Soft:** Warm linen tint (`#F4F2EC`), dark stone text (`#1C1917`), `border: 1px solid #E7E5E4`. Hover shifts to `#EAE7DF`.
- **Destructive:** Soft coral tint (`#FFE4E6`) with vivid crimson ink (`#E11D48`). Hover deepens to `#FECDD3`.

### Distinctive Badges & Status Chips
All badges follow a `rounded-full` pill structure with `padding: 4px 10px`, typography in `label-sm` (uppercase or title-case), and high-contrast pairing:
- **Role Badges:**
  - *Chủ sở hữu (Owner):* Rich indigo ink (`#4F46E5`) over faint violet substrate (`#EEF2FF`), accented by a tiny 4-pointed star icon.
  - *Thành viên (Member):* Neutral stone-700 (`#44403C`) over warm stone ground (`#F5F5F4`).
  - *Khách (Guest):* Slate-600 (`#475569`) over subtle border line (`#E2E8F0`).
- **Workflow Status Chips:**
  - *Chưa làm (To Do):* Warm Amber tint (`bg-[#FEF3C7] text-[#B45309]`).
  - *Đang làm (In Progress):* Sky Blue tint (`bg-[#E0F2FE] text-[#0369A1]`) accompanied by an animated pulsing indicator dot.
  - *Hoàn thành (Done):* Fresh Mint tint (`bg-[#ECFDF5] text-[#047857]`) with a clean check icon.
  - *Quá hạn (Overdue):* Vibrant Coral tint (`bg-[#FFE4E6] text-[#BE123C]`) with bold emphasis.

### Task Cards
Constructed from `#FFFFFF` resting on `#FAF9F6`, padded with `18px`, framed with `rounded-2xl` and `1px solid #E7E5E4`. Cards feature a three-tier hierarchy:
1. Header row: Project category chip alongside an avatar stack of assigned members.
2. Center content: High-contrast title (`headline-sm`, font weight 600) with optional 2-line description clamp.
3. Footer metadata: Checklist progress metric (ví dụ: `4/6 việc`), attachment indicator, and localized due date format (`Hôm nay`, `Ngày mai`, or `18 thg 5`).

### Input Fields & Controls
- **Inputs & Textareas:** Backed by `#FFFFFF`, bordered with `1.5px solid #E7E5E4`, `rounded-xl`, `padding: 10px 14px`. On focus, transitions cleanly to border `#4F46E5` with `box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.15)`. Placeholders in muted stone-400 (`#A8A29E`).
- **Checkboxes & Radios:** `rounded-md` (checkbox) and `rounded-full` (radio) featuring a tactile 1.5px border. Checked state snaps directly into `#4F46E5` fill with a pure white glyph checkmark.

### Collaboration & Presence Elements
- **Live User Cursor / Avatar:** Avatars are rendered within a circular pill (`rounded-full`) bound by a 2px studio-white outline. Live multi-user cursors match the user's allocated accent color (Lavender, Coral, Mint, Sky, Honey) carrying a companion pill label with their first name.