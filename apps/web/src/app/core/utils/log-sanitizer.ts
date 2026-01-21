// file: apps/web/src/app/core/utils/log-sanitizer.ts
// author: Security Audit
// date: 2025-01-21
// description: Utility functions for sanitizing PII from log output
// SEC-FINDING-002: Remove PII from debug logs

/**
 * Sanitize a string value for logging by masking most of the content
 * @param value The value to sanitize
 * @param visibleChars Number of characters to show at the start (default: 4)
 * @returns Sanitized string with most content masked
 */
export function sanitizeForLog(value: string | undefined | null): string {
  if (!value) return '[empty]';
  if (value.length <= 4) return '****';
  return value.slice(0, 4) + '****';
}

/**
 * Sanitize an email address for logging
 * Shows first 2 characters of local part and domain
 * @param email The email to sanitize
 * @returns Sanitized email like "jo****@ex****.com"
 */
export function sanitizeEmail(email: string | undefined | null): string {
  if (!email) return '[no-email]';
  const parts = email.split('@');
  if (parts.length !== 2) return sanitizeForLog(email);
  
  const local = parts[0];
  const domain = parts[1];
  
  const sanitizedLocal = local.length > 2 ? local.slice(0, 2) + '****' : '****';
  const domainParts = domain.split('.');
  const sanitizedDomain = domainParts.length > 1 
    ? domainParts[0].slice(0, 2) + '****.' + domainParts.slice(1).join('.')
    : sanitizeForLog(domain);
  
  return `${sanitizedLocal}@${sanitizedDomain}`;
}

/**
 * Sanitize a Cognito Sub (UUID) for logging
 * Shows first 8 characters only
 * @param cognitoSub The Cognito Sub to sanitize
 * @returns Sanitized sub like "a1b2c3d4-****"
 */
export function sanitizeCognitoSub(cognitoSub: string | undefined | null): string {
  if (!cognitoSub) return '[no-sub]';
  if (cognitoSub.length <= 8) return '****';
  return cognitoSub.slice(0, 8) + '-****';
}

/**
 * Sanitize a user ID for logging
 * Shows first 8 characters only
 * @param userId The user ID to sanitize
 * @returns Sanitized ID like "usr_1234****"
 */
export function sanitizeUserId(userId: string | undefined | null): string {
  if (!userId) return '[no-id]';
  if (userId.length <= 8) return '****';
  return userId.slice(0, 8) + '****';
}

/**
 * Sanitize a phone number for logging
 * Shows last 4 digits only
 * @param phone The phone number to sanitize
 * @returns Sanitized phone like "****1234"
 */
export function sanitizePhone(phone: string | undefined | null): string {
  if (!phone) return '[no-phone]';
  const digits = phone.replace(/\D/g, '');
  if (digits.length <= 4) return '****';
  return '****' + digits.slice(-4);
}
