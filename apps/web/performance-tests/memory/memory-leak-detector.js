/**
 * Memory leak detection script for authentication flow
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

class MemoryLeakDetector {
  constructor(options = {}) {
    this.url = options.url || 'http://localhost:4200/user/auth';
    this.iterations = options.iterations || 20;
    this.samplingInterval = options.samplingInterval || 5000;
    this.reportPath = options.reportPath || './performance-tests/reports/memory-leak-report.json';
    this.memorySnapshots = [];
    this.performanceMetrics = [];
  }

  async detectMemoryLeaks() {
    console.log('Starting memory leak detection...');
    
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
        '--enable-features=NetworkService'
      ]
    });

    try {
      const page = await browser.newPage();
      
      // Enable memory monitoring
      await page.coverage.startJSCoverage();
      await page.coverage.startCSSCoverage();
      
      // Set up memory sampling
      await this.setupMemoryMonitoring(page);
      
      // Perform authentication flow iterations
      for (let i = 0; i < this.iterations; i++) {
        console.log(`Iteration ${i + 1}/${this.iterations}`);
        await this.performAuthenticationCycle(page, i);
        await this.collectMemoryMetrics(page, i);
        
        // Force garbage collection if available
        if (page.evaluate && typeof page.evaluate === 'function') {
          try {
            await page.evaluate(() => {
              if (window.gc) {
                window.gc();
              }
            });
          } catch (e) {
            // GC not available, continue
          }
        }
        
        await this.wait(this.samplingInterval);
      }
      
      // Final memory snapshot
      await this.collectMemoryMetrics(page, this.iterations);
      
      // Analyze results
      const analysis = this.analyzeMemoryLeaks();
      
      // Generate report
      await this.generateReport(analysis);
      
      return analysis;
      
    } finally {
      await browser.close();
    }
  }

  async setupMemoryMonitoring(page) {
    // Monitor performance metrics
    await page.evaluateOnNewDocument(() => {
      window.performanceMetrics = {
        memoryUsage: [],
        navigationTimings: [],
        resourceTimings: []
      };
      
      // Monitor memory usage
      if (performance.memory) {
        setInterval(() => {
          window.performanceMetrics.memoryUsage.push({
            timestamp: Date.now(),
            used: performance.memory.usedJSHeapSize,
            total: performance.memory.totalJSHeapSize,
            limit: performance.memory.jsHeapSizeLimit
          });
        }, 1000);
      }
    });
  }

  async performAuthenticationCycle(page, iteration) {
    try {
      // Navigate to auth page
      await page.goto(this.url, { waitUntil: 'networkidle2' });
      
      // Fill email
      await page.waitForSelector('#email-input', { timeout: 10000 });
      await page.type('#email-input', `test${iteration}@memory.test`);
      
      // Click continue
      await page.click('.auth-flow__button');
      
      // Wait for password step
      await page.waitForSelector('#password-setup-input', { timeout: 10000 });
      await page.type('#password-setup-input', 'TestPassword123!');
      
      // Continue to next step
      await page.click('.auth-flow__button');
      
      // Wait for name setup
      await page.waitForSelector('#first-name-input', { timeout: 10000 });
      await page.type('#first-name-input', 'Memory');
      await page.type('#last-name-input', 'Test');
      
      // Continue to phone setup
      await page.click('.auth-flow__button');
      
      // Phone number
      await page.waitForSelector('#phone-input', { timeout: 10000 });
      await page.type('#phone-input', `+155512345${iteration.toString().padStart(2, '0')}`);
      
      // Simulate form interactions
      await page.evaluate(() => {
        // Simulate user interactions that might cause memory leaks
        const inputs = document.querySelectorAll('input');
        inputs.forEach(input => {
          input.focus();
          input.blur();
        });
        
        // Trigger form validations
        const event = new Event('input', { bubbles: true });
        inputs.forEach(input => input.dispatchEvent(event));
      });
      
    } catch (error) {
      console.error(`Error in iteration ${iteration}:`, error.message);
    }
  }

  async collectMemoryMetrics(page, iteration) {
    try {
      // Get JavaScript heap info
      const metrics = await page.metrics();
      
      // Get performance memory info
      const memoryInfo = await page.evaluate(() => {
        if (performance.memory) {
          return {
            usedJSHeapSize: performance.memory.usedJSHeapSize,
            totalJSHeapSize: performance.memory.totalJSHeapSize,
            jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
          };
        }
        return null;
      });
      
      // Collect DOM node count
      const nodeCount = await page.evaluate(() => document.querySelectorAll('*').length);
      
      // Collect event listener count (approximation)
      const eventListenerCount = await page.evaluate(() => {
        let count = 0;
        const elements = document.querySelectorAll('*');
        elements.forEach(el => {
          // This is an approximation as direct listener count is not easily accessible
          if (el.onclick || el.addEventListener) count++;
        });
        return count;
      });
      
      const snapshot = {
        iteration,
        timestamp: Date.now(),
        metrics,
        memoryInfo,
        nodeCount,
        eventListenerCount
      };
      
      this.memorySnapshots.push(snapshot);
      
      console.log(`Memory usage at iteration ${iteration}: ${memoryInfo ? Math.round(memoryInfo.usedJSHeapSize / 1024 / 1024) : 'N/A'} MB`);
      
    } catch (error) {
      console.error(`Error collecting metrics at iteration ${iteration}:`, error.message);
    }
  }

  analyzeMemoryLeaks() {
    if (this.memorySnapshots.length < 2) {
      return { error: 'Insufficient data for analysis' };
    }

    const analysis = {
      totalIterations: this.iterations,
      samplingInterval: this.samplingInterval,
      memoryTrend: this.analyzeMemoryTrend(),
      domLeaks: this.analyzeDOMLeaks(),
      eventListenerLeaks: this.analyzeEventListenerLeaks(),
      recommendations: [],
      summary: {}
    };

    // Generate recommendations
    if (analysis.memoryTrend.isLeaking) {
      analysis.recommendations.push('Memory leak detected: Memory usage increases over time');
    }
    
    if (analysis.domLeaks.isLeaking) {
      analysis.recommendations.push('DOM leak detected: DOM node count increases without cleanup');
    }
    
    if (analysis.eventListenerLeaks.isLeaking) {
      analysis.recommendations.push('Event listener leak detected: Listeners not properly removed');
    }

    // Summary
    analysis.summary = {
      hasMemoryLeak: analysis.memoryTrend.isLeaking,
      hasDOMLeak: analysis.domLeaks.isLeaking,
      hasEventListenerLeak: analysis.eventListenerLeaks.isLeaking,
      severity: this.calculateSeverity(analysis)
    };

    return analysis;
  }

  analyzeMemoryTrend() {
    const memoryValues = this.memorySnapshots
      .filter(s => s.memoryInfo)
      .map(s => s.memoryInfo.usedJSHeapSize);
    
    if (memoryValues.length < 2) {
      return { error: 'Insufficient memory data' };
    }

    const first = memoryValues[0];
    const last = memoryValues[memoryValues.length - 1];
    const increase = last - first;
    const percentageIncrease = (increase / first) * 100;
    
    // Calculate trend
    let trend = 0;
    for (let i = 1; i < memoryValues.length; i++) {
      if (memoryValues[i] > memoryValues[i - 1]) trend++;
    }
    
    const isLeaking = percentageIncrease > 20 && trend > memoryValues.length * 0.6;
    
    return {
      initialMemory: first,
      finalMemory: last,
      increase,
      percentageIncrease,
      isLeaking,
      confidence: trend / memoryValues.length
    };
  }

  analyzeDOMLeaks() {
    const nodeValues = this.memorySnapshots.map(s => s.nodeCount);
    const first = nodeValues[0];
    const last = nodeValues[nodeValues.length - 1];
    const increase = last - first;
    const percentageIncrease = (increase / first) * 100;
    
    const isLeaking = percentageIncrease > 10;
    
    return {
      initialNodes: first,
      finalNodes: last,
      increase,
      percentageIncrease,
      isLeaking
    };
  }

  analyzeEventListenerLeaks() {
    const listenerValues = this.memorySnapshots.map(s => s.eventListenerCount);
    const first = listenerValues[0];
    const last = listenerValues[listenerValues.length - 1];
    const increase = last - first;
    const percentageIncrease = (increase / first) * 100;
    
    const isLeaking = percentageIncrease > 15;
    
    return {
      initialListeners: first,
      finalListeners: last,
      increase,
      percentageIncrease,
      isLeaking
    };
  }

  calculateSeverity(analysis) {
    let severity = 'low';
    
    if (analysis.memoryTrend.percentageIncrease > 50) severity = 'high';
    else if (analysis.memoryTrend.percentageIncrease > 25) severity = 'medium';
    
    if (analysis.domLeaks.percentageIncrease > 25) severity = 'high';
    if (analysis.eventListenerLeaks.percentageIncrease > 30) severity = 'high';
    
    return severity;
  }

  async generateReport(analysis) {
    const report = {
      timestamp: new Date().toISOString(),
      url: this.url,
      testConfiguration: {
        iterations: this.iterations,
        samplingInterval: this.samplingInterval
      },
      analysis,
      rawData: this.memorySnapshots
    };

    // Ensure reports directory exists
    const reportsDir = path.dirname(this.reportPath);
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    fs.writeFileSync(this.reportPath, JSON.stringify(report, null, 2));
    console.log(`Memory leak report generated: ${this.reportPath}`);
    
    // Generate summary
    this.generateSummaryReport(analysis);
  }

  generateSummaryReport(analysis) {
    const summaryPath = this.reportPath.replace('.json', '-summary.txt');
    const summary = `
Memory Leak Detection Summary
============================
URL: ${this.url}
Test Duration: ${this.iterations} iterations
Sampling Interval: ${this.samplingInterval}ms

Results:
--------
Memory Leak: ${analysis.summary.hasMemoryLeak ? 'DETECTED' : 'Not detected'}
DOM Leak: ${analysis.summary.hasDOMLeak ? 'DETECTED' : 'Not detected'}
Event Listener Leak: ${analysis.summary.hasEventListenerLeak ? 'DETECTED' : 'Not detected'}
Severity: ${analysis.summary.severity.toUpperCase()}

Memory Trend:
${analysis.memoryTrend.percentageIncrease ? `- Memory increased by ${analysis.memoryTrend.percentageIncrease.toFixed(2)}%` : '- Memory data unavailable'}

Recommendations:
${analysis.recommendations.map(r => `- ${r}`).join('\n')}

Generated: ${new Date().toISOString()}
`;

    fs.writeFileSync(summaryPath, summary);
    console.log(`Summary report generated: ${summaryPath}`);
  }

  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = MemoryLeakDetector;

// CLI usage
if (require.main === module) {
  const detector = new MemoryLeakDetector({
    url: process.argv[2] || 'http://localhost:4200/user/auth',
    iterations: parseInt(process.argv[3]) || 20,
    samplingInterval: parseInt(process.argv[4]) || 5000
  });

  detector.detectMemoryLeaks()
    .then(analysis => {
      console.log('Memory leak detection completed');
      console.log('Summary:', analysis.summary);
      process.exit(analysis.summary.hasMemoryLeak ? 1 : 0);
    })
    .catch(error => {
      console.error('Memory leak detection failed:', error);
      process.exit(1);
    });
}