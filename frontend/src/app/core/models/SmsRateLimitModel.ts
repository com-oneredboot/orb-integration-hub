/**
 * SmsRateLimit model.
 */

// Import enums and models used in this model

// CreateInput
export type SmsRateLimitCreateInput = {
  phoneNumber: string;
  requestCount: number;
  firstRequestTime: number;
  ttl: number;
};

// UpdateInput
export type SmsRateLimitUpdateInput = {
  phoneNumber: string;
  requestCount: number;
  firstRequestTime: number;
  ttl: number;
};

// QueryInput
export type SmsRateLimitQueryByPhoneNumberInput = {
  phoneNumber: string;
};



// Response types
export type SmsRateLimitResponse = {
  StatusCode: number;
  Message: string;
  Data: SmsRateLimit | null;
};

export type SmsRateLimitCreateResponse = {
  StatusCode: number;
  Message: string;
  Data: SmsRateLimit | null;
};

export type SmsRateLimitUpdateResponse = {
  StatusCode: number;
  Message: string;
  Data: SmsRateLimit | null;
};

export type SmsRateLimitListResponse = {
  StatusCode: number;
  Message: string;
  Data: SmsRateLimit[] | null;
};

// GraphQL Response Wrappers
export type SmsRateLimitCreateMutationResponse = {
  SmsRateLimitCreate: SmsRateLimitCreateResponse;
};

export type SmsRateLimitUpdateMutationResponse = {
  SmsRateLimitUpdate: SmsRateLimitUpdateResponse;
};

export type SmsRateLimitDeleteMutationResponse = {
  SmsRateLimitDelete: SmsRateLimitResponse;
};

export type SmsRateLimitQueryByPhoneNumberResponse = {
  SmsRateLimitQueryByPhoneNumber: SmsRateLimitResponse;
};


export interface ISmsRateLimit {
  phoneNumber: string;
  requestCount: number;
  firstRequestTime: number;
  ttl: number;
}

export class SmsRateLimit implements ISmsRateLimit {
  phoneNumber = '';
  requestCount = 0;
  firstRequestTime = 0;
  ttl = 0;

  constructor(data: Partial<ISmsRateLimit> = {}) {
    Object.entries(data).forEach(([key, value]) => {
      if (key in this) {
        {
          this[key as keyof this] = value as this[keyof this];
        }
      }
    });
  }
} 