// file: frontend/src/app/components/signup/signup.component.ts
// author: Corey Dale Peters
// date: 2024-12-06
// description: The SignUpComponent handles user registration

// 3rd Party Imports
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';

// Application Imports
import { AuthService } from '../../services/auth.service';
import {CreateUserInput, User} from "../../models/user.model";

@Component({
  selector: 'app-signup',
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.scss']
})
export class SignUpComponent implements OnInit, OnDestroy {

  form: FormGroup;
  isLoading = false;
  error = '';
  passwordVisible = false;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router
  ) {
    this.form = this.fb.group({
      firstName: ['', [Validators.required, Validators.pattern(/^[a-zA-Z]+$/)]],
      lastName: ['', [Validators.required, Validators.pattern(/^[a-zA-Z]+$/)]],
      phoneNumber: ['', [
        Validators.required,
        Validators.pattern(/^\+[1-9]\d{1,14}$/)
      ]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
      ]],

    });
  }

  ngOnInit(): void {
    this.auth.isAuthenticated$()
      .pipe(takeUntil(this.destroy$))
      .subscribe(isAuth => {
        if (isAuth) this.router.navigate(['/dashboard'])
          .then(r => console.info('User already authenticated. Navigated to dashboard'));
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
      await this.handleSignup();
    } catch (err) {
      console.error('Signup error:', err);
      this.error = err instanceof Error ? err.message : 'An error occurred';
    } finally {
      this.isLoading = false;
    }
  }

  togglePasswordVisibility(): void {
    this.passwordVisible = !this.passwordVisible;
  }

  private async handleSignup(): Promise<void> {
    const { firstName, lastName, email, password, phoneNumber } = this.form.value;
    console.info('Starting registration');

    const user = {
      cognito_id: uuidv4(),
      first_name: firstName,
      last_name: lastName,
      email,
      phone_number: phoneNumber,
      groups: ['USER'],
      status: 'PENDING'
    } as User

    const response = await this.auth.register(user as CreateUserInput, password);

    if (response.status_code === 200 && response.user?.id) {

      console.info('Registration successful');
      await this.router.navigate(['/confirm-email']);

    } else {
      this.error = response.message || 'Registration failed';
    }
  }

}
