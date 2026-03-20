# Project Docs

Always load and reference documentation from the `app/docs/` folder when working on this project.

# Styling Rules

- **Tailwind-only for DOM elements.** No `style` props on DOM elements except for genuinely dynamic computed values (e.g. chart positioning math). Recharts SVG props (`fill`, `stroke`) are the one legitimate exception.
- **Venue colors use Tailwind theme classes.** `--color-michelin` and `--color-zmax` are declared in `@theme {}` in `index.css`. Always use `bg-michelin`, `text-michelin`, `bg-zmax`, `text-zmax`, `border-michelin`, `border-zmax` for DOM elements. Only use `venueColor()` (from `venueColors.js`) for Recharts SVG fill/stroke props.
