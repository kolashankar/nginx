# RealCast API - Error Codes Reference

Comprehensive guide to error codes and troubleshooting.

---

## HTTP Status Codes

### 2xx Success

| Code | Name | Description |
|------|------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 204 | No Content | Successful deletion |

### 4xx Client Errors

| Code | Name | Description | Common Causes |
|------|------|-------------|---------------|
| 400 | Bad Request | Invalid request parameters | Missing required fields, invalid format |
| 401 | Unauthorized | Authentication required or failed | Missing/invalid token, expired token |
| 403 | Forbidden | Access denied | Insufficient permissions, IP not whitelisted |
| 404 | Not Found | Resource doesn't exist | Invalid ID, deleted resource |
| 409 | Conflict | Resource conflict | Duplicate stream key, resource already exists |
| 422 | Unprocessable Entity | Validation failed | Invalid data format, constraint violation |
| 429 | Too Many Requests | Rate limit exceeded | Too many API calls |

### 5xx Server Errors

| Code | Name | Description | Action |
|------|------|-------------|--------|
| 500 | Internal Server Error | Server encountered an error | Retry, contact support |
| 502 | Bad Gateway | Upstream service unavailable | Wait and retry |
| 503 | Service Unavailable | Service temporarily down | Check status page, retry |
| 504 | Gateway Timeout | Request timed out | Retry with exponential backoff |

---

## Application Error Codes

### Authentication Errors (AUTH_*)

#### AUTH_001: Invalid Credentials
```json
{
  "code": "AUTH_001",
  "message": "Invalid email or password",
  "status": 401
}
```
**Solution:** Check credentials, reset password if needed

#### AUTH_002: Token Expired
```json
{
  "code": "AUTH_002",
  "message": "JWT token has expired",
  "status": 401
}
```
**Solution:** Refresh token or login again

#### AUTH_003: Invalid Token
```json
{
  "code": "AUTH_003",
  "message": "JWT token is invalid or malformed",
  "status": 401
}
```
**Solution:** Ensure Bearer token is correctly formatted

---

### Stream Errors (STREAM_*)

#### STREAM_001: Invalid Stream Key
```json
{
  "code": "STREAM_001",
  "message": "Stream key is invalid or expired",
  "status": 403
}
```
**Solution:** Generate new stream key

#### STREAM_002: Stream Already Active
```json
{
  "code": "STREAM_002",
  "message": "Stream is already live",
  "status": 409
}
```
**Solution:** Stop existing stream before starting new one

#### STREAM_003: Stream Not Found
```json
{
  "code": "STREAM_003",
  "message": "Stream does not exist",
  "status": 404
}
```
**Solution:** Verify stream ID

#### STREAM_004: Stream Limit Reached
```json
{
  "code": "STREAM_004",
  "message": "Maximum concurrent streams reached",
  "status": 403
}
```
**Solution:** Upgrade plan or stop inactive streams

---

### Rate Limiting Errors (RATE_*)

#### RATE_001: API Rate Limit
```json
{
  "code": "RATE_001",
  "message": "API rate limit exceeded",
  "status": 429,
  "retry_after": 60
}
```
**Solution:** Wait and retry after specified seconds

#### RATE_002: Stream Rate Limit
```json
{
  "code": "RATE_002",
  "message": "Too many stream creation requests",
  "status": 429,
  "retry_after": 300
}
```
**Solution:** Slow down stream creation frequency

---

### Validation Errors (VAL_*)

#### VAL_001: Missing Required Field
```json
{
  "code": "VAL_001",
  "message": "Required field 'title' is missing",
  "status": 400,
  "field": "title"
}
```
**Solution:** Include all required fields

#### VAL_002: Invalid Format
```json
{
  "code": "VAL_002",
  "message": "Email format is invalid",
  "status": 400,
  "field": "email"
}
```
**Solution:** Use correct format for field

---

### Webhook Errors (WEBHOOK_*)

#### WEBHOOK_001: Invalid Signature
```json
{
  "code": "WEBHOOK_001",
  "message": "Webhook signature verification failed",
  "status": 401
}
```
**Solution:** Verify HMAC signature using correct secret

#### WEBHOOK_002: Delivery Failed
```json
{
  "code": "WEBHOOK_002",
  "message": "Failed to deliver webhook after 3 retries",
  "status": 500
}
```
**Solution:** Check webhook endpoint is accessible

---

### Recording Errors (REC_*)

#### REC_001: Recording Failed
```json
{
  "code": "REC_001",
  "message": "Failed to start recording",
  "status": 500,
  "details": "Insufficient storage"
}
```
**Solution:** Check storage quota

