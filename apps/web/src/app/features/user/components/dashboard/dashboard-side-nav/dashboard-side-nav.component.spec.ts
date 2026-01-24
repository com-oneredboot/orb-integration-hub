// file: apps/web/src/app/features/user/components/dashboard/dashboard-side-nav/dashboard-side-nav.component.spec.ts
// author: Kiro
// date: 2026-01-23
// description: Unit tests for DashboardSideNavComponent

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { DashboardSideNavComponent } from './dashboard-side-nav.component';
import { FontAwesomeModule, FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { 
  faUser, 
  faShieldAlt, 
  faCreditCard, 
  faPlug 
} from '@fortawesome/free-solid-svg-icons';

describe('DashboardSideNavComponent', () => {
  let component: DashboardSideNavComponent;
  let fixture: ComponentFixture<DashboardSideNavComponent>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [DashboardSideNavComponent, FontAwesomeModule],
      providers: [
        { provide: Router, useValue: routerSpy }
      ]
    }).compileComponents();

    // Add icons to library
    const library = TestBed.inject(FaIconLibrary);
    library.addIcons(faUser, faShieldAlt, faCreditCard, faPlug);

    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    fixture = TestBed.createComponent(DashboardSideNavComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('rendering', () => {
    it('should display all navigation items', () => {
      const buttons = fixture.nativeElement.querySelectorAll('.orb-side-nav__button');
      expect(buttons.length).toBe(4);
    });

    it('should display profile icon', () => {
      const profileItem = component.navItems.find(item => item.id === 'profile');
      expect(profileItem).toBeTruthy();
      expect(profileItem?.icon).toBe('user');
    });

    it('should display security icon', () => {
      const securityItem = component.navItems.find(item => item.id === 'security');
      expect(securityItem).toBeTruthy();
      expect(securityItem?.icon).toBe('shield-alt');
    });

    it('should display payment icon', () => {
      const paymentItem = component.navItems.find(item => item.id === 'payment');
      expect(paymentItem).toBeTruthy();
      expect(paymentItem?.icon).toBe('credit-card');
    });

    it('should display integrations icon', () => {
      const integrationsItem = component.navItems.find(item => item.id === 'integrations');
      expect(integrationsItem).toBeTruthy();
      expect(integrationsItem?.icon).toBe('plug');
    });

    it('should mark disabled items with disabled class', () => {
      const disabledButtons = fixture.nativeElement.querySelectorAll('.orb-side-nav__button--disabled');
      expect(disabledButtons.length).toBe(2); // payment and integrations
    });
  });

  describe('navigation', () => {
    it('should navigate to profile on profile button click', () => {
      const profileButton = fixture.nativeElement.querySelector('.orb-side-nav__button');
      profileButton.click();
      
      expect(router.navigate).toHaveBeenCalledWith(['/profile']);
    });

    it('should navigate to security on security button click', () => {
      const buttons = fixture.nativeElement.querySelectorAll('.orb-side-nav__button');
      buttons[1].click(); // Security is second
      
      expect(router.navigate).toHaveBeenCalledWith(['/authenticate']);
    });

    it('should not navigate when disabled item is clicked', () => {
      const paymentItem = component.navItems.find(item => item.id === 'payment');
      component.onItemClick(paymentItem!);
      
      expect(router.navigate).not.toHaveBeenCalled();
    });
  });

  describe('tooltips', () => {
    it('should show tooltip on mouse enter', () => {
      const profileItem = component.navItems[0];
      component.onMouseEnter(profileItem);
      
      expect(component.hoveredItemId).toBe(profileItem.id);
      expect(component.isTooltipVisible(profileItem)).toBe(true);
    });

    it('should hide tooltip on mouse leave', () => {
      const profileItem = component.navItems[0];
      component.onMouseEnter(profileItem);
      component.onMouseLeave();
      
      expect(component.hoveredItemId).toBeNull();
      expect(component.isTooltipVisible(profileItem)).toBe(false);
    });

    it('should display correct tooltip text', () => {
      const profileItem = component.navItems.find(item => item.id === 'profile');
      expect(profileItem?.tooltip).toBe('Edit Profile');
    });

    it('should only show tooltip for hovered item', () => {
      const profileItem = component.navItems[0];
      const securityItem = component.navItems[1];
      
      component.onMouseEnter(profileItem);
      
      expect(component.isTooltipVisible(profileItem)).toBe(true);
      expect(component.isTooltipVisible(securityItem)).toBe(false);
    });
  });

  describe('keyboard accessibility', () => {
    it('should trigger navigation on Enter key', () => {
      const profileItem = component.navItems[0];
      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      spyOn(event, 'preventDefault');
      
      component.onKeydown(event, profileItem);
      
      expect(event.preventDefault).toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith(['/profile']);
    });

    it('should trigger navigation on Space key', () => {
      const profileItem = component.navItems[0];
      const event = new KeyboardEvent('keydown', { key: ' ' });
      spyOn(event, 'preventDefault');
      
      component.onKeydown(event, profileItem);
      
      expect(event.preventDefault).toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalled();
    });

    it('should not trigger navigation on other keys', () => {
      const profileItem = component.navItems[0];
      const event = new KeyboardEvent('keydown', { key: 'Tab' });
      
      component.onKeydown(event, profileItem);
      
      expect(router.navigate).not.toHaveBeenCalled();
    });
  });

  describe('accessibility attributes', () => {
    it('should have navigation role', () => {
      const nav = fixture.nativeElement.querySelector('.orb-side-nav');
      expect(nav.getAttribute('role')).toBe('navigation');
    });

    it('should have aria-label on navigation', () => {
      const nav = fixture.nativeElement.querySelector('.orb-side-nav');
      expect(nav.getAttribute('aria-label')).toBe('Quick actions');
    });

    it('should have aria-label on buttons', () => {
      const buttons = fixture.nativeElement.querySelectorAll('.orb-side-nav__button');
      expect(buttons[0].getAttribute('aria-label')).toBe('Edit Profile');
    });

    it('should have aria-disabled on disabled buttons', () => {
      const buttons = fixture.nativeElement.querySelectorAll('.orb-side-nav__button');
      // Payment (index 2) and Integrations (index 3) are disabled
      expect(buttons[2].getAttribute('aria-disabled')).toBe('true');
      expect(buttons[3].getAttribute('aria-disabled')).toBe('true');
    });

    it('should hide icons from screen readers', () => {
      const icons = fixture.nativeElement.querySelectorAll('.orb-side-nav__icon');
      icons.forEach((icon: Element) => {
        expect(icon.getAttribute('aria-hidden')).toBe('true');
      });
    });
  });

  describe('events', () => {
    it('should emit itemClicked event on button click', () => {
      spyOn(component.itemClicked, 'emit');
      const profileItem = component.navItems[0];
      
      component.onItemClick(profileItem);
      
      expect(component.itemClicked.emit).toHaveBeenCalledWith(profileItem);
    });

    it('should not emit itemClicked for disabled items', () => {
      spyOn(component.itemClicked, 'emit');
      const paymentItem = component.navItems.find(item => item.id === 'payment');
      
      component.onItemClick(paymentItem!);
      
      expect(component.itemClicked.emit).not.toHaveBeenCalled();
    });
  });

  describe('custom action handlers', () => {
    it('should call custom action handler when provided', () => {
      const actionSpy = jasmine.createSpy('action');
      const customItem = { ...component.navItems[0], action: actionSpy, route: undefined };
      
      component.onItemClick(customItem);
      
      expect(actionSpy).toHaveBeenCalled();
    });

    it('should prefer action handler over route', () => {
      const actionSpy = jasmine.createSpy('action');
      const customItem = { ...component.navItems[0], action: actionSpy };
      
      component.onItemClick(customItem);
      
      expect(actionSpy).toHaveBeenCalled();
      expect(router.navigate).not.toHaveBeenCalled();
    });
  });

  describe('trackByItemId', () => {
    it('should return item id', () => {
      const item = component.navItems[0];
      expect(component.trackByItemId(0, item)).toBe(item.id);
    });
  });
});
