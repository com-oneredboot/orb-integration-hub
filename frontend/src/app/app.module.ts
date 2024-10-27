import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { ReactiveFormsModule} from "@angular/forms";
import { RouterModule } from '@angular/router';

import { AppComponent } from './app.component';
import { SignupComponent } from './components/signup/signup.component';
import { SignInComponent } from './components/signin/signin.component';
import { ConfirmSignupComponent } from './components/confirm-signup/confirm-signup.component';
import {AppRoutingModule} from "./app.routes";
import {NgOptimizedImage} from "@angular/common";
import {AppLayoutComponent} from "./layouts/app-layout/app-layout.component";
import {PageLayoutComponent} from "./layouts/page-layout/page-layout.comonent";

@NgModule({
  declarations: [
    AppComponent,
    AppLayoutComponent,
    PageLayoutComponent,
    SignupComponent,
    SignInComponent,
    ConfirmSignupComponent
  ],
  imports: [
    BrowserModule,
    ReactiveFormsModule,
    AppRoutingModule,
    NgOptimizedImage
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
