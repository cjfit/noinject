# Icons for NoInject Extension

You need to create the following icon files for the extension to work properly:

## Safe State Icons (Green Shield with Checkmark)
- `icon-safe-16.png` - 16x16 pixels
- `icon-safe-32.png` - 32x32 pixels
- `icon-safe-48.png` - 48x48 pixels
- `icon-safe-128.png` - 128x128 pixels

## Danger State Icons (Red Shield with Warning/Exclamation)
- `icon-danger-16.png` - 16x16 pixels
- `icon-danger-32.png` - 32x32 pixels
- `icon-danger-48.png` - 48x48 pixels
- `icon-danger-128.png` - 128x128 pixels

## Design Guidelines

### Safe Icons
- Base color: Green (#10B981 or #059669)
- Symbol: Shield with checkmark inside
- Style: Clean, modern, minimal
- Background: Transparent or white

### Danger Icons
- Base color: Red (#DC2626 or #991B1B)
- Symbol: Shield with exclamation mark or warning triangle
- Style: Clean, modern, minimal
- Background: Transparent or white

## Quick Creation Options

1. **Using Figma/Sketch**: Create vector icons at 128x128 and export at different sizes
2. **Using Online Tools**: Use tools like Canva, Pixlr, or Photopea
3. **Using AI**: Generate with tools like DALL-E or Midjourney with prompt: "minimalist shield icon with checkmark, flat design, green color, transparent background"
4. **Placeholder SVG to PNG**: Convert the SVGs below to PNGs at required sizes

### Safe Icon SVG (for conversion):
```svg
<svg width="128" height="128" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
  <rect width="128" height="128" fill="white" rx="24"/>
  <path d="M64 16L24 32v32c0 24.67 17.07 47.74 40 53.33 22.93-5.59 40-28.66 40-53.33V32L64 16z"
        fill="#10B981"/>
  <path d="M56 72L44 60l-5.66 5.66L56 83.32 84 55.32 78.34 49.66z"
        fill="white" stroke="white" stroke-width="2"/>
</svg>
```

### Danger Icon SVG (for conversion):
```svg
<svg width="128" height="128" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
  <rect width="128" height="128" fill="white" rx="24"/>
  <path d="M64 16L24 32v32c0 24.67 17.07 47.74 40 53.33 22.93-5.59 40-28.66 40-53.33V32L64 16z"
        fill="#DC2626"/>
  <line x1="64" y1="44" x2="64" y2="64" stroke="white" stroke-width="6" stroke-linecap="round"/>
  <circle cx="64" cy="76" r="4" fill="white"/>
</svg>
```

## Online SVG to PNG Converters
- https://svgtopng.com/
- https://cloudconvert.com/svg-to-png
- https://convertio.co/svg-png/

After conversion, place all PNG files in this `/icons` directory.
