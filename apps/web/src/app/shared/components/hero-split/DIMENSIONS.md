# HeroSplitComponent - Gold Standard Dimensions

This document provides the exact dimensions used in the HeroSplitComponent, extracted from the platform page. These dimensions are the **gold standard** used consistently across ALL pages.

## Gold Standard Dimensions

| Property | Value | CSS Variable | Computed |
|----------|-------|--------------|----------|
| Container max-width | 1400px | N/A | 1400px |
| Padding (vertical) | var(--spacing-2xl) | 48px | 48px top/bottom |
| Title font size | var(--font-size-4xl) | 36px | 36px |
| Gap (horizontal) | var(--spacing-24) | 96px | 96px between logo and content |
| Logo max-width | 600px | N/A | 600px |
| Content max-width | 600px | N/A | 600px |

## Visual Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  ◄────────────────────── max-width: 1400px ──────────────────────►         │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     padding: var(--spacing-lg)                      │   │
│  │                                                                     │   │
│  │  ┌──────────────────────┐  ◄─ gap: 96px ─►  ┌──────────────────────┐  │
│  │  │                      │                    │                      │  │
│  │  │   Logo Section       │                    │   Content Section    │  │
│  │  │                      │                    │                      │  │
│  │  │   flex: 1            │                    │   flex: 1            │  │
│  │  │   max-width: 600px   │                    │   max-width: 600px   │  │
│  │  │                      │                    │                      │  │
│  │  │   ┌──────────────┐   │                    │   ┌──────────────┐   │  │
│  │  │   │              │   │                    │   │   Title      │   │  │
│  │  │   │              │   │                    │   │   (36px)     │   │  │
│  │  │   │    Logo      │   │                    │   └──────────────┘   │  │
│  │  │   │    Image     │   │                    │                      │  │
│  │  │   │              │   │                    │   ┌──────────────┐   │  │
│  │  │   │              │   │                    │   │   Subtitle   │   │  │
│  │  │   │              │   │                    │   └──────────────┘   │  │
│  │  │   └──────────────┘   │                    │                      │  │
│  │  │                      │                    │   ┌──────────────┐   │  │
│  │  │                      │                    │   │   Buttons    │   │  │
│  │  │                      │                    │   └──────────────┘   │  │
│  │  │                      │                    │                      │  │
│  │  └──────────────────────┘                    └──────────────────────┘  │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ▲                                                                          │
│  │  padding: 48px (var(--spacing-2xl))                                     │
│  ▼                                                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Dimension Breakdown

### Container Dimensions

| Element | Property | Value | CSS Variable | Computed Value |
|---------|----------|-------|--------------|----------------|
| Outer Container | max-width | 1400px | N/A | 1400px |
| Outer Container | padding (vertical) | var(--spacing-2xl) | 48px | 48px top/bottom |
| Inner Container | max-width | 1400px | N/A | 1400px |
| Inner Container | padding (horizontal) | var(--spacing-lg) | 24px | 24px left/right |
| Inner Container | margin | 0 auto | N/A | Centered |

### Flex Layout

| Element | Property | Value | Description |
|---------|----------|-------|-------------|
| Flex Container | display | flex | Flexbox layout |
| Flex Container | align-items | center | Vertical centering |
| Flex Container | gap | var(--spacing-24) | 96px between sections |
| Flex Container | justify-content | center | Horizontal centering |

### Logo Section

| Property | Value | Description |
|----------|-------|-------------|
| flex | 1 | Takes equal space with content |
| max-width | 600px | Maximum width constraint |
| Image width | 100% | Fills container |
| Image height | auto | Maintains aspect ratio |
| object-fit | contain | Scales to fit without cropping |

### Content Section

| Property | Value | Description |
|----------|-------|-------------|
| flex | 1 | Takes equal space with logo |
| max-width | 600px | Maximum width constraint |
| display | flex | Flexbox for vertical stacking |
| flex-direction | column | Vertical layout |
| gap | var(--spacing-xl) | 32px between elements |
| align-items | flex-start | Left-aligned (desktop) |

### Typography

| Element | Property | Value | CSS Variable |
|---------|----------|-------|--------------|
| Title | font-family | var(--font-family-heading) | System heading font |
| Title | font-size | var(--font-size-4xl) | 36px |
| Title | font-weight | var(--font-weight-bold) | 700 |
| Title | color | var(--color-neutral-800) | #1a365d |
| Title | margin | 0 | No margin |
| Subtitle | font-size | var(--font-size-lg) | 18px |
| Subtitle | color | var(--color-neutral-800) | #1a365d |
| Subtitle | line-height | var(--line-height-relaxed) | 1.625 |
| Subtitle | margin | 0 | No margin |

### Spacing Between Elements

