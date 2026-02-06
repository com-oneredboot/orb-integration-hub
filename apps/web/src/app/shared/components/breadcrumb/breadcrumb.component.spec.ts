// file: apps/web/src/app/shared/components/breadcrumb/breadcrumb.component.spec.ts
// author: Kiro AI Assistant
// date: 2025-01-27
// description: Unit tests for BreadcrumbComponent

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { RouterTestingModule } from '@angular/router/testing';
import { FontAwesomeModule, FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { BreadcrumbComponent, BreadcrumbItem } from './breadcrumb.component';
import * as fc from 'fast-check';

describe('BreadcrumbComponent', () => {
  let component: BreadcrumbComponent;
  let fixture: ComponentFixture<BreadcrumbComponent>;

  /**
   * Helper function to create test breadcrumb items
   */
  const createBreadcrumbItems = (count: number, options?: { lastHasRoute?: boolean }): BreadcrumbItem[] => {
    const items: BreadcrumbItem[] = [];
    for (let i = 0; i < count; i++) {
      const isLast = i === count - 1;
      items.push({
        label: `Item ${i + 1}`,
        route: isLast && !options?.lastHasRoute ? null : `/route-${i + 1}`
      });
    }
    return items;
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BreadcrumbComponent, RouterTestingModule, FontAwesomeModule]
    }).compileComponents();

    // Add icons to library
    const library = TestBed.inject(FaIconLibrary);
    library.addIcons(faChevronRight);

    fixture = TestBed.createComponent(BreadcrumbComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('rendering correct number of items', () => {
    /**
     * Validates: Requirement 1.2 - Render each BreadcrumbItem as a navigation element
     */
    it('should render correct number of items for single item', () => {
      component.items = createBreadcrumbItems(1);
      fixture.detectChanges();

      const listItems = fixture.debugElement.queryAll(By.css('.breadcrumb__item'));
      expect(listItems.length).toBe(1);
    });

    it('should render correct number of items for multiple items', () => {
      component.items = createBreadcrumbItems(3);
      fixture.detectChanges();

      const listItems = fixture.debugElement.queryAll(By.css('.breadcrumb__item'));
      expect(listItems.length).toBe(3);
    });

    it('should render correct number of items for many items', () => {
      component.items = createBreadcrumbItems(5);
      fixture.detectChanges();

      const listItems = fixture.debugElement.queryAll(By.css('.breadcrumb__item'));
      expect(listItems.length).toBe(5);
    });

    it('should render nothing when items array is empty', () => {
      component.items = [];
      fixture.detectChanges();

      const listItems = fixture.debugElement.queryAll(By.css('.breadcrumb__item'));
      expect(listItems.length).toBe(0);
    });
  });

  describe('last item is plain text', () => {
    /**
     * Validates: Requirement 1.4 - Last item renders as plain text without a link
     */
    it('should render last item as plain text (span) not a link', () => {
      component.items = createBreadcrumbItems(3);
      fixture.detectChanges();

      const listItems = fixture.debugElement.queryAll(By.css('.breadcrumb__item'));
      const lastItem = listItems[listItems.length - 1];
      
      const link = lastItem.query(By.css('a.breadcrumb__link'));
      const span = lastItem.query(By.css('span.breadcrumb__current'));
      
      expect(link).toBeNull();
      expect(span).toBeTruthy();
      expect(span.nativeElement.textContent.trim()).toBe('Item 3');
    });

    it('should render last item as plain text even if it has a route defined', () => {
      component.items = createBreadcrumbItems(3, { lastHasRoute: true });
      fixture.detectChanges();

      const listItems = fixture.debugElement.queryAll(By.css('.breadcrumb__item'));
      const lastItem = listItems[listItems.length - 1];
      
      const link = lastItem.query(By.css('a.breadcrumb__link'));
      const span = lastItem.query(By.css('span.breadcrumb__current'));
      
      expect(link).toBeNull();
      expect(span).toBeTruthy();
    });

    it('should render single item as plain text', () => {
      component.items = [{ label: 'Only Item', route: '/some-route' }];
      fixture.detectChanges();

      const listItems = fixture.debugElement.queryAll(By.css('.breadcrumb__item'));
      const onlyItem = listItems[0];
      
      const link = onlyItem.query(By.css('a.breadcrumb__link'));
      const span = onlyItem.query(By.css('span.breadcrumb__current'));
      
      expect(link).toBeNull();
      expect(span).toBeTruthy();
      expect(span.nativeElement.textContent.trim()).toBe('Only Item');
    });
  });

  describe('non-last items with routes are links', () => {
    /**
     * Validates: Requirement 1.3 - Items with routes render as clickable links
     */
    it('should render non-last items with routes as links', () => {
      component.items = [
        { label: 'Organizations', route: '/customers/organizations' },
        { label: 'Acme Corp', route: '/customers/organizations/123' },
        { label: 'Applications', route: null }
      ];
      fixture.detectChanges();

      const listItems = fixture.debugElement.queryAll(By.css('.breadcrumb__item'));
      
      // First item should be a link
      const firstLink = listItems[0].query(By.css('a.breadcrumb__link'));
      expect(firstLink).toBeTruthy();
      expect(firstLink.nativeElement.textContent.trim()).toBe('Organizations');
      expect(firstLink.attributes['ng-reflect-router-link']).toBe('/customers/organizations');
      
      // Second item should be a link
      const secondLink = listItems[1].query(By.css('a.breadcrumb__link'));
      expect(secondLink).toBeTruthy();
      expect(secondLink.nativeElement.textContent.trim()).toBe('Acme Corp');
    });

    it('should render non-last items without routes as plain text', () => {
      component.items = [
        { label: 'Organizations', route: null },
        { label: 'Acme Corp', route: '/customers/organizations/123' },
        { label: 'Current Page', route: null }
      ];
      fixture.detectChanges();

      const listItems = fixture.debugElement.queryAll(By.css('.breadcrumb__item'));
      
      // First item has no route, should be span
      const firstLink = listItems[0].query(By.css('a.breadcrumb__link'));
      const firstSpan = listItems[0].query(By.css('span.breadcrumb__current'));
      expect(firstLink).toBeNull();
      expect(firstSpan).toBeTruthy();
      
      // Second item has route and is not last, should be link
      const secondLink = listItems[1].query(By.css('a.breadcrumb__link'));
      expect(secondLink).toBeTruthy();
    });

    it('should have correct routerLink attribute on links', () => {
      component.items = [
        { label: 'Home', route: '/home' },
        { label: 'Section', route: '/home/section' },
        { label: 'Current', route: null }
      ];
      fixture.detectChanges();

      const links = fixture.debugElement.queryAll(By.css('a.breadcrumb__link'));
      expect(links.length).toBe(2);
      expect(links[0].attributes['ng-reflect-router-link']).toBe('/home');
      expect(links[1].attributes['ng-reflect-router-link']).toBe('/home/section');
    });
  });

  describe('separator count equals items minus one', () => {
    /**
     * Validates: Requirement 1.5 - Display chevron-right icon as separator between items
     */
    it('should render zero separators for single item', () => {
      component.items = createBreadcrumbItems(1);
      fixture.detectChanges();

      const separators = fixture.debugElement.queryAll(By.css('.breadcrumb__separator'));
      expect(separators.length).toBe(0);
    });

    it('should render one separator for two items', () => {
      component.items = createBreadcrumbItems(2);
      fixture.detectChanges();

      const separators = fixture.debugElement.queryAll(By.css('.breadcrumb__separator'));
      expect(separators.length).toBe(1);
    });

    it('should render two separators for three items', () => {
      component.items = createBreadcrumbItems(3);
      fixture.detectChanges();

      const separators = fixture.debugElement.queryAll(By.css('.breadcrumb__separator'));
      expect(separators.length).toBe(2);
    });

    it('should render n-1 separators for n items', () => {
      const itemCount = 5;
      component.items = createBreadcrumbItems(itemCount);
      fixture.detectChanges();

      const separators = fixture.debugElement.queryAll(By.css('.breadcrumb__separator'));
      expect(separators.length).toBe(itemCount - 1);
    });

    it('should render zero separators for empty items array', () => {
      component.items = [];
      fixture.detectChanges();

      const separators = fixture.debugElement.queryAll(By.css('.breadcrumb__separator'));
      expect(separators.length).toBe(0);
    });

    it('should render separators with aria-hidden attribute', () => {
      component.items = createBreadcrumbItems(3);
      fixture.detectChanges();

      const separators = fixture.debugElement.queryAll(By.css('.breadcrumb__separator'));
      separators.forEach(separator => {
        expect(separator.attributes['aria-hidden']).toBe('true');
      });
    });
  });

  describe('accessibility attributes', () => {
    /**
     * Validates: Requirement 6.1 - Use nav element with aria-label="Breadcrumb"
     * Validates: Requirement 6.3 - Mark current page item with aria-current="page"
     */
    it('should have nav element with aria-label="Breadcrumb"', () => {
      component.items = createBreadcrumbItems(3);
      fixture.detectChanges();

      const nav = fixture.debugElement.query(By.css('nav.breadcrumb'));
      expect(nav).toBeTruthy();
      expect(nav.attributes['aria-label']).toBe('Breadcrumb');
    });

    it('should use ordered list (ol) for breadcrumb items', () => {
      component.items = createBreadcrumbItems(3);
      fixture.detectChanges();

      const ol = fixture.debugElement.query(By.css('nav.breadcrumb ol.breadcrumb__list'));
      expect(ol).toBeTruthy();
    });

    it('should mark last item with aria-current="page"', () => {
      component.items = createBreadcrumbItems(3);
      fixture.detectChanges();

      const listItems = fixture.debugElement.queryAll(By.css('.breadcrumb__item'));
      const lastItem = listItems[listItems.length - 1];
      const currentSpan = lastItem.query(By.css('.breadcrumb__current'));
      
      expect(currentSpan.attributes['aria-current']).toBe('page');
    });

    it('should not have aria-current on non-last items', () => {
      component.items = createBreadcrumbItems(3);
      fixture.detectChanges();

      const listItems = fixture.debugElement.queryAll(By.css('.breadcrumb__item'));
      
      // Check first two items (non-last)
      for (let i = 0; i < listItems.length - 1; i++) {
        const link = listItems[i].query(By.css('a.breadcrumb__link'));
        const span = listItems[i].query(By.css('span.breadcrumb__current'));
        
        if (link) {
          expect(link.attributes['aria-current']).toBeFalsy();
        }
        if (span) {
          expect(span.attributes['aria-current']).toBeFalsy();
        }
      }
    });

    it('should have aria-current="page" on single item', () => {
      component.items = [{ label: 'Only Page', route: null }];
      fixture.detectChanges();

      const currentSpan = fixture.debugElement.query(By.css('.breadcrumb__current'));
      expect(currentSpan.attributes['aria-current']).toBe('page');
    });

    it('should have nav element even with empty items', () => {
      component.items = [];
      fixture.detectChanges();

      const nav = fixture.debugElement.query(By.css('nav.breadcrumb'));
      expect(nav).toBeTruthy();
      expect(nav.attributes['aria-label']).toBe('Breadcrumb');
    });
  });

  describe('label display', () => {
    it('should display correct labels for all items', () => {
      component.items = [
        { label: 'Organizations', route: '/orgs' },
        { label: 'Acme Corporation', route: '/orgs/123' },
        { label: 'Applications', route: null }
      ];
      fixture.detectChanges();

      const listItems = fixture.debugElement.queryAll(By.css('.breadcrumb__item'));
      
      expect(listItems[0].nativeElement.textContent).toContain('Organizations');
      expect(listItems[1].nativeElement.textContent).toContain('Acme Corporation');
      expect(listItems[2].nativeElement.textContent).toContain('Applications');
    });

    it('should handle special characters in labels', () => {
      component.items = [
        { label: 'Test & Demo', route: '/test' },
        { label: 'Item <Special>', route: null }
      ];
      fixture.detectChanges();

      const listItems = fixture.debugElement.queryAll(By.css('.breadcrumb__item'));
      expect(listItems[0].nativeElement.textContent).toContain('Test & Demo');
      expect(listItems[1].nativeElement.textContent).toContain('Item <Special>');
    });

    it('should handle empty string labels', () => {
      component.items = [
        { label: '', route: '/empty' },
        { label: 'Current', route: null }
      ];
      fixture.detectChanges();

      const listItems = fixture.debugElement.queryAll(By.css('.breadcrumb__item'));
      expect(listItems.length).toBe(2);
    });
  });

  describe('real-world breadcrumb scenarios', () => {
    it('should render organization detail breadcrumb correctly', () => {
      component.items = [
        { label: 'Organizations', route: '/customers/organizations' },
        { label: 'Acme Corp', route: null }
      ];
      fixture.detectChanges();

      const links = fixture.debugElement.queryAll(By.css('a.breadcrumb__link'));
      const currentSpan = fixture.debugElement.query(By.css('.breadcrumb__current[aria-current="page"]'));
      const separators = fixture.debugElement.queryAll(By.css('.breadcrumb__separator'));

      expect(links.length).toBe(1);
      expect(links[0].nativeElement.textContent.trim()).toBe('Organizations');
      expect(currentSpan.nativeElement.textContent.trim()).toBe('Acme Corp');
      expect(separators.length).toBe(1);
    });

    it('should render application detail breadcrumb correctly', () => {
      component.items = [
        { label: 'Organizations', route: '/customers/organizations' },
        { label: 'Acme Corp', route: '/customers/organizations/org-123' },
        { label: 'Applications', route: '/customers/applications' },
        { label: 'My App', route: null }
      ];
      fixture.detectChanges();

      const links = fixture.debugElement.queryAll(By.css('a.breadcrumb__link'));
      const currentSpan = fixture.debugElement.query(By.css('.breadcrumb__current[aria-current="page"]'));
      const separators = fixture.debugElement.queryAll(By.css('.breadcrumb__separator'));

      expect(links.length).toBe(3);
      expect(currentSpan.nativeElement.textContent.trim()).toBe('My App');
      expect(separators.length).toBe(3);
    });

    it('should render environment detail breadcrumb correctly', () => {
      component.items = [
        { label: 'Organizations', route: '/customers/organizations' },
        { label: 'Acme Corp', route: '/customers/organizations/org-123' },
        { label: 'Applications', route: '/customers/applications' },
        { label: 'My App', route: '/customers/applications/app-456' },
        { label: 'Environments', route: null },
        { label: 'Production', route: null }
      ];
      fixture.detectChanges();

      const links = fixture.debugElement.queryAll(By.css('a.breadcrumb__link'));
      const separators = fixture.debugElement.queryAll(By.css('.breadcrumb__separator'));
      const listItems = fixture.debugElement.queryAll(By.css('.breadcrumb__item'));

      expect(links.length).toBe(4);
      expect(separators.length).toBe(5);
      expect(listItems.length).toBe(6);
      
      // Last item should have aria-current
      const lastItem = listItems[listItems.length - 1];
      const lastSpan = lastItem.query(By.css('.breadcrumb__current'));
      expect(lastSpan.attributes['aria-current']).toBe('page');
    });
  });

  describe('breadcrumb truncation edge cases', () => {
    /**
     * Validates: Requirements 2.1, 2.2, 2.3
     */
    it('should not truncate with 0 items', () => {
      component.items = [];
      component.truncationThreshold = 4;
      fixture.detectChanges();

      const displayItems = component.displayItems;
      expect(displayItems.length).toBe(0);
    });

    it('should not truncate with 1 item', () => {
      component.items = createBreadcrumbItems(1);
      component.truncationThreshold = 4;
      fixture.detectChanges();

      const displayItems = component.displayItems;
      expect(displayItems.length).toBe(1);
      expect(displayItems).toEqual(component.items);
    });

    it('should not truncate with 2 items', () => {
      component.items = createBreadcrumbItems(2);
      component.truncationThreshold = 4;
      fixture.detectChanges();

      const displayItems = component.displayItems;
      expect(displayItems.length).toBe(2);
      expect(displayItems).toEqual(component.items);
    });

    it('should not truncate with 3 items', () => {
      component.items = createBreadcrumbItems(3);
      component.truncationThreshold = 4;
      fixture.detectChanges();

      const displayItems = component.displayItems;
      expect(displayItems.length).toBe(3);
      expect(displayItems).toEqual(component.items);
    });

    it('should truncate with exactly 4 items (boundary case)', () => {
      component.items = createBreadcrumbItems(4);
      component.truncationThreshold = 4;
      fixture.detectChanges();

      const displayItems = component.displayItems;
      expect(displayItems.length).toBe(4);
      
      // Should have pattern: [first, ellipsis, item3, item4]
      expect(displayItems[0].label).toBe('Item 1');
      expect(displayItems[1].label).toBe('...');
      expect(displayItems[1].isEllipsis).toBe(true);
      expect(displayItems[2].label).toBe('Item 3');
      expect(displayItems[3].label).toBe('Item 4');
    });

    it('should truncate with 5+ items', () => {
      component.items = createBreadcrumbItems(5);
      component.truncationThreshold = 4;
      fixture.detectChanges();

      const displayItems = component.displayItems;
      expect(displayItems.length).toBe(4);
      
      // Should have pattern: [first, ellipsis, item4, item5]
      expect(displayItems[0].label).toBe('Item 1');
      expect(displayItems[1].label).toBe('...');
      expect(displayItems[1].isEllipsis).toBe(true);
      expect(displayItems[2].label).toBe('Item 4');
      expect(displayItems[3].label).toBe('Item 5');
    });

    it('should handle null input gracefully', () => {
      component.items = null as unknown as BreadcrumbItem[];
      component.truncationThreshold = 4;
      fixture.detectChanges();

      const displayItems = component.displayItems;
      expect(displayItems).toEqual([]);
    });

    it('should handle undefined input gracefully', () => {
      component.items = undefined as unknown as BreadcrumbItem[];
      component.truncationThreshold = 4;
      fixture.detectChanges();

      const displayItems = component.displayItems;
      expect(displayItems).toEqual([]);
    });

    it('should render ellipsis as non-clickable span', () => {
      component.items = createBreadcrumbItems(5);
      component.truncationThreshold = 4;
      fixture.detectChanges();

      const listItems = fixture.debugElement.queryAll(By.css('.breadcrumb__item'));
      // Second item should be ellipsis (index 1, but +1 for icon item)
      const ellipsisItem = listItems[2]; // Icon at 0, first breadcrumb at 1, ellipsis at 2
      
      const link = ellipsisItem.query(By.css('a.breadcrumb__link'));
      const span = ellipsisItem.query(By.css('span.breadcrumb__current'));
      
      expect(link).toBeNull();
      expect(span).toBeTruthy();
      expect(span.nativeElement.textContent.trim()).toBe('...');
      expect(span.nativeElement.classList.contains('ellipsis')).toBe(true);
    });

    it('should maintain separators with truncated items', () => {
      component.items = createBreadcrumbItems(6);
      component.truncationThreshold = 4;
      fixture.detectChanges();

      const displayItems = component.displayItems;
      const separators = fixture.debugElement.queryAll(By.css('.breadcrumb__separator'));
      
      // Should have 3 separators for 4 display items
      expect(separators.length).toBe(displayItems.length - 1);
      expect(separators.length).toBe(3);
    });
  });

  describe('Property-Based Tests - Feature: horizontal-breadcrumb-tabs-layout', () => {
    /**
     * Property 2: Truncation Threshold Enforcement
     * Validates: Requirements 2.1, 2.3
     * 
     * For any breadcrumb array, if the array length is >= 4, then applying the 
     * truncation function should produce a truncated result; if the array length 
     * is < 4, the result should be identical to the input.
     */
    it('Property 2: should apply truncation only when length >= 4', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              label: fc.string({ minLength: 1, maxLength: 20 }),
              route: fc.oneof(fc.constant(null), fc.webUrl())
            }),
            { minLength: 0, maxLength: 20 }
          ),
          (items) => {
            component.items = items;
            component.truncationThreshold = 4;
            fixture.detectChanges();

            const displayItems = component.displayItems;

            if (items.length < 4) {
              // No truncation should occur
              expect(displayItems.length).toBe(items.length);
              expect(displayItems).toEqual(items);
            } else {
              // Truncation should occur
              expect(displayItems.length).toBe(4);
              expect(displayItems.length).toBeLessThan(items.length);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property 3: Truncation Pattern Correctness
     * Validates: Requirements 2.2, 2.4
     * 
     * For any breadcrumb array with length >= 4, the truncated result should 
     * contain exactly 4 items: the first item from the original array, an ellipsis 
     * item (with isEllipsis: true and route: null), and the last 2 items from the 
     * original array, in that order.
     */
    it('Property 3: should follow correct truncation pattern [first, ellipsis, ...lastTwo]', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              label: fc.string({ minLength: 1, maxLength: 20 }),
              route: fc.oneof(fc.constant(null), fc.webUrl())
            }),
            { minLength: 4, maxLength: 20 }
          ),
          (items) => {
            component.items = items;
            component.truncationThreshold = 4;
            fixture.detectChanges();

            const displayItems = component.displayItems;

            // Should have exactly 4 items
            expect(displayItems.length).toBe(4);

            // First item should match original first item
            expect(displayItems[0].label).toBe(items[0].label);
            expect(displayItems[0].route).toBe(items[0].route);

            // Second item should be ellipsis
            expect(displayItems[1].label).toBe('...');
            expect(displayItems[1].route).toBeNull();
            expect(displayItems[1].isEllipsis).toBe(true);

            // Last two items should match original last two items
            expect(displayItems[2].label).toBe(items[items.length - 2].label);
            expect(displayItems[2].route).toBe(items[items.length - 2].route);
            expect(displayItems[3].label).toBe(items[items.length - 1].label);
            expect(displayItems[3].route).toBe(items[items.length - 1].route);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property 6: Truncation Preserves First and Last Items
     * Validates: Requirements 2.2
     * 
     * For any breadcrumb array with length >= 4, the first item in the truncated 
     * result should have the same label and route as the first item in the original 
     * array, and the last item in the truncated result should have the same label 
     * and route as the last item in the original array.
     */
    it('Property 6: should preserve first and last items during truncation', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              label: fc.string({ minLength: 1, maxLength: 20 }),
              route: fc.oneof(fc.constant(null), fc.webUrl())
            }),
            { minLength: 4, maxLength: 20 }
          ),
          (items) => {
            component.items = items;
            component.truncationThreshold = 4;
            fixture.detectChanges();

            const displayItems = component.displayItems;

            // First item preserved
            expect(displayItems[0].label).toBe(items[0].label);
            expect(displayItems[0].route).toBe(items[0].route);
            expect(displayItems[0].isEllipsis).toBeFalsy();

            // Last item preserved
            const lastDisplayItem = displayItems[displayItems.length - 1];
            const lastOriginalItem = items[items.length - 1];
            expect(lastDisplayItem.label).toBe(lastOriginalItem.label);
            expect(lastDisplayItem.route).toBe(lastOriginalItem.route);
            expect(lastDisplayItem.isEllipsis).toBeFalsy();
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property 7: Separator Rendering Between Items
     * Validates: Requirements 2.5
     * 
     * For any breadcrumb array (truncated or not), when rendered, separators 
     * should appear between all adjacent items except after the last item, 
     * including around the ellipsis if present.
     */
    it('Property 7: should render separators between all items (count = items - 1)', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              label: fc.string({ minLength: 1, maxLength: 20 }),
              route: fc.oneof(fc.constant(null), fc.webUrl())
            }),
            { minLength: 0, maxLength: 20 }
          ),
          (items) => {
            component.items = items;
            component.truncationThreshold = 4;
            fixture.detectChanges();

            const displayItems = component.displayItems;
            const separators = fixture.debugElement.queryAll(By.css('.breadcrumb__separator'));

            if (displayItems.length === 0) {
              expect(separators.length).toBe(0);
            } else {
              expect(separators.length).toBe(displayItems.length - 1);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
