/**
 * In-Memory Rate Limiter for Pick-Your-Photo API Endpoints
 * Prevents brute-force attacks and abuse on sensitive public routes.
 */

const rateLimitMap = new Map();

export function checkRateLimit(identifier, limit = 5, windowSeconds = 60) {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const key = String(identifier || 'anon').toLowerCase().trim();

  let entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetTime) {
    entry = {
      count: 1,
      resetTime: now + windowMs,
    };
    rateLimitMap.set(key, entry);
    return { success: true, remaining: limit - 1, resetSeconds: windowSeconds };
  }

  entry.count += 1;

  if (entry.count > limit) {
    const resetSeconds = Math.ceil((entry.resetTime - now) / 1000);
    return { success: false, remaining: 0, resetSeconds };
  }

  return {
    success: true,
    remaining: Math.max(0, limit - entry.count),
    resetSeconds: Math.ceil((entry.resetTime - now) / 1000)
  };
}

export function getClientIp(request) {
  if (!request) return '127.0.0.1';
  const forwarded = request.headers?.get?.('x-forwarded-for') || request.headers?.['x-forwarded-for'];
  if (forwarded) {
    return String(forwarded).split(',')[0].trim();
  }
  const realIp = request.headers?.get?.('x-real-ip') || request.headers?.['x-real-ip'];
  if (realIp) return String(realIp).trim();
  return '127.0.0.1';
}

// Periodic TTL sweep every 15 minutes to prevent heap memory growth
if (typeof setInterval !== 'undefined') {
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, val] of rateLimitMap.entries()) {
      if (now > val.resetTime) {
        rateLimitMap.delete(key);
      }
    }
  }, 15 * 60 * 1000);
  if (cleanupTimer && typeof cleanupTimer.unref === 'function') {
    cleanupTimer.unref();
  }
}

