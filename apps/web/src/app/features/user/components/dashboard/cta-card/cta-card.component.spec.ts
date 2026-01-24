// file: apps/web/src/app/features/user/components/dashboard/cta-card/cta-card.component.spec.ts
// author: Kiro
// date: 2026-01-23
// description: Unit tests for CtaCardComponent

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { CtaCardComponent } from './cta-card.component';
import { CtaCard } from '../dashboard.types';
import { FontAwesomeModule, FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { 
  faUser, 
  faArrowRight, 
  faBuilding, 
  faEnvelope,
  faShieldAlt,
  faPhone
} from '@fortawesome/free-solid-svg-icons';

describe('CtaCardComponent', () => {
  let component: CtaCardComponent;
  let fixture: ComponentFixture<CtaCardComponent>;
  let router: jasmine.SpyObj<Router>;

  const createTestCard = (overrides: Partial<CtaCard> = {}): CtaCard => ({
    id: 'test-card',
    icon: 'user',
    title: 'Test Card Title',
    description: 'Test card description text',
    actionLabel: 'Take Action',
    actionRoute: '/test-route',
    priority: 10,
    category: 'health',
    ...overrides
  });

  beforeEach(async () => {
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [CtaCardComponent, FontAwesomeModule],
      providers: [
        { provide: Router, useValue: routerSpy }
      ]
    }).compileComponents();

    // Add icons to library
    const library = TestBed.inject(FaIconLibrary);
    library.addIcons(faUser, faArrowRight, faBuilding, faEnvelope, faShieldAlt, faPhone);

    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    fixture = TestBed.createComponent(CtaCardComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    component.card = createTestCard();
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('rendering', () => {
    it('should display the card title', () => {
      component.card = createTestCard({ title: 'My Custom Title' });
      fixture.detectChanges();
      
      const titleEl = fixture.nativeElement.querySelector('.orb-cta-card__title');
      expect(titleEl.textContent).toContain('My Custom Title');
    });

    it('should display the card description', () => {
      component.card = createTestCard({ description: 'My custom description' });
      fixture.detectChanges();
      
      const descEl = fixture.nativeElement.querySelector('.orb-cta-card__description');
      expect(descEl.textContent).toContain('My custom description');
    });

    it('should display the action button with correct label', () => {
      component.card = createTestCard({ actionLabel: 'Click Me' });
      fixture.detectChanges();
      
      const buttonEl = fixture.nativeElement.querySelector('.orb-btn');
      expect(buttonEl.textContent).toContain('Click Me');
    });

    it('should display the icon', () => {
      component.card = createTestCard({ icon: 'user' });
      fixture.detectChanges();
      
      const iconEl = fixture.nativeElement.querySelector('.orb-cta-card__icon');
      expect(iconEl).toBeTruthy();
    });

    it('should apply health category class', () => {
      component.card = createTestCard({ category: 'health' });
      fixture.detectChanges();
      
      const cardEl = fixture.nativeElement.querySelector('.orb-cta-card');
      expect(cardEl.classList.contains('orb-cta-card--health')).toBe(true);
    });

    it('should apply benefit category class', () => {
      component.card = createTestCard({ category: 'benefit' });
      fixture.detectChanges();
      
      const cardEl = fixture.nativeElement.querySelector('.orb-cta-card');
      expect(cardEl.classList.contains('orb-cta-card--benefit')).toBe(true);
    });

    it('should apply action category class', () => {
      component.card = createTestCard({ category: 'action' });
      fixture.detectChanges();
      
      const cardEl = fixture.nativeElement.querySelector('.orb-cta-card');
      expect(cardEl.classList.contains('orb-cta-card--action')).toBe(true);
    });
  });

  describe('navigation', () => {
    it('should navigate to actionRoute on button click', () => {
      component.card = createTestCard({ actionRoute: '/my-route' });
      fixture.detectChanges();
      
      const buttonEl = fixture.nativeElement.querySelector('.orb-btn');
      buttonEl.click();
      
      expect(router.navigate).toHaveBeenCalledWith(['/my-route']);
    });

    it('should navigate with query params when provided', () => {
      component.card = createTestCard({ 
        actionRoute: '/my-route',
        actionQueryParams: { mode: 'setup', step: '1' }
      });
      fixture.detectChanges();
      
      const buttonEl = fixture.nativeElement.querySelector('.orb-btn');
      buttonEl.click();
      
      expect(router.navigate).toHaveBeenCalledWith(['/my-route'], {
        queryParams: { mode: 'setup', step: '1' }
      });
    });

    it('should call actionHandler when provided', () => {
      const handlerSpy = jasmine.createSpy('actionHandler');
      component.card = createTestCard({ 
        actionHandler: handlerSpy,
        actionRoute: undefined
      });
      fixture.detectChanges();
      
      const buttonEl = fixture.nativeElement.querySelector('.orb-btn');
      buttonEl.click();
      
      expect(handlerSpy).toHaveBeenCalled();
    });

    it('should prefer actionHandler over actionRoute', () => {
      const handlerSpy = jasmine.createSpy('actionHandler');
      component.card = createTestCard({ 
        actionHandler: handlerSpy,
        actionRoute: '/should-not-navigate'
      });
      fixture.detectChanges();
      
      const buttonEl = fixture.nativeElement.querySelector('.orb-btn');
      buttonEl.click();
      
      expect(handlerSpy).toHaveBeenCalled();
      expect(router.navigate).not.toHaveBeenCalled();
    });
  });

  describe('events', () => {
    it('should emit actionTriggered event on button click', () => {
      const card = createTestCard();
      component.card = card;
      fixture.detectChanges();
      
      spyOn(component.actionTriggered, 'emit');
      
      const buttonEl = fixture.nativeElement.querySelector('.orb-btn');
      buttonEl.click();
      
      expect(component.actionTriggered.emit).toHaveBeenCalledWith(card);
    });
  });

  describe('keyboard accessibility', () => {
    it('should trigger action on Enter key', () => {
      component.card = createTestCard({ actionRoute: '/test' });
      fixture.detectChanges();
      
      const buttonEl = fixture.nativeElement.querySelector('.orb-btn');
      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      buttonEl.dispatchEvent(event);
      
      // Button click is handled by browser for Enter key on buttons
      // We test the onKeydown method directly
      component.onKeydown(new KeyboardEvent('keydown', { key: 'Enter' }));
      expect(router.navigate).toHaveBeenCalled();
    });

    it('should trigger action on Space key', () => {
      component.card = createTestCard({ actionRoute: '/test' });
      fixture.detectChanges();
      
      component.onKeydown(new KeyboardEvent('keydown', { key: ' ' }));
      expect(router.navigate).toHaveBeenCalled();
    });

    it('should not trigger action on other keys', () => {
      component.card = createTestCard({ actionRoute: '/test' });
      fixture.detectChanges();
      
      component.onKeydown(new KeyboardEvent('keydown', { key: 'Tab' }));
      expect(router.navigate).not.toHaveBeenCalled();
    });
  });

  describe('accessibility attributes', () => {
    it('should have article role', () => {
      component.card = createTestCard();
      fixture.detectChanges();
      
      const cardEl = fixture.nativeElement.querySelector('.orb-cta-card');
      expect(cardEl.getAttribute('role')).toBe('article');
    });

    it('should have aria-labelledby pointing to title', () => {
      component.card = createTestCard({ id: 'my-card' });
      fixture.detectChanges();
      
      const cardEl = fixture.nativeElement.querySelector('.orb-cta-card');
      const titleEl = fixture.nativeElement.querySelector('.orb-cta-card__title');
      
      expect(cardEl.getAttribute('aria-labelledby')).toBe('cta-title-my-card');
      expect(titleEl.id).toBe('cta-title-my-card');
    });

    it('should have aria-label on action button', () => {
      component.card = createTestCard({ 
        actionLabel: 'Click Me',
        title: 'Card Title'
      });
      fixture.detectChanges();
      
      const buttonEl = fixture.nativeElement.querySelector('.orb-btn');
      expect(buttonEl.getAttribute('aria-label')).toBe('Click Me - Card Title');
    });

    it('should hide decorative icons from screen readers', () => {
      component.card = createTestCard();
      fixture.detectChanges();
      
      const iconEl = fixture.nativeElement.querySelector('.orb-cta-card__icon');
      expect(iconEl.getAttribute('aria-hidden')).toBe('true');
    });
  });

  describe('getCategoryClass', () => {
    it('should return correct class for health category', () => {
      component.card = createTestCard({ category: 'health' });
      expect(component.getCategoryClass()).toBe('orb-cta-card--health');
    });

    it('should return correct class for benefit category', () => {
      component.card = createTestCard({ category: 'benefit' });
      expect(component.getCategoryClass()).toBe('orb-cta-card--benefit');
    });

    it('should return correct class for action category', () => {
      component.card = createTestCard({ category: 'action' });
      expect(component.getCategoryClass()).toBe('orb-cta-card--action');
    });
  });
});
