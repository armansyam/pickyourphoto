import { NextResponse } from 'next/server';

/**
 * Standardized API Error Handler
 * In production: Logs full stack traces server-side while masking raw DB/Internal exceptions
 * In development: Returns detailed message for rapid debugging
 */
export function handleApiError(error, defaultMessage = 'Terjadi kesalahan pada sistem.', statusCode = 500) {
  console.error('[API Internal Error]:', error?.message || error);
  const isDev = process.env.NODE_ENV !== 'production';
  const safeMessage = isDev ? (error?.message || defaultMessage) : defaultMessage;

  return NextResponse.json({
    success: false,
    error: safeMessage
  }, { status: statusCode });
}

export function handleApiSuccess(data = {}, message = null, statusCode = 200) {
  return NextResponse.json({
    success: true,
    ...(message ? { message } : {}),
    ...data
  }, { status: statusCode });
}
