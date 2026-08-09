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
          <li>✓ Bebas Jumlah Foto per Proyek</li>
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

        // Inject dynamic Add-On Cloud Storage plans
        const addonPlans = db.prepare("SELECT * FROM addon_plans WHERE status = 'active' ORDER BY sortOrder ASC, price ASC").all();
        if (addonPlans && addonPlans.length > 0) {
            const dynamicAddonHtml = addonPlans.map(addon => {
                const quotaGb = addon.quotaBytes ? (addon.quotaBytes / (1024 * 1024 * 1024)).toFixed(0) : '0';
                return `
      <div class="tier" style="border: 1.5px solid rgba(52,211,153,0.3); background: rgba(52,211,153,0.03); border-radius: 16px; padding: 24px; display: flex; flex-direction: column; justify: space-between;">
        <div>
          <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; background: rgba(52,211,153,0.15); color: #34d399; padding: 3px 8px; border-radius: 12px; border: 1px solid rgba(52,211,153,0.3);">ADD-ON CLOUD</span>
          <div class="tier-name" style="margin-top: 10px;">${addon.name}</div>
          <div style="font-size: 26px; font-weight: 850; color: #ffffff; margin: 6px 0 2px 0;">
              ${quotaGb} GB Storage
          </div>
          <div style="font-size: 18px; font-weight: 700; color: #34d399; margin-bottom: 12px;">
              Rp ${Number(addon.price).toLocaleString('id-ID')} <span style="font-size: 11px; font-weight: normal; color: #a1a1aa;">/ bulan</span>
          </div>
          <div class="tier-note" style="margin-bottom: 14px;">Dedicated Cloud Storage studio</div>
          <ul style="list-style: none; padding: 0; margin: 0 0 16px 0; font-size: 12px; line-height: 2.0; color: #a1a1aa;">
            <li style="color: #34d399; font-weight: bold;">✓ ${quotaGb} GB Dedicated Storage</li>
            <li style="color: #34d399; font-weight: bold;">✓ High-Speed Pipe Stream</li>
            <li>✓ Unlimited High-Res Photos</li>
            <li>✓ Daily Prorated Billing</li>
          </ul>
        </div>
        <a href="/register" style="display: block; width: 100%; text-align: center; margin-top: 16px; padding: 10px; background: linear-gradient(135deg, #10b981, #059669); color: #fff; border-radius: 8px; font-weight: bold; text-decoration: none; font-size: 13px; box-shadow: 0 4px 12px rgba(16,185,129,0.25);">Daftar &amp; Pilih Add-On &rarr;</a>
      </div>`;
            }).join('');

            html = html.replace(
                /<div class="tier-grid reveal" id="landingAddonTierGrid">[\s\S]*?<\/div>/,
                `<div class="tier-grid reveal" id="landingAddonTierGrid">${dynamicAddonHtml}</div>`
            );
        }
    } catch (e) {
        console.error("Failed to inject dynamic plans to landing html:", e);
    }

    return new NextResponse(html, {
        headers: { 'Content-Type': 'text/html' }
    });
}
