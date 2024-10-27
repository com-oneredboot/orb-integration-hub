// confirm-signup.component.spec.ts
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { ConfirmSignupComponent } from './confirm-signup.component';
import { AuthService } from '../../services/auth.service';

describe('ConfirmSignupComponent', () => {
  let component: ConfirmSignupComponent;
  let fixture: ComponentFixture<ConfirmSignupComponent>;
  let authService: jasmine.SpyObj<AuthService>;
  let router: Router;

  beforeEach(async () => {
    const authSpy = jasmine.createSpyObj('AuthService', [
      'confirmRegistration',
      'resendConfirmationCode',
      'isAuthenticated$'
    ]);
    authSpy.isAuthenticated$.and.returnValue(of(false));

    await TestBed.configureTestingModule({
      declarations: [ ConfirmSignupComponent ],
      imports: [
        ReactiveFormsModule
      ],
      providers: [
        { provide: AuthService, useValue: authSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParams: of({ username: 'test@example.com' })
          }
        }
      ]
    }).compileComponents();

    router = TestBed.inject(Router);
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ConfirmSignupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with empty form and username from query params', () => {
    expect(component.confirmForm.get('code')?.value).toBe('');
    expect(component.username).toBe('test@example.com');
  });

  it('should redirect to signup if no username provided', fakeAsync(() => {
    const navigateSpy = spyOn(router, 'navigate');
    TestBed.inject(ActivatedRoute).queryParams = of({});
    component.ngOnInit();
    tick();
    expect(navigateSpy).toHaveBeenCalledWith(['/signup']);
  }));

  // it('should handle successful confirmation', fakeAsync(async () => {
  //   const navigateSpy = spyOn(router, 'navigate');
  //   authService.confirmRegistration.and.returnValue(Promise.resolve());
  //
  //   component.confirmForm.setValue({ code: '123456' });
  //   await component.onSubmit();
  //   tick();
  //
  //   expect(authService.confirmRegistration).toHaveBeenCalledWith(
  //     'test@example.com',
  //     '123456'
  //   );
  //   expect(navigateSpy).toHaveBeenCalledWith(['/signin']);
  // }));

  it('should handle confirmation error', fakeAsync(async () => {
    authService.confirmRegistration.and.returnValue(
      Promise.reject({
        code: 'CodeMismatchException',
        message: 'Invalid verification code'
      })
    );

    component.confirmForm.setValue({ code: '123456' });
    await component.onSubmit();
    tick();

    expect(component.errorMessage).toBe('Invalid verification code. Please try again.');
  }));

  it('should handle resend code', fakeAsync(async () => {
    authService.resendConfirmationCode.and.returnValue(Promise.resolve());
    await component.resendCode();
    tick();
    expect(authService.resendConfirmationCode).toHaveBeenCalledWith('test@example.com');
  }));

  it('should validate code format', () => {
    const codeControl = component.confirmForm.get('code');

    codeControl?.setValue('12345');
    expect(codeControl?.errors?.['minlength']).toBeTruthy();

    codeControl?.setValue('1234567');
    expect(codeControl?.errors?.['maxlength']).toBeTruthy();

    codeControl?.setValue('123456');
    expect(codeControl?.errors).toBeFalsy();
  });
});
