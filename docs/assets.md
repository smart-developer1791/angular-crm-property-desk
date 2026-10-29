# Haven — Assets & Provenance

## Property photography

These original AI-generated architectural concepts illustrate a fictional agency. They do not depict the named demo addresses. Three photographs are reused across the 24 sample listings; the image picker exposes the same three concepts for new listings. UI image descriptions and Settings identify them as illustrative.

Generation used the **built-in image-generation tool** in text-to-image mode (`image_gen.imagegen`), without reference images. The implementation session used the `imagegen` skill. No third-party stock photos or image-search results were used.

| Concept                          | Runtime asset                                                     | Dimensions  | Source PNG basename                             |
| -------------------------------- | ----------------------------------------------------------------- | ----------- | ----------------------------------------------- |
| Contemporary limestone residence | [`public/images/limestone.webp`](../public/images/limestone.webp) | 1536 × 1024 | `exec-59246b59-fde7-458c-add1-6d7fead9b2a9.png` |
| Cedar and brick residence        | [`public/images/cedar.webp`](../public/images/cedar.webp)         | 1536 × 1024 | `exec-e1fd854b-3b01-46f2-8abe-38db8e031f4e.png` |
| Boutique condominium             | [`public/images/condo.webp`](../public/images/condo.webp)         | 1536 × 1024 | `exec-33b8f37f-2008-464c-8e20-5b9832f02776.png` |

Final generated originals were saved during the creation session under:

```text
/home/node/.codex/generated_images/01a0730c-5fe7-7f00-852e-ba725ce10adb/
```

Those source PNGs remain in the generation output folder and are not required at runtime. The three WebP files above are the delivered repository assets. They were encoded from the PNGs using browser canvas without resizing, cropping, compositing, or content edits. CSS `object-fit: cover` adjusts their display within cards. Runtime images total approximately 1.1 MB and are served locally; listing cards use lazy loading.

### Final prompt: limestone residence

```text
Use case: photorealistic-natural. Asset type: an original property listing photograph for a fictional premium real estate CRM called Haven. Create one landscape architectural editorial photo, 1536x1024. Subject: a beautiful contemporary two-story cream limestone residence in a leafy Austin-inspired neighborhood, large black-framed glazing, recessed entrance, warm oak front door, low manicured grasses, small mature olive tree, horizontal volumes and strong clean architectural lines. The house should fill most of the frame, shot from street level at a slight angle with a professional 35mm architecture lens, straight verticals. Soft early morning sun, pale blue sky, refined realistic materials, natural colors, aspirational but believable. No people, no cars, no text, no watermarks, no branding, no collage. This is a fictional demo property, not an image of an identifiable real address.
```

### Final prompt: cedar residence

```text
Use case: photorealistic-natural. Asset type: an original property listing photograph for a fictional premium real estate CRM. Create one landscape architecture editorial photo, 1536x1024. Subject: an elegant two-story mid-century inspired home with warm cedar siding, muted red brick, broad low-pitched roof, glass front entry and large picture windows, set among tall oak trees in an Austin-inspired quiet neighborhood. Beautiful lawn, contemporary stepping stones, neat drought-tolerant landscaping. Entire facade visible in a professional eye-level 35mm architecture photograph with straight verticals. Dappled late afternoon sunlight and blue-grey sky. Natural material texture, tasteful realistic photography. No people, no vehicles, no text, no watermarks, no logos, no collage. Original fictional building, not an identifiable real address.
```

### Final prompt: condominium

```text
Use case: photorealistic-natural. Asset type: an original property listing photograph for a fictional premium real estate CRM. Create one landscape architecture editorial photo, 1536x1024. Subject: a contemporary three-story boutique condominium building in an Austin-inspired neighborhood, ivory stucco and taupe stone, vertical dark metal fins, glass balconies, landscaped entrance courtyard, a small ornamental tree and architectural grasses. Frame one handsome corner of the entire building and its entrance at street level with professional architectural photography, straight vertical lines, clean composition. Calm bright overcast morning with pale grey-blue sky. Premium but natural architectural editorial realism. No people, no text, no watermarks, no logos, no vehicles, no collage. This is a fictional demo property.
```

## Typography and interface artwork

DM Sans and Manrope are bundled locally from their `@fontsource-variable` packages. Their complete license notices are preserved in [`docs/licenses`](./licenses/). No external font requests are needed.

The Haven house mark, favicon, stroke icons, and decorative line artwork are original inline SVG and CSS. They are code-native assets and were not generated as raster images. The listing sparkline and offer bars render workspace data directly.

## Screenshots

Files in [`docs/screenshots`](./screenshots/) are real Chromium captures of the running production build, with the bundled demo data. They are not image-generation mockups. Responsive screenshots use the same implementation and assets as the desktop interface.
