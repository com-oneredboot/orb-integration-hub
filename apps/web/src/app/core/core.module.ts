// file: apps/web/src/app/core/core.module.ts
// author: Corey Dale Peters
// date: 2025-01-03
// description: Core Module

// 3rd party modules
import { NgModule, Optional, SkipSelf } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';

// Services
import { CognitoService } from './services/cognito.service';

// Reducers
import { reducers } from '../store/app.reducer';

@NgModule({
    declarations: [
        // Universal components can be declared here
    ],
    imports: [
        CommonModule,
        EffectsModule.forRoot([]),
        StoreModule.forRoot(reducers),
        // Other modules like RouterModule can be imported if needed
    ],
    providers: [
        CognitoService,
        // Other singleton services and interceptors
    ]
})

export class CoreModule {
    constructor(@Optional() @SkipSelf() parentModule: CoreModule) {
        if (parentModule) {
            throw new Error('CoreModule is already loaded. Import it in the AppModule only');
        }
    }
}
