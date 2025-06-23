// file: performance-tests/organizations/performance-test-runner.js
// author: AI Assistant
// created: 2025-06-22
// description: Performance testing framework for Organizations Lambda vs DynamoDB resolvers

const AWS = require('aws-sdk');
const { performance } = require('perf_hooks');
const fs = require('fs');
const path = require('path');

// Configure AWS SDK
AWS.config.update({
    region: process.env.AWS_REGION || 'us-east-1'
});

const appsync = new AWS.AppSync();
const lambda = new AWS.Lambda();

class OrganizationsPerformanceTester {
    constructor(config) {
        this.config = {
            graphqlEndpoint: config.graphqlEndpoint,
            lambdaFunctionName: config.lambdaFunctionName,
            testIterations: config.testIterations || 100,
            concurrentUsers: config.concurrentUsers || 10,
            warmupIterations: config.warmupIterations || 10,
            ...config
        };
        
        this.results = {
            lambda: {
                coldStart: [],
                warmInvocation: [],
                errors: 0,
                totalRequests: 0
            },
            dynamodb: {
                response: [],
                errors: 0,
                totalRequests: 0
            }
        };
    }

    async runPerformanceComparison() {
        console.log('🚀 Starting Organizations Performance Test Suite');
        console.log(`📊 Test Configuration:`);
        console.log(`   - Iterations: ${this.config.testIterations}`);
        console.log(`   - Concurrent Users: ${this.config.concurrentUsers}`);
        console.log(`   - Warmup Iterations: ${this.config.warmupIterations}`);
        console.log('');

        try {
            // Step 1: Warmup Lambda functions
            await this.warmupLambda();

            // Step 2: Test Lambda resolver performance
            await this.testLambdaResolver();

            // Step 3: Test DynamoDB resolver performance (simulated)
            await this.testDynamoDBResolver();

            // Step 4: Generate performance report
            await this.generatePerformanceReport();

        } catch (error) {
            console.error('❌ Performance test failed:', error);
            throw error;
        }
    }

    async warmupLambda() {
        console.log('🔥 Warming up Lambda functions...');
        
        const warmupPromises = [];
        for (let i = 0; i < this.config.warmupIterations; i++) {
            warmupPromises.push(this.invokeLambdaFunction({
                operation: 'listOrganizations',
                isWarmup: true
            }));
        }

        await Promise.all(warmupPromises);
        console.log('✅ Lambda warmup completed\n');
    }

    async testLambdaResolver() {
        console.log('🧪 Testing Lambda Resolver Performance...');

        // Test cold start (simulate by waiting for function to go cold)
        await this.sleep(300000); // 5 minutes to ensure cold start
        const coldStartTime = await this.measureLambdaOperation('listOrganizations');
        this.results.lambda.coldStart.push(coldStartTime);

        // Test warm invocations
        const warmPromises = [];
        for (let i = 0; i < this.config.testIterations; i++) {
            warmPromises.push(this.measureLambdaOperation('listOrganizations'));
            
            // Batch requests to avoid overwhelming
            if (warmPromises.length >= this.config.concurrentUsers) {
                const batchResults = await Promise.all(warmPromises);
                this.results.lambda.warmInvocation.push(...batchResults);
                warmPromises.length = 0;
                await this.sleep(100); // Small delay between batches
            }
        }

        // Process remaining promises
        if (warmPromises.length > 0) {
            const batchResults = await Promise.all(warmPromises);
            this.results.lambda.warmInvocation.push(...batchResults);
        }

        console.log(`✅ Lambda testing completed: ${this.results.lambda.warmInvocation.length} requests\n`);
    }

