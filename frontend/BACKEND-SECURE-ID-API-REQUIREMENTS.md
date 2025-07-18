# Backend Secure ID Generation API Requirements

## Overview
The frontend application has been refactored to remove client-side UUID generation for security-critical identifiers. All user IDs, session IDs, and other security-sensitive identifiers must now be generated by secure backend services.

## Security Rationale
- **Client-side UUID generation is a security vulnerability** - predictable and controllable by malicious clients
- **User/session IDs should be cryptographically secure** and generated server-side only
- **Frontend-generated IDs can be manipulated** for privilege escalation and security bypass attempts
- **Backend generation ensures entropy** and prevents ID collision attacks

## Required API Endpoints

### 1. Single ID Generation
**Endpoint:** `POST /api/secure/generate-id`

**Request Headers:**
```
Content-Type: application/json
X-Request-Type: secure-id-generation
X-Request-Context: {context}
```

**Request Body:**
```json
{
  "type": "user|session|cognito|transaction|correlation",
  "context": "user_registration|cognito_authentication|session_management",
  "metadata": {
    "email": "user@example.com",
    "timestamp": 1640995200000,
    "additional_context": "value"
  }
}
```

**Response Body:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "type": "user",
  "timestamp": 1640995200000,
  "expiresAt": 1640995800000,
  "metadata": {
    "generated_by": "backend_secure_service",
    "entropy_bits": 128,
    "algorithm": "uuid_v4_crypto_secure"
  }
}
```

### 2. Batch ID Generation
**Endpoint:** `POST /api/secure/generate-id/batch`

**Request Headers:**
```
Content-Type: application/json
X-Request-Type: secure-id-batch-generation
X-Batch-Size: {number}
```

**Request Body:**
```json
{
  "requests": [
    {
      "type": "user",
      "context": "user_registration",
      "metadata": {"email": "user@example.com"}
    },
    {
      "type": "cognito",
      "context": "cognito_authentication", 
      "metadata": {"email": "user@example.com"}
    }
  ]
}
```

**Response Body:**
```json
{
  "ids": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "type": "user",
      "timestamp": 1640995200000
    },
    {
      "id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      "type": "cognito", 
      "timestamp": 1640995200000
    }
  ]
}
```

### 3. Health Check
**Endpoint:** `GET /api/secure/generate-id/health`

**Response Body:**
```json
{
  "status": "healthy",
  "service": "secure-id-generation",
  "version": "1.0.0",
  "uptime": 3600,
  "entropy_available": true
}
```

### 4. Fallback Endpoint (Alternative)
**Endpoint:** `POST /api/v1/ids/generate`
- Same request/response format as primary endpoint
- Used as automatic fallback if primary endpoint fails

## Security Requirements

### ID Generation Standards
- **MUST use cryptographically secure random number generators**
- **MUST follow RFC 4122 UUID v4 standard** for user/session IDs
- **MUST have minimum 128 bits of entropy**
- **MUST NOT be predictable or sequential**
- **MUST validate format**: `^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`

### Rate Limiting
- **Max 100 requests per minute per client IP**
- **Max 10 batch requests per minute per client IP**
- **Exponential backoff for failed requests**

### Audit Logging
- **Log all ID generation requests** with correlation IDs
- **Include request context and metadata** (excluding PII)
- **Track failure rates and potential abuse patterns**
- **Alert on unusual request patterns**

### Response Times
- **Single ID generation: < 100ms**
- **Batch generation: < 500ms**
- **Health check: < 50ms**

## Error Handling

### Error Response Format
```json
{
  "error": {
    "code": "SECURE_ID_GENERATION_FAILED",
    "message": "Unable to generate secure ID",
    "details": "Insufficient entropy available",
    "correlation_id": "req_123456789",
    "timestamp": 1640995200000
  }
}
```

### Error Codes
- `SECURE_ID_GENERATION_FAILED` - General generation failure
- `INSUFFICIENT_ENTROPY` - Cryptographic entropy unavailable
- `INVALID_REQUEST_TYPE` - Unknown ID type requested
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `SERVICE_UNAVAILABLE` - Backend service down

## Frontend Fallback Behavior
If ALL backend endpoints fail:
1. **Frontend will generate emergency client-side IDs**
2. **SECURITY WARNING will be logged**
3. **Generated IDs will be marked as "insecure"**
4. **Error will be reported to monitoring systems**
5. **User will see degraded security warning**

⚠️ **This fallback should NEVER happen in production and indicates a critical system failure!**

## Implementation Notes

### Backend Service Requirements
- **High availability** (99.9% uptime minimum)
- **Horizontal scaling** for load distribution
- **Monitoring and alerting** for service health
- **Secure key management** for cryptographic operations
- **Regular security audits** of ID generation algorithms

### Database Integration
- **Store generation metadata** for audit trails
- **Track ID usage patterns** for security analysis
- **Implement ID lifecycle management**
- **Regular entropy pool health checks**

### Infrastructure Security
- **Network isolation** for ID generation services
- **TLS 1.3 minimum** for all communications  
- **Certificate pinning** for critical endpoints
- **WAF protection** against abuse

## Testing Requirements

### Unit Tests
- ID format validation
- Entropy verification
- Rate limiting enforcement
- Error handling paths

### Integration Tests  
- End-to-end ID generation flow
- Fallback mechanism testing
- Performance benchmarking
- Security penetration testing

### Load Testing
- Concurrent request handling
- Batch generation performance
- Rate limiting effectiveness
- Service degradation scenarios

## Monitoring and Metrics

### Key Metrics
- **IDs generated per second**
- **Request/response latency**
- **Error rates by endpoint**
- **Rate limiting triggers**
- **Entropy pool status**

### Alerts
- **Service availability < 99%**
- **Response time > 500ms**
- **Error rate > 1%**
- **Rate limiting > 10% of requests**
- **Emergency fallback activations**

## Migration Guide

### Phase 1: Deploy Backend Services
1. Implement secure ID generation API
2. Deploy with monitoring and alerting
3. Verify health checks and performance

### Phase 2: Update Frontend Application
1. Integrate SecureIdGenerationService
2. Update user creation flows
3. Add fallback mechanisms
4. Deploy with feature flags

### Phase 3: Validation and Monitoring
1. Monitor ID generation patterns
2. Verify no client-side generation
3. Test fallback scenarios
4. Performance optimization

## Compliance Notes
- **SOC 2 Type II** compliance for secure ID generation
- **GDPR Article 32** technical measures for data protection
- **NIST SP 800-63B** guidelines for digital identity
- **OWASP** secure coding practices for authentication