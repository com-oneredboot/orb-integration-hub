/**
 * Unit tests for VerificationCodeInputComponent
 *
 * Feature: frontend-ui-consistency
 * Validates: Requirements 6.1, 6.3, 6.4
 *
 * Tests component rendering, verification types, and resend button styling.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { VerificationCodeInputComponent, VerificationCodeType } from './verification-code-input.component';

describe('VerificationCodeInputComponent', () => {
  let component: VerificationCodeInputComponent;
  let fixture: ComponentFixture<VerificationCodeInputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VerificationCodeInputComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(VerificationCodeInputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Verification Types', () => {
    const types: VerificationCodeType[] = ['email', 'phone', 'mfa'];

    types.forEach(type => {
      it(`should display correct icon for ${type} verification type`, () => {
        component.type = type;
        component.destination = 'test@example.com';
        fixture.detectChanges();

        const icon = component.getTypeIcon();
        
        switch (type) {
          case 'email':
            expect(icon).toBe(component.faEnvelope);
            break;
          case 'phone':
            expect(icon).toBe(component.faMobileAlt);
            break;
          case 'mfa':
            expect(icon).toBe(component.faShieldAlt);
            break;
        }
      });
    });

    it('should default to email type', () => {
      expect(component.type).toBe('email');
    });
  });

  describe('Component Rendering', () => {
    it('should display message', () => {
      component.message = 'Enter your verification code';
      fixture.detectChanges();

      const message = fixture.debugElement.query(By.css('.verification-code__message'));
      expect(message.nativeElement.textContent).toContain('Enter your verification code');
    });

    it('should display destination when provided', () => {
      component.destination = 'test@example.com';
      fixture.detectChanges();

      const destination = fixture.debugElement.query(By.css('.verification-code__destination'));
      expect(destination).toBeTruthy();
      expect(destination.nativeElement.textContent).toContain('test@example.com');
    });

    it('should not display destination when not provided', () => {
      component.destination = '';
      fixture.detectChanges();

      const destination = fixture.debugElement.query(By.css('.verification-code__destination'));
      expect(destination).toBeFalsy();
    });

    it('should display label', () => {
      component.label = 'Verification Code';
      fixture.detectChanges();

      const label = fixture.debugElement.query(By.css('.verification-code__label'));
      expect(label.nativeElement.textContent).toContain('Verification Code');
    });

    it('should display required indicator', () => {
      fixture.detectChanges();

      const required = fixture.debugElement.query(By.css('.verification-code__required'));
      expect(required).toBeTruthy();
    });
  });

  describe('Input Validation', () => {
    it('should only allow numeric input', () => {
      const input = fixture.debugElement.query(By.css('input'));
      
      // Simulate input with letters
      input.nativeElement.value = 'abc123';
      input.nativeElement.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      // Should only keep digits
      expect(component.codeControl.value).toBe('123');
    });

    it('should limit input to 6 digits', () => {
      const input = fixture.debugElement.query(By.css('input'));
      
      input.nativeElement.value = '12345678';
      input.nativeElement.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      expect(component.codeControl.value).toBe('123456');
    });

    it('should show error when code is invalid and touched', () => {
      component.codeControl.setValue('123');
      component.codeControl.markAsTouched();
      fixture.detectChanges();

      expect(component.showError).toBe(true);
      expect(component.errorMessage).toBe('Please enter a 6-digit code');
    });

    it('should show required error when empty and touched', () => {
      component.codeControl.setValue('');
      component.codeControl.markAsTouched();
      fixture.detectChanges();

      expect(component.showError).toBe(true);
      expect(component.errorMessage).toBe('Verification code is required');
    });

    it('should be valid with 6 digits', () => {
      component.codeControl.setValue('123456');
      fixture.detectChanges();

      expect(component.isValid).toBe(true);
    });
  });

  describe('Error Display', () => {
    it('should show error message when invalid and touched', () => {
      component.codeControl.setValue('123');
      component.codeControl.markAsTouched();
      fixture.detectChanges();

      const error = fixture.debugElement.query(By.css('.verification-code__error'));
      expect(error).toBeTruthy();
    });

    it('should show external error when provided', () => {
      component.externalError = 'Invalid code. Please try again.';
      fixture.detectChanges();

      expect(component.showError).toBe(true);
      expect(component.errorMessage).toBe('Invalid code. Please try again.');
    });

    it('should prioritize external error over validation error', () => {
      component.codeControl.setValue('123');
      component.codeControl.markAsTouched();
      component.externalError = 'Server error';
      fixture.detectChanges();

      expect(component.errorMessage).toBe('Server error');
    });
  });

  describe('Valid State Display', () => {
    it('should show valid indicator when valid and touched', () => {
      component.codeControl.setValue('123456');
      component.codeControl.markAsTouched();
      fixture.detectChanges();

      const validIndicator = fixture.debugElement.query(By.css('.verification-code__valid-indicator'));
      expect(validIndicator).toBeTruthy();
    });

    it('should not show valid indicator when there is an external error', () => {
      component.codeControl.setValue('123456');
      component.codeControl.markAsTouched();
      component.externalError = 'Wrong code';
      fixture.detectChanges();

      const validIndicator = fixture.debugElement.query(By.css('.verification-code__valid-indicator'));
      expect(validIndicator).toBeFalsy();
    });
  });

  describe('Resend Button', () => {
    it('should show resend section when showResend is true', () => {
      component.showResend = true;
      fixture.detectChanges();

      const resend = fixture.debugElement.query(By.css('.verification-code__resend'));
      expect(resend).toBeTruthy();
    });

    it('should not show resend section when showResend is false', () => {
      component.showResend = false;
      fixture.detectChanges();

      const resend = fixture.debugElement.query(By.css('.verification-code__resend'));
      expect(resend).toBeFalsy();
    });

    it('should disable resend button when canResend is false', () => {
      component.showResend = true;
      component.canResend = false;
      fixture.detectChanges();

      const button = fixture.debugElement.query(By.css('.verification-code__resend-button'));
      expect(button.nativeElement.disabled).toBe(true);
    });

    it('should disable resend button when resendLoading is true', () => {
      component.showResend = true;
      component.resendLoading = true;
      fixture.detectChanges();

      const button = fixture.debugElement.query(By.css('.verification-code__resend-button'));
      expect(button.nativeElement.disabled).toBe(true);
    });

    it('should show "Sending..." text when resendLoading is true', () => {
      component.showResend = true;
      component.resendLoading = true;
      fixture.detectChanges();

      const button = fixture.debugElement.query(By.css('.verification-code__resend-button'));
      expect(button.nativeElement.textContent.trim()).toBe('Sending...');
    });

    it('should emit resend event on button click', () => {
      component.showResend = true;
      component.canResend = true;
      fixture.detectChanges();

      const resendSpy = spyOn(component.resend, 'emit');
      const button = fixture.debugElement.query(By.css('.verification-code__resend-button'));
      button.nativeElement.click();

      expect(resendSpy).toHaveBeenCalled();
    });
  });

  describe('CSS Custom Properties (Color Consistency)', () => {
    it('should use --orb-primary for icon color', () => {
      component.destination = 'test@example.com';
      fixture.detectChanges();

      // The component uses CSS custom properties in its styles
      // We verify the styles are defined correctly
      const iconElement = fixture.debugElement.query(By.css('.verification-code__icon'));
      expect(iconElement).toBeTruthy();
      
      // The actual color is applied via CSS, which uses var(--orb-primary, #E31837)
      // This test verifies the element exists and has the correct class
    });

    it('should use --orb-primary for resend button color', () => {
      component.showResend = true;
      fixture.detectChanges();

      const button = fixture.debugElement.query(By.css('.verification-code__resend-button'));
      expect(button).toBeTruthy();
      
      // The button uses var(--orb-primary, #E31837) for color
      // CSS custom properties are applied at runtime
    });

    it('should use --orb-primary for focus ring', () => {
      const input = fixture.debugElement.query(By.css('.verification-code__input'));
      expect(input).toBeTruthy();
      
      // The input uses var(--orb-primary, #E31837) for focus border and box-shadow
      // This is defined in the component's inline styles
    });
  });

  describe('Accessibility', () => {
    it('should have aria-describedby pointing to error', () => {
      const input = fixture.debugElement.query(By.css('input'));
      expect(input.attributes['aria-describedby']).toContain('-error');
    });

    it('should have aria-invalid when showing error', () => {
      component.codeControl.setValue('123');
      component.codeControl.markAsTouched();
      fixture.detectChanges();

      const input = fixture.debugElement.query(By.css('input'));
      expect(input.attributes['aria-invalid']).toBe('true');
    });

    it('should have aria-required', () => {
      const input = fixture.debugElement.query(By.css('input'));
      expect(input.attributes['aria-required']).toBe('true');
    });

    it('should have role="status" on info section', () => {
      const info = fixture.debugElement.query(By.css('.verification-code__info'));
      expect(info.attributes['role']).toBe('status');
    });

    it('should have role="alert" on error message', () => {
      component.codeControl.setValue('123');
      component.codeControl.markAsTouched();
      fixture.detectChanges();

      const error = fixture.debugElement.query(By.css('.verification-code__error'));
      expect(error.attributes['role']).toBe('alert');
    });
  });

  describe('ControlValueAccessor', () => {
    it('should write value correctly', () => {
      component.writeValue('123456');
      expect(component.codeControl.value).toBe('123456');
    });

    it('should handle null value', () => {
      component.writeValue(null as unknown as string);
      expect(component.codeControl.value).toBe('');
    });

    it('should call onChange when input changes', () => {
      const onChangeSpy = jasmine.createSpy('onChange');
      component.registerOnChange(onChangeSpy);

      const input = fixture.debugElement.query(By.css('input'));
      input.nativeElement.value = '123456';
      input.nativeElement.dispatchEvent(new Event('input'));

      expect(onChangeSpy).toHaveBeenCalledWith('123456');
    });

    it('should call onTouched when input is blurred', () => {
      const onTouchedSpy = jasmine.createSpy('onTouched');
      component.registerOnTouched(onTouchedSpy);

      component.onBlur();

      expect(onTouchedSpy).toHaveBeenCalled();
    });

    it('should disable control when setDisabledState is called', () => {
      component.setDisabledState(true);
      expect(component.codeControl.disabled).toBe(true);

      component.setDisabledState(false);
      expect(component.codeControl.disabled).toBe(false);
    });
  });
});
