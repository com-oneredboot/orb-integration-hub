// file: apps/web/src/app/core/models/ErrorRegistryModel.ts
// description: Error registry for standardized error messages

export interface ErrorDefinition {
  code: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

const errorRegistry: Record<string, ErrorDefinition> = {
  'ORB-AUTH-001': { code: 'ORB-AUTH-001', message: 'Session refresh failed', severity: 'medium' },
  'ORB-AUTH-002': { code: 'ORB-AUTH-002', message: 'Invalid credentials', severity: 'medium' },
  'ORB-AUTH-003': { code: 'ORB-AUTH-003', message: 'Authentication failed', severity: 'medium' },
  'ORB-AUTH-005': { code: 'ORB-AUTH-005', message: 'User email check failed', severity: 'medium' },
  'ORB-AUTH-006': { code: 'ORB-AUTH-006', message: 'Duplicate users found for this email', severity: 'high' },
  'ORB-API-002': { code: 'ORB-API-002', message: 'API request failed', severity: 'medium' },
  'ORB-API-004': { code: 'ORB-API-004', message: 'API error', severity: 'medium' },
  'ORB-SYS-001': { code: 'ORB-SYS-001', message: 'Unexpected system error', severity: 'high' },
};

export function getError(code: string): ErrorDefinition | null {
  return errorRegistry[code] || null;
}
