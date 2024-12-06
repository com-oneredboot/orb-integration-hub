// file: frontend/src/app/models/sms.model.ts
// author: Corey Dale Peters
// date: 2024-12-06
// description: Contains all GraphQL mutation queries for the API service

// SMS Verification
import {GenericResponse} from "./appsync.model";

export const sendSMSVerificationCodeMutation = `
  mutation SendSMSVerificationCode($input: SMSVerificationInput!) {
    sendSMSVerificationCode(input: $input) {
      status_code
      message
      code
    }
  }
`;

export type SMSVerificationResponse =  GenericResponse & {
  code?: number
}

export type SMSVerificationInput = {
  phone_number: string
}