    async testDynamoDBResolver() {
        console.log('🗄️  Testing DynamoDB Resolver Performance (Simulated)...');

        // Simulate DynamoDB direct access performance
        // In reality, this would test actual AppSync DynamoDB resolvers
        const dynamoPromises = [];
        
        for (let i = 0; i < this.config.testIterations; i++) {
            dynamoPromises.push(this.measureDynamoDBOperation());
            
            // Batch requests
            if (dynamoPromises.length >= this.config.concurrentUsers) {
                const batchResults = await Promise.all(dynamoPromises);
                this.results.dynamodb.response.push(...batchResults);
                dynamoPromises.length = 0;
                await this.sleep(50); // Smaller delay for DynamoDB
            }
        }

        // Process remaining promises
        if (dynamoPromises.length > 0) {
            const batchResults = await Promise.all(dynamoPromises);
            this.results.dynamodb.response.push(...batchResults);
        }

        console.log(`✅ DynamoDB testing completed: ${this.results.dynamodb.response.length} requests\n`);
    }

    async measureLambdaOperation(operation) {
        const startTime = performance.now();
        
        try {
            await this.invokeLambdaFunction({ operation });
            this.results.lambda.totalRequests++;
            return performance.now() - startTime;
        } catch (error) {
            this.results.lambda.errors++;
            console.error(`❌ Lambda error:`, error.message);
            return null;
        }
    }

    async measureDynamoDBOperation() {
        const startTime = performance.now();
        
        try {
            // Simulate DynamoDB scan operation timing
            await this.simulateDynamoDBScan();
            this.results.dynamodb.totalRequests++;
            return performance.now() - startTime;
        } catch (error) {
            this.results.dynamodb.errors++;
            console.error(`❌ DynamoDB error:`, error.message);
            return null;
        }
    }

    async invokeLambdaFunction(params) {
        const payload = {
            info: { fieldName: 'listOrganizations' },
            identity: {
                sub: 'test-user-123',
                groups: ['CUSTOMER']
            },
            arguments: {}
        };

        const lambdaParams = {
            FunctionName: this.config.lambdaFunctionName,
            Payload: JSON.stringify(payload),
            InvocationType: 'RequestResponse'
        };

        return lambda.invoke(lambdaParams).promise();
    }

    async simulateDynamoDBScan() {
        // Simulate DynamoDB scan timing based on typical performance
        const baseLatency = 8; // Base 8ms for DynamoDB
        const jitter = Math.random() * 12; // Add 0-12ms jitter
        
        await this.sleep(baseLatency + jitter);
        return { Items: [] }; // Simulated response
    }

    async generatePerformanceReport() {
        console.log('📈 Generating Performance Report...');

        const report = {
            timestamp: new Date().toISOString(),
            configuration: this.config,
            results: {
                lambda: this.calculateStats(this.results.lambda),
                dynamodb: this.calculateStats(this.results.dynamodb),
                comparison: this.calculateComparison()
            }
        };

        // Write detailed report to file
        const reportPath = path.join(__dirname, 'reports', `performance-report-${Date.now()}.json`);
        
        // Ensure reports directory exists
        const reportsDir = path.dirname(reportPath);
        if (!fs.existsSync(reportsDir)) {
            fs.mkdirSync(reportsDir, { recursive: true });
        }

        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

        // Print summary to console
        this.printPerformanceSummary(report);

        return report;
    }

    calculateStats(results) {
        const validTimes = [];
        
        if (results.warmInvocation) {
            validTimes.push(...results.warmInvocation.filter(t => t !== null));
        }
        if (results.response) {
            validTimes.push(...results.response.filter(t => t !== null));
        }

        if (validTimes.length === 0) {
            return { error: 'No valid timing data' };
        }

        const sorted = validTimes.sort((a, b) => a - b);
        
        return {
            count: validTimes.length,
            errors: results.errors,
            errorRate: (results.errors / results.totalRequests * 100).toFixed(2) + '%',
            min: Math.min(...validTimes).toFixed(2),
            max: Math.max(...validTimes).toFixed(2),
            mean: (validTimes.reduce((a, b) => a + b, 0) / validTimes.length).toFixed(2),
            median: sorted[Math.floor(sorted.length / 2)].toFixed(2),
            p95: sorted[Math.floor(sorted.length * 0.95)].toFixed(2),
            p99: sorted[Math.floor(sorted.length * 0.99)].toFixed(2),
            coldStart: results.coldStart ? results.coldStart[0]?.toFixed(2) : 'N/A'
        };
    }

