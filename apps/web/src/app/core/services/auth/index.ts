// Auth Services Barrel Export
// Centralized exports for all authentication-related services

export { CognitoService } from '../cognito.service';
export { AuthAnalyticsService } from './auth-analytics.service';
export { AuthPerformanceService } from './auth-performance.service';

// Re-export auth-related interfaces and types
export type {
  AnalyticsEvent,
  ConversionFunnel,
  ABTestVariant,
  ABTestConfig,
  UserSegment
} from './auth-analytics.service';

export type {
  PerformanceMetrics,
  CacheConfig
} from './auth-performance.service';