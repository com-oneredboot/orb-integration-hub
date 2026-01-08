/**
 * Mobile device performance testing script
 */

const puppeteer = require('puppeteer');
const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const fs = require('fs');
const path = require('path');

class MobilePerformanceTest {
  constructor(options = {}) {
    this.url = options.url || 'http://localhost:4200/user/auth';
    this.reportDir = options.reportDir || './performance-tests/reports/mobile';
    this.devices = options.devices || [
      'iPhone 12',
      'Samsung Galaxy S21',
      'iPad',
      'Pixel 5'
    ];
    this.networkConditions = options.networkConditions || [
      'Fast 3G',
      'Slow 3G',
      '4G',
      'WiFi'
    ];
  }

  async runMobileTests() {
    console.log('Starting mobile performance tests...');
    
    // Ensure reports directory exists
    if (!fs.existsSync(this.reportDir)) {
      fs.mkdirSync(this.reportDir, { recursive: true });
    }

    const results = {
      timestamp: new Date().toISOString(),
      url: this.url,
      deviceTests: {},
      networkTests: {},
      summary: {}
    };

    try {
      // Test different devices
      for (const device of this.devices) {
        console.log(`\nTesting device: ${device}`);
        results.deviceTests[device] = await this.testDevice(device);
      }

      // Test different network conditions
      for (const network of this.networkConditions) {
        console.log(`\nTesting network: ${network}`);
        results.networkTests[network] = await this.testNetworkCondition(network);
      }

      // Generate summary
      results.summary = this.generateMobileSummary(results);

      // Save comprehensive report
      const reportPath = path.join(this.reportDir, 'mobile-performance-report.json');
      fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));

