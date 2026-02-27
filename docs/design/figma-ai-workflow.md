# Using Figma AI to Convert Screenshots to Designs

This guide shows how to use Figma's built-in AI to convert your existing UI screenshots into editable Figma designs.

## Prerequisites

- Figma account (free or paid)
- Screenshots of your components
- Access to Figma AI features (available in Figma)

## Step-by-Step Workflow

### Step 1: Capture High-Quality Screenshots

**Important:** Capture at 2x resolution for best AI recognition.

**Priority Components to Capture:**

1. **Organizations List Page** (canonical example)
   - URL: `http://localhost:4200/customers/organizations`
   - Capture: Full page including hero, card, data grid, filters

2. **Individual Components:**
   - Card with black header
   - Data grid table
   - Status badges (all colors)
   - Buttons (all variants)
   - Form inputs
   - Tab navigation

3. **Organization Detail Page**
   - Hero section
   - Tab navigation with badges
   - Content sections

### Step 2: Use Figma AI to Generate Designs

**For each screenshot:**

1. **Open Figma** and create a new file: "Orb Integration Hub - Components"

2. **Import screenshot:**
   - Drag and drop the PNG into Figma
   - Or: File → Place Image

3. **Generate design from image:**
   - Select the screenshot
   - Right-click → **"Generate design from image"**
   - Or: Use the AI panel (⌘ + / or Ctrl + /)
   - Type: "Convert this screenshot to editable design"

4. **Review AI output:**
   - Figma AI will create layers, text, shapes
   - Check if colors are accurate
   - Verify spacing and sizing

5. **Refine the design:**
   - Adjust colors to match design tokens
   - Fix any misrecognized elements
   - Group related elements
   - Create components for reusable parts

### Step 3: Apply Design Tokens

**Import tokens first:**
1. Install "Tokens Studio for Figma" plugin
2. Import `docs/design/figma-tokens.json`
3. Apply tokens to the AI-generated designs

**Or manually apply:**
- Colors: Use exact hex values from token file
- Spacing: Use 8px grid (4, 8, 12, 16, 24, 32, 48)
- Typography: Match font sizes (12, 14, 16, 18, 20, 24, 36)
- Border radius: 2px, 6px, 8px, 12px

### Step 4: Create Figma Components

**Convert designs to reusable components:**

1. **Card Component:**
   - Select the card design
   - Right-click → "Create component"
   - Name: "Card/Default"
   - Create variants: "Card/With Header", "Card/Table"

2. **Button Components:**
   - Create component set for all button variants
   - Name: "Button"
   - Variants: Primary, Secondary, Outline, Card Button

3. **Status Badge:**
   - Create component with variants
   - Name: "Status Badge"
   - Variants: Active, Pending, Suspended, Inactive

4. **Data Grid:**
   - Create table component
   - Include header row, data rows
   - Make columns flexible

### Step 5: Organize Figma File

**Recommended structure:**

```
Orb Integration Hub
├── 📄 Cover (overview page)
├── 🎨 Design Tokens
│   ├── Colors
│   ├── Typography
│   └── Spacing
├── 🧩 Components
│   ├── Buttons
│   ├── Cards
│   ├── Forms
│   ├── Navigation
│   └── Data Display
├── 📱 Pages
│   ├── Organizations List
│   ├── Organization Detail
│   ├── Applications List
│   └── Dashboard
└── 📸 Screenshots (reference)
```

### Step 6: Set Up Code Connect

Once Figma components are created, link them to code:

1. **Get the Figma URL** for a component
   - Example: `https://figma.com/design/abc123/Components?node-id=1-2`

2. **Use Figma power to create mapping:**
   ```typescript
   // The hook will prompt you, or manually:
   kiroPowers.use({
     powerName: "figma",
     serverName: "figma",
     toolName: "add_code_connect_map",
     arguments: {
       fileKey: "abc123",
       nodeId: "1:2",
       source: "apps/web/src/app/shared/components/data-grid/data-grid.component.ts",
       componentName: "DataGridComponent",
       label: "Angular"
     }
   });
   ```

3. **Verify mapping:**
   - Edit a component file
   - The hook will prompt to check Code Connect
   - Confirm the mapping is correct

## Tips for Better AI Results

### Screenshot Best Practices

1. **Clean background:** Use white or light gray background
2. **High contrast:** Ensure text is readable
3. **Full component:** Capture complete component, not partial
4. **Multiple states:** Capture hover, active, disabled states separately
5. **Consistent size:** Use 1400px width for page screenshots

### Helping Figma AI Recognize Patterns

**For tables/grids:**
- Capture with at least 3-5 rows of data
- Include header row
- Show all column types

**For buttons:**
- Capture each variant separately
- Include icon + text examples
- Show different sizes

**For cards:**
- Capture with real content
- Show header and body sections clearly
- Include any badges or status indicators

### When AI Struggles

If Figma AI doesn't recognize something well:

1. **Simplify the screenshot:** Capture smaller sections
2. **Manual recreation:** Use AI output as starting point, refine manually
3. **Reference the original:** Keep screenshot visible while editing
4. **Use plugins:** Try html.to.design for complex layouts

## Alternative: Figma Dev Mode

If you have Figma Dev Mode (paid feature):

1. Designers create components in Figma
2. Dev Mode shows CSS, measurements, assets
3. Easier to maintain design-code consistency
4. Code Connect works better with Dev Mode

## Component Priority Order

**Start with these (highest value):**

1. ✅ **Card component** - Used everywhere
2. ✅ **Button variants** - Primary, secondary, card button
3. ✅ **Data grid** - Complex but reusable
4. ✅ **Status badges** - Simple, high visibility
5. ✅ **Form inputs** - Common pattern

**Then move to:**

6. Hero split layout
7. Tab navigation
8. Breadcrumbs
9. Page layouts
10. Dashboard CTA cards

## Expected Time Investment

- **Screenshot capture:** 1-2 hours
- **Figma AI generation:** 2-3 hours (with refinement)
- **Token application:** 1 hour
- **Component creation:** 2-4 hours
- **Code Connect setup:** 1 hour

**Total:** ~7-12 hours for complete component library

## Success Criteria

You'll know you're done when:

- [ ] All major components exist in Figma
- [ ] Design tokens are applied consistently
- [ ] Components are organized and named clearly
- [ ] Code Connect mappings are set up
- [ ] Designers can modify and iterate on designs
- [ ] New designs can be implemented using Figma power

## Next Steps After Setup

1. **Design iteration:** Designers improve existing components
2. **New features:** Designers create new components in Figma first
3. **Implementation:** Use Figma power to get design context
4. **Maintenance:** Hook keeps Code Connect mappings updated
