# ShowGo project instructions

## UI/UX skill usage

For every task that changes or evaluates the interface—pages, components, layout, styling, typography, color, motion, responsive behavior, accessibility, interaction, or visual assets—use the installed UI/UX Pro Max skills in `.claude/skills/`.

Before making UI changes:

1. Read `.claude/skills/ui-ux-pro-max/SKILL.md`.
2. Read the most relevant supporting skill when applicable:
   - `.claude/skills/ui-styling/SKILL.md` for interface implementation and accessibility.
   - `.claude/skills/design-system/SKILL.md` for tokens, component specs, or design systems.
   - `.claude/skills/brand/SKILL.md` for brand identity, voice, and visual consistency.
   - `.claude/skills/banner-design/SKILL.md` for banners, heroes, or promotional graphics.
   - `.claude/skills/design/SKILL.md` for broader visual design and asset direction.
   - `.claude/skills/slides/SKILL.md` for presentations.
3. Use the local search tool for non-trivial visual decisions before coding:

   ```bash
   python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<specific product and UI context>" --design-system -p "ShowGo"
   ```

4. Apply the resulting guidance together with the existing project styles and requirements. Preserve responsive behavior, keyboard access, visible focus states, useful motion, and reduced-motion support.
5. Do not skip the skill workflow for a UI task because the change appears small. For backend-only or non-visual work, the UI/UX skills are not required.

The skills are project-local and should be treated as the source of truth for future UI/UX work in this repository. Do not reinstall or replace them unless explicitly asked.
