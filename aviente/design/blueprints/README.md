# Category blueprint placeholders (design 7a)

One SVG per category, shown wherever a recipe has no photo. Strokes use `currentColor` so CSS `color` themes them:
- green theme ink: #1e3a2f · burgundy theme ink: #5c2222 · kids: always #c2417e (theme-exempt)

## Container (hero or thumbnail)
- bg #fbf7ec, border 1px #ded5c2 (kids: border #f0c8d8)
- faint grid overlay: `background-image: linear-gradient(#1e3a2f0d 1px,transparent 1px), linear-gradient(90deg,#1e3a2f0d 1px,transparent 1px); background-size:14px 14px` (kids grid color #c2417e12)
- SVG centered; hero ~130px wide, browse thumbnail ~44px (bump stroke-width to 2.4 at thumbnail size)

## Caption under the drawing
- Category name: italic Cormorant Garamond 500, theme ink (kids: Baloo 2 800, #c2417e)
- Plate line: 8px monospace, letter-spacing 2px, #9a8c7c —
  entrees "PL. I — HORS-D'ŒUVRE" · soups "PL. II — POTAGES" · salads "PL. III — SALADES" · mains "PL. IV — PLATS" · sides "PL. V — ACCOMPAGNEMENTS" · dessert "PL. VI — DESSERTS" · kids "PL. VII — LES PETITS" · other "PL. VIII — DIVERS"
- Recipe hero adds " · NO PHOTO YET"

See turn 7 in Aviente Explorations.dc.html for the exact rendering.
