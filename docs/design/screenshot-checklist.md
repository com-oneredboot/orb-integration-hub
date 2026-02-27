# Screenshot Capture Checklist

**Dev Server:** http://localhost:4200/
**Save Location:** `docs/design/screenshots/`

## Screenshot Settings

**Before you start:**
- Set browser window width to **1400px** (matches max-width)
- Use **2x resolution** if possible (Retina/high DPI display)
- Ensure you're logged in to the application

## Priority 1: Core Components (Start Here)

### 1. Organizations List Page ⭐ CANONICAL EXAMPLE
- [ ] **URL:** http://localhost:4200/customers/organizations
- [ ] **Filename:** `01-organizations-list-full.png`
- [ ] **Capture:** Full page including:
  - Hero section with logo and title
  - Breadcrumbs
  - Card with black header ("Organizations" + "Create" button)
  - Filter section (search input, status dropdown)
  - Data grid with all columns
  - Pagination controls
- [ ] **Notes:** This is the gold standard - capture everything!

### 2. Organization Detail Page
- [ ] **URL:** http://localhost:4200/customers/organizations/{pick-an-id}
- [ ] **Filename:** `02-organization-detail-overview.png`
- [ ] **Capture:** Overview tab showing:
  - Hero with logo and org name
  - Tab navigation (Overview, Members, Settings, Delete)
  - Organization details form
  - Metadata section (ID, Created, Last Updated)

### 3. Card Component (Close-up)
- [ ] **URL:** Any page with cards
- [ ] **Filename:** `03-card-component.png`
- [ ] **Capture:** Single card showing:
  - Black header bar
  - White title text with icon
  - Action button in header
  - Content area

### 4. Data Grid (Close-up)
- [ ] **URL:** Organizations list
- [ ] **Filename:** `04-data-grid-table.png`
- [ ] **Capture:** Just the table portion showing:
  - Column headers
  - 5-7 rows of data
  - All column types (info, status, role, count, date)

### 5. Status Badges (All Variants)
- [ ] **URL:** Any list page
- [ ] **Filename:** `05-status-badges.png`
- [ ] **Capture:** Status column showing:
  - Active (green)
  - Pending (yellow)
  - Suspended/Inactive (red)
- [ ] **Tip:** Scroll to find different statuses or create test data

### 6. Buttons (All Variants)
- [ ] **URL:** Various pages
- [ ] **Filename:** `06-buttons-all.png`
- [ ] **Capture separately:**
  - Primary button (red) - `06a-button-primary.png`
  - Secondary button (gray) - `06b-button-secondary.png`
  - Card header button (white border) - `06c-button-card-header.png`
  - Outline button - `06d-button-outline.png`

## Priority 2: Additional Components

### 7. Form Inputs
- [ ] **URL:** Settings or create/edit pages
- [ ] **Filename:** `07-form-inputs.png`
- [ ] **Capture:**
  - Text input (normal state)
  - Text input (focused - click into it)
  - Text input with icon
  - Select dropdown
  - Error state (if available)

### 8. Tab Navigation
- [ ] **URL:** Organization detail page
- [ ] **Filename:** `08-tab-navigation.png`
- [ ] **Capture:** Tab bar showing:
  - Active tab
  - Inactive tabs
  - Tab with badge (if any)
  - Danger tab (Delete)

### 9. Hero Split Component
- [ ] **URL:** Dashboard or any page with hero
- [ ] **Filename:** `09-hero-split.png`
- [ ] **Capture:** Hero section showing:
  - Logo on left
  - Title and subtitle on right
  - Proper spacing and alignment

### 10. Dashboard CTA Cards
- [ ] **URL:** http://localhost:4200/dashboard
- [ ] **Filename:** `10-dashboard-cta-cards.png`
- [ ] **Capture:** CTA cards showing:
  - Different severity levels (green, yellow, orange borders)
  - Icon + title at top
  - Description in middle
  - Button at bottom-right

## Priority 3: Page Layouts

### 11. Applications List
- [ ] **URL:** http://localhost:4200/customers/applications
- [ ] **Filename:** `11-applications-list-full.png`
- [ ] **Capture:** Full page (similar to organizations)

### 12. Application Detail
- [ ] **URL:** http://localhost:4200/customers/applications/{pick-an-id}
- [ ] **Filename:** `12-application-detail.png`
- [ ] **Capture:** Detail page with tabs

### 13. Dashboard Full Page
- [ ] **URL:** http://localhost:4200/dashboard
- [ ] **Filename:** `13-dashboard-full.png`
- [ ] **Capture:** Complete dashboard view

## Screenshot Tips

### Browser DevTools Tricks

**Set exact viewport size:**
1. Open DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Set to "Responsive"
4. Enter width: 1400px, height: 900px

**Capture specific element:**
1. Right-click element in DevTools
2. "Capture node screenshot" (Chrome)
3. Or use browser extension

**Hide elements temporarily:**
```javascript
// In console, to isolate a component:
document.querySelector('.orb-card').style.outline = '2px solid red';
```

### Windows Screenshot Tools

- **Snipping Tool:** Win + Shift + S (built-in)
- **Snagit:** Professional tool (paid)
- **ShareX:** Free, powerful (recommended)

### macOS Screenshot Tools

- **Built-in:** Cmd + Shift + 4 (select area)
- **CleanShot X:** Professional tool (paid)

## After Capturing Screenshots

### 1. Organize Files
All screenshots should be in: `docs/design/screenshots/`

### 2. Quick Review
- [ ] All images are clear and readable
- [ ] Consistent browser width (1400px)
- [ ] No personal data visible (use test accounts)
- [ ] File names match checklist

### 3. Upload to Figma

**Manual process (Figma power can't upload):**

1. **Open Figma** and create new file: "Orb Integration Hub - Screenshots"

2. **Create pages:**
   - Page 1: "Components"
   - Page 2: "Full Pages"
   - Page 3: "Reference"

3. **Drag and drop screenshots:**
   - Select all screenshots from `docs/design/screenshots/`
   - Drag into Figma
   - Organize by category

4. **Use Figma AI:**
   - Select a screenshot
   - Right-click → "Generate design from image"
   - Wait for AI to process
   - Review and refine the output

5. **Apply design tokens:**
   - Install "Tokens Studio for Figma" plugin
   - Import `docs/design/figma-tokens.json`
   - Apply tokens to AI-generated designs

## Estimated Time

- **Screenshot capture:** 30-60 minutes
- **Upload to Figma:** 5 minutes
- **Figma AI generation:** 2-3 hours (with refinement)
- **Token application:** 1 hour
- **Component creation:** 2-4 hours

## Need Help?

If you encounter issues:
- Check that dev server is running: http://localhost:4200/
- Ensure you're logged in
- Try different test accounts for different states
- Use browser DevTools to inspect elements

## Next Steps

Once screenshots are captured and uploaded to Figma:
1. Share Figma file with designers
2. Provide `figma-tokens.json` for token import
3. Designers use Figma AI to convert screenshots
4. Designers refine and create component library
5. Set up Code Connect to link back to code
