/**
 * Artillery stress test processor for authentication system
 */

module.exports = {
  generateStressUser,
  validateStressResponse,
  checkRateLimiting,
  monitorResourceUsage,
  simulateMemoryPressure
};

let requestCounter = 0;
let errorCounter = 0;
let rateLimitCounter = 0;

function generateStressUser(context, events, done) {
  requestCounter++;
  
  // Generate high-volume test data
  context.vars.email = `stress${requestCounter}@load.test`;
  context.vars.password = 'StressTest123!';
  context.vars.requestId = requestCounter;
  context.vars.timestamp = Date.now();
  
  // Simulate varying user behaviors under stress
  if (requestCounter % 10 === 0) {
    context.vars.invalidPassword = 'wrong-password';
  }
  
  return done();
}

function validateStressResponse(context, events, done) {
  const responseTime = Date.now() - context.vars.timestamp;
  
  // Track stress test metrics
  events.emit('histogram', 'stress.response_time', responseTime);
  
  // Error rate tracking
  if (context.response && context.response.statusCode >= 400) {
    errorCounter++;
    events.emit('counter', 'stress.errors.total', 1);
    
    if (context.response.statusCode === 429) {
      rateLimitCounter++;
      events.emit('counter', 'stress.rate_limited', 1);
    } else if (context.response.statusCode >= 500) {
      events.emit('counter', 'stress.server_errors', 1);
    }
  }
  
  // Performance thresholds under stress
  if (responseTime > 5000) {
    events.emit('counter', 'stress.slow_responses', 1);
  }
  
  if (responseTime > 10000) {
    events.emit('counter', 'stress.timeout_responses', 1);
  }
  
  // Calculate error rate
  const errorRate = (errorCounter / requestCounter) * 100;
  events.emit('rate', 'stress.error_rate', errorRate);
  
  return done();
}

function checkRateLimiting(context, events, done) {
  // Verify rate limiting is working properly
  if (context.response && context.response.statusCode === 429) {
    events.emit('counter', 'rate_limiting.triggered', 1);
    
    // Check for proper rate limiting headers
    const headers = context.response.headers || {};
    if (headers['retry-after'] || headers['x-ratelimit-remaining']) {
      events.emit('counter', 'rate_limiting.proper_headers', 1);
    } else {
      events.emit('counter', 'rate_limiting.missing_headers', 1);
    }
  }
  
  return done();
}

function monitorResourceUsage(context, events, done) {
  // Monitor system resource usage during stress
  const memUsage = process.memoryUsage();
  const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
  
  events.emit('histogram', 'system.memory.heap_used_mb', heapUsedMB);
  
  if (heapUsedMB > 150) {
    events.emit('counter', 'system.memory.high_usage', 1);
  }
  
  if (heapUsedMB > 250) {
    events.emit('counter', 'system.memory.critical_usage', 1);
  }
  
  // Check if garbage collection is keeping up
  const heapTotal = memUsage.heapTotal / 1024 / 1024;
  const heapUtilization = (heapUsedMB / heapTotal) * 100;
  
  events.emit('histogram', 'system.memory.heap_utilization', heapUtilization);
  
  if (heapUtilization > 80) {
    events.emit('counter', 'system.memory.high_utilization', 1);
  }
  
  return done();
}

function simulateMemoryPressure(context, events, done) {
  // Simulate memory pressure scenarios
  const largeArray = new Array(1000).fill('memory-pressure-test-data');
  
  setTimeout(() => {
    // Release memory after delay
    largeArray.length = 0;
    events.emit('counter', 'memory_pressure.simulation_complete', 1);
    done();
  }, 100);
}