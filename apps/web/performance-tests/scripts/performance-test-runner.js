/**
 * Comprehensive performance test runner
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');

class PerformanceTestRunner {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || 'http://localhost:4200';
    this.reportDir = options.reportDir || './performance-tests/reports';
    this.testTypes = options.testTypes || ['load', 'stress', 'lighthouse', 'memory'];
    this.results = {};
  }

  async runAllTests() {
    console.log('Starting comprehensive performance testing...');
    
    // Ensure reports directory exists
    if (!fs.existsSync(this.reportDir)) {
      fs.mkdirSync(this.reportDir, { recursive: true });
    }

    const testResults = {};

    try {
      // Run load tests
      if (this.testTypes.includes('load')) {
        console.log('\n=== Running Load Tests ===');
        testResults.loadTest = await this.runLoadTests();
      }

      // Run stress tests
      if (this.testTypes.includes('stress')) {
        console.log('\n=== Running Stress Tests ===');
        testResults.stressTest = await this.runStressTests();
      }

      // Run Lighthouse audits
      if (this.testTypes.includes('lighthouse')) {
        console.log('\n=== Running Lighthouse Audits ===');
        testResults.lighthouse = await this.runLighthouseTests();
      }

      // Run memory leak detection
      if (this.testTypes.includes('memory')) {
        console.log('\n=== Running Memory Leak Detection ===');
        testResults.memoryTest = await this.runMemoryTests();
      }

      // Generate comprehensive report
      await this.generateComprehensiveReport(testResults);

      return testResults;

    } catch (error) {
      console.error('Performance testing failed:', error);
      throw error;
    }
  }

  async runLoadTests() {
    return new Promise((resolve, reject) => {
      const artilleryPath = path.join(__dirname, '../artillery/auth-flow-load-test.yml');
      const reportPath = path.join(this.reportDir, 'load-test-report.json');

      const artillery = spawn('npx', ['artillery', 'run', '--output', reportPath, artilleryPath], {
        stdio: 'inherit',
        cwd: process.cwd()
      });

      artillery.on('close', (code) => {
        if (code === 0) {
          console.log('Load tests completed successfully');
          
          // Read and parse results
          try {
            const results = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
            resolve({
              status: 'success',
              reportPath,
              summary: this.extractLoadTestSummary(results)
            });
          } catch (error) {
            resolve({
              status: 'success',
              reportPath,
              summary: { error: 'Could not parse results' }
            });
          }
        } else {
          reject(new Error(`Load tests failed with code ${code}`));
        }
      });

      artillery.on('error', (error) => {
        reject(error);
      });
    });
  }

  async runStressTests() {
    return new Promise((resolve, reject) => {
      const artilleryPath = path.join(__dirname, '../artillery/stress-test.yml');
      const reportPath = path.join(this.reportDir, 'stress-test-report.json');

      const artillery = spawn('npx', ['artillery', 'run', '--output', reportPath, artilleryPath], {
        stdio: 'inherit',
        cwd: process.cwd()
      });

      artillery.on('close', (code) => {
        if (code === 0) {
          console.log('Stress tests completed successfully');
          
          try {
            const results = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
            resolve({
              status: 'success',
              reportPath,
              summary: this.extractStressTestSummary(results)
            });
          } catch (error) {
            resolve({
              status: 'success',
              reportPath,
              summary: { error: 'Could not parse results' }
            });
          }
        } else {
          reject(new Error(`Stress tests failed with code ${code}`));
        }
      });

      artillery.on('error', (error) => {
        reject(error);
      });
    });
  }

  async runLighthouseTests() {
    const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
    
    try {
      const opts = {
        logLevel: 'info',
        output: 'json',
        onlyCategories: ['performance', 'accessibility'],
        port: chrome.port,
      };

      // Desktop audit
      const desktopConfig = require('../lighthouse/lighthouse-config.js');
      const desktopResult = await lighthouse(`${this.baseUrl}/user/auth`, opts, desktopConfig);
      
      // Mobile audit
      const mobileConfig = require('../lighthouse/mobile-config.js');
      const mobileResult = await lighthouse(`${this.baseUrl}/user/auth`, opts, mobileConfig);

      // Save reports
      const desktopReportPath = path.join(this.reportDir, 'lighthouse-desktop-report.json');
      const mobileReportPath = path.join(this.reportDir, 'lighthouse-mobile-report.json');
      
      fs.writeFileSync(desktopReportPath, desktopResult.report);
      fs.writeFileSync(mobileReportPath, mobileResult.report);

      return {
        status: 'success',
        desktop: {
          reportPath: desktopReportPath,
          score: desktopResult.lhr.categories.performance.score * 100,
          metrics: this.extractLighthouseMetrics(desktopResult.lhr)
        },
        mobile: {
          reportPath: mobileReportPath,
          score: mobileResult.lhr.categories.performance.score * 100,
          metrics: this.extractLighthouseMetrics(mobileResult.lhr)
        }
      };

    } finally {
      await chrome.kill();
    }
  }

  async runMemoryTests() {
    const MemoryLeakDetector = require('../memory/memory-leak-detector.js');
    
    const detector = new MemoryLeakDetector({
      url: `${this.baseUrl}/user/auth`,
      iterations: 15,
      samplingInterval: 3000,
      reportPath: path.join(this.reportDir, 'memory-leak-report.json')
    });

    try {
      const analysis = await detector.detectMemoryLeaks();
      return {
        status: 'success',
        reportPath: path.join(this.reportDir, 'memory-leak-report.json'),
        summary: analysis.summary,
        recommendations: analysis.recommendations
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message
      };
    }
  }

  extractLoadTestSummary(results) {
    if (!results || !results.aggregate) {
      return { error: 'Invalid results format' };
    }

    const aggregate = results.aggregate;
    return {
      scenarios: aggregate.scenariosCompleted || 0,
      requests: aggregate.requestsCompleted || 0,
      errors: aggregate.errors || 0,
      errorRate: aggregate.errors ? (aggregate.errors / aggregate.requestsCompleted * 100).toFixed(2) + '%' : '0%',
      averageResponseTime: aggregate.latency ? aggregate.latency.mean + 'ms' : 'N/A',
      p95ResponseTime: aggregate.latency ? aggregate.latency.p95 + 'ms' : 'N/A',
      rps: aggregate.rps ? aggregate.rps.mean.toFixed(2) : 'N/A'
    };
  }

  extractStressTestSummary(results) {
    if (!results || !results.aggregate) {
      return { error: 'Invalid results format' };
    }

    const aggregate = results.aggregate;
    return {
      scenarios: aggregate.scenariosCompleted || 0,
      requests: aggregate.requestsCompleted || 0,
      errors: aggregate.errors || 0,
      errorRate: aggregate.errors ? (aggregate.errors / aggregate.requestsCompleted * 100).toFixed(2) + '%' : '0%',
      averageResponseTime: aggregate.latency ? aggregate.latency.mean + 'ms' : 'N/A',
      maxResponseTime: aggregate.latency ? aggregate.latency.max + 'ms' : 'N/A',
      rps: aggregate.rps ? aggregate.rps.mean.toFixed(2) : 'N/A'
    };
  }

  extractLighthouseMetrics(lhr) {
    const audits = lhr.audits;
    return {
      firstContentfulPaint: audits['first-contentful-paint'].displayValue,
      largestContentfulPaint: audits['largest-contentful-paint'].displayValue,
      totalBlockingTime: audits['total-blocking-time'].displayValue,
      cumulativeLayoutShift: audits['cumulative-layout-shift'].displayValue,
      speedIndex: audits['speed-index'].displayValue,
      interactive: audits['interactive'].displayValue
    };
  }

  async generateComprehensiveReport(testResults) {
    const report = {
      timestamp: new Date().toISOString(),
      baseUrl: this.baseUrl,
      testTypes: this.testTypes,
      results: testResults,
      summary: this.generateSummary(testResults),
      recommendations: this.generateRecommendations(testResults)
    };

    const reportPath = path.join(this.reportDir, 'comprehensive-performance-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Generate human-readable summary
    await this.generateTextSummary(report);

    console.log(`\nComprehensive performance report generated: ${reportPath}`);
    return reportPath;
  }

  generateSummary(testResults) {
    const summary = {
      overallStatus: 'unknown',
      criticalIssues: [],
      passedTests: 0,
      totalTests: 0
    };

    // Analyze load test results
    if (testResults.loadTest) {
      summary.totalTests++;
      if (testResults.loadTest.status === 'success') {
        summary.passedTests++;
        const errorRate = parseFloat(testResults.loadTest.summary.errorRate);
        if (errorRate > 5) {
          summary.criticalIssues.push(`High error rate in load testing: ${testResults.loadTest.summary.errorRate}`);
        }
      }
    }

    // Analyze Lighthouse results
    if (testResults.lighthouse) {
      summary.totalTests += 2; // Desktop + mobile
      if (testResults.lighthouse.desktop && testResults.lighthouse.desktop.score > 70) {
        summary.passedTests++;
      } else if (testResults.lighthouse.desktop) {
        summary.criticalIssues.push(`Poor desktop performance score: ${testResults.lighthouse.desktop.score}`);
      }
      
      if (testResults.lighthouse.mobile && testResults.lighthouse.mobile.score > 70) {
        summary.passedTests++;
      } else if (testResults.lighthouse.mobile) {
        summary.criticalIssues.push(`Poor mobile performance score: ${testResults.lighthouse.mobile.score}`);
      }
    }

    // Analyze memory test results
    if (testResults.memoryTest) {
      summary.totalTests++;
      if (testResults.memoryTest.status === 'success' && !testResults.memoryTest.summary.hasMemoryLeak) {
        summary.passedTests++;
      } else if (testResults.memoryTest.summary && testResults.memoryTest.summary.hasMemoryLeak) {
        summary.criticalIssues.push('Memory leak detected');
      }
    }

    // Determine overall status
    if (summary.criticalIssues.length === 0) {
      summary.overallStatus = 'excellent';
    } else if (summary.passedTests / summary.totalTests > 0.7) {
      summary.overallStatus = 'good';
    } else if (summary.passedTests / summary.totalTests > 0.4) {
      summary.overallStatus = 'needs_improvement';
    } else {
      summary.overallStatus = 'poor';
    }

    return summary;
  }

  generateRecommendations(testResults) {
    const recommendations = [];

    // Load test recommendations
    if (testResults.loadTest && testResults.loadTest.summary) {
      const errorRate = parseFloat(testResults.loadTest.summary.errorRate);
      if (errorRate > 1) {
        recommendations.push('Investigate and fix errors causing high error rate in load testing');
      }
      
      const avgResponseTime = parseInt(testResults.loadTest.summary.averageResponseTime);
      if (avgResponseTime > 2000) {
        recommendations.push('Optimize response times - average response time exceeds 2 seconds');
      }
    }

    // Lighthouse recommendations
    if (testResults.lighthouse) {
      if (testResults.lighthouse.desktop && testResults.lighthouse.desktop.score < 80) {
        recommendations.push('Improve desktop performance score through code splitting and asset optimization');
      }
      
      if (testResults.lighthouse.mobile && testResults.lighthouse.mobile.score < 70) {
        recommendations.push('Optimize for mobile performance - consider reducing bundle size and improving loading strategies');
      }
    }

    // Memory recommendations
    if (testResults.memoryTest && testResults.memoryTest.recommendations) {
      recommendations.push(...testResults.memoryTest.recommendations);
    }

    return recommendations;
  }

  async generateTextSummary(report) {
    const summaryPath = path.join(this.reportDir, 'performance-summary.txt');
    
    const summary = `
COMPREHENSIVE PERFORMANCE TEST REPORT
=====================================

Test Date: ${report.timestamp}
Base URL: ${report.baseUrl}
Test Types: ${report.testTypes.join(', ')}

OVERALL SUMMARY
---------------
Status: ${report.summary.overallStatus.toUpperCase()}
Tests Passed: ${report.summary.passedTests}/${report.summary.totalTests}
Critical Issues: ${report.summary.criticalIssues.length}

DETAILED RESULTS
----------------

Load Testing:
${report.results.loadTest ? `
- Status: ${report.results.loadTest.status}
- Scenarios Completed: ${report.results.loadTest.summary.scenarios || 'N/A'}
- Error Rate: ${report.results.loadTest.summary.errorRate || 'N/A'}
- Average Response Time: ${report.results.loadTest.summary.averageResponseTime || 'N/A'}
- P95 Response Time: ${report.results.loadTest.summary.p95ResponseTime || 'N/A'}
` : 'Not run'}

Lighthouse Audits:
${report.results.lighthouse ? `
Desktop Performance Score: ${report.results.lighthouse.desktop ? report.results.lighthouse.desktop.score : 'N/A'}
Mobile Performance Score: ${report.results.lighthouse.mobile ? report.results.lighthouse.mobile.score : 'N/A'}
` : 'Not run'}

Memory Leak Detection:
${report.results.memoryTest ? `
- Status: ${report.results.memoryTest.status}
- Memory Leak Detected: ${report.results.memoryTest.summary ? (report.results.memoryTest.summary.hasMemoryLeak ? 'YES' : 'NO') : 'Unknown'}
- Severity: ${report.results.memoryTest.summary ? report.results.memoryTest.summary.severity : 'Unknown'}
` : 'Not run'}

CRITICAL ISSUES
---------------
${report.summary.criticalIssues.length > 0 ? report.summary.criticalIssues.map(issue => `- ${issue}`).join('\n') : 'None detected'}

RECOMMENDATIONS
---------------
${report.recommendations.length > 0 ? report.recommendations.map(rec => `- ${rec}`).join('\n') : 'No specific recommendations'}

For detailed reports, see:
${Object.values(report.results).map(result => {
  if (result.reportPath) return `- ${result.reportPath}`;
  if (result.desktop && result.desktop.reportPath) return `- ${result.desktop.reportPath}`;
  if (result.mobile && result.mobile.reportPath) return `- ${result.mobile.reportPath}`;
  return null;
}).filter(Boolean).join('\n')}
`;

    fs.writeFileSync(summaryPath, summary);
    console.log(`Performance summary generated: ${summaryPath}`);
  }
}

module.exports = PerformanceTestRunner;

// CLI usage
if (require.main === module) {
  const runner = new PerformanceTestRunner({
    baseUrl: process.argv[2] || 'http://localhost:4200',
    testTypes: process.argv[3] ? process.argv[3].split(',') : ['load', 'lighthouse', 'memory']
  });

  runner.runAllTests()
    .then(results => {
      console.log('\nPerformance testing completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('Performance testing failed:', error);
      process.exit(1);
    });
}