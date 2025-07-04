// Generated TypeScript registry model for ErrorRegistry
// Generated at 2025-07-04T14:44:31.469901

export interface IErrorRegistry {
  code: string;
  message: string;
  description: string;
  solution: string;
  details?: any;
}

export const ERRORS: Record<string, IErrorRegistry> = {
  "ORB-AUTH-001": {
    code: "ORB-AUTH-001",
    message: "Invalid email format",
    description: "The provided email address format is invalid",
    solution: "Please enter a valid email address"  },
  "ORB-AUTH-002": {
    code: "ORB-AUTH-002",
    message: "Invalid credentials",
    description: "The provided email and password combination is invalid",
    solution: "Please check your email and password and try again"  },
  "ORB-AUTH-003": {
    code: "ORB-AUTH-003",
    message: "Email verification failed",
    description: "Failed to verify email with provided code",
    solution: "Please check the verification code and try again"  },
  "ORB-AUTH-004": {
    code: "ORB-AUTH-004",
    message: "User already exists",
    description: "A user with this email already exists",
    solution: "Please use a different email or try to sign in"  },
  "ORB-AUTH-005": {
    code: "ORB-AUTH-005",
    message: "User email check failed",
    description: "Failed to check if user exists by email",
    solution: "Please try again later"  },
  "ORB-API-001": {
    code: "ORB-API-001",
    message: "GraphQL query error",
    description: "An error occurred while executing a GraphQL query",
    solution: "Please try again later"  },
  "ORB-API-002": {
    code: "ORB-API-002",
    message: "GraphQL mutation error",
    description: "An error occurred while executing a GraphQL mutation",
    solution: "Please try again later"  },
  "ORB-API-003": {
    code: "ORB-API-003",
    message: "Invalid input for GraphQL operation",
    description: "The input provided for a GraphQL operation was invalid",
    solution: "Please check the input parameters and try again"  },
  "ORB-API-004": {
    code: "ORB-API-004",
    message: "Network error",
    description: "A network error occurred while communicating with the API",
    solution: "Please check your internet connection and try again"  },
  "ORB-DATA-001": {
    code: "ORB-DATA-001",
    message: "Invalid data format",
    description: "The data format provided is invalid",
    solution: "Please check the data format and try again"  },
  "ORB-DATA-002": {
    code: "ORB-DATA-002",
    message: "Data not found",
    description: "The requested data was not found",
    solution: "Please check if the data exists and try again"  },
  "ORB-SYS-001": {
    code: "ORB-SYS-001",
    message: "Unexpected error",
    description: "An unexpected error occurred",
    solution: "Please try again later"  },
};

export function getError(code: string): IErrorRegistry | undefined {
  return ERRORS[code];
} 