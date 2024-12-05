import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { ReactiveFormsModule} from "@angular/forms";

import { AppComponent } from './app.component';
import { SignUpComponent } from './components/signup/signup.component';
import { SignInComponent } from './components/signin/signin.component';
import { ConfirmEmailComponent } from './components/confirm-email/confirm-email.component';
import { AppRoutingModule } from "./app.routes";
import { NgOptimizedImage } from "@angular/common";
import { AppLayoutComponent } from "./layouts/app-layout/app-layout.component";
import { PageLayoutComponent } from "./layouts/page-layout/page-layout.comonent";
import { MFASetupComponent } from "./components/mfa-setup/mfa-setup.component";
import {ConfirmPhoneComponent} from "./components/confirm-phone/confirm-phone.component";

@NgModule({
  declarations: [
    AppComponent,
    AppLayoutComponent,
    ConfirmEmailComponent,
    ConfirmPhoneComponent,
    MFASetupComponent,
    PageLayoutComponent,
    SignUpComponent,
    SignInComponent
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
