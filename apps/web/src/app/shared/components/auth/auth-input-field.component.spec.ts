/**
 * Unit tests for AuthInputFieldComponent
 *
 * Feature: frontend-ui-consistency
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5
 *
 * Tests input states, validation states, and focus styling.
 */

import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { AuthInputFieldComponent, ValidationState, AuthInputVariant, AuthInputSize } from './auth-input-field.component';

describe('AuthInputFieldComponent', () => {
  let component: AuthInputFieldComponent;
  let fixture: ComponentFixture<AuthInputFieldComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuthInputFieldComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(AuthInputFieldComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Input Variants', () => {
    const variants: AuthInputVariant[] = ['default', 'outlined', 'filled'];

    variants.forEach(variant => {
      it(`should render ${variant} variant correctly`, () => {
        component.variant = variant;
        fixture.detectChanges();

        const container = fixture.debugElement.query(By.css('.auth-input'));
        expect(container.attributes['data-variant']).toBe(variant);
      });
    });

    it('should default to default variant', () => {
      const container = fixture.debugElement.query(By.css('.auth-input'));
      expect(container.attributes['data-variant']).toBe('default');
    });
  });

  describe('Input Sizes', () => {
    const sizes: AuthInputSize[] = ['small', 'medium', 'large'];

    sizes.forEach(size => {
      it(`should render ${size} size correctly`, () => {
        component.size = size;
        fixture.detectChanges();

        const container = fixture.debugElement.query(By.css('.auth-input'));
        expect(container.attributes['data-size']).toBe(size);
      });
    });

    it('should default to medium size', () => {
      const container = fixture.debugElement.query(By.css('.auth-input'));
      expect(container.attributes['data-size']).toBe('medium');
    });
  });

  describe('Validation States', () => {
    const states: ValidationState[] = ['none', 'pending', 'valid', 'invalid'];

    states.forEach(state => {
      it(`should apply ${state} validation state class`, () => {
        component.validationState = state;
        fixture.detectChanges();

        const classes = component.getInputClasses();
        if (state !== 'none') {
          expect(classes).toContain(`auth-input--${state}`);
        } else {
          expect(classes).not.toContain('auth-input--none');
        }
      });
    });

    it('should show valid icon when validation state is valid', () => {
      component.validationState = 'valid';
      component.showValidationIcon = true;
      fixture.detectChanges();

      const validIcon = fixture.debugElement.query(By.css('.auth-input__validation-icon--valid'));
      expect(validIcon).toBeTruthy();
    });

    it('should show invalid icon when validation state is invalid', () => {
      component.validationState = 'invalid';
      component.showValidationIcon = true;
      fixture.detectChanges();

      const invalidIcon = fixture.debugElement.query(By.css('.auth-input__validation-icon--invalid'));
      expect(invalidIcon).toBeTruthy();
    });

    it('should show pending spinner when validation state is pending', () => {
      component.validationState = 'pending';
      component.showValidationIcon = true;
      fixture.detectChanges();

      const pendingIcon = fixture.debugElement.query(By.css('.auth-input__validation-icon--pending'));
      expect(pendingIcon).toBeTruthy();
    });
  });

  describe('Error State', () => {
    it('should show error message when invalid with error message', () => {
      component.validationState = 'invalid';
      component.errorMessage = 'This field is required';
      fixture.detectChanges();

      const errorDiv = fixture.debugElement.query(By.css('.auth-input__error'));
      expect(errorDiv).toBeTruthy();
      expect(errorDiv.nativeElement.textContent).toContain('This field is required');
    });

    it('should not show error message when valid', () => {
      component.validationState = 'valid';
      component.errorMessage = 'This field is required';
      fixture.detectChanges();

      const errorDiv = fixture.debugElement.query(By.css('.auth-input__error'));
      expect(errorDiv).toBeFalsy();
    });

    it('should have role="alert" on error message', () => {
      component.validationState = 'invalid';
      component.errorMessage = 'Error';
      fixture.detectChanges();

      const errorDiv = fixture.debugElement.query(By.css('.auth-input__error'));
      expect(errorDiv.attributes['role']).toBe('alert');
    });
  });

  describe('Success State', () => {
    it('should show success message when valid with success message', () => {
      component.validationState = 'valid';
      component.successMessage = 'Looks good!';
      fixture.detectChanges();

      const successDiv = fixture.debugElement.query(By.css('.auth-input__success'));
      expect(successDiv).toBeTruthy();
      expect(successDiv.nativeElement.textContent).toContain('Looks good!');
    });
  });

  describe('Focus State', () => {
    it('should add focused class when input is focused', () => {
      component.onFocus();
      fixture.detectChanges();

      const classes = component.getInputClasses();
      expect(classes).toContain('auth-input--focused');
    });

    it('should remove focused class when input is blurred', () => {
      component.onFocus();
      component.onBlur();
      fixture.detectChanges();

      const classes = component.getInputClasses();
      expect(classes).not.toContain('auth-input--focused');
    });

    it('should emit focusChange on focus', () => {
      const focusSpy = spyOn(component.focusChange, 'emit');
      component.onFocus();

      expect(focusSpy).toHaveBeenCalledWith(true);
    });

    it('should emit focusChange on blur', () => {
      const focusSpy = spyOn(component.focusChange, 'emit');
      component.onBlur();

      expect(focusSpy).toHaveBeenCalledWith(false);
    });

    it('should add focused class to container when focused', () => {
      component.onFocus();
      fixture.detectChanges();

      const container = fixture.debugElement.query(By.css('.auth-input__container'));
      expect(container.classes['auth-input__container--focused']).toBe(true);
    });
  });

  describe('Disabled State', () => {
    it('should disable input when disabled is true', () => {
      component.disabled = true;
      fixture.detectChanges();

      const input = fixture.debugElement.query(By.css('input'));
      expect(input.nativeElement.disabled).toBe(true);
    });

    it('should add disabled class when disabled', () => {
      component.disabled = true;
      fixture.detectChanges();

      const classes = component.getInputClasses();
      expect(classes).toContain('auth-input--disabled');
    });
  });

  describe('Readonly State', () => {
    it('should make input readonly when readonly is true', () => {
      component.readonly = true;
      fixture.detectChanges();

      const input = fixture.debugElement.query(By.css('input'));
      expect(input.nativeElement.readOnly).toBe(true);
    });

    it('should add readonly class when readonly', () => {
      component.readonly = true;
      fixture.detectChanges();

      const classes = component.getInputClasses();
      expect(classes).toContain('auth-input--readonly');
    });
  });

  describe('Label', () => {
    it('should show label when provided', () => {
      component.label = 'Email Address';
      fixture.detectChanges();

      const label = fixture.debugElement.query(By.css('.auth-input__label'));
      expect(label).toBeTruthy();
      expect(label.nativeElement.textContent).toContain('Email Address');
    });

    it('should show required indicator when required', () => {
      component.label = 'Email';
      component.required = true;
      fixture.detectChanges();

      const required = fixture.debugElement.query(By.css('.auth-input__required'));
      expect(required).toBeTruthy();
    });
  });

  describe('Help Text', () => {
    it('should show help text when provided and no error', () => {
      component.helpText = 'Enter your email address';
      fixture.detectChanges();

      const helpDiv = fixture.debugElement.query(By.css('.auth-input__help'));
      expect(helpDiv).toBeTruthy();
      expect(helpDiv.nativeElement.textContent).toContain('Enter your email address');
    });

    it('should hide help text when showing error', () => {
      component.helpText = 'Enter your email address';
      component.validationState = 'invalid';
      component.errorMessage = 'Invalid email';
      fixture.detectChanges();

      const helpDiv = fixture.debugElement.query(By.css('.auth-input__help'));
      expect(helpDiv).toBeFalsy();
    });
  });

  describe('Password Toggle', () => {
    it('should show password toggle for password type', () => {
      component.type = 'password';
      fixture.detectChanges();

      const toggle = fixture.debugElement.query(By.css('.auth-input__toggle'));
      expect(toggle).toBeTruthy();
    });

    it('should toggle password visibility on click', () => {
      component.type = 'password';
      fixture.detectChanges();

      expect(component.passwordVisible).toBe(false);
      expect(component.inputType).toBe('password');

      component.togglePasswordVisibility();
      fixture.detectChanges();

      expect(component.passwordVisible).toBe(true);
      expect(component.inputType).toBe('text');
    });
  });

  describe('Icons', () => {
    it('should show leading icon when provided', () => {
      component.leadingIcon = 'envelope';
      fixture.detectChanges();

      const icon = fixture.debugElement.query(By.css('.auth-input__icon--leading'));
      expect(icon).toBeTruthy();
    });

    it('should show trailing icon when provided and no validation icon', () => {
      component.trailingIcon = 'search';
      component.showValidationIcon = false;
      fixture.detectChanges();

      const icon = fixture.debugElement.query(By.css('.auth-input__icon--trailing'));
      expect(icon).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have aria-invalid when validation state is invalid', () => {
      component.validationState = 'invalid';
      fixture.detectChanges();

      const input = fixture.debugElement.query(By.css('input'));
      expect(input.attributes['aria-invalid']).toBe('true');
    });

    it('should have aria-required when required', () => {
      component.required = true;
      fixture.detectChanges();

      const input = fixture.debugElement.query(By.css('input'));
      expect(input.attributes['aria-required']).toBe('true');
    });

    it('should have aria-describedby pointing to error when invalid', () => {
      component.validationState = 'invalid';
      component.errorMessage = 'Error';
      fixture.detectChanges();

      const describedBy = component.getAriaDescribedBy();
      expect(describedBy).toContain(component.errorId);
    });

    it('should have aria-describedby pointing to help text when valid', () => {
      component.helpText = 'Help text';
      fixture.detectChanges();

      const describedBy = component.getAriaDescribedBy();
      expect(describedBy).toContain(component.helpId);
    });
  });

  describe('Input Events', () => {
    it('should emit inputChange on input without debounce when realTimeValidation is false', () => {
      const inputSpy = spyOn(component.inputChange, 'emit');
      component.realTimeValidation = false;
      fixture.detectChanges();

      const input = fixture.debugElement.query(By.css('input'));
      input.nativeElement.value = 'test';
      input.nativeElement.dispatchEvent(new Event('input'));

      expect(inputSpy).toHaveBeenCalledWith('test');
    });

    it('should emit inputChange on input with debounce when realTimeValidation is true', fakeAsync(() => {
      // Need to reinitialize component to set up debounce subscription
      component.realTimeValidation = true;
      component.debounceTime = 100;
      component.ngOnInit();
      fixture.detectChanges();

      const inputSpy = spyOn(component.inputChange, 'emit');

      const input = fixture.debugElement.query(By.css('input'));
      input.nativeElement.value = 'test';
      input.nativeElement.dispatchEvent(new Event('input'));

      // Should not emit immediately
      expect(inputSpy).not.toHaveBeenCalled();

      tick(100);

      expect(inputSpy).toHaveBeenCalledWith('test');
    }));

    it('should emit enterPressed on Enter key', () => {
      const enterSpy = spyOn(component.enterPressed, 'emit');
      const event = new KeyboardEvent('keydown', { key: 'Enter' });

      component.onKeyDown(event);

      expect(enterSpy).toHaveBeenCalled();
    });
  });

  describe('ControlValueAccessor', () => {
    it('should write value correctly', () => {
      component.writeValue('test@example.com');
      expect(component.value).toBe('test@example.com');
    });

    it('should handle null value', () => {
      component.writeValue(null as unknown as string);
      expect(component.value).toBe('');
    });

    it('should call onChange when input changes', () => {
      const onChangeSpy = jasmine.createSpy('onChange');
      component.registerOnChange(onChangeSpy);

      const input = fixture.debugElement.query(By.css('input'));
      input.nativeElement.value = 'new value';
      input.nativeElement.dispatchEvent(new Event('input'));

      expect(onChangeSpy).toHaveBeenCalledWith('new value');
    });

    it('should call onTouched when input is blurred', () => {
      const onTouchedSpy = jasmine.createSpy('onTouched');
      component.registerOnTouched(onTouchedSpy);

      component.onBlur();

      expect(onTouchedSpy).toHaveBeenCalled();
    });

    it('should set disabled state', () => {
      component.setDisabledState(true);
      expect(component.disabled).toBe(true);

      component.setDisabledState(false);
      expect(component.disabled).toBe(false);
    });
  });
});
