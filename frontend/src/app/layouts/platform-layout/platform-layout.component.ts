// file: frontend/src/app/layouts/platform-layout/platform-layout.component.ts
// author: Corey Dale Peters
// date: 2024-12-04
// description: Angular component

import { Component } from '@angular/core';
import {CognitoService} from "../../core/services/cognito.service";
import {Router} from "@angular/router";
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { UserActions } from '../../features/user/store/user.actions';
import { selectIsAuthenticated } from '../../features/user/store/user.selectors';

@Component({
    selector: 'app-platform-layout',
    templateUrl: './platform-layout.component.html',
    styleUrls: ['./platform-layout.component.scss'],
    standalone: true,
    imports: [RouterModule, CommonModule]
})
export class PlatformLayoutComponent {
  title = 'OneRedBoot Integration Hub';
  currentYear: number = new Date().getFullYear();
  isAuthenticated$ = this.store.select(selectIsAuthenticated);

  constructor(
    private authService: CognitoService,
    public router: Router,  // Make router public to use in template
    private store: Store
  ) {}

  signOut(): void {
    // Use NgRx action - navigation will be handled by the effect
    this.store.dispatch(UserActions.signout());
  }
}
