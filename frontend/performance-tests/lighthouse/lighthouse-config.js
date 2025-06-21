/**
 * Lighthouse configuration for authentication flow performance auditing
 */

module.exports = {
  extends: 'lighthouse:default',
  settings: {
    formFactor: 'desktop',
    throttling: {
      rttMs: 40,
      throughputKbps: 10240,
      cpuSlowdownMultiplier: 1,
      requestLatencyMs: 0,
      downloadThroughputKbps: 0,
      uploadThroughputKbps: 0
    },
    screenEmulation: {
      mobile: false,
      width: 1350,
      height: 940,
      deviceScaleFactor: 1,
      disabled: false,
    },
    emulatedUserAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.109 Safari/537.36 Chrome-Lighthouse'
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
    'accessibility',
    'best-practices'
  ],
  categories: {
    performance: {
      title: 'Performance',
      description: 'These checks ensure that your authentication flow performs well.',
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
      description: 'These checks highlight opportunities to improve the accessibility of your authentication flow.',
      auditRefs: [
        { id: 'accessibility', weight: 100 }
      ]
    }
  },
  groups: {
    'metrics': {
      title: 'Metrics'
    },
    'load-opportunities': {
      title: 'Opportunities',
      description: 'These suggestions can help your page load faster. They don\'t directly affect the Performance score.'
    }
  }
};