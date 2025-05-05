// file: frontend/src/app/features/user/components/dashboard/dashboard.component.ts
// author: Corey Dale Peters
// date: 2025-02-24
// description: Dashboard component for authenticated users

import { Component, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { IUser } from '../../../../core/models/users.model';
import * as fromAuth from '../../components/auth-flow/store/auth.selectors';
import { UserService } from '../../../../core/services/user.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  standalone: false
})
export class DashboardComponent implements OnInit {
  currentUser$: Observable<IUser | null>;
  debugMode$: Observable<boolean>;

  constructor(
    private store: Store,
    private userService: UserService
  ) {
    this.currentUser$ = this.store.select(fromAuth.selectCurrentUser);
    this.debugMode$ = this.store.select(fromAuth.selectDebugMode);
  }
  
  /**
   * Public method to check if a user is valid
   * @param user The user to check
   * @returns True if the user has all required attributes, false otherwise
   */
  public isUserValid(user: any): boolean {
    return this.userService.isUserValid(user);
  }

  ngOnInit(): void {
    // Additional initialization if needed
  }
}