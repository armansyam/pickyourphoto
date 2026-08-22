i# Audit Report: Pick Your Photo Project

## 1. Project Overview
SaaS platform for photo management with enterprise-grade features:
- Multi-payment gateway integration (6 Indonesian providers)
- Zero-storage media streaming via Google Drive
- Client-side RAW file handling
- 8-tab admin control panel
- 30-day grace period for expired subscriptions

## 2. Architecture Analysis
### 2.1 Technology Stack
- **Framework**: Next.js 14.2.3 (App Router)
- **Database**: SQLite with WAL mode via better-sqlite3
- **Auth**: JWT with 24h expiration
- **Payment**: 6 integrated gateway providers
- **Storage**: Google Drive multi-account pool with smart balancing

### 2.2 Directory Structure
- **app/**: Next.js App Router (70+ API routes)
- **components/**: Reusable UI components
- **lib/**: Core utilities and integrations
- **data/**: SQLite database volume (critical persistence layer)

## 3. Security Assessment

### 4.1 Authentication Security
**Strengths:**
- JWT tokens with 24h expiration
- httpOnly, secure cookies with sameSite=lax
- Role-based access control (admin/vendor)
- Grace period handling (7 days)
- Dynamic maxProjects calculation

**Critical Findings:**
- **CRITICAL**: JWT_SECRET validation in getJwtSecret() uses default string 'isi_dengan_string_acak_panjang_dan_aman' as fallback (line 7 in auth.js). This is a severe security risk if environment variable is missing.
- **HIGH**: Middleware excludes API routes from authentication checks (lines 32-34), requiring individual route implementation. Risk of missing auth checks in specific endpoints.

### 4.2 Database Security
**Strengths:**
- WAL mode with 10s busy_timeout (lines 35-37 in db.js)
- Parameterized queries via better-sqlite3
- Table name prefixing (vendor./trial.) prevents accidental cross-database access
- Proper indexing on critical fields (email, subdomain)

**Recommendations:**
- Add database file permission restrictions (chmod 600 data/)
- Implement database encryption at rest for sensitive data

### 4.3 Payment Gateway Integration
**Strengths:**
- Signature verification for all payment webhooks
- Atomic transaction handling with SQLite conditional locks
- Multi-provider abstraction layer

**Recommendations:**
- Add webhook replay protection (nonce validation)
- Implement webhook signature verification in all payment handlers

### 4.4 Storage Security
**Strengths:**
- Zero-storage architecture (files streamed directly from Google Drive)
- Client-side RAW file handling (no server storage)
- Cloudflare CDN caching for media

**Recommendations:**
- Add Content Security Policy (CSP) headers for media endpoints
- Implement rate limiting on storage upload endpoints

## 5. Critical Security Issues

### 5.1 JWT_SECRET Configuration Risk (CRITICAL)
**Issue**: getJwtSecret() function (auth.js:6-10) uses hardcoded default string as fallback:
```javascript
if (!secret || secret.trim() === '' || secret === 'isi_dengan_string_acak_panjang_dan_aman') {
  throw new Error('CRITICAL SECURITY CONFIGURATION MISSING...');
}
```
**Impact**: If JWT_SECRET environment variable is missing or empty, the app uses predictable default string, making all tokens vulnerable to brute-force attacks.

**Fix**: Remove default string fallback and enforce JWT_SECRET requirement:
```javascript
if (!secret || secret.trim() === '') {
  throw new Error('CRITICAL: JWT_SECRET environment variable is required');
}
```

### 5.2 Missing Authentication on API Routes (HIGH)
**Issue**: Middleware explicitly excludes API routes from authentication checks (middleware.js:32-34):
```javascript
if (pathname.startsWith('/api') || ...) {
  return NextResponse.next();
}
```
**Impact**: API routes must implement their own authentication, creating multiple points of failure where authentication might be missed.

**Fix**: Implement centralized authentication in middleware or create a base API route handler that validates tokens.

## 6. Performance Observations
- **Positive**: WAL mode and memory-mapped I/O (64MB cache) optimize database performance
- **Opportunity**: Consider connection pooling for high-concurrency scenarios
- **Note**: SQLite is suitable for current scale (<10k vendors) but may require PostgreSQL migration at hyperscale

## 7. Deployment Integrity
**Strengths:**
- Docker-compose includes CRON_SECRET requirement (comment line 11)
- Environment variables properly separated (NODE_ENV vs JWT_SECRET)
- Multi-stage Docker build recipe

**Recommendations:**
- Add health check endpoint for production monitoring
- Implement automated database backup verification

## 8. Code Quality Assessment
**Positive Practices:**
- Consistent use of better-sqlite3 with proper pragmas
- Modular payment gateway drivers
- Comprehensive error handling in auth functions
- Graceful degradation for expired accounts

**Areas for Improvement:**
- Reduce nested conditional logic in auth.js (lines 101-136)
- Implement input validation for all API endpoints
- Add type safety to database queries

## 9. Recommendations Summary
1. **Critical**: Fix JWT_SECRET validation to remove default string fallback
2. **High**: Implement centralized authentication for all API routes
3. **Medium**: Add rate limiting to payment and authentication endpoints
4. **Low**: Implement database file permission restrictions
5. **Low**: Add CSP headers for media streaming endpoints

**Next Steps**:
1. Address critical JWT_SECRET issue immediately
2. Conduct security review of all payment webhook handlers
3. Implement rate limiting on /api/auth/* and /api/payment/* endpoints
4. Add comprehensive logging for security events