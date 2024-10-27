import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { ReactiveFormsModule} from "@angular/forms";
import { RouterModule } from '@angular/router';

import { AppComponent } from './app.component';
import { SignUpComponent } from './components/signup/sign-up.component';
import { SignInComponent } from './components/signin/signin.component';
import { ConfirmSignupComponent } from './components/confirm-signup/confirm-signup.component';
import {AppRoutingModule} from "./app.routes";
import {NgOptimizedImage} from "@angular/common";

@NgModule({
  declarations: [
    AppComponent,
    SignUpComponent,
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
