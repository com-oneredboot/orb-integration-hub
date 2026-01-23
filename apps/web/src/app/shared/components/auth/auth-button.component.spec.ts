/**
 * Unit tests for AuthButtonComponent
 *
 * Feature: frontend-ui-consistency
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5
 *
 * Tests button variants, loading states, and disabled states.
 */

import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { AuthButtonComponent, AuthButtonVariant, AuthButtonSize } from './auth-button.component';

describe('AuthButtonComponent', () => {
  let component: AuthButtonComponent;
  let fixture: ComponentFixture<AuthButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuthButtonComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(AuthButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Button Variants', () => {
    const variants: AuthButtonVariant[] = ['primary', 'secondary', 'outline', 'ghost', 'danger', 'success'];

    variants.forEach(variant => {
      it(`should render ${variant} variant correctly`, () => {
        component.variant = variant;
        fixture.detectChanges();

        const button = fixture.debugElement.query(By.css('button'));
        expect(button.attributes['data-variant']).toBe(variant);
      });
    });

    it('should default to primary variant', () => {
      const button = fixture.debugElement.query(By.css('button'));
      expect(button.attributes['data-variant']).toBe('primary');
    });
  });

  describe('Button Sizes', () => {
    const sizes: AuthButtonSize[] = ['small', 'medium', 'large'];

    sizes.forEach(size => {
      it(`should render ${size} size correctly`, () => {
        component.size = size;
        fixture.detectChanges();

        const button = fixture.debugElement.query(By.css('button'));
        expect(button.attributes['data-size']).toBe(size);
      });
    });

    it('should default to medium size', () => {
      const button = fixture.debugElement.query(By.css('button'));
      expect(button.attributes['data-size']).toBe('medium');
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner when loading is true', () => {
      component.loading = true;
      fixture.detectChanges();

      const spinner = fixture.debugElement.query(By.css('.auth-button__spinner'));
      expect(spinner).toBeTruthy();
    });

    it('should not show loading spinner when loading is false', () => {
      component.loading = false;
      fixture.detectChanges();

      const spinner = fixture.debugElement.query(By.css('.auth-button__spinner'));
      expect(spinner).toBeFalsy();
    });

    it('should add loading class when loading', () => {
      component.loading = true;
      fixture.detectChanges();

      const classes = component.getButtonClasses();
      expect(classes).toContain('auth-button--loading');
    });

    it('should disable button when loading', () => {
      component.loading = true;
      fixture.detectChanges();

      const button = fixture.debugElement.query(By.css('button'));
      expect(button.nativeElement.disabled).toBe(true);
    });

    it('should hide text when loading and hideTextOnLoading is true', () => {
      component.loading = true;
      component.hideTextOnLoading = true;
      fixture.detectChanges();

      const textSpan = fixture.debugElement.query(By.css('.auth-button__text'));
      expect(textSpan.classes['auth-button__text--hidden']).toBe(true);
    });
  });

  describe('Disabled State', () => {
    it('should disable button when disabled is true', () => {
      component.disabled = true;
      fixture.detectChanges();

      const button = fixture.debugElement.query(By.css('button'));
      expect(button.nativeElement.disabled).toBe(true);
    });

    it('should add disabled class when disabled', () => {
      component.disabled = true;
      fixture.detectChanges();

      const classes = component.getButtonClasses();
      expect(classes).toContain('auth-button--disabled');
    });

    it('should not emit click event when disabled', () => {
      component.disabled = true;
      fixture.detectChanges();

      const clickSpy = spyOn(component.buttonClick, 'emit');
      const button = fixture.debugElement.query(By.css('button'));
      button.nativeElement.click();

      expect(clickSpy).not.toHaveBeenCalled();
    });
  });

  describe('Full Width', () => {
    it('should add full-width class when fullWidth is true', () => {
      component.fullWidth = true;
      fixture.detectChanges();

      const classes = component.getButtonClasses();
      expect(classes).toContain('auth-button--full-width');
    });
  });

  describe('Icons', () => {
    it('should show leading icon when provided', () => {
      component.leadingIcon = 'arrow-left';
      fixture.detectChanges();

      const icon = fixture.debugElement.query(By.css('.auth-button__icon--leading'));
      expect(icon).toBeTruthy();
    });

    it('should show trailing icon when provided', () => {
      component.trailingIcon = 'arrow-right';
      fixture.detectChanges();

      const icon = fixture.debugElement.query(By.css('.auth-button__icon--trailing'));
      expect(icon).toBeTruthy();
    });

    it('should hide icons when loading', () => {
      component.leadingIcon = 'arrow-left';
      component.loading = true;
      fixture.detectChanges();

      const icon = fixture.debugElement.query(By.css('.auth-button__icon--leading'));
      expect(icon).toBeFalsy();
    });
  });

  describe('Success State', () => {
    it('should show success overlay when showSuccessState is true', () => {
      component.showSuccessState = true;
      fixture.detectChanges();

      const overlay = fixture.debugElement.query(By.css('.auth-button__success-overlay'));
      expect(overlay).toBeTruthy();
    });

    it('should add success class when in success state', () => {
      component.showSuccessState = true;
      fixture.detectChanges();

      const classes = component.getButtonClasses();
      expect(classes).toContain('auth-button--success');
    });

    it('should show success message when provided', () => {
      component.showSuccessState = true;
      component.successMessage = 'Done!';
      fixture.detectChanges();

      const message = fixture.debugElement.query(By.css('.auth-button__success-text'));
      expect(message.nativeElement.textContent).toBe('Done!');
    });

    it('should auto-hide success state after duration', fakeAsync(() => {
      component.successDuration = 1000;
      component.showSuccess('Success!');
      fixture.detectChanges();

      expect(component.showSuccessState).toBe(true);

      tick(1000);
      fixture.detectChanges();

      expect(component.showSuccessState).toBe(false);
    }));
  });

  describe('Progress Indicator', () => {
    it('should show progress bar when showProgress is true and progress > 0', () => {
      component.showProgress = true;
      component.progress = 50;
      fixture.detectChanges();

      const progressBar = fixture.debugElement.query(By.css('.auth-button__progress'));
      expect(progressBar).toBeTruthy();
    });

    it('should set progress width correctly', () => {
      component.showProgress = true;
      component.progress = 75;
      fixture.detectChanges();

      const progressBar = fixture.debugElement.query(By.css('.auth-button__progress'));
      expect(progressBar.styles['width']).toBe('75%');
    });

    it('should clamp progress between 0 and 100', () => {
      component.setProgress(150);
      expect(component.progress).toBe(100);

      component.setProgress(-50);
      expect(component.progress).toBe(0);
    });
  });

  describe('Accessibility', () => {
    it('should have aria-label when provided', () => {
      component.ariaLabel = 'Submit form';
      fixture.detectChanges();

      const button = fixture.debugElement.query(By.css('button'));
      expect(button.attributes['aria-label']).toBe('Submit form');
    });

    it('should use buttonText as aria-label fallback', () => {
      component.buttonText = 'Click me';
      fixture.detectChanges();

      const button = fixture.debugElement.query(By.css('button'));
      expect(button.attributes['aria-label']).toBe('Click me');
    });

    it('should have aria-describedby when provided', () => {
      component.ariaDescribedBy = 'help-text';
      fixture.detectChanges();

      const button = fixture.debugElement.query(By.css('button'));
      expect(button.attributes['aria-describedby']).toBe('help-text');
    });
  });

  describe('Click Events', () => {
    it('should emit buttonClick on click', () => {
      const clickSpy = spyOn(component.buttonClick, 'emit');
      const button = fixture.debugElement.query(By.css('button'));

      button.nativeElement.click();

      expect(clickSpy).toHaveBeenCalled();
    });

    it('should not emit buttonClick when loading', () => {
      component.loading = true;
      fixture.detectChanges();

      const clickSpy = spyOn(component.buttonClick, 'emit');
      const button = fixture.debugElement.query(By.css('button'));

      button.nativeElement.click();

      expect(clickSpy).not.toHaveBeenCalled();
    });
  });

  describe('Focus Events', () => {
    it('should emit focusChange on focus', () => {
      const focusSpy = spyOn(component.focusChange, 'emit');
      const button = fixture.debugElement.query(By.css('button'));

      button.nativeElement.dispatchEvent(new Event('focus'));

      expect(focusSpy).toHaveBeenCalledWith(true);
    });

    it('should emit focusChange on blur', () => {
      const focusSpy = spyOn(component.focusChange, 'emit');
      const button = fixture.debugElement.query(By.css('button'));

      button.nativeElement.dispatchEvent(new Event('blur'));

      expect(focusSpy).toHaveBeenCalledWith(false);
    });

    it('should add focused class when focused', () => {
      component.onFocus();
      fixture.detectChanges();

      const classes = component.getButtonClasses();
      expect(classes).toContain('auth-button--focused');
    });
  });
});
