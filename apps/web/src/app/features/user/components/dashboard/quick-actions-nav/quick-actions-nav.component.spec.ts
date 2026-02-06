// file: apps/web/src/app/features/user/components/dashboard/quick-actions-nav/quick-actions-nav.component.spec.ts
// author: Kiro
// date: 2026-01-23
// description: Unit tests for QuickActionsNavComponent

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, NavigationEnd } from '@angular/router';
import { QuickActionsNavComponent } from './quick-actions-nav.component';
import { FontAwesomeModule, FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { Subject } from 'rxjs';
import { 
  faBuilding,
  faRocket,
  faUsers,
  faUser
} from '@fortawesome/free-solid-svg-icons';

describe('QuickActionsNavComponent', () => {
  let component: QuickActionsNavComponent;
  let fixture: ComponentFixture<QuickActionsNavComponent>;
  let router: jasmine.SpyObj<Router>;
  let routerEvents$: Subject<NavigationEnd>;

  beforeEach(async () => {
    routerEvents$ = new Subject<NavigationEnd>();
    const routerSpy = jasmine.createSpyObj('Router', ['navigate'], {
      events: routerEvents$.asObservable(),
      url: '/customers/organizations'
    });

    await TestBed.configureTestingModule({
      imports: [QuickActionsNavComponent, FontAwesomeModule],
      providers: [
        { provide: Router, useValue: routerSpy }
      ]
    }).compileComponents();

    // Add icons to library
    const library = TestBed.inject(FaIconLibrary);
    library.addIcons(faBuilding, faRocket, faUsers, faUser);

    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    fixture = TestBed.createComponent(QuickActionsNavComponent);
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

    it('should display organizations icon', () => {
      const orgItem = component.navItems.find(item => item.id === 'organizations');
      expect(orgItem).toBeTruthy();
      expect(orgItem?.icon).toBe('building');
    });

    it('should display applications icon', () => {
      const appItem = component.navItems.find(item => item.id === 'applications');
      expect(appItem).toBeTruthy();
      expect(appItem?.icon).toBe('rocket');
    });

    it('should display groups icon', () => {
      const groupsItem = component.navItems.find(item => item.id === 'groups');
      expect(groupsItem).toBeTruthy();
      expect(groupsItem?.icon).toBe('users');
    });

    it('should display users icon', () => {
      const usersItem = component.navItems.find(item => item.id === 'users');
      expect(usersItem).toBeTruthy();
      expect(usersItem?.icon).toBe('user');
    });
  });

  describe('navigation', () => {
    it('should navigate to organizations on organizations button click', () => {
      const orgItem = component.navItems.find(item => item.id === 'organizations');
      component.onItemClick(orgItem!);
      
      expect(router.navigate).toHaveBeenCalledWith(['/customers/organizations']);
    });

    it('should navigate to applications on applications button click', () => {
      const appItem = component.navItems.find(item => item.id === 'applications');
      component.onItemClick(appItem!);
      
      expect(router.navigate).toHaveBeenCalledWith(['/customers/applications']);
    });

    it('should not navigate when disabled item is clicked', () => {
      const disabledItem = { ...component.navItems[0], disabled: true };
      component.onItemClick(disabledItem);
      
      expect(router.navigate).not.toHaveBeenCalled();
    });
  });

  describe('tooltips', () => {
    it('should show tooltip on mouse enter', () => {
      const orgItem = component.navItems[0];
      component.onMouseEnter(orgItem);
      
      expect(component.hoveredItemId).toBe(orgItem.id);
      expect(component.isTooltipVisible(orgItem)).toBe(true);
    });

    it('should hide tooltip on mouse leave', () => {
      const orgItem = component.navItems[0];
      component.onMouseEnter(orgItem);
      component.onMouseLeave();
      
      expect(component.hoveredItemId).toBeNull();
      expect(component.isTooltipVisible(orgItem)).toBe(false);
    });

    it('should display correct tooltip text', () => {
      const orgItem = component.navItems.find(item => item.id === 'organizations');
      expect(orgItem?.tooltip).toBe('Organizations');
    });

    it('should only show tooltip for hovered item', () => {
      const orgItem = component.navItems[0];
      const appItem = component.navItems[1];
      
      component.onMouseEnter(orgItem);
      
      expect(component.isTooltipVisible(orgItem)).toBe(true);
      expect(component.isTooltipVisible(appItem)).toBe(false);
    });
  });

  describe('keyboard accessibility', () => {
    it('should trigger navigation on Enter key', () => {
      const orgItem = component.navItems[0];
      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      spyOn(event, 'preventDefault');
      
      component.onKeydown(event, orgItem);
      
      expect(event.preventDefault).toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith(['/customers/organizations']);
    });

    it('should trigger navigation on Space key', () => {
      const orgItem = component.navItems[0];
      const event = new KeyboardEvent('keydown', { key: ' ' });
      spyOn(event, 'preventDefault');
      
      component.onKeydown(event, orgItem);
      
      expect(event.preventDefault).toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalled();
    });

    it('should not trigger navigation on other keys', () => {
      const orgItem = component.navItems[0];
      const event = new KeyboardEvent('keydown', { key: 'Tab' });
      
      component.onKeydown(event, orgItem);
      
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
      expect(buttons[0].getAttribute('aria-label')).toBe('Organizations');
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
      const orgItem = component.navItems[0];
      
      component.onItemClick(orgItem);
      
      expect(component.itemClicked.emit).toHaveBeenCalledWith(orgItem);
    });

    it('should not emit itemClicked for disabled items', () => {
      spyOn(component.itemClicked, 'emit');
      const disabledItem = { ...component.navItems[0], disabled: true };
      
      component.onItemClick(disabledItem);
      
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

  describe('active state', () => {
    it('should mark current route as active', () => {
      expect(component.isActive(component.navItems[0])).toBe(true); // organizations is active
    });

    it('should not mark other routes as active', () => {
      expect(component.isActive(component.navItems[1])).toBe(false); // applications is not active
    });
  });
});
