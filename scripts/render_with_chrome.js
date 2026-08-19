/**
 * Master Studio Quality Chrome-based Promo Video Renderer (Instagram Ready).
 * High-production-value layouts that fill 100% of the screen in both 9:16 Story and 16:9 Feeds.
 * Fast, natural, snappy human cursor motion (0.3s flight, click scales, and golden ripple).
 */

const puppeteer = require('puppeteer-core');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUTPUT_DIR = path.join(__dirname, '..', 'videos_instagram');
const PUBLIC_DIR = path.join(__dirname, '..', 'public', 'videos');

function getHtmlTemplate(videoNum, isVertical) {
  const W = isVertical ? 1080 : 1920;
  const H = isVertical ? 1920 : 1080;

  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,600;0,9..144,700;1,9..144,500;1,9..144,700&family=Montserrat:wght@500;600;700;800&family=IBM+Plex+Mono:wght@600;700&display=swap');

  :root {
    --bg: #FAF8F5;
    --paper: #1C1917;
    --muted: #57534E;
    --brass: #C5A059;
    --brass-dark: #8C6D23;
    --line: rgba(197, 160, 89, 0.32);
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: ${W}px;
    height: ${H}px;
    background: radial-gradient(85% 55% at 50% 0%, rgba(197, 160, 89, 0.16), transparent 70%),
                radial-gradient(60% 40% at 85% 15%, rgba(212, 175, 55, 0.1), transparent 70%),
                var(--bg);
    color: var(--paper);
    font-family: 'Montserrat', -apple-system, sans-serif;
    overflow: hidden;
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: ${isVertical ? '70px 60px' : '50px 90px'};
  }

  /* TOP BRAND HEADER */
  .brand-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: rgba(255, 255, 255, 0.95);
    border: 2px solid var(--line);
    border-radius: ${isVertical ? '28px' : '22px'};
    padding: ${isVertical ? '24px 38px' : '18px 32px'};
    box-shadow: 0 10px 30px rgba(197, 160, 89, 0.12);
  }
  .brand-logo-group {
    display: flex;
    align-items: center;
    gap: 18px;
  }
  .brand-icon-box {
    width: ${isVertical ? '54px' : '44px'};
    height: ${isVertical ? '54px' : '44px'};
    border-radius: 14px;
    background: linear-gradient(135deg, #D4AF37, #8C6D23);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 14px rgba(197, 160, 89, 0.4);
  }
  .brand-name {
    font-family: 'Fraunces', Georgia, serif;
    font-size: ${isVertical ? '32px' : '26px'};
    font-weight: 700;
    color: var(--paper);
  }
  .brand-name em {
    font-style: italic;
    color: var(--brass-dark);
  }
  .brand-badge {
    font-family: 'IBM Plex Mono', monospace;
    font-size: ${isVertical ? '17px' : '14px'};
    font-weight: 700;
    color: var(--brass-dark);
    background: rgba(197, 160, 89, 0.16);
    border: 1.5px solid var(--line);
    padding: 8px 22px;
    border-radius: 30px;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  /* MAIN STAGE (FULL HEIGHT IN VERTICAL & BALANCED IN LANDSCAPE) */
  .main-stage {
    flex: 1;
    display: ${isVertical ? 'flex' : 'grid'};
    ${isVertical ? 'flex-direction: column; justify-content: space-around; gap: 40px; margin: 30px 0;' : 'grid-template-columns: 1fr 1fr; gap: 60px; align-items: center; margin: 20px 0;'}
  }

  /* TEXT COLUMN */
  .text-column {
    display: flex;
    flex-direction: column;
    gap: ${isVertical ? '18px' : '16px'};
  }
  .pill-tag {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    font-family: 'IBM Plex Mono', monospace;
    font-size: ${isVertical ? '20px' : '16px'};
    font-weight: 700;
    padding: 10px 24px;
    border-radius: 30px;
    width: fit-content;
    text-transform: uppercase;
  }
  .pill-tag.gold { background: rgba(197, 160, 89, 0.16); border: 2px solid var(--line); color: var(--brass-dark); }
  .pill-tag.red { background: #FEF2F2; border: 2px solid #FCA5A5; color: #DC2626; }
  .pill-tag.green { background: rgba(21, 128, 61, 0.12); border: 2px solid rgba(21, 128, 61, 0.35); color: #15803D; }

  .main-headline {
    font-family: 'Fraunces', Georgia, serif;
    font-size: ${isVertical ? '66px' : '52px'};
    line-height: 1.16;
    font-weight: 700;
    color: var(--paper);
  }
  .main-headline em {
    font-style: italic;
    color: var(--brass-dark);
  }
  .main-desc {
    font-size: ${isVertical ? '26px' : '20px'};
    color: var(--muted);
    line-height: 1.5;
  }

  /* CHECKLIST FEATURE LIST (FOR FEEDS 16:9) */
  .feature-checklist {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-top: 10px;
  }
  .check-item {
    display: flex;
    align-items: center;
    gap: 14px;
    font-size: 19px;
    font-weight: 600;
    color: var(--paper);
  }
  .check-circle {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: rgba(21, 128, 61, 0.15);
    color: #15803D;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    font-weight: 800;
  }

  /* MOCKUP CARD (EXPANDED TO PROMINENT LUXURY SIZE) */
  .mockup-card {
    background: #FFFFFF;
    border: 2.5px solid var(--line);
    border-radius: ${isVertical ? '36px' : '28px'};
    padding: ${isVertical ? '48px 40px' : '36px'};
    box-shadow: 0 25px 60px rgba(197, 160, 89, 0.18), 0 4px 20px rgba(0,0,0,0.03);
    display: flex;
    flex-direction: column;
    gap: ${isVertical ? '28px' : '22px'};
    position: relative;
    overflow: hidden;
    ${isVertical ? 'min-height: 720px; justify-content: center;' : 'min-height: 520px;'}
  }

  /* PHOTO GALLERY ITEMS WITH LUXURY PHOTOGRAPHY GRADIENTS */
  .photo-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
  .photo-item {
    aspect-ratio: 1/1;
    background: linear-gradient(145deg, #F3ECE7, #FAF6F2);
    border-radius: ${isVertical ? '24px' : '18px'};
    border: 2.5px solid rgba(197, 160, 89, 0.3);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
    box-shadow: 0 6px 18px rgba(0,0,0,0.04);
    transition: all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  .photo-item.selected {
    border-color: var(--brass-dark);
    background: linear-gradient(145deg, rgba(197, 160, 89, 0.3), rgba(212, 175, 55, 0.15));
    box-shadow: 0 12px 32px rgba(197, 160, 89, 0.45);
    transform: scale(0.95);
  }
  .photo-item .star-svg {
    width: ${isVertical ? '64px' : '48px'};
    height: ${isVertical ? '64px' : '48px'};
    fill: none;
    stroke: var(--brass);
    stroke-width: 2.2;
    filter: drop-shadow(0 2px 6px rgba(197, 160, 89, 0.3));
  }
  .photo-item.selected .star-svg {
    fill: var(--brass-dark);
    stroke: none;
    filter: drop-shadow(0 4px 10px rgba(140, 109, 35, 0.5));
  }
  .photo-item .badge-terpilih {
    position: absolute;
    bottom: 14px;
    background: var(--brass-dark);
    color: #FFFFFF;
    font-size: ${isVertical ? '14px' : '11px'};
    font-weight: 800;
    padding: 4px 12px;
    border-radius: 6px;
    font-family: 'IBM Plex Mono', monospace;
    display: none;
    box-shadow: 0 2px 8px rgba(0,0,0,0.25);
  }
  .photo-item.selected .badge-terpilih { display: block; }

  /* DRIVE PROBLEM FILES */
  .drive-row {
    background: #FAFAFA;
    border: 2px solid #E5E7EB;
    padding: ${isVertical ? '24px 28px' : '16px 22px'};
    border-radius: 18px;
    font-family: 'IBM Plex Mono', monospace;
    font-size: ${isVertical ? '22px' : '17px'};
    font-weight: 600;
    color: var(--muted);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .drive-row.danger {
    background: #FEF2F2;
    border-color: #FCA5A5;
    color: #B91C1C;
    box-shadow: 0 4px 16px rgba(220, 38, 38, 0.12);
  }

  /* ACTION BUTTON */
  .gold-cta-btn {
    background: linear-gradient(135deg, var(--brass), var(--brass-dark));
    color: #FFFFFF;
    font-weight: 700;
    font-size: ${isVertical ? '24px' : '19px'};
    padding: ${isVertical ? '24px 36px' : '18px 30px'};
    border-radius: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 14px;
    box-shadow: 0 10px 28px rgba(197, 160, 89, 0.45);
    transition: transform 0.15s ease;
  }

  /* NOTIFICATION BANNER */
  .notif-bar {
    background: rgba(21, 128, 61, 0.1);
    border: 2px solid rgba(21, 128, 61, 0.35);
    color: #15803D;
    padding: ${isVertical ? '22px 28px' : '16px 22px'};
    border-radius: 18px;
    font-size: ${isVertical ? '21px' : '16px'};
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 14px;
  }

  /* BOTTOM BRAND FOOTER BAR */
  .bottom-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: ${isVertical ? '20px 28px' : '14px 24px'};
    background: rgba(255, 255, 255, 0.85);
    border: 1.5px solid var(--line);
    border-radius: 20px;
    font-size: ${isVertical ? '18px' : '15px'};
    font-weight: 600;
    color: var(--muted);
  }
  .bottom-footer strong {
    color: var(--brass-dark);
  }

  /* FAST SNAPPY NATURAL CURSOR */
  #mouseCursor {
    position: absolute;
    width: ${isVertical ? '48px' : '38px'};
    height: ${isVertical ? '48px' : '38px'};
    top: 0; left: 0; z-index: 1000;
    pointer-events: none;
    filter: drop-shadow(0 6px 14px rgba(0, 0, 0, 0.35));
    transform-origin: 0 0;
  }
  #mouseRipple {
    position: absolute;
    width: 60px; height: 60px;
    border-radius: 50%;
    border: 3.5px solid var(--brass);
    transform: translate(-50%, -50%) scale(0);
    opacity: 0;
    pointer-events: none;
    z-index: 999;
  }
  @keyframes rippleEffect {
    0% { transform: translate(-50%, -50%) scale(0.2); opacity: 1; }
    100% { transform: translate(-50%, -50%) scale(2.2); opacity: 0; }
  }
</style>
</head>
<body>

  <!-- HEADER -->
  <header class="brand-header">
    <div class="brand-logo-group">
      <div class="brand-icon-box">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
          <circle cx="12" cy="13" r="4"/>
        </svg>
      </div>
      <div class="brand-name">Pick Your Photo <em>Studio</em></div>
    </div>
    <div class="brand-badge">${videoNum === 1 ? '0 Byte Storage' : (videoNum === 2 ? 'Trial Instan' : 'Magic Sort')}</div>
  </header>

  <!-- STAGE CONTENT -->
  <main class="main-stage">
    <div class="text-column">
      <div class="pill-tag ${videoNum === 1 ? 'red' : (videoNum === 2 ? 'green' : 'gold')}" id="sceneTag">
        ${videoNum === 1 ? '❌ Masalah Kirim Drive Manual' : (videoNum === 2 ? '⚡ Instant Trial Tanpa Daftar' : '✨ Alur Lengkap Fotografer')}
      </div>
      <h1 class="main-headline" id="mainHeadline">
        ${videoNum === 1 ? 'Klien <em>Pusing</em> Pilih<br>Ribuan Foto Drive?' : (videoNum === 2 ? 'Coba Langsung <em>1 Menit</em><br>Galeri Siap Pakai' : 'Kelola Puluhan Project<br><em>Otomatis Rapi</em>')}
      </h1>
      <p class="main-desc" id="mainDesc">
        ${videoNum === 1 ? 'Kirim link Google Drive bikin klien repot mencatat nomor foto satu per satu di WhatsApp.' : (videoNum === 2 ? 'Upload beberapa foto sampel, sistem otomatis buatkan galeri interaktif siap kirim ke klien.' : 'Setiap foto yang disukai klien langsung terdata otomatis tanpa perlu catat manual.')}
      </p>

      ${!isVertical ? `
        <div class="feature-checklist">
          <div class="check-item"><span class="check-circle">✓</span> 0 Byte VPS Storage — Sync Google Drive</div>
          <div class="check-item"><span class="check-circle">✓</span> Klien Pilih Foto Langsung dari Smartphone</div>
          <div class="check-item"><span class="check-circle">✓</span> Rekap Nomor File Otomatis ke WhatsApp</div>
        </div>
      ` : ''}
    </div>

    <div class="mockup-card" id="mockupCard">
      ${videoNum === 1 ? `
        <div id="v1_scene_problem" style="display:flex; flex-direction:column; gap:20px;">
          <div style="display:flex; flex-direction:column; gap:16px;">
            <div class="drive-row"><span>IMG_0492.JPG</span><span style="font-size:15px; color:#8C827A;">24 MB</span></div>
            <div class="drive-row"><span>IMG_0493.JPG</span><span style="font-size:15px; color:#8C827A;">22 MB</span></div>
            <div class="drive-row danger" id="driveConfused">
              <span>IMG_0494.JPG</span>
              <span style="font-size:14px; font-weight:700; color:#DC2626;">Klien: "Yang mana ya?"</span>
            </div>
          </div>
          <div class="notif-bar" style="background:#FEF2F2; border-color:#FCA5A5; color:#DC2626;">
            ⚠️ Butuh 3–5 hari hanya untuk sortir foto!
          </div>
        </div>

        <div id="v1_scene_solution" style="display:none; flex-direction:column; gap:24px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <strong style="color:var(--brass-dark); font-size:24px;">Wedding Rama & Shinta</strong>
            <span id="v1Counter" style="background:rgba(21,128,61,0.12); color:#15803D; font-weight:700; font-size:17px; padding:6px 16px; border-radius:12px;">14/20 Dipilih</span>
          </div>
          <div class="photo-grid">
            <div class="photo-item selected"><svg class="star-svg" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg><span class="badge-terpilih">TERPILIH</span></div>
            <div class="photo-item selected"><svg class="star-svg" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg><span class="badge-terpilih">TERPILIH</span></div>
            <div class="photo-item" id="photoTarget"><svg class="star-svg" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg><span class="badge-terpilih">TERPILIH</span></div>
          </div>
          <div class="notif-bar">
            ✓ 0 Byte VPS Storage — Sync Langsung Google Drive
          </div>
        </div>
      ` : (videoNum === 2 ? `
        <div id="v2_dropzone" style="border:3.5px dashed var(--line); border-radius:26px; padding:45px; text-align:center; background:rgba(197,160,89,0.06); display:flex; flex-direction:column; align-items:center; gap:16px; transition:all 0.2s;">
          <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="var(--brass-dark)" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          <div style="font-size:24px; font-weight:700; color:var(--brass-dark);" id="v2DropText">Drag & Drop 6 Foto Sampel</div>
          <div style="font-size:18px; color:var(--muted);">Uji coba gratis tanpa kartu kredit & tanpa daftar</div>
        </div>
        <div class="gold-cta-btn" id="v2CtaBtn">
          💬 Salin Pesan Otomatis WhatsApp
        </div>
        <div class="notif-bar" id="v2Notif">
          🚀 Siap Kirim ke Klien dalam 1 Menit
        </div>
      ` : `
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <strong style="color:var(--brass-dark); font-size:24px;">Prewedding Arya & Bella</strong>
          <span id="v3Counter" style="background:rgba(21,128,61,0.12); color:#15803D; font-weight:700; font-size:17px; padding:6px 16px; border-radius:12px;">0/450 Dipilih</span>
        </div>
        <div class="photo-grid">
          <div class="photo-item" id="m1"><svg class="star-svg" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg><span class="badge-terpilih">TERPILIH</span></div>
          <div class="photo-item" id="m2"><svg class="star-svg" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg><span class="badge-terpilih">TERPILIH</span></div>
          <div class="photo-item" id="m3"><svg class="star-svg" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg><span class="badge-terpilih">TERPILIH</span></div>
        </div>
        <div class="notif-bar" id="v3Notif" style="opacity:0; transition:opacity 0.25s ease;">
          ✓ Notifikasi WA Terkirim Otomatis ke Fotografer!
        </div>
      `)}
    </div>
  </main>

  <!-- FOOTER BAR -->
  <footer class="bottom-footer">
    <div>SaaS Platform Khusus <strong>Studio Fotografer Indonesia</strong></div>
    <div>Coba Sekarang di <strong>pickyourphoto.com</strong> ↗</div>
  </footer>

  <!-- REALISTIC CURSOR -->
  <svg id="mouseCursor" viewBox="0 0 24 24" fill="none">
    <path d="M3 3l7 18 3-7 7-3L3 3z" fill="#C5A059" stroke="#FFFFFF" stroke-width="2" stroke-linejoin="round"/>
  </svg>
  <div id="mouseRipple"></div>

<script>
  // SNAPPY NATURAL HUMAN CURSOR (0.3s fast flight, easeOutCubic)
  function easeOutCubic(t) { return 1 - Math.pow(1 - Math.min(Math.max(t, 0), 1), 3); }

  function getElCenter(id) {
    const el = document.getElementById(id);
    if (!el) return { x: ${W/2}, y: ${H/2} };
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width/2, y: r.top + r.height/2 };
  }

  function setCursor(x, y, scale = 1) {
    const c = document.getElementById('mouseCursor');
    c.style.transform = \`translate(\${Math.round(x)}px, \${Math.round(y)}px) scale(\${scale})\`;
  }

  function triggerRipple(x, y) {
    const r = document.getElementById('mouseRipple');
    r.style.left = x + 'px';
    r.style.top = y + 'px';
    r.style.animation = 'none';
    void r.offsetWidth;
    r.style.animation = 'rippleEffect 0.4s ease-out forwards';
  }

  function updateFrame(t) {
    const vNum = ${videoNum};

    if (vNum === 1) {
      if (t < 3.0) {
        document.getElementById('v1_scene_problem').style.display = 'flex';
        document.getElementById('v1_scene_solution').style.display = 'none';
        
        // Fast move 0.4s - 0.7s (0.3s flight time!)
        const target = getElCenter('driveConfused');
        if (t < 0.4) {
          setCursor(${W * 0.8}, ${H * 0.8});
        } else if (t < 0.7) {
          const p = easeOutCubic((t - 0.4) / 0.3);
          setCursor(${W * 0.8} + (target.x - ${W * 0.8}) * p, ${H * 0.8} + (target.y - ${H * 0.8}) * p);
        } else {
          setCursor(target.x, target.y);
          if (t >= 0.71 && t <= 0.76) triggerRipple(target.x, target.y);
        }
      } else {
        document.getElementById('v1_scene_problem').style.display = 'none';
        document.getElementById('v1_scene_solution').style.display = 'flex';
        document.getElementById('sceneTag').className = 'pill-tag gold';
        document.getElementById('sceneTag').innerHTML = '✨ Solusi Galeri Auto Sortir';
        document.getElementById('mainHeadline').innerHTML = 'Galeri Mewah <em>1-Click</em><br>Auto Sortir Otomatis';
        document.getElementById('mainDesc').innerHTML = 'Klien buka galeri di HP, klik bintang favorit, nomor file langsung terekam rapi.';

        // Fast move 3.4s - 3.7s (0.3s flight time!)
        const pTarget = getElCenter('photoTarget');
        if (t < 3.4) {
          setCursor(${W * 0.2}, ${H * 0.7});
        } else if (t < 3.7) {
          const p = easeOutCubic((t - 3.4) / 0.3);
          setCursor(${W * 0.2} + (pTarget.x - ${W * 0.2}) * p, ${H * 0.7} + (pTarget.y - ${H * 0.7}) * p);
        } else {
          setCursor(pTarget.x, pTarget.y, t < 3.8 ? 0.85 : 1);
          document.getElementById('photoTarget').classList.add('selected');
          document.getElementById('v1Counter').textContent = '15/20 Dipilih';
          if (t >= 3.71 && t <= 3.76) triggerRipple(pTarget.x, pTarget.y);
        }
      }
    } else if (vNum === 2) {
      const dropTarget = getElCenter('v2_dropzone');
      const ctaTarget = getElCenter('v2CtaBtn');

      if (t < 3.0) {
        if (t < 0.4) {
          setCursor(${W * 0.15}, ${H * 0.75});
        } else if (t < 0.7) {
          const p = easeOutCubic((t - 0.4) / 0.3);
          setCursor(${W * 0.15} + (dropTarget.x - ${W * 0.15}) * p, ${H * 0.75} + (dropTarget.y - ${H * 0.75}) * p);
        } else {
          setCursor(dropTarget.x, dropTarget.y);
          document.getElementById('v2DropText').textContent = '✓ 6 Foto Sampel Terupload!';
          document.getElementById('v2_dropzone').style.borderColor = '#15803D';
          document.getElementById('v2_dropzone').style.background = 'rgba(21, 128, 61, 0.08)';
          if (t >= 0.71 && t <= 0.76) triggerRipple(dropTarget.x, dropTarget.y);
        }
      } else {
        if (t < 3.4) {
          setCursor(dropTarget.x, dropTarget.y);
        } else if (t < 3.7) {
          const p = easeOutCubic((t - 3.4) / 0.3);
          setCursor(dropTarget.x + (ctaTarget.x - dropTarget.x) * p, dropTarget.y + (ctaTarget.y - dropTarget.y) * p);
        } else {
          setCursor(ctaTarget.x, ctaTarget.y, t < 3.8 ? 0.85 : 1);
          document.getElementById('v2CtaBtn').innerHTML = '✓ Link Galeri WhatsApp Tersalin!';
          document.getElementById('v2CtaBtn').style.background = '#15803D';
          if (t >= 3.71 && t <= 3.76) triggerRipple(ctaTarget.x, ctaTarget.y);
        }
      }
    } else {
      // VIDEO 3: MAGIC SORT (Snappy quick selection 0.3s flight per item)
      const m1 = getElCenter('m1');
      const m2 = getElCenter('m2');
      const m3 = getElCenter('m3');

      if (t < 1.0) {
        if (t < 0.4) {
          setCursor(${W * 0.2}, ${H * 0.8});
        } else {
          const p = easeOutCubic((t - 0.4) / 0.3);
          setCursor(${W * 0.2} + (m1.x - ${W * 0.2}) * p, ${H * 0.8} + (m1.y - ${H * 0.8}) * p);
        }
      } else if (t < 2.5) {
        document.getElementById('m1').classList.add('selected');
        document.getElementById('v3Counter').textContent = '1/450 Dipilih';
        if (t < 1.8) {
          setCursor(m1.x, m1.y);
        } else if (t < 2.1) {
          const p = easeOutCubic((t - 1.8) / 0.3);
          setCursor(m1.x + (m2.x - m1.x) * p, m1.y + (m2.y - m1.y) * p);
        } else {
          setCursor(m2.x, m2.y);
        }
      } else if (t < 4.5) {
        document.getElementById('m2').classList.add('selected');
        document.getElementById('v3Counter').textContent = '2/450 Dipilih';
        if (t < 3.5) {
          setCursor(m2.x, m2.y);
        } else if (t < 3.8) {
          const p = easeOutCubic((t - 3.5) / 0.3);
          setCursor(m2.x + (m3.x - m2.x) * p, m2.y + (m3.y - m2.y) * p);
        } else {
          setCursor(m3.x, m3.y);
        }
      } else {
        document.getElementById('m3').classList.add('selected');
        document.getElementById('v3Counter').textContent = '3/450 Dipilih';
        document.getElementById('v3Notif').style.opacity = '1';
        setCursor(m3.x, m3.y);
      }
    }
  }

  window.seek = updateFrame;
</script>
</body>
</html>`;
}

async function renderVideo(browser, videoNum, isVertical, durationSec, filename) {
  const W = isVertical ? 1080 : 1920;
  const H = isVertical ? 1920 : 1080;
  const fps = 60;
  const totalFrames = durationSec * fps;
  const outputPath = path.join(OUTPUT_DIR, filename);
  const publicPath = path.join(PUBLIC_DIR, filename);

  console.log(`\n🎬 Rendering ${filename} (${W}x${H} @ 60fps, ${durationSec}s)...`);

  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });

  const html = getHtmlTemplate(videoNum, isVertical);
  await page.setContent(html, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => document.fonts.ready);

  const ffmpeg = spawn('/opt/homebrew/bin/ffmpeg', [
    '-y',
    '-f', 'image2pipe',
    '-vcodec', 'png',
    '-r', String(fps),
    '-i', '-',
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '16',
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    outputPath
  ]);

  ffmpeg.stderr.on('data', () => {});

  for (let frame = 0; frame < totalFrames; frame++) {
    const t = (frame / totalFrames) * durationSec;
    await page.evaluate((currT) => {
      window.seek(currT);
    }, t);

    const buffer = await page.screenshot({ type: 'png', omitBackground: false });
    ffmpeg.stdin.write(buffer);

    if (frame % (fps * 2) === 0 || frame === totalFrames - 1) {
      const pct = Math.round((frame / totalFrames) * 100);
      process.stdout.write(`   [${filename}] Progress: ${pct}%\r`);
    }
  }

  ffmpeg.stdin.end();
  await new Promise(resolve => ffmpeg.on('close', resolve));
  await page.close();

  fs.copyFileSync(outputPath, publicPath);
  const sizeMb = (fs.statSync(outputPath).size / (1024 * 1024)).toFixed(2);
  console.log(`✅ [${filename}] Selesai (${sizeMb} MB) -> ${outputPath}`);
}

async function main() {
  console.log('========================================================');
  console.log('🚀 MASTER STUDIO PROMO VIDEO ENGINE (60 FPS INSTAGRAM)');
  console.log('========================================================');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  try {
    // 1. Video 1: Perkenalan Platform (6s)
    await renderVideo(browser, 1, true, 6, 'video_1_intro_story_9x16.mp4');
    await renderVideo(browser, 1, false, 6, 'video_1_intro_feeds_16x9.mp4');

    // 2. Video 2: Trial Instan (6s)
    await renderVideo(browser, 2, true, 6, 'video_2_trial_story_9x16.mp4');
    await renderVideo(browser, 2, false, 6, 'video_2_trial_feeds_16x9.mp4');

    // 3. Video 3: Magic Sort Workflow (6s)
    await renderVideo(browser, 3, true, 6, 'video_3_simulasi_story_9x16.mp4');
    await renderVideo(browser, 3, false, 6, 'video_3_simulasi_feeds_16x9.mp4');

    console.log('\n🎉 SEMUA 6 VIDEO PROMO INSTAGRAM DENGAN TATA LETAK SEMPURNA & KURSOR NATURAL SELESAI!');
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error('Render error:', err);
  process.exit(1);
});
