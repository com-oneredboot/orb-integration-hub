# Performance Testing Suite

Comprehensive performance testing infrastructure for the authentication flow, including load testing, memory leak detection, mobile performance validation, and network condition testing.

## Overview

This performance testing suite provides:

- **Load Testing**: Artillery-based load testing with up to 150+ concurrent users
- **Stress Testing**: System stress testing with rate limiting validation
- **Memory Leak Detection**: Automated memory leak detection with detailed analysis
- **Mobile Performance**: Device-specific performance testing and Core Web Vitals
- **Network Throttling**: Performance validation under various network conditions
- **Lighthouse Audits**: Desktop and mobile performance scoring
- **Baseline Metrics**: Performance regression detection and monitoring
- **CI/CD Integration**: Automated performance testing in pipelines

## Quick Start

### Prerequisites

```bash
# Install dependencies
npm install

# Ensure application is running
npm run start:secure
```

### Run All Performance Tests

```bash
# Run comprehensive performance test suite
npm run perf:all

# Establish baseline metrics (first time)
npm run perf:baseline
```

### Individual Test Categories

```bash
# Load testing (100+ concurrent users)
npm run perf:load

# Stress testing (200+ concurrent users)
npm run perf:stress

# Lighthouse performance audits
npm run perf:lighthouse
npm run perf:lighthouse:mobile

# Memory leak detection
npm run perf:memory

# Mobile device testing
npm run perf:mobile

# Network throttling tests
npm run perf:network

# Bundle analysis
npm run bundle:analyze
```

## Test Categories

### 1. Load Testing (`npm run perf:load`)

**Purpose**: Validate system performance under normal and peak load conditions.

**Configuration**: `performance-tests/artillery/auth-flow-load-test.yml`

**Scenarios**:
- Complete user registration flow (30% weight)
- Existing user login flow (50% weight)
- Password reset flow (10% weight)
- Static asset loading (10% weight)

**Load Phases**:
1. Warm-up: 5 users for 30 seconds
2. Ramp up: 10-50 users over 60 seconds
3. Sustained load: 50 users for 120 seconds
4. Peak load: 100 users for 60 seconds
5. Stress test: 150 users for 30 seconds

**Performance Targets**:
- Page Load: <2 seconds
- Step Transitions: <500ms
- Error Rate: <1%
- P95 Response Time: <3 seconds

### 2. Stress Testing (`npm run perf:stress`)

**Purpose**: Validate system behavior under extreme load and rate limiting.

**Configuration**: `performance-tests/artillery/stress-test.yml`

**Scenarios**:
- Authentication stress test (60% weight)
- Rate limiting validation (30% weight)
- Resource exhaustion test (10% weight)

**Stress Phases**:
1. Gradual ramp-up: 50-200 users over 60 seconds
2. Peak stress: 200 users for 300 seconds
3. Spike test: 500 users for 30 seconds
4. Recovery: 500-50 users over 60 seconds

### 3. Memory Leak Detection (`npm run perf:memory`)

**Purpose**: Detect memory leaks and resource cleanup issues.

**Configuration**: `performance-tests/memory/memory-leak-detector.js`

**Process**:
- 20 iterations of complete authentication flow
- Memory sampling every 5 seconds
- DOM node counting and event listener tracking
- Garbage collection monitoring

**Detection Criteria**:
- Memory increase >20% over iterations
- DOM node count increase >10%
- Event listener count increase >15%

### 4. Mobile Performance (`npm run perf:mobile`)

**Purpose**: Validate performance across mobile devices and conditions.

**Configuration**: `performance-tests/scripts/mobile-performance-test.js`

**Device Testing**:
- iPhone 12, Samsung Galaxy S21, iPad, Pixel 5
- Touch interaction responsiveness
- Virtual keyboard impact
- Core Web Vitals measurement

**Network Conditions**:
- Fast 3G, Slow 3G, 4G, WiFi
- Form responsiveness under constraints
- Progressive loading validation

### 5. Network Throttling (`npm run perf:network`)

**Purpose**: Validate performance under various network conditions.

**Configuration**: `performance-tests/scripts/network-throttling-test.js`

**Network Scenarios**:
- Regular 3G (1.5 Mbps down, 750 Kbps up, 300ms latency)
- Slow 3G (500 Kbps down/up, 400ms latency)
- Edge (240 Kbps down, 200 Kbps up, 840ms latency)
- GPRS (50 Kbps down, 20 Kbps up, 500ms latency)
- Offline simulation

### 6. Lighthouse Audits

**Purpose**: Comprehensive performance, accessibility, and best practices auditing.

**Desktop Configuration**: `performance-tests/lighthouse/lighthouse-config.js`
**Mobile Configuration**: `performance-tests/lighthouse/mobile-config.js`

