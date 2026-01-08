/**
 * Network throttling and slow connection performance testing
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

class NetworkThrottlingTest {
  constructor(options = {}) {
    this.url = options.url || 'http://localhost:4200/user/auth';
    this.reportDir = options.reportDir || './performance-tests/reports/network';
    this.scenarios = options.scenarios || [
      {
        name: 'Regular 3G',
        downloadThroughput: 1.5 * 1024 * 1024 / 8,
        uploadThroughput: 750 * 1024 / 8,
        latency: 300
      },
      {
        name: 'Slow 3G',
        downloadThroughput: 500 * 1024 / 8,
        uploadThroughput: 500 * 1024 / 8,
        latency: 400
      },
      {
        name: 'Edge',
        downloadThroughput: 240 * 1024 / 8,
        uploadThroughput: 200 * 1024 / 8,
        latency: 840
      },
      {
        name: 'GPRS',
        downloadThroughput: 50 * 1024 / 8,
        uploadThroughput: 20 * 1024 / 8,
        latency: 500
      },
      {
        name: 'Offline Simulation',
        offline: true
      }
    ];
  }

  async runNetworkTests() {
    console.log('Starting network throttling tests...');
    
    if (!fs.existsSync(this.reportDir)) {
      fs.mkdirSync(this.reportDir, { recursive: true });
    }

    const results = {
      timestamp: new Date().toISOString(),
      url: this.url,
      scenarios: {},
      summary: {}
    };

    try {
      for (const scenario of this.scenarios) {
        console.log(`\nTesting network condition: ${scenario.name}`);
        results.scenarios[scenario.name] = await this.testNetworkScenario(scenario);
      }

      // Test progressive loading capabilities
      console.log('\nTesting progressive loading...');
      results.progressiveLoading = await this.testProgressiveLoading();

      // Test offline capabilities
      console.log('\nTesting offline capabilities...');
      results.offlineCapabilities = await this.testOfflineCapabilities();

      // Generate summary
      results.summary = this.generateNetworkSummary(results);

      // Save report
      const reportPath = path.join(this.reportDir, 'network-throttling-report.json');
      fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));

      console.log(`Network throttling report saved: ${reportPath}`);
      return results;

    } catch (error) {
      console.error('Network throttling tests failed:', error);
      throw error;
    }
  }

  async testNetworkScenario(scenario) {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const page = await browser.newPage();
      
      // Set network conditions
      if (scenario.offline) {
        await page.setOfflineMode(true);
      } else {
        await page.emulateNetworkConditions({
          offline: false,
          downloadThroughput: scenario.downloadThroughput,
          uploadThroughput: scenario.uploadThroughput,
          latency: scenario.latency
        });
      }

      const testStart = Date.now();
      const results = {
        scenario: scenario.name,
        networkConditions: scenario
      };

      try {
        // Test initial page load
        const loadStart = Date.now();
        const response = await page.goto(this.url, { 
          waitUntil: 'networkidle2',
          timeout: scenario.offline ? 5000 : 60000
        });
        
        results.initialLoad = {
          time: Date.now() - loadStart,
          statusCode: response?.status(),
          success: true
        };

        if (!scenario.offline) {
          // Test form interactions under network constraints
          results.formInteractions = await this.testFormUnderConstraints(page);
          
          // Test asset loading
          results.assetLoading = await this.testAssetLoadingUnderConstraints(page);
          
          // Test API calls
          results.apiCalls = await this.testAPICallsUnderConstraints(page);
        }

      } catch (error) {
        results.initialLoad = {
          time: Date.now() - loadStart,
          success: false,
          error: error.message
        };
      }

      results.totalTestTime = Date.now() - testStart;
      return results;

    } finally {
      await browser.close();
    }
  }

  async testFormUnderConstraints(page) {
    try {
      const results = {};

      // Test form field responsiveness
      const emailStart = Date.now();
      await page.waitForSelector('#email-input', { timeout: 30000 });
      await page.type('#email-input', 'slow@network.test');
      results.emailInputTime = Date.now() - emailStart;

      // Test form submission
      const submitStart = Date.now();
      await page.click('.auth-flow__button');
      
      try {
        await page.waitForSelector('#password-setup-input, .auth-flow__error', { timeout: 30000 });
        results.formSubmissionTime = Date.now() - submitStart;
        results.submissionSuccess = true;
      } catch (error) {
        results.formSubmissionTime = Date.now() - submitStart;
        results.submissionSuccess = false;
        results.submissionError = error.message;
      }

      // Test real-time validation under network constraints
      if (results.submissionSuccess) {
        const validationStart = Date.now();
        await page.type('#password-setup-input', 'weak');
        await page.waitForSelector('.auth-flow__requirement', { timeout: 10000 });
        results.validationResponseTime = Date.now() - validationStart;
      }

      return results;
    } catch (error) {
      return { error: error.message };
    }
  }

  async testAssetLoadingUnderConstraints(page) {
    try {
      const results = {};

      // Monitor network requests
      const requests = [];
      page.on('request', request => {
        requests.push({
          url: request.url(),
          method: request.method(),
          resourceType: request.resourceType(),
          timestamp: Date.now()
        });
      });

      const responses = [];
      page.on('response', response => {
        responses.push({
          url: response.url(),
          status: response.status(),
          timestamp: Date.now()
        });
      });

      // Trigger asset loading
      await page.reload({ waitUntil: 'networkidle2' });

      // Analyze asset loading performance
      results.totalRequests = requests.length;
      results.totalResponses = responses.length;
      results.failedRequests = responses.filter(r => r.status >= 400).length;

      // Categorize requests by type
      const requestsByType = {};
      requests.forEach(req => {
        if (!requestsByType[req.resourceType]) {
          requestsByType[req.resourceType] = 0;
        }
        requestsByType[req.resourceType]++;
      });
      results.requestsByType = requestsByType;

      return results;
    } catch (error) {
      return { error: error.message };
    }
  }

  async testAPICallsUnderConstraints(page) {
    try {
      const results = {};
      const apiCalls = [];

      // Monitor API calls
      page.on('response', response => {
        const url = response.url();
        if (url.includes('/api/') || url.includes('/graphql')) {
          apiCalls.push({
            url,
            status: response.status(),
            timestamp: Date.now()
          });
        }
      });

      // Trigger API calls through form interactions
      await page.type('#email-input', 'api@test.slow');
      await page.click('.auth-flow__button');

      // Wait for potential API calls
      await page.waitForTimeout(5000);

      results.apiCallCount = apiCalls.length;
      results.successfulAPICalls = apiCalls.filter(call => call.status < 400).length;
      results.failedAPICalls = apiCalls.filter(call => call.status >= 400).length;

      if (apiCalls.length > 0) {
        const responseTimes = apiCalls.map(call => call.timestamp);
        results.averageAPIResponseTime = responseTimes.length > 1 ? 
          (Math.max(...responseTimes) - Math.min(...responseTimes)) / apiCalls.length : 0;
      }

      return results;
    } catch (error) {
      return { error: error.message };
    }
  }

  async testProgressiveLoading() {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const page = await browser.newPage();
      
      // Simulate slow 3G
      await page.emulateNetworkConditions({
        offline: false,
        downloadThroughput: 500 * 1024 / 8,
        uploadThroughput: 500 * 1024 / 8,
        latency: 400
      });

      const results = {};

      // Test progressive content loading
      const navigationStart = Date.now();
      await page.goto(this.url);

      // Check for skeleton screens or loading states
      const hasLoadingStates = await page.evaluate(() => {
        return !!(
          document.querySelector('.skeleton') ||
          document.querySelector('.loading') ||
          document.querySelector('[aria-live="polite"]') ||
          document.querySelector('.spinner')
        );
      });

      results.hasLoadingStates = hasLoadingStates;

      // Measure time to first meaningful content
      await page.waitForSelector('.auth-flow__header-title', { timeout: 30000 });
      results.timeToFirstMeaningfulContent = Date.now() - navigationStart;

      // Check for lazy loading
      const hasLazyLoading = await page.evaluate(() => {
        const images = document.querySelectorAll('img');
        return Array.from(images).some(img => 
          img.loading === 'lazy' || img.getAttribute('data-src')
        );
      });

      results.hasLazyLoading = hasLazyLoading;

      return results;
    } finally {
      await browser.close();
    }
  }

  async testOfflineCapabilities() {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const page = await browser.newPage();
      
      // First load the page normally
      await page.goto(this.url);
      
      // Then go offline
      await page.setOfflineMode(true);
      
      const results = {};

      // Test offline page behavior
      try {
        await page.reload({ timeout: 5000 });
        results.offlinePageLoads = false;
      } catch (error) {
        results.offlinePageLoads = false;
        results.offlineError = error.message;
      }

      // Check for service worker
      const hasServiceWorker = await page.evaluate(async () => {
        return 'serviceWorker' in navigator && !!(await navigator.serviceWorker.getRegistration());
      });

      results.hasServiceWorker = hasServiceWorker;

      // Check for offline messaging
      const hasOfflineMessage = await page.evaluate(() => {
        return !!(
          document.querySelector('[data-offline]') ||
          document.querySelector('.offline-message') ||
          document.body.textContent.includes('offline')
        );
      });

      results.hasOfflineMessage = hasOfflineMessage;

      return results;
    } finally {
      await browser.close();
    }
  }

  generateNetworkSummary(results) {
    const summary = {
      overallPerformance: 'unknown',
      networkResilience: 'unknown',
      recommendations: []
    };

    // Analyze performance across network conditions
    const loadTimes = [];
    let failedScenarios = 0;

    for (const [scenarioName, result] of Object.entries(results.scenarios)) {
      if (result.initialLoad?.success) {
        loadTimes.push(result.initialLoad.time);
      } else {
        failedScenarios++;
      }

      // Check specific scenario performance
      if (scenarioName.includes('3G') && result.initialLoad?.time > 10000) {
        summary.recommendations.push(`Poor performance on ${scenarioName} - consider optimization`);
      }
      
      if (scenarioName === 'Slow 3G' && result.initialLoad?.time > 15000) {
        summary.recommendations.push('Critical: Slow 3G performance exceeds acceptable limits');
      }
    }

    // Overall performance assessment
    const avgLoadTime = loadTimes.length > 0 ? loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length : 0;
    
    if (avgLoadTime < 5000 && failedScenarios === 0) {
      summary.overallPerformance = 'excellent';
    } else if (avgLoadTime < 10000 && failedScenarios <= 1) {
      summary.overallPerformance = 'good';
    } else if (avgLoadTime < 20000) {
      summary.overallPerformance = 'acceptable';
    } else {
      summary.overallPerformance = 'poor';
    }

    // Network resilience assessment
    if (results.progressiveLoading?.hasLoadingStates && results.offlineCapabilities?.hasServiceWorker) {
      summary.networkResilience = 'excellent';
    } else if (results.progressiveLoading?.hasLoadingStates || results.offlineCapabilities?.hasOfflineMessage) {
      summary.networkResilience = 'good';
    } else {
      summary.networkResilience = 'needs_improvement';
      summary.recommendations.push('Implement progressive loading and offline capabilities');
    }

    // Progressive loading recommendations
    if (!results.progressiveLoading?.hasLoadingStates) {
      summary.recommendations.push('Add skeleton screens and loading states for better perceived performance');
    }

    if (!results.progressiveLoading?.hasLazyLoading) {
      summary.recommendations.push('Implement lazy loading for images and non-critical resources');
    }

    // Offline capabilities recommendations
    if (!results.offlineCapabilities?.hasServiceWorker) {
      summary.recommendations.push('Consider implementing a service worker for offline capabilities');
    }

    return summary;
  }
}

module.exports = NetworkThrottlingTest;

// CLI usage
if (require.main === module) {
  const tester = new NetworkThrottlingTest({
    url: process.argv[2] || 'http://localhost:4200/user/auth'
  });

  tester.runNetworkTests()
    .then(results => {
      console.log('\nNetwork throttling tests completed');
      console.log('Summary:', results.summary);
      process.exit(0);
    })
    .catch(error => {
      console.error('Network throttling tests failed:', error);
      process.exit(1);
    });
}