#### REC_002: Recording Not Found
```json
{
  "code": "REC_002",
  "message": "Recording does not exist",
  "status": 404
}
```
**Solution:** Verify recording ID

---

## WebSocket Error Codes

### Connection Errors

#### WS_001: Authentication Failed
```json
{
  "error": {
    "code": "WS_001",
    "message": "WebSocket authentication failed",
    "type": "authentication_failed"
  }
}
```

#### WS_002: Connection Limit
```json
{
  "error": {
    "code": "WS_002",
    "message": "Maximum connections reached",
    "type": "connection_limit"
  }
}
```

### Chat Errors

#### WS_CHAT_001: User Banned
```json
{
  "error": {
    "code": "WS_CHAT_001",
    "message": "You are banned from this chat",
    "type": "user_banned",
    "until": "2024-12-09T12:00:00Z"
  }
}
```

#### WS_CHAT_002: User Muted
```json
{
  "error": {
    "code": "WS_CHAT_002",
    "message": "You are temporarily muted",
    "type": "user_muted",
    "duration": 300
  }
}
```

#### WS_CHAT_003: Slow Mode
```json
{
  "error": {
    "code": "WS_CHAT_003",
    "message": "Please wait before sending another message",
    "type": "slow_mode",
    "wait_seconds": 5
  }
}
```

---

## Error Handling Best Practices

### 1. Implement Retry Logic

```javascript
async function apiCallWithRetry(apiCall, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await apiCall();
    } catch (error) {
      if (error.status === 429) {
        // Rate limited - wait and retry
        const waitTime = error.retry_after || Math.pow(2, i) * 1000;
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else if (error.status >= 500) {
        // Server error - exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
      } else {
        // Client error - don't retry
        throw error;
      }
    }
  }
  throw new Error('Max retries exceeded');
}
```

### 2. Handle Specific Errors

```javascript
try {
  const stream = await api.streams.create(data);
} catch (error) {
  switch (error.code) {
    case 'AUTH_002':
      // Token expired - refresh
      await refreshToken();
      break;
    case 'STREAM_004':
      // Limit reached - show upgrade prompt
      showUpgradeModal();
      break;
    case 'RATE_001':
      // Rate limited - show wait message
      showMessage(`Please wait ${error.retry_after} seconds`);
      break;
    default:
      // Generic error
      showError(error.message);
  }
}
```

### 3. User-Friendly Messages

```javascript
const ERROR_MESSAGES = {
  'AUTH_001': 'Incorrect email or password. Please try again.',
  'AUTH_002': 'Your session has expired. Please log in again.',
  'STREAM_001': 'Invalid stream key. Please generate a new one.',
  'STREAM_004': 'You\'ve reached your stream limit. Upgrade for more!',
  'RATE_001': 'Whoa, slow down! Please wait a moment before trying again.',
  'default': 'Something went wrong. Please try again later.'
};

function getUserMessage(errorCode) {
  return ERROR_MESSAGES[errorCode] || ERROR_MESSAGES.default;
}
```

### 4. Logging Errors

```javascript
function logError(error, context) {
  console.error('RealCast Error:', {
    code: error.code,
    message: error.message,
    status: error.status,
    timestamp: new Date().toISOString(),
    context: context,
    user: getCurrentUser()?.id,
    endpoint: error.config?.url
  });
  
  // Send to error tracking service
  if (window.Sentry) {
    Sentry.captureException(error, {
      extra: { context }
    });
  }
}
```

---

## Common Issues & Solutions

### Issue: 401 Unauthorized on every request

**Cause:** Token expired or invalid

**Solution:**
1. Check token expiry
2. Implement token refresh
3. Ensure Bearer token format: `Authorization: Bearer {token}`

### Issue: 429 Rate Limit constantly

**Cause:** Too many requests

**Solution:**
1. Implement request debouncing
2. Cache responses where possible
3. Use webhooks instead of polling
4. Upgrade to higher tier

### Issue: Stream not starting (403)

**Cause:** Invalid stream key or permissions

**Solution:**
1. Regenerate stream key
2. Verify app ownership
3. Check API key scopes
4. Ensure stream hasn't been deleted

### Issue: Webhook not receiving events

**Cause:** Endpoint unreachable or signature verification failing

**Solution:**
1. Verify webhook URL is publicly accessible
2. Check HTTPS certificate is valid
3. Implement signature verification correctly
4. Check webhook logs in dashboard

---

## Support

If you encounter an error not documented here:

1. Check [Status Page](https://status.realcast.io)
2. Search [Discord Community](https://discord.gg/realcast)
3. Contact support@realcast.io with error details
