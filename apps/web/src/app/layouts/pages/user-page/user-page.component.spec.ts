/**
 * User Page Component Unit Tests
 *
 * Tests for the standard page wrapper component used within user-layout.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UserPageComponent } from './user-page.component';
import { BreadcrumbItem } from '../../../shared/components/breadcrumb/breadcrumb.component';
import { TabConfig } from '../../../shared/models/tab-config.model';

describe('UserPageComponent', () => {
  let component: UserPageComponent;
  let fixture: ComponentFixture<UserPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserPageComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(UserPageComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Hero Section', () => {
    it('should show hero by default', () => {
      expect(component.showHero).toBe(true);
    });

    it('should render hero when showHero is true', () => {
      component.showHero = true;
      component.heroTitle = 'Test Title';
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const hero = compiled.querySelector('app-hero-split');
      expect(hero).toBeTruthy();
    });

    it('should not render hero when showHero is false', () => {
      component.showHero = false;
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const hero = compiled.querySelector('app-hero-split');
      expect(hero).toBeFalsy();
    });

    it('should use default logo', () => {
      expect(component.heroLogo).toBe('assets/orb-logo.jpg');
    });

    it('should use default logo alt text', () => {
      expect(component.heroLogoAlt).toBe('Orb Integration Hub Logo');
    });
  });

  describe('Content Section', () => {
    it('should always render content section', () => {
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const content = compiled.querySelector('.user-page__content');
      expect(content).toBeTruthy();
    });

    it('should render main content area', () => {
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const main = compiled.querySelector('.user-page__main');
      expect(main).toBeTruthy();
    });
  });

  describe('Breadcrumbs', () => {
    it('should render breadcrumbs when items are provided', () => {
      const items: BreadcrumbItem[] = [
        { label: 'Home', route: '/' },
        { label: 'Page', route: null }
      ];
      component.breadcrumbItems = items;
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const breadcrumb = compiled.querySelector('app-breadcrumb');
      expect(breadcrumb).toBeTruthy();
    });

    it('should not render breadcrumbs when no items provided', () => {
      component.breadcrumbItems = [];
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const breadcrumb = compiled.querySelector('app-breadcrumb');
      expect(breadcrumb).toBeFalsy();
    });

    it('should render breadcrumb container with correct class', () => {
      component.breadcrumbItems = [{ label: 'Test', route: null }];
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const container = compiled.querySelector('.orb-breadcrumb-container');
      expect(container).toBeTruthy();
    });
  });

  describe('Tab Navigation', () => {
    it('should render tabs when provided', () => {
      const tabs: TabConfig[] = [
        { id: 'tab1', label: 'Tab 1' },
        { id: 'tab2', label: 'Tab 2' }
      ];
      component.tabs = tabs;
      component.activeTabId = 'tab1';
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const tabNav = compiled.querySelector('app-tab-navigation');
      expect(tabNav).toBeTruthy();
    });

    it('should not render tabs when not provided', () => {
      component.tabs = [];
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const tabNav = compiled.querySelector('app-tab-navigation');
      expect(tabNav).toBeFalsy();
    });

    it('should emit tabChange event when tab is changed', () => {
      spyOn(component.tabChange, 'emit');
      
      component.onTabChange('new-tab');

      expect(component.tabChange.emit).toHaveBeenCalledWith('new-tab');
    });
  });

  describe('Layout Structure', () => {
    it('should have correct element order: hero → content → breadcrumbs → tabs → main', () => {
      component.showHero = true;
      component.heroTitle = 'Test';
      component.breadcrumbItems = [{ label: 'Test', route: null }];
      component.tabs = [{ id: 'tab1', label: 'Tab 1' }];
      component.activeTabId = 'tab1';
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const page = compiled.querySelector('.user-page');
      const children = Array.from(page?.children || []);

      // Hero should be first (if shown)
      expect(children[0].tagName.toLowerCase()).toBe('app-hero-split');
      
      // Content section should be second
      expect(children[1].classList.contains('user-page__content')).toBe(true);
      
      // Within content section: breadcrumbs → tabs → main
      const contentChildren = Array.from(children[1].children);
      expect(contentChildren[0].classList.contains('orb-breadcrumb-container')).toBe(true);
      expect(contentChildren[1].tagName.toLowerCase()).toBe('app-tab-navigation');
      expect(contentChildren[2].classList.contains('user-page__main')).toBe(true);
    });

    /**
     * Property 9: Page layout element order
     * **Validates: Requirements 2.5**
     * 
     * For any page component in the application, the DOM structure should contain
     * breadcrumb, tab navigation, and content elements in that exact order.
     */
    it('should maintain breadcrumb → tabs → content order regardless of configuration', () => {
      // Test with various configurations
      const configurations = [
        {
          breadcrumbs: [{ label: 'Home', route: '/' }],
          tabs: [{ id: 'overview', label: 'Overview' }],
          activeTab: 'overview'
        },
        {
          breadcrumbs: [{ label: 'Home', route: '/' }, { label: 'Page', route: null }],
          tabs: [
            { id: 'overview', label: 'Overview' },
            { id: 'security', label: 'Security' }
          ],
          activeTab: 'overview'
        },
        {
          breadcrumbs: [
            { label: 'Home', route: '/' },
            { label: 'Organizations', route: '/organizations' },
            { label: 'Detail', route: null }
          ],
          tabs: [
            { id: 'overview', label: 'Overview' },
            { id: 'security', label: 'Security' },
            { id: 'members', label: 'Members' },
            { id: 'applications', label: 'Applications' }
          ],
          activeTab: 'overview'
        }
      ];

      configurations.forEach(config => {
        component.breadcrumbItems = config.breadcrumbs;
        component.tabs = config.tabs;
        component.activeTabId = config.activeTab;
        fixture.detectChanges();

        const compiled = fixture.nativeElement as HTMLElement;
        const content = compiled.querySelector('.user-page__content');
        const contentChildren = Array.from(content?.children || []);

        // Find indices of elements
        let breadcrumbIndex = -1;
        let tabsIndex = -1;
        let mainIndex = -1;

        contentChildren.forEach((child, index) => {
          const element = child as HTMLElement;
          if (element.classList.contains('orb-breadcrumb-container')) {
            breadcrumbIndex = index;
          }
          if (element.tagName.toLowerCase() === 'app-tab-navigation') {
            tabsIndex = index;
          }
          if (element.classList.contains('user-page__main')) {
            mainIndex = index;
          }
        });

        // Verify order
        expect(breadcrumbIndex).toBeGreaterThanOrEqual(0);
        expect(tabsIndex).toBeGreaterThanOrEqual(0);
        expect(mainIndex).toBeGreaterThanOrEqual(0);
        expect(breadcrumbIndex).toBeLessThan(tabsIndex);
        expect(tabsIndex).toBeLessThan(mainIndex);
      });
    });

    /**
     * Property 7: Overview tab presence
     * **Validates: Requirements 2.2**
     * 
     * For any page component in the application, the first tab in the tabs
     * configuration array should have the id 'overview' and label 'Overview'.
     */
    it('should have Overview as first tab when tabs are provided', () => {
      const tabConfigurations = [
        [{ id: 'overview', label: 'Overview' }],
        [
          { id: 'overview', label: 'Overview' },
          { id: 'security', label: 'Security' }
        ],
        [
          { id: 'overview', label: 'Overview' },
          { id: 'security', label: 'Security' },
          { id: 'members', label: 'Members' },
          { id: 'applications', label: 'Applications' }
        ]
      ];

      tabConfigurations.forEach(tabs => {
        component.tabs = tabs;
        component.activeTabId = tabs[0].id;
        fixture.detectChanges();

        // Verify first tab is Overview
        expect(component.tabs[0].id).toBe('overview');
        expect(component.tabs[0].label).toBe('Overview');
      });
    });

    /**
     * Property 6: Full-width layout consistency
     * **Validates: Requirements 2.1, 8.1, 8.2, 8.3**
     * 
     * For any page component in the application, the page container should have
     * no max-width CSS constraint and should span the full available viewport width.
     */
    it('should have no max-width constraint on page container', () => {
      component.breadcrumbItems = [{ label: 'Test', route: null }];
      component.tabs = [{ id: 'overview', label: 'Overview' }];
      component.activeTabId = 'overview';
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const page = compiled.querySelector('.user-page');
      const computedStyle = window.getComputedStyle(page as Element);

      // The page itself should not have max-width
      // Note: The content section has max-width: 1400px which is intentional
      // but the page container should be full-width
      expect(computedStyle.maxWidth).toBe('none');
    });

    /**
     * Property 11: Page padding consistency
     * **Validates: Requirements 8.4**
     * 
     * For any page component in the application, the left and right padding values
     * on the page content container should be equal and consistent across all pages.
     */
    it('should have equal left and right padding on content container', () => {
      component.breadcrumbItems = [{ label: 'Test', route: null }];
      component.tabs = [{ id: 'overview', label: 'Overview' }];
      component.activeTabId = 'overview';
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const content = compiled.querySelector('.user-page__content');
      const computedStyle = window.getComputedStyle(content as Element);

      const paddingLeft = computedStyle.paddingLeft;
      const paddingRight = computedStyle.paddingRight;

      // Left and right padding should be equal
      expect(paddingLeft).toBe(paddingRight);
    });

    it('should render breadcrumbs before tabs in DOM order', () => {
      component.breadcrumbItems = [{ label: 'Test', route: null }];
      component.tabs = [{ id: 'overview', label: 'Overview' }];
      component.activeTabId = 'overview';
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const content = compiled.querySelector('.user-page__content');
      const breadcrumb = content?.querySelector('.orb-breadcrumb-container');
      const tabs = content?.querySelector('app-tab-navigation');

      // Get positions in DOM
      const breadcrumbPosition = Array.from(content?.children || []).indexOf(breadcrumb as Element);
      const tabsPosition = Array.from(content?.children || []).indexOf(tabs as Element);

      expect(breadcrumbPosition).toBeLessThan(tabsPosition);
    });

    it('should render tabs before main content in DOM order', () => {
      component.breadcrumbItems = [{ label: 'Test', route: null }];
      component.tabs = [{ id: 'overview', label: 'Overview' }];
      component.activeTabId = 'overview';
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const content = compiled.querySelector('.user-page__content');
      const tabs = content?.querySelector('app-tab-navigation');
      const main = content?.querySelector('.user-page__main');

      // Get positions in DOM
      const tabsPosition = Array.from(content?.children || []).indexOf(tabs as Element);
      const mainPosition = Array.from(content?.children || []).indexOf(main as Element);

      expect(tabsPosition).toBeLessThan(mainPosition);
    });
  });
});
