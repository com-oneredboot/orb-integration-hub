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
  });
});
