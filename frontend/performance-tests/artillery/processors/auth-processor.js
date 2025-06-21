/**
 * Artillery processor for authentication flow performance testing
 */

module.exports = {
  generateTestUser,
  validateResponse,
  measureAuthLatency,
  checkMemoryUsage,
  simulateNetworkDelay
};

function generateTestUser(requestParams, context, ee, next) {
  // Generate unique test user data
  const timestamp = Date.now();
  const randomId = Math.floor(Math.random() * 10000);
  
  context.vars.email = `testuser${timestamp}${randomId}@performance.test`;
  context.vars.password = 'TestPassword123!';
  context.vars.firstName = 'Performance';
  context.vars.lastName = `User${randomId}`;
  context.vars.phoneNumber = `+1555${randomId.toString().padStart(4, '0')}`;
  
  return next();
}

function validateResponse(requestParams, response, context, ee, next) {
  // Validate response structure and timing
  if (response.statusCode !== 200 && response.statusCode !== 201) {
    ee.emit('counter', 'auth.errors.http_status', 1);
    console.error(`HTTP Error: ${response.statusCode} - ${response.body}`);
  }
  
  // Check response time thresholds
  const responseTime = response.timings.end - response.timings.start;
  
  if (responseTime > 2000) {
    ee.emit('counter', 'auth.errors.slow_response', 1);
  }
  
  if (responseTime > 5000) {
    ee.emit('counter', 'auth.errors.timeout', 1);
  }
  
  // Emit custom metrics
  ee.emit('histogram', 'auth.response_time', responseTime);
  
  return next();
}

function measureAuthLatency(requestParams, context, ee, next) {
  // Record timestamp for latency measurement
  context.vars.startTime = Date.now();
  return next();
}

function checkMemoryUsage(requestParams, context, ee, next) {
  // Simulate memory usage monitoring
  if (process.memoryUsage().heapUsed > 100 * 1024 * 1024) { // 100MB threshold
    ee.emit('counter', 'system.memory.high_usage', 1);
  }
  
  return next();
}

function simulateNetworkDelay(requestParams, context, ee, next) {
  // Simulate various network conditions
  const networkConditions = ['fast', 'slow', '3g', 'offline'];
  const condition = networkConditions[Math.floor(Math.random() * networkConditions.length)];
  
  let delay = 0;
  switch (condition) {
    case 'slow':
      delay = Math.random() * 1000 + 500; // 500-1500ms
      break;
    case '3g':
      delay = Math.random() * 2000 + 1000; // 1-3 seconds
      break;
    case 'offline':
      delay = 10000; // 10 seconds to simulate timeout
      break;
    default:
      delay = Math.random() * 100; // 0-100ms for fast connection
  }
  
  setTimeout(() => {
    context.vars.networkCondition = condition;
    ee.emit('counter', `network.condition.${condition}`, 1);
    next();
  }, delay);
}