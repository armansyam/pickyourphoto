import { NextResponse } from 'next/server';
import { getAuthVendor } from '@/lib/auth';
import db from '@/lib/db';
import fs from 'fs';
import path from 'path';
import { getRequestOrigin } from '@/lib/url';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    const vendor = getAuthVendor();

    // Read static landing page html
    const filePath = path.join(process.cwd(), 'public/landing.html');
    let html = fs.readFileSync(filePath, 'utf8');

    // If user is already logged in, update navbar login button to point to dashboard
    if (vendor) {
        const dest = vendor.role === 'admin' ? '/admin' : '/dashboard';
        html = html.replace(
            /<a href="\/login"[\s\S]*?data-i18n="nav\.masuk">[\s\S]*?<\/a>/,
            `<a href="${dest}" style="font-size:13.5px;color:#ffffff;font-weight:700;padding:6px 14px;background:linear-gradient(135deg,#C5A059,#996515);border-radius:8px;box-shadow:0 2px 8px rgba(197,160,89,0.3);text-decoration:none;display:inline-flex;align-items:center;gap:6px;">Buka Dashboard &rarr;</a>`
        );
    }

    try {
        // 1. Ambil konfigurasi identitas SaaS dinamis dari database
        const saasRows = db.prepare("SELECT key, value FROM saas_settings WHERE key IN ('saas_name', 'saas_logo_url', 'saas_tagline', 'saas_description', 'contact_whatsapp', 'contact_email', 'company_address')").all() || [];
        const saasMap = {};
        saasRows.forEach(r => { saasMap[r.key] = r.value; });

        const brandName = saasMap.saas_name || 'Pick Your Photo';
        const brandLogo = saasMap.saas_logo_url || '';
        const brandTagline = saasMap.saas_tagline || 'Galeri Seleksi Foto untuk Fotografer & Vendor';

        // Ganti Brand Name di Navbar Header & Footer secara dinamis
        const logoHtml = brandLogo && brandLogo !== '/logo.png'
            ? `<div class="logo"><img src="${brandLogo}" alt="${brandName}" style="height:28px;max-width:140px;object-fit:contain;vertical-align:middle;margin-right:8px;" />${brandName}</div>`
            : `<div class="logo"><span class="dot"></span>${brandName}</div>`;

        html = html.replace(/<div class="logo"><span class="dot"><\/span>Pick Your Photo<\/div>/g, logoHtml);
        html = html.replace(/<title>Pick Your Photo.*?<\/title>/, `<title>${brandName} — ${brandTagline}</title>`);
        html = html.replace(/&copy; 2026 Pick Your Photo\./g, `&copy; 2026 ${brandName}.`);



        // 3. Inject dynamic Add-On Cloud Storage plans
        const addonPlans = db.prepare("SELECT * FROM addon_plans WHERE status = 'active' ORDER BY sortOrder ASC, price ASC").all();
        if (addonPlans && addonPlans.length > 0) {
            const dynamicAddonHtml = addonPlans.map(addon => {
                const quotaGb = addon.quotaBytes ? (addon.quotaBytes / (1024 * 1024 * 1024)).toFixed(0) : '0';
                return `
      <div class="tier" style="border: 1.5px solid rgba(197,160,89,0.35); background: #FFFFFF; border-radius: 16px; padding: 24px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 6px 24px rgba(197,160,89,0.08);">
        <div>
          <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; background: rgba(197,160,89,0.15); color: #8C6D23; padding: 3px 8px; border-radius: 12px; border: 1px solid rgba(197,160,89,0.4);">ADD-ON CLOUD</span>
          <div class="tier-name" style="margin-top: 10px; color: #1C1917;">${addon.name}</div>
          <div style="font-size: 26px; font-weight: 850; color: #1C1917; margin: 6px 0 2px 0;">
              ${quotaGb} GB Storage
          </div>
          <div style="font-size: 18px; font-weight: 700; color: #8C6D23; margin-bottom: 12px;">
              Rp ${Number(addon.price).toLocaleString('id-ID')} <span style="font-size: 11px; font-weight: normal; color: var(--muted);">/ bulan</span>
          </div>
          <div class="tier-note" style="margin-bottom: 14px; color: var(--muted);">Dedicated Cloud Storage studio</div>
          <ul style="list-style: none; padding: 0; margin: 0 0 16px 0; font-size: 12px; line-height: 2.0; color: var(--muted);">
            <li style="color: #8C6D23; font-weight: bold;">✓ ${quotaGb} GB Dedicated Storage</li>
            <li style="color: #8C6D23; font-weight: bold;">✓ High-Speed Pipe Stream</li>
            <li>✓ Unlimited High-Res Photos</li>
            <li>✓ Daily Prorated Billing</li>
          </ul>
        </div>
        <a href="/register" style="display: block; width: 100%; text-align: center; margin-top: 16px; padding: 10px; background: linear-gradient(135deg, #C5A059, #996515); color: #fff; border-radius: 8px; font-weight: bold; text-decoration: none; font-size: 13px; box-shadow: 0 4px 12px rgba(197,160,89,0.25);">Daftar &amp; Pilih Add-On &rarr;</a>
      </div>`;
            }).join('');

            html = html.replace(
                /<div class="tier-grid reveal" id="landingAddonTierGrid">[\s\S]*?<\/div>/,
                `<div class="tier-grid reveal" id="landingAddonTierGrid">${dynamicAddonHtml}</div>`
            );
        } else {
            html = html.replace(
                /<div class="tier-grid reveal" id="landingAddonTierGrid">[\s\S]*?<\/div>/,
                ''
            );
        }
    } catch (e) {
        console.error("Failed to inject dynamic settings to landing html:", e);
    }

    return new NextResponse(html, {
        headers: { 'Content-Type': 'text/html' }
    });
}
