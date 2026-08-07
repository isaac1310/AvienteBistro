# Stroke icon set — CategoryPlate vocabulary

64×64 viewBox, fill none, stroke currentColor 2.4, round caps/joins — identical
grammar to components/CategoryPlate.tsx, so render them the same way: inline SVG
(NOT background-image; currentColor won't resolve there — see page.module.css).

Nav: home, recipes (the book), menus (the card), add (+ in a circle).
Home actions: kids_bear (Kids' table — the one cheerful motif, matches the planner),
menu_candle (Create a menu), add_recipe (nib/pencil, replaces ✒️), settings (gear, replaces ⚙).

Sizing: nav ~20px (mobile) / 22px (sidebar); home action tiles ~28px.
Color: inherit — var(--ink-soft) idle, var(--primary) active, kids tile #2f6b52.
Suggest an <Icon name> component that inlines these, same pattern as CategoryPlate.
