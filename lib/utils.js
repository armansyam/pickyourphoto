/**
 * lib/utils.js — Shared Utility Helpers
 * Safe JSON parsing, input validation, and common patterns.
 */

import { NextResponse } from 'next/server';

/**
 * Safely parse JSON body from a Next.js Request.
 * Returns the parsed object, or a NextResponse 400 if the body is empty/malformed.
 * Usage:
 *   const result = await safeJson(request);
 *   if (result instanceof NextResponse) return result;
 *   const { field } = result;
 */
export async function safeJson(request, fallback = null) {
    try {
        const text = await request.text();
        if (!text || text.trim() === '') {
            if (fallback !== null) return fallback;
            return NextResponse.json({ message: 'Request body tidak boleh kosong.' }, { status: 400 });
        }
        return JSON.parse(text);
    } catch (_) {
        if (fallback !== null) return fallback;
        return NextResponse.json({ message: 'Format request body tidak valid (bukan JSON).' }, { status: 400 });
    }
}

/**
 * Validate required fields. Returns null if valid, or a NextResponse 400 with error message.
 */
export function requireFields(obj, fields) {
    for (const field of fields) {
        const val = obj[field];
        if (val === undefined || val === null || (typeof val === 'string' && val.trim() === '')) {
            return NextResponse.json({ message: `Field '${field}' wajib diisi.` }, { status: 400 });
        }
    }
    return null;
}
