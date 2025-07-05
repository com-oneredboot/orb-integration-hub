/**
 * Baseline metrics establishment and monitoring script
 */

const fs = require('fs');
const path = require('path');

class BaselineMetrics {
  constructor(options = {}) {
    this.reportsDir = options.reportsDir || './performance-tests/reports';
    this.baselineFile = options.baselineFile || './performance-tests/baseline-metrics.json';
    this.thresholds = options.thresholds || {
      loadTime: 3000, // ms
      errorRate: 5, // percentage
      memoryUsage: 100, // MB
      performanceScore: 70, // Lighthouse score
      mobileScore: 60 // Mobile Lighthouse score
    };
  }

  async establishBaseline() {
    console.log('Establishing performance baseline metrics...');

    try {
      // Read latest performance reports
      const reports = await this.readLatestReports();
      
      // Calculate baseline metrics
      const baseline = this.calculateBaseline(reports);
      
      // Save baseline
      await this.saveBaseline(baseline);
      
      console.log('Baseline metrics established successfully');
      return baseline;
      
    } catch (error) {
      console.error('Failed to establish baseline:', error);
      throw error;
    }
  }

  async compareAgainstBaseline() {
    console.log('Comparing current performance against baseline...');

    try {
      // Load existing baseline
      const baseline = this.loadBaseline();
      if (!baseline) {
        throw new Error('No baseline found. Please establish baseline first.');
      }

      // Read current reports
      const currentReports = await this.readLatestReports();
      const currentMetrics = this.calculateBaseline(currentReports);

      // Perform comparison
      const comparison = this.performComparison(baseline, currentMetrics);
      
      // Generate comparison report
      await this.generateComparisonReport(comparison);
      
      return comparison;
      
    } catch (error) {
      console.error('Failed to compare against baseline:', error);
      throw error;
    }
  }

  async readLatestReports() {
    const reports = {};

    try {
      // Read load test report
      const loadTestPath = path.join(this.reportsDir, 'load-test-report.json');
      if (fs.existsSync(loadTestPath)) {
        reports.loadTest = JSON.parse(fs.readFileSync(loadTestPath, 'utf8'));
      }

      // Read stress test report
      const stressTestPath = path.join(this.reportsDir, 'stress-test-report.json');
      if (fs.existsSync(stressTestPath)) {
        reports.stressTest = JSON.parse(fs.readFileSync(stressTestPath, 'utf8'));
      }

      // Read Lighthouse reports
      const lighthousePath = path.join(this.reportsDir, 'lighthouse-desktop-report.json');
      if (fs.existsSync(lighthousePath)) {
        reports.lighthouse = JSON.parse(fs.readFileSync(lighthousePath, 'utf8'));
      }

      const lighthouseMobilePath = path.join(this.reportsDir, 'lighthouse-mobile-report.json');
      if (fs.existsSync(lighthouseMobilePath)) {
        reports.lighthouseMobile = JSON.parse(fs.readFileSync(lighthouseMobilePath, 'utf8'));
      }

      // Read memory test report
      const memoryTestPath = path.join(this.reportsDir, 'memory-leak-report.json');
      if (fs.existsSync(memoryTestPath)) {
        reports.memoryTest = JSON.parse(fs.readFileSync(memoryTestPath, 'utf8'));
      }

      // Read comprehensive report
      const comprehensivePath = path.join(this.reportsDir, 'comprehensive-performance-report.json');
      if (fs.existsSync(comprehensivePath)) {
        reports.comprehensive = JSON.parse(fs.readFileSync(comprehensivePath, 'utf8'));
      }

      return reports;
    } catch (error) {
      console.error('Error reading reports:', error);
      return {};
    }
  }

