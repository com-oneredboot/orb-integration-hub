// file: frontend/src/app/core/models/cognito.model.ts
// author: Corey Dale Peters
// date: 2025-01-03
// description: This file contains the cognito model.

export interface CognitoUser {
  attributes : {
    email: string;
    email_verified: boolean;
    sub: string;
  }
  code: string;
  id: string;
  username: string;
}
