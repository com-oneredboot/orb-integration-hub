Please conduct a deep and thorough code review of my "auth-flow" feature. I want a comprehensive analysis that covers all aspects of the authentication implementation. Here's what I need you to examine:

**Security Analysis:**
- Authentication mechanisms and their implementation
- Password handling, hashing, and storage practices
- Session management and token security
- Input validation and sanitization
- Protection against common vulnerabilities (OWASP Top 10: injection attacks, broken authentication, sensitive data exposure, etc.)
- Rate limiting and brute force protection
- Secure communication (HTTPS enforcement, secure headers)

**Code Quality & Architecture:**
- Overall code structure and organization
- Design patterns used and their appropriateness
- Error handling and logging practices
- Code readability, maintainability, and documentation
- Separation of concerns and modularity
- Database interactions and query security
- API design and RESTful principles (if applicable)

**Functionality & Logic:**
- User registration and login flows
- Password reset and account recovery mechanisms
- Multi-factor authentication (if implemented)
- Authorization and permission handling
- Session timeout and cleanup
- Edge cases and error scenarios

**Testing & Reliability:**
- Test coverage for authentication flows
- Unit tests, integration tests, and security tests
- Mock implementations and test data handling
- Performance under load

**Best Practices & Standards:**
- Compliance with authentication best practices
- Framework-specific security recommendations
- Code style consistency
- Configuration management (environment variables, secrets)

Please provide:
1. A summary of findings with severity levels (Critical, High, Medium, Low)
2. Specific code examples where issues exist
3. Recommended fixes with code snippets where applicable
4. Security improvements and hardening suggestions
5. Performance optimization opportunities
6. Any missing functionality or incomplete implementations

Focus on both immediate security concerns and long-term maintainability. Be thorough but practical in your recommendations.

Please create a taskmaster task with subtasks for this request.