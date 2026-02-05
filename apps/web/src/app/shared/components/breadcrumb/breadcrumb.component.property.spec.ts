// file: apps/web/src/app/shared/components/breadcrumb/breadcrumb.component.property.spec.ts
// author: Kiro AI Assistant
// date: 2025-01-27
// description: Property-based tests for BreadcrumbComponent using fast-check

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { FontAwesomeModule, FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { faChevronRight } from '@fortawesome/free-solid-svg-icons';
import * as fc from 'fast-check';
import { BreadcrumbComponent, BreadcrumbItem } from './breadcrumb.component';

describe('BreadcrumbComponent Property Tests', () => {
  let component: BreadcrumbComponent;
  let fixture: ComponentFixture<BreadcrumbComponent>;

  /**
   * Smart generator for BreadcrumbItem
   * Generates realistic breadcrumb items with:
   * - Non-empty labels (1-50 chars, alphanumeric with spaces)
   * - Routes that are either null or valid URL paths
   */
  const breadcrumbItemArbitrary: fc.Arbitrary<BreadcrumbItem> = fc.record({
    label: fc.string({ minLength: 1, maxLength: 50 })
      .filter((s: string) => s.trim().length > 0 && /^[a-zA-Z0-9 ]+$/.test(s)),
    route: fc.oneof(
      fc.constant(null),
      fc.string({ minLength: 1, maxLength: 50 })
        .filter((s: string) => /^[a-z0-9\-/]+$/.test(s))
        .map((s: string) => '/' + s.replace(/^\/+/, ''))
    )
  });

  /**
   * Generator for non-empty arrays of breadcrumb items (1-10 items)
   * This represents realistic breadcrumb hierarchies
   */
  const nonEmptyBreadcrumbItemsArbitrary: fc.Arbitrary<BreadcrumbItem[]> = fc.array(
    breadcrumbItemArbitrary,
    { minLength: 1, maxLength: 10 }
  );

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BreadcrumbComponent, FontAwesomeModule],
      providers: [provideRouter([])]
    }).compileComponents();

    // Add icons to library
    const library = TestBed.inject(FaIconLibrary);
    library.addIcons(faChevronRight);

    fixture = TestBed.createComponent(BreadcrumbComponent);
    component = fixture.componentInstance;
  });

  /**
   * Property 1: Last item is never a link
   * **Validates: Requirements 1.4**
   *
   * For any breadcrumb items array with at least one item, the last item
   * SHALL be rendered as plain text (not a clickable link), regardless of
   * whether it has a route defined.
   */
  describe('Property 1: Last item is never a link', () => {
    it('should render last item as plain text for any valid breadcrumb array', () => {
      fc.assert(
        fc.property(nonEmptyBreadcrumbItemsArbitrary, (items: BreadcrumbItem[]) => {
          // Arrange
          component.items = items;
          fixture.detectChanges();

          // Act
          const listItems = fixture.debugElement.queryAll(By.css('.breadcrumb__item'));
          const lastItem = listItems[listItems.length - 1];

          // Assert: Last item should NOT have a link
          const link = lastItem.query(By.css('a.breadcrumb__link'));
          const span = lastItem.query(By.css('span.breadcrumb__current'));

          // Property: Last item is always a span, never a link
          expect(link).toBeNull();
          expect(span).toBeTruthy();

          // Property: Last item has aria-current="page"
          expect(span.attributes['aria-current']).toBe('page');

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('should render last item as plain text even when it has a route defined', () => {
      fc.assert(
        fc.property(
          fc.array(breadcrumbItemArbitrary, { minLength: 1, maxLength: 10 }),
          (items: BreadcrumbItem[]) => {
            // Force the last item to have a route
            const itemsWithLastRoute = items.map((item, index) => ({
              ...item,
              route: index === items.length - 1 ? '/some-route' : item.route
            }));

            // Arrange
            component.items = itemsWithLastRoute;
            fixture.detectChanges();

            // Act
            const listItems = fixture.debugElement.queryAll(By.css('.breadcrumb__item'));
            const lastItem = listItems[listItems.length - 1];

            // Assert: Last item should still NOT be a link
            const link = lastItem.query(By.css('a.breadcrumb__link'));
            const span = lastItem.query(By.css('span.breadcrumb__current'));

            expect(link).toBeNull();
            expect(span).toBeTruthy();

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 3: Separator count equals items minus one
   * **Validates: Requirements 1.5**
   *
   * For any breadcrumb items array with n items (n > 0), the component
   * SHALL render exactly n-1 separator icons.
   */
  describe('Property 3: Separator count equals items minus one', () => {
    it('should render exactly n-1 separators for n items', () => {
      fc.assert(
        fc.property(nonEmptyBreadcrumbItemsArbitrary, (items: BreadcrumbItem[]) => {
          // Arrange
          component.items = items;
          fixture.detectChanges();

          // Act
          const separators = fixture.debugElement.queryAll(By.css('.breadcrumb__separator'));

          // Assert: Separator count = items.length - 1
          const expectedSeparatorCount = items.length - 1;
          expect(separators.length).toBe(expectedSeparatorCount);

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('should render zero separators for single item', () => {
      fc.assert(
        fc.property(breadcrumbItemArbitrary, (item: BreadcrumbItem) => {
          // Arrange: Single item array
          component.items = [item];
          fixture.detectChanges();

          // Act
          const separators = fixture.debugElement.queryAll(By.css('.breadcrumb__separator'));

          // Assert: No separators for single item
          expect(separators.length).toBe(0);

          return true;
        }),
        { numRuns: 50 }
      );
    });

    it('should render separators with aria-hidden attribute', () => {
      fc.assert(
        fc.property(
          fc.array(breadcrumbItemArbitrary, { minLength: 2, maxLength: 10 }),
          (items: BreadcrumbItem[]) => {
            // Arrange
            component.items = items;
            fixture.detectChanges();

            // Act
            const separators = fixture.debugElement.queryAll(By.css('.breadcrumb__separator'));

            // Assert: All separators have aria-hidden="true"
            separators.forEach(separator => {
              expect(separator.attributes['aria-hidden']).toBe('true');
            });

            return true;
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Edge case: Empty items array
   * Verifies the component handles empty arrays gracefully
   */
  describe('Edge case: Empty items array', () => {
    it('should render zero items and zero separators for empty array', () => {
      // Arrange
      component.items = [];
      fixture.detectChanges();

      // Act
      const listItems = fixture.debugElement.queryAll(By.css('.breadcrumb__item'));
      const separators = fixture.debugElement.queryAll(By.css('.breadcrumb__separator'));

      // Assert
      expect(listItems.length).toBe(0);
      expect(separators.length).toBe(0);
    });
  });
});
