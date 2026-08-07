# Dish photos carved out of מתכונים.pdf

Eight images over 60KB, extracted without poppler by carving the JPEG streams
directly out of the PDF. The other 41 images in that file are small decorative
page furniture, repeated across pages, and are not here.

## How to attach one

1. Open the recipe → **Edit** → **🖼 From gallery** → pick the file.
2. The app downscales it to 1600px WebP before upload, so a 400KB phone photo
   lands around 200KB. You do not need to resize anything yourself.
3. If you attach one to the wrong recipe, use **↗ Move this photo to another
   recipe** on the edit screen. That is exactly what it is for.

## What each one is

Page numbers would need `pdfimages -p`, which needs poppler, which we chose not to
install. So these are identified by eye — two confidently, the rest are yours to
recognise. Nothing depends on getting this right first time; moving a photo is one
tap.

| file | size | what it looks like | likely recipe |
|---|---|---|---|
| `photo-01.jpg` | 287 KB | the book cover — utensil pattern, "Aviente Recipe Book" | **not a dish.** Already adapted into the app header as vector line art |
| `photo-02.jpg` | 175 KB | landscape, 1200×800 — the only one not shot portrait | ? |
| `photo-03.jpg` | 291 KB | mashed potato under a heavy layer of chopped chives, glass bowl, laid table | **פירה ירוק** (the green mash) |
| `photo-04.jpg` | 363 KB | ? | ? |
| `photo-05.jpg` | 491 KB | stuffed onions in a black sauté pan, golden sauce, wooden table | **בצל ממולא** |
| `photo-06.jpg` | 334 KB | ? | ? |
| `photo-07.jpg` | 327 KB | ? | ? |
| `photo-08.jpg` | 426 KB | ? | ? |

## Why the cover is not one of them

`photo-01` is the printed cover. Rather than uploading it as a recipe photo, its
motif was redrawn as `public/brand/pattern-utensils.svg` and now tiles behind the
homepage header — 3.4KB of vector instead of 287KB of raster, in the app's gold
rather than the book's brown, and crisp at any size.
