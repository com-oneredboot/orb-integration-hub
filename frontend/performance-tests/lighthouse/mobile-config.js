/**
 * Lighthouse mobile configuration for authentication flow performance auditing
 */

module.exports = {
  extends: 'lighthouse:default',
  settings: {
    formFactor: 'mobile',
    throttling: {
      rttMs: 150,
      throughputKbps: 1638.4,
      cpuSlowdownMultiplier: 4,
      requestLatencyMs: 150 * 3.75,
      downloadThroughputKbps: 1638.4 * 0.9,
      uploadThroughputKbps: 675 * 0.9
    },
    screenEmulation: {
      mobile: true,
      width: 375,
      height: 667,
      deviceScaleFactor: 2,
      disabled: false,
    },
    emulatedUserAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1'
  },
  audits: [
    'first-contentful-paint',
    'largest-contentful-paint',
    'first-meaningful-paint',
    'speed-index',
    'total-blocking-time',
    'cumulative-layout-shift',
    'interactive',
    'mainthread-work-breakdown',
    'bootup-time',
    'uses-long-cache-ttl',
    'total-byte-weight',
    'unused-javascript',
    'unused-css-rules',
    'unminified-css',
    'unminified-javascript',
    'efficient-animated-content',
    'uses-optimized-images',
    'uses-webp-images',
    'uses-responsive-images',
    'offscreen-images',
    'render-blocking-resources',
    'critical-request-chains',
    'uses-rel-preconnect',
    'font-display',
    'viewport',
    'content-width',
    'tap-targets',
    'accessibility',
    'best-practices'
  ],
  categories: {
    performance: {
      title: 'Performance',
      description: 'These checks ensure that your authentication flow performs well on mobile devices.',
      auditRefs: [
        { id: 'first-contentful-paint', weight: 10, group: 'metrics' },
        { id: 'largest-contentful-paint', weight: 25, group: 'metrics' },
        { id: 'first-meaningful-paint', weight: 10, group: 'metrics' },
        { id: 'speed-index', weight: 10, group: 'metrics' },
        { id: 'interactive', weight: 10, group: 'metrics' },
        { id: 'total-blocking-time', weight: 30, group: 'metrics' },
        { id: 'cumulative-layout-shift', weight: 5, group: 'metrics' },
        { id: 'render-blocking-resources', weight: 0, group: 'load-opportunities' },
        { id: 'uses-responsive-images', weight: 0, group: 'load-opportunities' },
        { id: 'offscreen-images', weight: 0, group: 'load-opportunities' },
        { id: 'unminified-css', weight: 0, group: 'load-opportunities' },
        { id: 'unminified-javascript', weight: 0, group: 'load-opportunities' },
        { id: 'unused-css-rules', weight: 0, group: 'load-opportunities' },
        { id: 'unused-javascript', weight: 0, group: 'load-opportunities' },
        { id: 'uses-optimized-images', weight: 0, group: 'load-opportunities' },
        { id: 'uses-webp-images', weight: 0, group: 'load-opportunities' },
        { id: 'uses-long-cache-ttl', weight: 0, group: 'load-opportunities' },
        { id: 'efficient-animated-content', weight: 0, group: 'load-opportunities' }
      ]
    },
    accessibility: {
      title: 'Accessibility',
      description: 'These checks highlight opportunities to improve the mobile accessibility of your authentication flow.',
      auditRefs: [
        { id: 'accessibility', weight: 100 }
      ]
    },
    'mobile-friendly': {
      title: 'Mobile Friendly',
      description: 'These checks ensure your authentication flow works well on mobile devices.',
      auditRefs: [
        { id: 'viewport', weight: 25 },
        { id: 'content-width', weight: 25 },
        { id: 'tap-targets', weight: 50 }
      ]
    }
  },
  groups: {
    'metrics': {
      title: 'Metrics'
    },
    'load-opportunities': {
      title: 'Opportunities',
      description: 'These suggestions can help your page load faster on mobile. They don\'t directly affect the Performance score.'
    }
  }
};