  calculateBaseline(reports) {
    const baseline = {
      timestamp: new Date().toISOString(),
      metrics: {},
      thresholds: this.thresholds
    };

    // Extract load test metrics
    if (reports.loadTest && reports.loadTest.aggregate) {
      baseline.metrics.loadTest = {
        averageResponseTime: reports.loadTest.aggregate.latency?.mean || 0,
        p95ResponseTime: reports.loadTest.aggregate.latency?.p95 || 0,
        errorRate: reports.loadTest.aggregate.errors ? 
          (reports.loadTest.aggregate.errors / reports.loadTest.aggregate.requestsCompleted * 100) : 0,
        requestsPerSecond: reports.loadTest.aggregate.rps?.mean || 0,
        totalRequests: reports.loadTest.aggregate.requestsCompleted || 0
      };
    }

    // Extract stress test metrics
    if (reports.stressTest && reports.stressTest.aggregate) {
      baseline.metrics.stressTest = {
        maxResponseTime: reports.stressTest.aggregate.latency?.max || 0,
        errorRateUnderStress: reports.stressTest.aggregate.errors ? 
          (reports.stressTest.aggregate.errors / reports.stressTest.aggregate.requestsCompleted * 100) : 0,
        maxRequestsPerSecond: reports.stressTest.aggregate.rps?.max || 0
      };
    }

    // Extract Lighthouse metrics
    if (reports.lighthouse && reports.lighthouse.categories) {
      baseline.metrics.lighthouse = {
        performanceScore: reports.lighthouse.categories.performance?.score * 100 || 0,
        firstContentfulPaint: this.extractLighthouseMetric(reports.lighthouse, 'first-contentful-paint'),
        largestContentfulPaint: this.extractLighthouseMetric(reports.lighthouse, 'largest-contentful-paint'),
        totalBlockingTime: this.extractLighthouseMetric(reports.lighthouse, 'total-blocking-time'),
        cumulativeLayoutShift: this.extractLighthouseMetric(reports.lighthouse, 'cumulative-layout-shift')
      };
    }

    // Extract mobile Lighthouse metrics
    if (reports.lighthouseMobile && reports.lighthouseMobile.categories) {
      baseline.metrics.lighthouseMobile = {
        performanceScore: reports.lighthouseMobile.categories.performance?.score * 100 || 0,
        firstContentfulPaint: this.extractLighthouseMetric(reports.lighthouseMobile, 'first-contentful-paint'),
        largestContentfulPaint: this.extractLighthouseMetric(reports.lighthouseMobile, 'largest-contentful-paint')
      };
    }

    // Extract memory metrics
    if (reports.memoryTest && reports.memoryTest.analysis) {
      baseline.metrics.memory = {
        memoryLeakDetected: reports.memoryTest.analysis.summary?.hasMemoryLeak || false,
        memoryIncreasePercentage: reports.memoryTest.analysis.memoryTrend?.percentageIncrease || 0,
        domLeakDetected: reports.memoryTest.analysis.summary?.hasDOMLeak || false,
        eventListenerLeakDetected: reports.memoryTest.analysis.summary?.hasEventListenerLeak || false
      };
    }

    return baseline;
  }

  extractLighthouseMetric(lighthouseReport, metricName) {
    if (!lighthouseReport.audits || !lighthouseReport.audits[metricName]) {
      return null;
    }
    
    const audit = lighthouseReport.audits[metricName];
    return {
      score: audit.score,
      numericValue: audit.numericValue,
      displayValue: audit.displayValue
    };
  }

  async saveBaseline(baseline) {
    // Ensure directory exists
    const baselineDir = path.dirname(this.baselineFile);
    if (!fs.existsSync(baselineDir)) {
      fs.mkdirSync(baselineDir, { recursive: true });
    }

    fs.writeFileSync(this.baselineFile, JSON.stringify(baseline, null, 2));
    console.log(`Baseline saved to: ${this.baselineFile}`);
  }

  loadBaseline() {
    if (!fs.existsSync(this.baselineFile)) {
      return null;
    }
    
    try {
      return JSON.parse(fs.readFileSync(this.baselineFile, 'utf8'));
    } catch (error) {
      console.error('Error loading baseline:', error);
      return null;
    }
  }

  performComparison(baseline, current) {
    const comparison = {
      timestamp: new Date().toISOString(),
      baselineTimestamp: baseline.timestamp,
      overallStatus: 'unknown',
      regressions: [],
      improvements: [],
      within_threshold: [],
      metrics: {}
    };

    // Compare load test metrics
    if (baseline.metrics.loadTest && current.metrics.loadTest) {
      comparison.metrics.loadTest = this.compareMetrics(
        baseline.metrics.loadTest,
        current.metrics.loadTest,
        {
          averageResponseTime: { threshold: 20, higher_is_worse: true },
          errorRate: { threshold: 10, higher_is_worse: true },
          requestsPerSecond: { threshold: 10, higher_is_worse: false }
        }
      );
    }

    // Compare Lighthouse metrics
    if (baseline.metrics.lighthouse && current.metrics.lighthouse) {
      comparison.metrics.lighthouse = this.compareMetrics(
        baseline.metrics.lighthouse,
        current.metrics.lighthouse,
        {
          performanceScore: { threshold: 5, higher_is_worse: false }
        }
      );
    }

    // Compare memory metrics
    if (baseline.metrics.memory && current.metrics.memory) {
      comparison.metrics.memory = this.compareMemoryMetrics(
        baseline.metrics.memory,
        current.metrics.memory
      );
    }

    // Determine overall status
    const totalRegressions = Object.values(comparison.metrics)
      .reduce((sum, metric) => sum + (metric.regressions?.length || 0), 0);
    
    const totalImprovements = Object.values(comparison.metrics)
      .reduce((sum, metric) => sum + (metric.improvements?.length || 0), 0);

    if (totalRegressions === 0) {
      comparison.overallStatus = 'excellent';
    } else if (totalRegressions <= 2 && totalImprovements > totalRegressions) {
      comparison.overallStatus = 'good';
    } else if (totalRegressions <= 5) {
      comparison.overallStatus = 'acceptable';
    } else {
      comparison.overallStatus = 'poor';
    }

    // Collect overall regressions and improvements
    Object.values(comparison.metrics).forEach(metric => {
      if (metric.regressions) comparison.regressions.push(...metric.regressions);
      if (metric.improvements) comparison.improvements.push(...metric.improvements);
      if (metric.within_threshold) comparison.within_threshold.push(...metric.within_threshold);
    });

    return comparison;
  }

