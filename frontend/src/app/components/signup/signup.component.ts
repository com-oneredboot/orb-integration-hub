import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';

enum SignupStep {
  INITIAL
}

@Component({
  selector: 'app-signup',
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.scss']
})
export class SignUpComponent implements OnInit, OnDestroy {

  form: FormGroup;
  isLoading = false;
  error = '';
  username = '';
  passwordVisible = false;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router
  ) {
    this.form = this.fb.group({
      username: ['', [Validators.required, Validators.email]],
      password: ['', [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
      ]],
      phoneNumber: ['', [
        Validators.required,
        Validators.pattern(/^\+[1-9]\d{1,14}$/)
      ]]
    });
  }

  ngOnInit(): void {
    this.auth.isAuthenticated$()
      .pipe(takeUntil(this.destroy$))
      .subscribe(isAuth => {
        if (isAuth) this.router.navigate(['/dashboard']);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async onSubmit(): Promise<void> {
    if (this.isLoading || !this.form.valid) return;

    this.isLoading = true;
    this.error = '';

    try {
      await this.handleInitialSignup();
    } catch (err) {
      console.error('Signup error:', err);
      this.error = err instanceof Error ? err.message : 'An error occurred';
    } finally {
      this.isLoading = false;
    }
  }

  private async handleInitialSignup(): Promise<void> {
    const { username, password, phoneNumber } = this.form.value;
    console.info('Starting registration');

    const response = await this.auth.register(username, password, username, phoneNumber);

    if (response.success) {
      this.username = username;
      // After successful registration, redirect to confirm-email
      await this.router.navigate(['/confirm-signup'], {
        queryParams: { username: this.username }
      });
    } else {
      this.error = response.error || 'Registration failed';
    }
  }

  togglePasswordVisibility(): void {
    this.passwordVisible = !this.passwordVisible;
  }

}
