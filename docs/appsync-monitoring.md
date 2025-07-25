## AppSync Monitoring & Observability

### CloudWatch Dashboard
A CloudWatch dashboard named `${CustomerId}-${ProjectId}-${Environment}-appsync-dashboard` is automatically created. It includes widgets for:
- **4XX/5XX Errors**: Tracks client and server errors for the AppSync API.
- **Latency & Integration Latency**: Shows end-to-end and backend integration latency.
- **Request Count**: Total number of GraphQL requests.
- **Throttled Requests**: Requests throttled due to rate limits.

Access the dashboard in AWS Console > CloudWatch > Dashboards.

### CloudWatch Alarms
The following alarms are set up for AppSync:
- **4XX Error Alarm**: Triggers if 5 or more client errors occur in a 5-minute window.
- **5XX Error Alarm**: Triggers if any server error occurs in a 5-minute window.
- **Latency Alarm**: Triggers if average latency exceeds 2 seconds in a 5-minute window.

Configure notification actions (e.g., SNS, email) as needed in the AWS Console.

### X-Ray Tracing
X-Ray tracing is enabled for the AppSync API. This allows you to trace requests end-to-end, including integration with DynamoDB and Lambda data sources. Use AWS X-Ray in the console to view traces, identify bottlenecks, and troubleshoot issues.

### Best Practices
- Monitor the dashboard regularly for spikes in errors or latency.
- Investigate and resolve alarms promptly.
- Use X-Ray traces to debug complex issues or performance bottlenecks. 