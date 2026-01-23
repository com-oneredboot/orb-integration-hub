// file: apps/web/src/app/tests/form-validation-error-display.property.spec.ts
// author: Kiro
// date: 2026-01-23
// description: Property tests for form validation error display

import { TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder } from '@angular/forms';
import { FaIconLibrary, FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { of } from 'rxjs';
import { ProfileComponent } from '../features/user/components/profile/profile.component';
import { UserService } from '../core/services/user.service';
import { IUsers } from '../core/models/UsersModel';
import { UserStatus } from '../core/enums/UserStatusEnum';
import { UserGroup } from '../core/enums/UserGroupEnum';

/**
 * Property Test: Form Validation Error Display
 * Feature: profile-setup-refactor
 * Validates: Requirements 1.3
 * 
 * Properties:
 * 1. Invalid fields show errors when touched
 * 2. Valid fields do not show errors
 * 3. Error messages are consistent with validation rules
 */
describe('Property: Form Validation Error Display', () => {
  let component: ProfileComponent;
  let mockUserService: jasmine.SpyObj<UserService>;

  const createMockUser = (overrides: Partial<IUsers> = {}): IUsers => ({
    userId: '123',
    cognitoId: 'abc123',
    cognitoSub: 'cognito-sub-123',
    email: 'test@example.com',
    emailVerified: true,
    phoneNumber: '+12345678901',
    phoneVerified: true,
    firstName: 'Test',
    lastName: 'User',
    groups: [UserGroup.User],
    status: UserStatus.Active,
    mfaEnabled: false,
    mfaSetupComplete: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  });

  beforeEach(async () => {
    mockUserService = jasmine.createSpyObj('UserService', ['isUserValid', 'userUpdate', 'userQueryByUserId']);
    mockUserService.isUserValid.and.returnValue(true);

    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    const activatedRouteMock = { queryParams: of({}) };

    await TestBed.configureTestingModule({
      imports: [ProfileComponent, FontAwesomeModule],
      providers: [
        provideMockStore({ initialState: { user: { currentUser: createMockUser(), debugMode: false, isLoading: false, error: null } } }),
        { provide: UserService, useValue: mockUserService },
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: activatedRouteMock },
        FormBuilder
      ]
    }).compileComponents();

    const library = TestBed.inject(FaIconLibrary);
    library.addIconPacks(fas);

    const fixture = TestBed.createComponent(ProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  /**
   * Property: Empty required fields are invalid
   */
  describe('Required field validation', () => {
    const requiredFields = [
      { form: 'nameForm', field: 'firstName' },
      { form: 'nameForm', field: 'lastName' },
      { form: 'phoneForm', field: 'phoneNumber' },
      { form: 'verifyForm', field: 'verificationCode' }
    ];

    requiredFields.forEach(({ form, field }) => {
      it(`${form}.${field} is invalid when empty`, () => {
        const formGroup = component[form as keyof ProfileComponent] as ReturnType<FormBuilder['group']>;
        const control = formGroup.get(field);
        
        control?.setValue('');
        control?.markAsTouched();
        
        expect(control?.invalid).toBe(true);
        expect(control?.errors?.['required']).toBeTruthy();
      });
    });
  });

  /**
   * Property: Valid values pass validation
   */
  describe('Valid value acceptance', () => {
    const validValues = [
      { form: 'nameForm', field: 'firstName', value: 'John' },
      { form: 'nameForm', field: 'lastName', value: 'Doe' },
      { form: 'phoneForm', field: 'phoneNumber', value: '+12025550123' },
      { form: 'verifyForm', field: 'verificationCode', value: '123456' }
    ];

    validValues.forEach(({ form, field, value }) => {
      it(`${form}.${field} is valid with value "${value}"`, () => {
        const formGroup = component[form as keyof ProfileComponent] as ReturnType<FormBuilder['group']>;
        const control = formGroup.get(field);
        
        control?.setValue(value);
        
        expect(control?.valid).toBe(true);
      });
    });
  });

  /**
   * Property: Phone number validation follows E.164 format
   */
  describe('Phone number E.164 validation', () => {
    const invalidPhoneNumbers = [
      '1234567890',      // Missing +
      '+0123456789',     // Starts with 0 after +
      '12345',           // Too short, no +
      'abcdefghij',      // Non-numeric
      '+1234567890123456' // Too long (>15 digits)
    ];

    const validPhoneNumbers = [
      '+1',              // Minimum valid
      '+12025550123',    // US number
      '+447911123456',   // UK number
      '+81312345678',    // Japan number
      '+123456789012345' // Maximum 15 digits
    ];

    invalidPhoneNumbers.forEach(phone => {
      it(`rejects invalid phone number: "${phone}"`, () => {
        const control = component.phoneForm.get('phoneNumber');
        control?.setValue(phone);
        expect(control?.invalid).toBe(true);
      });
    });

    validPhoneNumbers.forEach(phone => {
      it(`accepts valid phone number: "${phone}"`, () => {
        const control = component.phoneForm.get('phoneNumber');
        control?.setValue(phone);
        expect(control?.valid).toBe(true);
      });
    });
  });

  /**
   * Property: Verification code must be exactly 6 digits
   */
  describe('Verification code validation', () => {
    const invalidCodes = [
      '12345',     // Too short
      '1234567',   // Too long
      'abcdef',    // Non-numeric
      '12345a',    // Mixed
      '12 345',    // Contains space
      ''           // Empty
    ];

    const validCodes = [
      '123456',
      '000000',
      '999999',
      '012345'
    ];

    invalidCodes.forEach(code => {
      it(`rejects invalid verification code: "${code}"`, () => {
        const control = component.verifyForm.get('verificationCode');
        control?.setValue(code);
        expect(control?.invalid).toBe(true);
      });
    });

    validCodes.forEach(code => {
      it(`accepts valid verification code: "${code}"`, () => {
        const control = component.verifyForm.get('verificationCode');
        control?.setValue(code);
        expect(control?.valid).toBe(true);
      });
    });
  });

  /**
   * Property: Name fields require minimum length
   */
  describe('Name minimum length validation', () => {
    const shortNames = ['A', 'B', 'X'];
    const validNames = ['AB', 'Jo', 'Al', 'John', 'Alexander'];

    shortNames.forEach(name => {
      it(`rejects short firstName: "${name}"`, () => {
        const control = component.nameForm.get('firstName');
        control?.setValue(name);
        expect(control?.invalid).toBe(true);
        expect(control?.errors?.['minlength']).toBeTruthy();
      });

      it(`rejects short lastName: "${name}"`, () => {
        const control = component.nameForm.get('lastName');
        control?.setValue(name);
        expect(control?.invalid).toBe(true);
        expect(control?.errors?.['minlength']).toBeTruthy();
      });
    });

    validNames.forEach(name => {
      it(`accepts valid firstName: "${name}"`, () => {
        const control = component.nameForm.get('firstName');
        control?.setValue(name);
        expect(control?.valid).toBe(true);
      });

      it(`accepts valid lastName: "${name}"`, () => {
        const control = component.nameForm.get('lastName');
        control?.setValue(name);
        expect(control?.valid).toBe(true);
      });
    });
  });

  /**
   * Property: Form validity reflects all field validities
   */
  describe('Form-level validity', () => {
    it('nameForm is valid only when both fields are valid', () => {
      component.nameForm.patchValue({ firstName: 'John', lastName: 'Doe' });
      expect(component.nameForm.valid).toBe(true);
      
      component.nameForm.patchValue({ firstName: '', lastName: 'Doe' });
      expect(component.nameForm.valid).toBe(false);
      
      component.nameForm.patchValue({ firstName: 'John', lastName: '' });
      expect(component.nameForm.valid).toBe(false);
    });

    it('phoneForm is valid only when phoneNumber is valid', () => {
      component.phoneForm.patchValue({ phoneNumber: '+12025550123' });
      expect(component.phoneForm.valid).toBe(true);
      
      component.phoneForm.patchValue({ phoneNumber: '' });
      expect(component.phoneForm.valid).toBe(false);
    });

    it('verifyForm is valid only when verificationCode is valid', () => {
      component.verifyForm.patchValue({ verificationCode: '123456' });
      expect(component.verifyForm.valid).toBe(true);
      
      component.verifyForm.patchValue({ verificationCode: '' });
      expect(component.verifyForm.valid).toBe(false);
    });
  });
});