| Gap Location | Value | CSS Variable | Computed |
|--------------|-------|--------------|----------|
| Logo ↔ Content | var(--spacing-24) | 96px | 96px |
| Title Container ↔ Subtitle | var(--spacing-xl) | 32px | 32px |
| Subtitle ↔ Actions | var(--spacing-xl) | 32px | 32px |
| Title Container margin-bottom | var(--spacing-md) | 16px | 16px |

## Responsive Breakpoints

### Desktop (> 1024px)
```
┌─────────────────────────────────────────────────────────┐
│  ┌──────────┐  gap: 96px  ┌──────────┐                 │
│  │   Logo   │             │ Content  │                 │
│  │          │             │          │                 │
│  └──────────┘             └──────────┘                 │
└─────────────────────────────────────────────────────────┘
```

### Tablet/Mobile (≤ 1024px)
```
┌─────────────────────────────────────────────────────────┐
│                    ┌──────────┐                         │
│                    │   Logo   │                         │
│                    │          │                         │
│                    └──────────┘                         │
│                                                         │
│                    ┌──────────┐                         │
│                    │ Content  │                         │
│                    │ (center) │                         │
│                    └──────────┘                         │
└─────────────────────────────────────────────────────────┘
```

### Mobile Buttons (≤ 768px)
```
┌─────────────────────────────────────────────────────────┐
│                    ┌──────────┐                         │
│                    │ Button 1 │  (full width)           │
│                    └──────────┘                         │
│                    ┌──────────┐                         │
│                    │ Button 2 │  (full width)           │
│                    └──────────┘                         │
└─────────────────────────────────────────────────────────┘
```

## CSS Custom Properties Used

### Spacing
- `--spacing-xs`: 4px
- `--spacing-sm`: 8px
- `--spacing-md`: 16px
- `--spacing-lg`: 24px
- `--spacing-xl`: 32px
- `--spacing-2xl`: 48px
- `--spacing-24`: 96px (special case for hero gap)

### Typography
- `--font-family-heading`: System heading font stack
- `--font-family-primary`: System body font stack
- `--font-size-base`: 16px
- `--font-size-lg`: 18px
- `--font-size-xl`: 20px
- `--font-size-2xl`: 24px
- `--font-size-3xl`: 30px
- `--font-size-4xl`: 36px
- `--font-weight-normal`: 400
- `--font-weight-medium`: 500
- `--font-weight-semibold`: 600
- `--font-weight-bold`: 700
- `--line-height-normal`: 1.5
- `--line-height-relaxed`: 1.625

### Colors
- `--color-background`: #ffffff
- `--color-neutral-800`: #1a365d
- `--color-text-primary`: #1a202c
- `--color-text-secondary`: #4a5568

### Other
- `--radius-md`: 8px
- `--radius-lg`: 12px
- `--transition-fast`: 150ms ease
- `--transition-normal`: 300ms ease

## Calculation Examples

### Total Width Calculation
```
Container max-width: 1400px
- Left padding: 24px
- Right padding: 24px
= Available width: 1352px

Logo section: 600px max (flex: 1)
Gap: 96px
Content section: 600px max (flex: 1)
= Total: 1296px (fits within 1352px)
```

### Vertical Spacing Calculation
```
Top padding: 48px
+ Title height: ~44px (36px font + line-height)
+ Title margin-bottom: 16px
+ Gap to subtitle: 32px
+ Subtitle height: ~29px (18px font + line-height)
+ Gap to actions: 32px
+ Actions height: ~48px (button height)
+ Bottom padding: 48px
= Total height: ~297px minimum
```

## Accessibility Considerations

### Minimum Touch Targets
- Buttons: 44px × 44px minimum (mobile)
- Links: 44px × 44px minimum (mobile)
- Interactive elements: 48px × 48px recommended

### Text Contrast
- Title on white: 12.63:1 (AAA)
- Subtitle on white: 12.63:1 (AAA)
- All text meets WCAG 2.1 Level AAA

### Responsive Text Sizing
- Desktop: 36px title, 18px subtitle
- Mobile: Same sizes (readable on all devices)
- Line height: 1.625 for optimal readability

## Performance Notes

### Image Optimization
- Logo should be optimized for web
- Recommended formats: WebP with PNG fallback
- Recommended size: 1200px × 1200px maximum
- Use `loading="lazy"` for below-fold images

### CSS Performance
- Uses CSS custom properties (fast)
- Flexbox layout (hardware accelerated)
- No JavaScript required for layout
- Minimal repaints on resize

## Testing Checklist

When implementing on a new page, verify:

- [ ] Logo displays at correct size
- [ ] Title and subtitle are readable
- [ ] Gap between logo and content is 96px
- [ ] Container is centered on page with max-width 1400px
- [ ] Layout stacks correctly on mobile (≤1024px)
- [ ] Buttons stack correctly on mobile (≤768px)
- [ ] Text is centered on mobile
- [ ] All spacing matches design tokens
- [ ] Component is accessible (keyboard, screen reader)
- [ ] Images have proper alt text