  compareMetrics(baseline, current, thresholds) {
    const result = {
      regressions: [],
      improvements: [],
      within_threshold: []
    };

    for (const [metricName, config] of Object.entries(thresholds)) {
      const baselineValue = baseline[metricName];
      const currentValue = current[metricName];

      if (baselineValue == null || currentValue == null) continue;

      const percentageChange = ((currentValue - baselineValue) / baselineValue) * 100;
      const isRegression = config.higher_is_worse ? 
        percentageChange > config.threshold :
        percentageChange < -config.threshold;
      
      const isImprovement = config.higher_is_worse ?
        percentageChange < -config.threshold :
        percentageChange > config.threshold;

      const comparison = {
        metric: metricName,
        baseline: baselineValue,
        current: currentValue,
        change: percentageChange,
        threshold: config.threshold
      };

      if (isRegression) {
        result.regressions.push(comparison);
      } else if (isImprovement) {
        result.improvements.push(comparison);
      } else {
        result.within_threshold.push(comparison);
      }
    }

    return result;
  }

  compareMemoryMetrics(baseline, current) {
    const result = {
      regressions: [],
      improvements: [],
      within_threshold: []
    };

    // Compare memory leak detection
    if (!baseline.memoryLeakDetected && current.memoryLeakDetected) {
      result.regressions.push({
        metric: 'memoryLeakDetected',
        baseline: false,
        current: true,
        description: 'New memory leak detected'
      });
    } else if (baseline.memoryLeakDetected && !current.memoryLeakDetected) {
      result.improvements.push({
        metric: 'memoryLeakDetected',
        baseline: true,
        current: false,
        description: 'Memory leak fixed'
      });
    }

    // Compare memory increase percentage
    const memoryChangeThreshold = 25; // 25% threshold
    const baselineIncrease = baseline.memoryIncreasePercentage || 0;
    const currentIncrease = current.memoryIncreasePercentage || 0;
    
    if (currentIncrease > baselineIncrease + memoryChangeThreshold) {
      result.regressions.push({
        metric: 'memoryIncreasePercentage',
        baseline: baselineIncrease,
        current: currentIncrease,
        description: 'Significant increase in memory usage'
      });
    } else if (baselineIncrease > currentIncrease + memoryChangeThreshold) {
      result.improvements.push({
        metric: 'memoryIncreasePercentage',
        baseline: baselineIncrease,
        current: currentIncrease,
        description: 'Improved memory usage'
      });
    }

    return result;
  }

  async generateComparisonReport(comparison) {
    const reportPath = path.join(this.reportsDir, 'baseline-comparison-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(comparison, null, 2));

    // Generate text summary
    const summaryPath = path.join(this.reportsDir, 'baseline-comparison-summary.txt');
    const summary = `
PERFORMANCE BASELINE COMPARISON REPORT
======================================

Comparison Date: ${comparison.timestamp}
Baseline Date: ${comparison.baselineTimestamp}
Overall Status: ${comparison.overallStatus.toUpperCase()}

SUMMARY
-------
Total Regressions: ${comparison.regressions.length}
Total Improvements: ${comparison.improvements.length}
Metrics Within Threshold: ${comparison.within_threshold.length}

REGRESSIONS
-----------
${comparison.regressions.length > 0 ? comparison.regressions.map(r => 
  `- ${r.metric}: ${r.baseline} → ${r.current} (${r.change?.toFixed(2)}% change)`
).join('\n') : 'None detected'}

IMPROVEMENTS
------------
${comparison.improvements.length > 0 ? comparison.improvements.map(i => 
  `- ${i.metric}: ${i.baseline} → ${i.current} (${i.change?.toFixed(2)}% change)`
).join('\n') : 'None detected'}

RECOMMENDATIONS
---------------
${comparison.regressions.length > 0 ? 
  '- Investigate performance regressions and optimize accordingly' : 
  '- Performance is stable or improving'}
${comparison.overallStatus === 'poor' ? 
  '- Critical: Multiple performance regressions detected, immediate action required' : ''}

For detailed analysis, see: ${reportPath}
`;

    fs.writeFileSync(summaryPath, summary);
    console.log(`Baseline comparison report generated: ${reportPath}`);
    console.log(`Summary: ${summaryPath}`);
  }
}

module.exports = BaselineMetrics;

// CLI usage
if (require.main === module) {
  const action = process.argv[2] || 'compare';
  const baseline = new BaselineMetrics();

  if (action === 'establish') {
    baseline.establishBaseline()
      .then(result => {
        console.log('Baseline established successfully');
        process.exit(0);
      })
      .catch(error => {
        console.error('Failed to establish baseline:', error);
        process.exit(1);
      });
  } else {
    baseline.compareAgainstBaseline()
      .then(result => {
        console.log('Baseline comparison completed');
        // Exit with error code if there are critical regressions
        process.exit(result.overallStatus === 'poor' ? 1 : 0);
      })
      .catch(error => {
        console.error('Failed to compare against baseline:', error);
        process.exit(1);
      });
  }
}