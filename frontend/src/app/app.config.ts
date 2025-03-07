// file: frontend/src/app/app.config.ts
// author: Corey Dale Peters
// date: 2025-03-07
// description: TypeScript file

import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [provideRouter(routes)]
};