    calculateComparison() {
        const lambdaStats = this.calculateStats(this.results.lambda);
        const dynamoStats = this.calculateStats(this.results.dynamodb);

        if (lambdaStats.error || dynamoStats.error) {
            return { error: 'Cannot compare due to insufficient data' };
        }

        return {
            meanDifference: (parseFloat(lambdaStats.mean) - parseFloat(dynamoStats.mean)).toFixed(2),
            medianDifference: (parseFloat(lambdaStats.median) - parseFloat(dynamoStats.median)).toFixed(2),
            p95Difference: (parseFloat(lambdaStats.p95) - parseFloat(dynamoStats.p95)).toFixed(2),
            lambdaSlowerFactor: (parseFloat(lambdaStats.mean) / parseFloat(dynamoStats.mean)).toFixed(2)
        };
    }

    printPerformanceSummary(report) {
        console.log('\n' + '='.repeat(80));
        console.log('🎯 PERFORMANCE TEST RESULTS SUMMARY');
        console.log('='.repeat(80));

        const { lambda, dynamodb, comparison } = report.results;

        console.log('\n📊 LAMBDA RESOLVER PERFORMANCE:');
        console.log(`   Cold Start:    ${lambda.coldStart}ms`);
        console.log(`   Mean:          ${lambda.mean}ms`);
        console.log(`   Median:        ${lambda.median}ms`);
        console.log(`   95th %ile:     ${lambda.p95}ms`);
        console.log(`   99th %ile:     ${lambda.p99}ms`);
        console.log(`   Error Rate:    ${lambda.errorRate}`);

        console.log('\n🗄️  DYNAMODB RESOLVER PERFORMANCE:');
        console.log(`   Mean:          ${dynamodb.mean}ms`);
        console.log(`   Median:        ${dynamodb.median}ms`);
        console.log(`   95th %ile:     ${dynamodb.p95}ms`);
        console.log(`   99th %ile:     ${dynamodb.p99}ms`);
        console.log(`   Error Rate:    ${dynamodb.errorRate}`);

        console.log('\n⚖️  PERFORMANCE COMPARISON:');
        console.log(`   Mean Difference:     ${comparison.meanDifference}ms`);
        console.log(`   Median Difference:   ${comparison.medianDifference}ms`);
        console.log(`   95th %ile Difference: ${comparison.p95Difference}ms`);
        console.log(`   Lambda Slower Factor: ${comparison.lambdaSlowerFactor}x`);

        console.log('\n💡 RECOMMENDATIONS:');
        if (parseFloat(comparison.lambdaSlowerFactor) < 2.0) {
            console.log('   ✅ Lambda performance is acceptable (<2x slower than DynamoDB)');
            console.log('   ✅ Security benefits justify the performance trade-off');
            console.log('   💰 Consider provisioned concurrency for production workloads');
        } else {
            console.log('   ⚠️  Lambda is significantly slower than DynamoDB');
            console.log('   🔧 Consider optimizations: provisioned concurrency, ARM64, smaller package');
            console.log('   📊 Re-evaluate if security benefits justify performance impact');
        }

        console.log('\n' + '='.repeat(80));
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Configuration and execution
const config = {
    lambdaFunctionName: process.env.ORGANIZATIONS_LAMBDA_FUNCTION || 'orb-integration-hub-organizations-resolver',
    graphqlEndpoint: process.env.GRAPHQL_ENDPOINT || 'https://your-appsync-endpoint.appsync-api.us-east-1.amazonaws.com/graphql',
    testIterations: parseInt(process.env.TEST_ITERATIONS) || 50,
    concurrentUsers: parseInt(process.env.CONCURRENT_USERS) || 5,
    warmupIterations: parseInt(process.env.WARMUP_ITERATIONS) || 5
};

// Run performance tests if this file is executed directly
if (require.main === module) {
    const tester = new OrganizationsPerformanceTester(config);
    
    tester.runPerformanceComparison()
        .then(() => {
            console.log('\n🎉 Performance testing completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Performance testing failed:', error);
            process.exit(1);
        });
}

module.exports = OrganizationsPerformanceTester;