import { NextResponse } from 'next/server';
import { getAuthVendor } from '@/lib/auth';
import db from '@/lib/db';
import fs from 'fs';
import path from 'path';
import { getRequestOrigin } from '@/lib/url';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    // Check if user is logged in
    const vendor = getAuthVendor();
    if (vendor) {
        const origin = getRequestOrigin(request);
        if (vendor.role === 'admin') {
            return NextResponse.redirect(new URL('/admin', origin));
        } else {
            return NextResponse.redirect(new URL('/dashboard', origin));
        }
    }

    // Read static landing page html
    const filePath = path.join(process.cwd(), 'public/landing.html');
    let html = fs.readFileSync(filePath, 'utf8');

    try {
        const plans = db.prepare("SELECT * FROM plans WHERE status = 'active' ORDER BY price ASC").all();
        if (plans && plans.length > 0) {
            const dynamicTierHtml = plans.map(plan => {
                const isFeatured = plan.name.includes('Pro');
                const logoText = (plan.allowCustomLogo === 1 || plan.allowCustomLogo === true || plan.name.includes('Pro') || plan.name.includes('Business'))
                    ? '<li style="color: #34d399; font-weight: bold;">✓ Bisa Menggunakan Logo Studio Sendiri</li>'
                    : '<li style="color: rgba(255,255,255,0.4);">• Logo Platform Standard</li>';
                    
                const rawText = (plan.allowRawSelector === 1 || plan.allowRawSelector === true)
                    ? '<li style="color: #34d399; font-weight: bold;">✓ Fitur Auto-Sorter / Selector File RAW</li>'
                    : '<li style="color: rgba(255,255,255,0.4);">• Fitur RAW Selector Nonaktif</li>';

                return `
      <div class="tier ${isFeatured ? 'featured' : ''}">
        ${isFeatured ? '<span class="tier-badge">PALING DIPILIH</span>' : ''}
        <div class="tier-name">${plan.name}</div>
        <div style="font-size: 22px; font-weight: 850; color: ${isFeatured ? '#fbbf24' : '#e4e4e7'}; margin-bottom: 4px;">
            Rp ${Number(plan.price).toLocaleString('id-ID')} <span style="font-size: 11px; font-weight: normal; color: #a1a1aa;">/ ${plan.activePeriodDays || 30} hari</span>
        </div>
        <div class="tier-note">${plan.name.includes('Starter') ? 'Cocok untuk fotografer pemula / freelance' : plan.name.includes('Pro') ? 'Untuk fotografer profesional & tim studio' : 'Untuk studio besar & vendor volume tinggi'}</div>
        <ul>
          <li>✓ Maksimal ${plan.maxProjects} Project Aktif</li>
          <li>✓ Foto Unlimited</li>
          <li>✓ Galeri Online & Seleksi Foto Klien</li>
          ${logoText}
          ${rawText}
        </ul>
        <a href="/register" style="display: block; width: 100%; text-align: center; margin-top: 20px; padding: 10px; background: ${isFeatured ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'rgba(255,255,255,0.08)'}; color: #fff; border-radius: 8px; font-weight: bold; text-decoration: none; font-size: 13px;">Pilih Paket &rarr;</a>
      </div>`;
            }).join('');

            // Replace landingTierGrid content dynamically
            html = html.replace(
                /<div class="tier-grid reveal" id="landingTierGrid">[\s\S]*?<\/div>\s*<\/section>/,
                `<div class="tier-grid reveal" id="landingTierGrid">${dynamicTierHtml}</div>\n  </section>`
            );
        }
    } catch (e) {
        console.error("Failed to inject dynamic plans to landing html:", e);
    }

    return new NextResponse(html, {
        headers: { 'Content-Type': 'text/html' }
    });
}
