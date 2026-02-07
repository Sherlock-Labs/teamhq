# Pixel Art Avatars

**Category:** Development
**Used by:** Alice, Robert
**Last updated:** 2026-02-07

## When to Use

When creating a new team member avatar or updating an existing one.

## Structure

All avatars are 16x16 pixel SVGs with `shape-rendering="crispEdges"` to prevent anti-aliasing blur.

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">
  <!-- Hair rows 0-3 -->
  <!-- Face rows 3-10 -->
  <!-- Neck row 10-11 -->
  <!-- Shirt rows 11-15 -->
</svg>
```

## Grid Layout

| Region | Rows | Notes |
|--------|------|-------|
| Hair | 0-3 | Top of head, varies by style |
| Face | 3-10 | Main face area, skin color |
| Eyes | 5-6 | Typically at rows 5-6 |
| Mouth | 8-9 | Smile or expression |
| Neck | 10-11 | Bridge to shirt |
| Shirt | 11-15 | Solid color, may include collar/neckline |

## Existing Color Palette

| Agent | Shirt Color | Hair Color | Skin Tone |
|-------|------------|------------|-----------|
| Thomas | `#5B7FCC` (blue) | `#7C5B3A` (brown) | `#E8B887` |
| Alice | `#CC5B8F` (pink) | `#1A1020` (black) | `#D4A574` |
| Jonah | `#CC7A3E` (orange) | `#4A3520` (dark brown) | `#E0B088` |
| Robert | `#7C5BBF` (purple) | `#B34D22` (auburn) | `#F0C8A0` |
| Andrei | `#3D6B4F` (green) | `#C4A882` (sandy) | `#E8C8A0` |
| Enzo | `#3A8C8C` (teal) | `#2A2020` (dark) | `#D4B896` |
| Priya | `#E06060` (coral) | `#1A1018` (black) | `#C68642` |
| Suki | `#C49B30` (amber) | `#3D2B1F` (dark brown) | `#F0D0B0` |
| Marco | `#5B7B9B` (slate blue) | `#6B4226` (curly brown) | `#D4A870` |
| Nadia | `#A06080` (mauve) | `#1C1016` (dark) | `#F5D5C0` |
| Yuki | `#4A8CC0` (steel blue) | `#0A0A12` (black) | `#F5E0C8` |
| Kai | `#7ACC40` (lime) | `#2A1E14` (dark) | `#D8A87A` |

## Conventions

- Use `<rect>` elements only — no `<circle>`, `<path>`, or other shapes (except for glasses)
- Glasses use `stroke` on `<rect>` with `stroke-width="0.6"` and `fill="none"`
- Hair color is darker than skin tone
- Mouth color is slightly darker than skin tone
- Each avatar has a unique shirt color that represents their role
- Optional details: glasses, blush, bindi, stubble, collars, v-necks
- Display at 48px with `image-rendering: pixelated` in CSS

## Anti-patterns

- Using circles or paths — stick to rects for the pixel art aesthetic
- Making the avatar too detailed — 16x16 is small, keep it simple
- Using colors too similar to an existing avatar
- Forgetting `shape-rendering="crispEdges"` — causes blurry rendering
