import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { provideRouter, Router, ActivatedRoute } from '@angular/router';
import { ConfirmPhoneComponent } from './confirm-phone.component';
import { AuthService } from '../../../../core/services/auth.service';
import { BehaviorSubject } from 'rxjs';
import { ConfirmSignUpOutput } from 'aws-amplify/auth';

describe('ConfirmSignupComponent', () => {
  let component: ConfirmPhoneComponent;
  let fixture: ComponentFixture<ConfirmPhoneComponent>;
  let authService: jasmine.SpyObj<AuthService>;
  let router: Router;
  let activatedRoute: jasmine.SpyObj<ActivatedRoute>;

  const mockUsername = 'testuser@example.com';

  beforeEach(async () => {
    const authSpy = jasmine.createSpyObj('AuthService', [
      'confirmRegistration',
      'resendConfirmationCode'
    ]);

    const routeSpy = jasmine.createSpyObj('ActivatedRoute', [], {
      queryParams: new BehaviorSubject({ username: mockUsername })
    });

    await TestBed.configureTestingModule({
      declarations: [ ConfirmPhoneComponent ],
      imports: [
        ReactiveFormsModule
      ],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authSpy },
        { provide: ActivatedRoute, useValue: routeSpy }
      ]
    }).compileComponents();

    router = TestBed.inject(Router);
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    activatedRoute = TestBed.inject(ActivatedRoute) as jasmine.SpyObj<ActivatedRoute>;
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ConfirmPhoneComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with empty form and username from query params', () => {
    expect(component.confirmationForm.get('verificationCode')?.value).toBe('');
    expect(component.username).toBe(mockUsername);
  });

  it('should redirect to signup if no username in query params', fakeAsync(() => {
    const navigateSpy = spyOn(router, 'navigate');
    (activatedRoute.queryParams as BehaviorSubject<any>).next({});
    tick();
    expect(navigateSpy).toHaveBeenCalledWith(['/signup']);
  }));

  it('should validate verification code format', () => {
    const verificationControl = component.confirmationForm.get('verificationCode');

    verificationControl?.setValue('');
    expect(verificationControl?.errors?.['required']).toBeTruthy();

    verificationControl?.setValue('abc123');
    expect(verificationControl?.errors?.['pattern']).toBeTruthy();

    verificationControl?.setValue('12345');
    expect(verificationControl?.errors?.['pattern']).toBeTruthy();

    verificationControl?.setValue('123456');
    expect(verificationControl?.errors).toBeFalsy();
  });

  it('should handle successful confirmation', fakeAsync(async () => {
    const navigateSpy = spyOn(router, 'navigate');
    const mockConfirmResponse: ConfirmSignUpOutput = {
      isSignUpComplete: true,
      nextStep: {
        signUpStep: 'DONE'
      }
    };

    authService.confirmEmail.and.returnValue(Promise.resolve(mockConfirmResponse));

    component.confirmationForm.get('verificationCode')?.setValue('123456');
    await component.onSubmit();
    tick();

    expect(authService.confirmEmail).toHaveBeenCalledWith(
      mockUsername,
      '123456'
    );
    expect(navigateSpy).toHaveBeenCalledWith(['/signin']);
    expect(component.errorMessage).toBe('');
  }));

  it('should handle confirmation error', fakeAsync(async () => {
    const error = new Error('Invalid verification code');
    authService.confirmEmail.and.returnValue(Promise.reject(error));

    component.confirmationForm.get('verificationCode')?.setValue('123456');
    await component.onSubmit();
    tick();

    expect(component.errorMessage).toBe('Invalid verification code');
    expect(component.isLoading).toBeFalse();
  }));

  it('should handle resend code success', fakeAsync(async () => {
    const mockResendResponse = { CodeDeliveryDetails: { Destination: 'test@example.com' } };
    authService.resendConfirmationCode.and.returnValue(Promise.resolve(mockResendResponse));

    await component.resendCode();
    tick();

    expect(authService.resendConfirmationCode).toHaveBeenCalledWith(mockUsername);
    expect(component.resendDisabled).toBeTrue();
    expect(component.errorMessage).toBe('');
  }));

  it('should handle resend code error', fakeAsync(async () => {
    const error = new Error('Failed to resend code');
    authService.resendConfirmationCode.and.returnValue(Promise.reject(error));

    await component.resendCode();
    tick();

    expect(component.errorMessage).toBe('Failed to resend code');
    expect(component.resendDisabled).toBeFalse();
  }));

  it('should manage resend timer correctly', fakeAsync(() => {
    const mockResendResponse = { CodeDeliveryDetails: { Destination: 'test@example.com' } };
    authService.resendConfirmationCode.and.returnValue(Promise.resolve(mockResendResponse));

    component.resendCode();
    tick();

    expect(component.resendDisabled).toBeTrue();
    expect(component.resendCountdown).toBe(60);

    tick(30000);
    expect(component.resendCountdown).toBe(30);
    expect(component.resendDisabled).toBeTrue();

    tick(30000);
    expect(component.resendDisabled).toBeFalse();
  }));

  it('should cleanup timer on destroy', fakeAsync(() => {
    const mockResendResponse = { CodeDeliveryDetails: { Destination: 'test@example.com' } };
    authService.resendConfirmationCode.and.returnValue(Promise.resolve(mockResendResponse));

    component.resendCode();
    tick();

    expect(component.resendDisabled).toBeTrue();

    component.ngOnDestroy();

    tick(60000);
    expect(component.resendTimer).toBeDefined();
  }));

  it('should not submit if form is invalid', fakeAsync(async () => {
    component.confirmationForm.get('verificationCode')?.setValue('');
    await component.onSubmit();
    tick();

    expect(authService.confirmEmail).not.toHaveBeenCalled();
  }));

  it('should not submit if already loading', fakeAsync(async () => {
    component.isLoading = true;
    component.confirmationForm.get('verificationCode')?.setValue('123456');

    await component.onSubmit();
    tick();

    expect(authService.confirmEmail).not.toHaveBeenCalled();
  }));

  it('should not allow resend if disabled', fakeAsync(async () => {
    component.resendDisabled = true;

    await component.resendCode();
    tick();

    expect(authService.resendConfirmationCode).not.toHaveBeenCalled();
  }));
});