**Metrics Tracked**:
- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
- Total Blocking Time (TBT)
- Cumulative Layout Shift (CLS)
- Speed Index
- Accessibility Score

**Performance Targets**:
- Desktop Score: >80
- Mobile Score: >70
- FCP: <1.5s
- LCP: <2.5s

## Baseline Metrics & Regression Detection

### Establishing Baseline

```bash
# First time setup - establish baseline metrics
npm run perf:baseline
```

This creates `performance-tests/baseline-metrics.json` with current performance characteristics.

### Regression Detection

```bash
# Compare current performance against baseline
node performance-tests/scripts/baseline-metrics.js compare
```

**Regression Thresholds**:
- Load time increase >20%
- Error rate increase >10%
- Performance score decrease >5 points
- Memory usage increase >25%

## CI/CD Integration

### GitHub Actions

Copy `performance-tests/ci/performance-ci.yml` to `.github/workflows/` for automated:

- Performance testing on PRs and main branch
- Daily scheduled comprehensive testing
- Performance regression detection
- Automatic baseline updates
- Bundle size budget enforcement

### Performance Budgets

**Bundle Size Limits**:
- Main bundle: <2MB
- Individual components: <30KB
- Total initial bundle: <1MB

**Performance Budgets**:
- Load time: <3 seconds
- Error rate: <5%
- Memory usage: <100MB sustained
- Mobile score: >60

## Reports and Analysis

### Report Locations

All reports are generated in `performance-tests/reports/`:

- `load-test-report.json` - Artillery load test results
- `stress-test-report.json` - Stress test results
- `lighthouse-desktop-report.json` - Desktop Lighthouse audit
- `lighthouse-mobile-report.json` - Mobile Lighthouse audit
- `memory-leak-report.json` - Memory leak analysis
- `mobile-performance-report.json` - Mobile device testing
- `network-throttling-report.json` - Network condition testing
- `comprehensive-performance-report.json` - Combined analysis
- `baseline-comparison-report.json` - Regression analysis

### Summary Reports

Human-readable summaries:

- `performance-summary.txt` - Overall performance summary
- `memory-leak-report-summary.txt` - Memory analysis summary
- `baseline-comparison-summary.txt` - Regression detection summary

## Troubleshooting

### Common Issues

**1. Tests timing out**
```bash
# Increase timeout in configuration files
# Check if application is properly started
curl http://localhost:4200/user/auth
```

**2. High memory usage during tests**
```bash
# Reduce test iterations or sampling interval
node performance-tests/memory/memory-leak-detector.js http://localhost:4200/user/auth 10 3000
```

**3. Network condition tests failing**
```bash
# Ensure Puppeteer has proper permissions
# Check Chrome installation
npm list puppeteer
```

**4. Lighthouse tests not running**
```bash
# Install Chrome dependencies
sudo apt-get install -y chromium-browser
```

### Performance Optimization Tips

**Based on Test Results**:

1. **High Load Times**: 
   - Enable gzip compression
   - Optimize images and assets
   - Implement code splitting

2. **Memory Leaks Detected**:
   - Check event listener cleanup
   - Verify component destruction
   - Monitor DOM node accumulation

3. **Poor Mobile Scores**:
   - Reduce bundle size
   - Optimize images for mobile
   - Improve touch target sizes

4. **Network Issues**:
   - Implement progressive loading
   - Add offline capabilities
   - Optimize critical rendering path

## Configuration

### Artillery Configuration

Edit `performance-tests/artillery/auth-flow-load-test.yml`:

```yaml
config:
  phases:
    - duration: 60          # Test duration
      arrivalRate: 50       # Users per second
      rampTo: 100          # Ramp to this rate
```

### Memory Testing Configuration

Edit `performance-tests/memory/memory-leak-detector.js`:

```javascript
const detector = new MemoryLeakDetector({
  iterations: 20,           // Number of test cycles
  samplingInterval: 5000    // Memory sampling interval
});
```

### Performance Thresholds

Edit `performance-tests/scripts/baseline-metrics.js`:

```javascript
this.thresholds = {
  loadTime: 3000,          // Maximum load time (ms)
  errorRate: 5,            // Maximum error rate (%)
  memoryUsage: 100,        // Maximum memory usage (MB)
  performanceScore: 70     // Minimum Lighthouse score
};
```

## Contributing

When adding new performance tests:

1. Follow existing naming conventions
2. Add comprehensive error handling
3. Include performance thresholds
4. Update this README
5. Test with various network conditions
6. Ensure CI/CD compatibility

## Support

For issues with performance testing:

1. Check application is running: `curl http://localhost:4200/user/auth`
2. Verify all dependencies: `npm list`
3. Review report files for detailed error information
4. Check CI/CD logs for automation issues