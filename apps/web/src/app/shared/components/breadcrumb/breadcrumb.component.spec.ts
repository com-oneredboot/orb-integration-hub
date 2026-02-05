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
});
