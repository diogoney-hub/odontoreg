---
name: Clinical Integrity
colors:
  surface: '#f9f9f9'
  surface-dim: '#dadada'
  surface-bright: '#f9f9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f4'
  surface-container: '#eeeeee'
  surface-container-high: '#e8e8e8'
  surface-container-highest: '#e2e2e2'
  on-surface: '#1a1c1c'
  on-surface-variant: '#3f4942'
  inverse-surface: '#2f3131'
  inverse-on-surface: '#f0f1f1'
  outline: '#6f7a72'
  outline-variant: '#bec9c0'
  surface-tint: '#006c47'
  primary: '#005f3e'
  on-primary: '#ffffff'
  primary-container: '#137a52'
  on-primary-container: '#a8ffcf'
  inverse-primary: '#7dd9a9'
  secondary: '#54615b'
  on-secondary: '#ffffff'
  secondary-container: '#d8e6de'
  on-secondary-container: '#5a6761'
  tertiary: '#00603d'
  on-tertiary: '#ffffff'
  tertiary-container: '#007b50'
  on-tertiary-container: '#acffd0'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#99f5c4'
  primary-fixed-dim: '#7dd9a9'
  on-primary-fixed: '#002113'
  on-primary-fixed-variant: '#005234'
  secondary-fixed: '#d8e6de'
  secondary-fixed-dim: '#bccac2'
  on-secondary-fixed: '#121e19'
  on-secondary-fixed-variant: '#3d4a44'
  tertiary-fixed: '#82f9bc'
  tertiary-fixed-dim: '#64dca2'
  on-tertiary-fixed: '#002112'
  on-tertiary-fixed-variant: '#005234'
  background: '#f9f9f9'
  on-background: '#1a1c1c'
  surface-variant: '#e2e2e2'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 52px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 42px
    fontWeight: '600'
    lineHeight: '1.2'
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
  headline-sm:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  lead-text:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-caps:
    fontFamily: Inter Tight
    fontSize: 12px
    fontWeight: '700'
    lineHeight: '1.0'
    letterSpacing: 0.05em
  pill-tag:
    fontFamily: Inter Tight
    fontSize: 13px
    fontWeight: '600'
    lineHeight: '1.0'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-max: 1120px
  container-narrow: 860px
  section-v-space: 80px
  gutter: 24px
  stack-gap: 1.25rem
  base-unit: 4px
---

## Brand & Style

This design system establishes a visual language of "Precision Modernism"—a blend of clinical authority and high-performance digital efficiency. It is designed specifically for dentists and medical professionals who require rigorous compliance consultation but appreciate a clean, frictionless interface.

The aesthetic direction is **Corporate / Modern** with a focus on vibrant precision. It utilizes a unified geometric sans-serif family to evoke technical accuracy and clarity, moving away from traditional academic serifs toward a tech-forward clinical feel. The interface feels "sterile" in a positive sense: organized, spacious, and deliberate. Depth is used through tonal layering to create a clear hierarchy of information, ensuring that compliance risks and regulatory tasks are front-and-center.

## Colors

The palette is built on a "Vibrant Clinical" foundation, utilizing fresh greens and supportive mint tones to organize information hierarchy.

- **Primary Green (`#137a52`)**: Represents growth, health, and regulatory approval. Used for active states and critical brand markers.
- **Secondary Mint (`#e4f2ea`)**: A soft supportive tone used for surface backgrounds and containers to reduce visual strain while maintaining brand presence.
- **Tertiary Emerald (`#16a06b`)**: A vibrant accent green used to highlight success states, interactive highlights, and secondary brand elements, reinforcing the clinical yet energetic theme.
- **Neutral White (`#ffffff`)**: Acts as the "Clean Room" base, maximizing brilliance and perceived clarity for data-heavy views.
- **Status Amber**: Reserved for cautionary compliance alerts or pending documentation requirements.

## Typography

This system uses a unified sans-serif approach to balance clarity with technical utility.

**Inter** is utilized for all display, headline, and body levels. Its neutral, geometric design ensures that complex clinical data remains legible at all sizes. Headlines are set with heavier weights and tighter line heights for a bold, technical appearance.

**Inter Tight** handles functional UI elements like labels and badges. Its slightly condensed profile allows for high data density in sidebars and reports without sacrificing clarity.

- **Eyebrows**: Use `label-caps` in uppercase for section categorizations.
- **Compliance Status**: Use `pill-tag` for badges (e.g., "Compliant", "Under Review").

## Layout & Spacing

The layout philosophy is based on a **Fixed Grid** model for desktop to maintain the density and structure expected of professional software.

- **Content Wrappers**: Primary content is contained within an 1120px center-aligned wrapper. For text-heavy documentation or blog-style consultation reports, use the 860px "narrow" wrapper to optimize line length for readability.
- **Rhythm**: Vertical rhythm is governed by an 80px section spacing, creating distinct mental breaks between different compliance modules.
- **Mobile Adaptation**: At the 768px breakpoint, gutters reduce to 16px, and section vertical spacing scales down to 48px. Grids typically reflow from multi-column to a single-stack model.

## Elevation & Depth

Hierarchy is achieved through **Tonal Layering** and **Ambient Shadows** rather than heavy borders.

- **The Base Layer**: Uses pure white to define the boundaries of the application and maximize clarity.
- **Surface Layer**: Cards and containers use the Secondary Mint (`#e4f2ea`) or subtle grey tints to pop against the white background.
- **Shadows**: Shadows are highly diffused and tinted with the Primary Green color (`rgba(19, 122, 82, 0.06)`) to maintain a cohesive, clean appearance.
- **Overlays**: Sticky navigation bars and overlays use a semi-transparent white (`85%` opacity) with a `12px` backdrop blur to maintain spatial awareness as users scroll through long reports.

## Shapes

The shape language is **Rounded**, intended to soften the potentially intimidating nature of legal and compliance data while feeling contemporary.

- **Cards & Containers**: Apply a 1rem (16px) radius to all primary cards to create a modern, approachable container style.
- **Interactive Elements**: Buttons and status tags utilize a "Pill" shape (999px radius) to distinguish them clearly from static content containers.
- **Icon Containers**: Use a "Soft" 12px radius to house brand icons, creating a cohesive visual unit.

## Components

- **Buttons**: The primary CTA is a pill-shaped button with a background of Primary Green and white text. Secondary buttons use the Secondary Mint background with Primary Green text.
- **Compliance Cards**: Feature a 1px `line-border`, 1rem corner radius, and a transition that slightly lifts the card (4px upward) on hover to indicate interactivity.
- **Pills/Badges**: Small, fully rounded indicators. Use `primary` for "Approved" states, `tertiary` (Emerald) for "In Progress" or "Updated" states, and `status-amber` for "Attention Required."
- **Input Fields**: Modern, clean inputs with a 1px border. On focus, the border should thicken to 2px and change to the Primary Green hue.
- **Checklists**: Custom checkmarks using the Primary Green. Items should have generous vertical padding (12px-16px) to remain accessible on touch devices.
- **Data Tables**: Remove vertical borders. Use horizontal dividers in the `line-border` color. The header row should be styled with `label-caps` and a Primary Green text color or Secondary Mint background.