# Content Security Policy Server Configuration

## Important: Frame-Ancestors Directive

The browser console shows this warning:
```
The Content Security Policy directive 'frame-ancestors' is ignored when delivered via a <meta> element.
```

### Why This Happens
The `frame-ancestors` directive can only be set via HTTP headers, not through HTML meta tags. This is a browser security restriction.

### Required Server-Side Configuration

To properly implement clickjacking protection, add this HTTP header at your web server level:

#### Apache (.htaccess)
```apache
Header always set X-Frame-Options "DENY"
Header always set Content-Security-Policy "frame-ancestors 'none'"
```

#### Nginx
```nginx
add_header X-Frame-Options DENY always;
add_header Content-Security-Policy "frame-ancestors 'none'" always;
```

#### CloudFront (AWS)
```json
{
  "ResponseHeadersPolicy": {
    "SecurityHeadersConfig": {
      "ContentSecurityPolicy": {
        "ContentSecurityPolicy": "frame-ancestors 'none'",
        "Override": true
      },
      "FrameOptions": {
        "FrameOption": "DENY",
        "Override": true
      }
    }
  }
}
```

#### Express.js (Node.js)
```javascript
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Content-Security-Policy', "frame-ancestors 'none'");
  next();
});
```

### Current Implementation
- ✅ **Meta tag CSP**: Provides baseline protection for same-origin policies
- ✅ **X-Content-Type-Options**: Working correctly via meta tags
- ✅ **X-XSS-Protection**: Working correctly via meta tags  
- ✅ **Referrer-Policy**: Working correctly via meta tags
- ❌ **X-Frame-Options**: Requires HTTP header implementation (removed from meta tags)
- ❌ **Frame-ancestors**: Requires HTTP header implementation

### Console Warnings Resolved
- ✅ **X-Frame-Options meta warning**: Fixed by removing meta tag implementation
- ✅ **Frame-ancestors meta warning**: Fixed by removing from CSP meta tag
- ✅ **Oversized image warning**: Fixed by using thumbnail version of logo

### Recommendation
Deploy the HTTP header configuration above to complete the clickjacking protection implementation. The current meta tag approach provides partial protection but full security requires server-side headers.