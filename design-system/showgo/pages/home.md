# ShowGo Home Page Overrides

> **PROJECT:** ShowGo
> **PAGE:** Home / live event discovery landing page
> **UPDATED:** 2026-09-20

These page rules intentionally override the generated Master recommendation where the product brief is more specific. Keep the Master file as the global source of truth for shared spacing, motion, accessibility, and component behavior.

## Product direction

- Audience: Gen Z and Millennials looking for live music, nightlife, and new artists.
- Feeling: high-energy, future-facing, editorial, welcoming, and easy to scan.
- Primary action: discover an event and make a plan.
- Design principle: dark OLED canvas with a controlled neon signal; avoid turning every surface into a glowing card.

## Tokens

```css
--color-background: #08070d;
--color-surface: #100d17;
--color-card: #15101d;
--color-foreground: #faf7ff;
--color-muted-foreground: #a79caf;
--color-primary: #a866ff;
--color-primary-strong: #7c42d9;
--color-accent: #bdff6e;
--color-peach: #ffb18d;
--color-border: rgba(218, 193, 255, 0.16);
--font-display: "Righteous", sans-serif;
--font-body: "Poppins", sans-serif;
--font-mono: "DM Mono", monospace;
```

## Layout

- Hero: two-column desktop composition; stack the copy before the visual on small screens.
- Content max-width: 1240px with 24px mobile gutters and 48px desktop gutters.
- Main feed: event cards remain image-left on desktop and mobile; preserve essential event metadata without relying on hover.
- Section order: hero > motion/ribbon > curated event feed > community proof > final CTA/footer.
- Include a persistent, keyboard-operable mode switch near the top that toggles between the polished "With system" experience and a separate full-page "Without system" early draft. Expose the selected state with `aria-pressed`, preserve the same content in both views, and stack both views cleanly on mobile.
- Breakpoints: verify at 375px, 768px, 1024px, and 1440px. Never introduce horizontal page scrolling.

## Type

- Use Righteous for display headlines only. Use Poppins for readable body copy and DM Mono for dates, category labels, and signal metadata.
- Keep body copy at 16px or larger on mobile where possible; use short line lengths and wrap rather than truncate.

## Motion and interaction

- Sound-wave bars can animate continuously, but the layout must work with a static waveform under `prefers-reduced-motion: reduce`.
- Use transform and opacity for reveal/hover effects; no layout-shifting hovers.
- Keep motion subtle and interruptible. Stagger list reveals by 30–50ms.
- Search and category filters must provide a helpful empty state. Icon-only controls require accessible names and pressed/expanded state.

## Visual guardrails

- Use SVG icons, not emoji or text glyphs for interface controls.
- Use purple as the primary signal and acid green only for live/available/play status.
- Keep glow on hero artwork, active focus, and primary actions; do not apply glow to every card.
- Use local event artwork from `assets/` with explicit dimensions/aspect ratios and lazy loading below the fold.
