// file: frontend/src/app/app.module.ts
// author: Corey Dale Peters
// date: 2025-03-07
// description: TypeScript file

import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { ReactiveFormsModule} from "@angular/forms";
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

import { AppComponent } from './app.component';
import { AppRoutingModule } from "./app.routes";
import { NgOptimizedImage } from "@angular/common";
import { PlatformLayoutComponent } from "./layouts/platform-layout/platform-layout.component";
import { UserLayoutComponent } from "./layouts/user-layout/user-layout.component";
import { EffectsModule } from "@ngrx/effects";
import { StoreModule } from "@ngrx/store";
import { UserModule } from "./features/user/user.module";

@NgModule({
  declarations: [],
  imports: [
    BrowserModule,
    ReactiveFormsModule,
    StoreModule.forRoot({}), // order is important here
    EffectsModule.forRoot([]), // order is important here
    AppRoutingModule,
    NgOptimizedImage,
    FontAwesomeModule,
    UserLayoutComponent,
    PlatformLayoutComponent,
    UserModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
