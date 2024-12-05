// 3rd Party Imports
import { generateClient } from 'aws-amplify/api';
import { GraphQLResult, GraphQLOptions } from '@aws-amplify/api-graphql';
import { Injectable } from '@angular/core';

export const getUserProfileQuery = /* GraphQL */ `
  query GetUserProfile($cognito_id: String!) {
    getUserProfile(cognito_id: $cognito_id) {
      id
      cognito_id
      username
      email
      role
      status
      created_at
      updated_at
      profile {
        full_name
        phone
        language
        preferences {
          email_notifications
          theme
        }
      }
    }
  }
`;

export const sendSMSVerificationCode = `
  mutation SendSMSVerificationCode($input: SMSVerificationInput!) {
    sendSMSVerificationCode(input: $input) {
      status_code
      message
      code
    }
  }
`;

export interface SMSVerificationResponse {
  status_code: Number
  message: String
  code?: Number
}

export interface SMSVerificationInput {
  phone_number: String
}


@Injectable({
  providedIn: 'root'
})
export class ApiService {

  protected client: any

  private authMode = 'userPool' as GraphQLOptions['authMode'];

  constructor() {
    this.client = generateClient({authMode: this.authMode});
  }

  protected async query(query: string, variables: any): Promise<GraphQLResult> {
    console.debug('query:', query, 'variables:', variables);
    return await this.client.graphql({query: query, variables: variables});
  }

  protected async mutate(mutation: string, variables_arg: any): Promise<GraphQLResult> {
    console.debug('mutation:', mutation, 'variables:', variables_arg);
    return await this.client.graphql({query: mutation, "variables": variables_arg});
  }

  public async sendSMSVerificationCode(phone_number: string): Promise<any> {
    console.debug('sendSMSVerificationCode:', phone_number);
    try {
      const response = await this.mutate(
        sendSMSVerificationCode, {phone_number}
      ) as GraphQLResult<SMSVerificationResponse>;
      console.debug('S3 Upload Response: ', response);

      // Check the status code, if 200 return, if not error
      if (response.data?.status_code !== 200) {
        console.error('Error sending SMS verification code:', response.data?.message);
      }

      return response.data;

      // Now you can upload to S3 using this URL
    } catch (error) {
      console.error('Error sending SMS verification code:', error);
    }
  }

}