      console.log(`Mobile performance report saved: ${reportPath}`);
      return results;

    } catch (error) {
      console.error('Mobile performance testing failed:', error);
      throw error;
    }
  }

  async testDevice(deviceName) {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const page = await browser.newPage();
      
      // Emulate device
      const devices = puppeteer.devices;
      const device = devices[deviceName] || devices['iPhone 12'];
      await page.emulate(device);

      // Start performance monitoring
      await page.coverage.startJSCoverage();
      await page.coverage.startCSSCoverage();

      const startTime = Date.now();

      // Navigate to auth page
      const response = await page.goto(this.url, { 
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      const loadTime = Date.now() - startTime;

      // Get performance metrics
      const metrics = await page.metrics();
      
      // Get Core Web Vitals
      const coreWebVitals = await page.evaluate(() => {
        return new Promise((resolve) => {
          if ('web-vital' in window) {
            // If web-vitals library is loaded
            resolve({
              fcp: performance.getEntriesByType('paint').find(entry => entry.name === 'first-contentful-paint')?.startTime,
              lcp: performance.getEntriesByType('largest-contentful-paint')?.[0]?.startTime,
              cls: 0 // Would need web-vitals library for accurate CLS
            });
          } else {
            // Fallback to basic metrics
            const paintEntries = performance.getEntriesByType('paint');
            resolve({
              fcp: paintEntries.find(entry => entry.name === 'first-contentful-paint')?.startTime,
              lcp: paintEntries.find(entry => entry.name === 'largest-contentful-paint')?.startTime || 0,
              cls: 0
            });
          }
        });
      });

      // Test touch interactions
      const touchResponsiveness = await this.testTouchInteractions(page);

      // Test form inputs on mobile
      const formPerformance = await this.testMobileFormPerformance(page);

      // Get coverage data
      const jsCoverage = await page.coverage.stopJSCoverage();
      const cssCoverage = await page.coverage.stopCSSCoverage();

      return {
        device: deviceName,
        loadTime,
        statusCode: response.status(),
        metrics,
        coreWebVitals,
        touchResponsiveness,
        formPerformance,
        coverage: {
          js: this.calculateCoverage(jsCoverage),
          css: this.calculateCoverage(cssCoverage)
        }
      };

    } finally {
      await browser.close();
    }
  }

  async testNetworkCondition(networkType) {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const page = await browser.newPage();
      
      // Emulate iPhone for consistency
      await page.emulate(puppeteer.devices['iPhone 12']);

      // Set network conditions
      const networkConditions = this.getNetworkConditions(networkType);
      await page.emulateNetworkConditions(networkConditions);

      const startTime = Date.now();

      // Navigate and measure
      const response = await page.goto(this.url, { 
        waitUntil: 'networkidle2',
        timeout: 60000 // Longer timeout for slow networks
      });

      const loadTime = Date.now() - startTime;

      // Test form interactions under network constraints
      const formResponsiveness = await this.testFormUnderNetworkConstraints(page);

      return {
        networkType,
        networkConditions,
        loadTime,
        statusCode: response.status(),
        formResponsiveness
      };

    } finally {
      await browser.close();
    }
  }

  async testTouchInteractions(page) {
    try {
      const results = {};

      // Test tap responsiveness
      const startTap = Date.now();
      await page.tap('#email-input');
      results.tapResponseTime = Date.now() - startTap;

      // Test swipe gesture (if applicable)
      const viewport = page.viewport();
      const startSwipe = Date.now();
      await page.touchscreen.tap(viewport.width / 2, viewport.height / 2);
      results.swipeResponseTime = Date.now() - startSwipe;

      // Test pinch zoom (basic simulation)
      results.pinchZoomSupported = await page.evaluate(() => {
        return 'ontouchstart' in window && 'TouchEvent' in window;
      });

      return results;
    } catch (error) {
      return { error: error.message };
    }
  }

  async testMobileFormPerformance(page) {
    try {
      const results = {};

      // Test email input
      const emailStartTime = Date.now();
      await page.type('#email-input', 'mobile@test.com');
      results.emailInputTime = Date.now() - emailStartTime;

      // Test virtual keyboard impact
      results.keyboardHeight = await page.evaluate(() => {
        return window.visualViewport ? window.visualViewport.height : window.innerHeight;
      });

      // Test form submission
      const submitStartTime = Date.now();
      await page.click('.auth-flow__button');
      
      // Wait for next step or response
      try {
        await page.waitForSelector('#password-setup-input, .auth-flow__error', { timeout: 10000 });
        results.formSubmissionTime = Date.now() - submitStartTime;
      } catch (error) {
        results.formSubmissionTime = Date.now() - submitStartTime;
        results.submissionError = 'Timeout waiting for response';
      }

      return results;
    } catch (error) {
      return { error: error.message };
    }
  }

  async testFormUnderNetworkConstraints(page) {
    try {
      // Test form loading
      const formLoadStart = Date.now();
      await page.waitForSelector('#email-input', { timeout: 30000 });
      const formLoadTime = Date.now() - formLoadStart;

      // Test typing responsiveness
      const typingStart = Date.now();
      await page.type('#email-input', 'test@slow.network');
      const typingResponseTime = Date.now() - typingStart;

      // Test form submission under network constraints
      const submitStart = Date.now();
      await page.click('.auth-flow__button');
      
      let submitTime;
      try {
        await page.waitForSelector('#password-setup-input, .auth-flow__error', { timeout: 20000 });
        submitTime = Date.now() - submitStart;
      } catch (error) {
        submitTime = Date.now() - submitStart;
      }

      return {
        formLoadTime,
        typingResponseTime,
        submitTime
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  getNetworkConditions(networkType) {
    const conditions = {
      'Fast 3G': {
        offline: false,
        downloadThroughput: 1.5 * 1024 * 1024 / 8, // 1.5 Mbps
        uploadThroughput: 750 * 1024 / 8, // 750 Kbps
        latency: 150
      },
      'Slow 3G': {
        offline: false,
        downloadThroughput: 500 * 1024 / 8, // 500 Kbps
        uploadThroughput: 500 * 1024 / 8, // 500 Kbps
        latency: 300
      },
      '4G': {
        offline: false,
        downloadThroughput: 4 * 1024 * 1024 / 8, // 4 Mbps
        uploadThroughput: 3 * 1024 * 1024 / 8, // 3 Mbps
        latency: 20
      },
      'WiFi': {
        offline: false,
        downloadThroughput: 30 * 1024 * 1024 / 8, // 30 Mbps
        uploadThroughput: 15 * 1024 * 1024 / 8, // 15 Mbps
        latency: 2
      }
    };

    return conditions[networkType] || conditions['Fast 3G'];
  }

  calculateCoverage(coverage) {
    let totalBytes = 0;
    let usedBytes = 0;

    for (const entry of coverage) {
      totalBytes += entry.text.length;
      for (const range of entry.ranges) {
        usedBytes += range.end - range.start - 1;
      }
    }

    return {
      totalBytes,
      usedBytes,
      percentage: totalBytes > 0 ? (usedBytes / totalBytes * 100).toFixed(2) : 0
    };
  }

  generateMobileSummary(results) {
    const summary = {
      devicePerformance: {},
      networkPerformance: {},
      recommendations: []
    };

    // Analyze device performance
    for (const [device, result] of Object.entries(results.deviceTests)) {
      if (result.error) continue;

      summary.devicePerformance[device] = {
        loadTime: result.loadTime,
        touchResponsive: result.touchResponsiveness?.tapResponseTime < 100,
        formPerformant: result.formPerformance?.emailInputTime < 500
      };

      // Generate device-specific recommendations
      if (result.loadTime > 3000) {
        summary.recommendations.push(`Optimize loading for ${device} - load time exceeds 3 seconds`);
      }
      
      if (result.touchResponsiveness?.tapResponseTime > 100) {
        summary.recommendations.push(`Improve touch responsiveness for ${device}`);
      }
    }

    // Analyze network performance
    for (const [network, result] of Object.entries(results.networkTests)) {
      if (result.error) continue;

      summary.networkPerformance[network] = {
        loadTime: result.loadTime,
        acceptable: result.loadTime < (network.includes('Slow') ? 10000 : 5000)
      };

      // Generate network-specific recommendations
      if (result.loadTime > 10000 && network.includes('3G')) {
        summary.recommendations.push(`Consider progressive loading for ${network} users`);
      }
    }

    return summary;
  }
}

module.exports = MobilePerformanceTest;

// CLI usage
if (require.main === module) {
  const tester = new MobilePerformanceTest({
    url: process.argv[2] || 'http://localhost:4200/user/auth'
  });

  tester.runMobileTests()
    .then(results => {
      console.log('\nMobile performance testing completed');
      console.log('Summary:', results.summary);
      process.exit(0);
    })
    .catch(error => {
      console.error('Mobile performance testing failed:', error);
      process.exit(1);
    });
}