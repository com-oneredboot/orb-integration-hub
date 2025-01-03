import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { ReactiveFormsModule} from "@angular/forms";

import { AppComponent } from './app.component';
import { AppRoutingModule } from "./app.routes";
import { NgOptimizedImage } from "@angular/common";
import { AppLayoutComponent } from "./layouts/app-layout/app-layout.component";
import { PageLayoutComponent } from "./layouts/page-layout/page-layout.comonent";
import { EffectsModule } from "@ngrx/effects";
import { StoreModule } from "@ngrx/store";
import { UserModule } from "./features/user/user.module";

@NgModule({
  declarations: [
    AppComponent,
    AppLayoutComponent,
    PageLayoutComponent,
  ],
  imports: [
    BrowserModule,
    ReactiveFormsModule,
    StoreModule.forRoot({}), // order is important here
    EffectsModule.forRoot([]), // order is important here
    AppRoutingModule,
    NgOptimizedImage,

    UserModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
