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
 * Standardize and clean Indonesian WhatsApp numbers into international digits format (628xxx).
 */
export function formatWhatsappNumber(phone) {
    if (!phone) return '';
    let cleaned = String(phone).replace(/[^0-9]/g, '');
    if (cleaned.startsWith('0')) {
        cleaned = '62' + cleaned.slice(1);
    } else if (cleaned.startsWith('8')) {
        cleaned = '628' + cleaned.slice(1);
    }
    return cleaned;
}

