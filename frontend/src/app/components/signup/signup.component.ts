// signup.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-signup',
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.scss']
})
export class SignupComponent implements OnInit, OnDestroy {
  signupForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  passwordVisible = false;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.signupForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
      ]]
    });
  }

  ngOnInit(): void {
    // Check if user is already authenticated
    this.authService.isAuthenticated$()
      .pipe(takeUntil(this.destroy$))
      .subscribe(isAuth => {
        if (isAuth) {
          this.router.navigate(['/dashboard']);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async onSubmit(): Promise<void> {
    if (this.signupForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';

      try {
        const { username, password, email } = this.signupForm.value;
        await this.authService.registerUser(username, password, email);
        await this.router.navigate(['/confirm-signup'], {
          queryParams: { username: username }
        });
      } catch (error: any) {
        this.handleError(error);
      } finally {
        this.isLoading = false;
      }
    } else {
      this.markFormFieldsAsTouched();
    }
  }

  togglePasswordVisibility(): void {
    this.passwordVisible = !this.passwordVisible;
  }

  private handleError(error: any): void {
    console.error('Signup error:', error);
    if (error.code === 'UsernameExistsException') {
      this.errorMessage = 'This username is already taken. Please choose another one.';
    } else if (error.code === 'InvalidPasswordException') {
      this.errorMessage = 'Password does not meet the requirements. Please ensure it contains uppercase, lowercase, numbers, and special characters.';
    } else if (error.code === 'InvalidParameterException') {
      this.errorMessage = 'Please check your input and try again.';
    } else {
      this.errorMessage = error.message || 'An unexpected error occurred';
    }
  }

  private markFormFieldsAsTouched(): void {
    Object.keys(this.signupForm.controls).forEach(key => {
      const control = this.signupForm.get(key);
      control?.markAsTouched();
    });
  }
}
