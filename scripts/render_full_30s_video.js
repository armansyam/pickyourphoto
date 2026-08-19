/**
 * Master 30-Second Complete SaaS Promo Video Generator (Instagram Story & Feeds).
 * Full 5-Scene Storytelling Arc:
 * 1. (0s - 5.5s): Problem Hook (Drive berantakan & klien pusing catat nomor)
 * 2. (5.5s - 12s): Solution (Pick Your Photo 0 Byte VPS storage & UI Mewah)
 * 3. (12s - 20s): Live Interactive Demo (Klien pilih bintang, live counter & glowing gold card)
 * 4. (20s - 25.5s): Magic Sort & Auto Recap (Kirim seleksi langsung ke WhatsApp fotografer)
 * 5. (25.5s - 30s): Outro & CTA (Instant Trial 1 Menit di pickyourphoto.com)
 */

const puppeteer = require('puppeteer-core');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUTPUT_DIR = path.join(__dirname, '..', 'videos_instagram');
const PUBLIC_DIR = path.join(__dirname, '..', 'public', 'videos');

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR, { recursive: true });

function getHtmlTemplate(isVertical) {
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
    --line: rgba(197, 160, 89, 0.35);
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: ${W}px;
    height: ${H}px;
    background: radial-gradient(85% 55% at 50% 0%, rgba(197, 160, 89, 0.18), transparent 70%),
                radial-gradient(60% 40% at 85% 15%, rgba(212, 175, 55, 0.12), transparent 70%),
                var(--bg);
    color: var(--paper);
    font-family: 'Montserrat', -apple-system, sans-serif;
    overflow: hidden;
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: ${isVertical ? '70px 55px' : '45px 80px'};
  }

  /* TOP PROGRESS BAR */
  .top-progress-container {
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 8px;
    background: rgba(197, 160, 89, 0.2);
    z-index: 2000;
  }
  .top-progress-bar {
    height: 100%;
    width: 0%;
    background: linear-gradient(90deg, #C5A059, #8C6D23);
    box-shadow: 0 0 12px rgba(197, 160, 89, 0.8);
  }

  /* TOP BRAND HEADER */
  .brand-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: rgba(255, 255, 255, 0.95);
    border: 2px solid var(--line);
    border-radius: ${isVertical ? '28px' : '22px'};
    padding: ${isVertical ? '22px 36px' : '16px 30px'};
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
    transition: all 0.3s ease;
  }

  /* MAIN STAGE (FULL HEIGHT IN VERTICAL & BALANCED IN LANDSCAPE) */
  .main-stage {
    flex: 1;
    display: ${isVertical ? 'flex' : 'grid'};
    ${isVertical ? 'flex-direction: column; justify-content: center; gap: 36px; margin: 25px 0;' : 'grid-template-columns: 1fr 1.05fr; gap: 50px; align-items: center; margin: 15px 0;'}
  }

  /* TEXT COLUMN */
  .text-column {
    display: flex;
    flex-direction: column;
    gap: ${isVertical ? '18px' : '14px'};
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
    transition: all 0.25s ease;
  }
  .pill-tag.gold { background: rgba(197, 160, 89, 0.16); border: 2px solid var(--line); color: var(--brass-dark); }
  .pill-tag.red { background: #FEF2F2; border: 2px solid #FCA5A5; color: #DC2626; }
  .pill-tag.green { background: rgba(21, 128, 61, 0.12); border: 2px solid rgba(21, 128, 61, 0.35); color: #15803D; }

  .main-headline {
    font-family: 'Fraunces', Georgia, serif;
    font-size: ${isVertical ? '64px' : '48px'};
    line-height: 1.16;
    font-weight: 700;
    color: var(--paper);
    transition: all 0.25s ease;
  }
  .main-headline em {
    font-style: italic;
    color: var(--brass-dark);
  }
  .main-desc {
    font-size: ${isVertical ? '25px' : '19px'};
    color: var(--muted);
    line-height: 1.5;
    transition: all 0.25s ease;
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

  /* MOCKUP CARD (DYNAMIC PER SCENE) */
  .mockup-card {
    background: #FFFFFF;
    border: 2.5px solid var(--line);
    border-radius: ${isVertical ? '36px' : '28px'};
    padding: ${isVertical ? '45px 38px' : '32px'};
    box-shadow: 0 25px 60px rgba(197, 160, 89, 0.18), 0 4px 20px rgba(0,0,0,0.03);
    display: flex;
    flex-direction: column;
    gap: ${isVertical ? '24px' : '18px'};
    position: relative;
    overflow: hidden;
    ${isVertical ? 'min-height: 740px; justify-content: center;' : 'min-height: 520px; justify-content: center;'}
  }

  /* SCENE 1: DRIVE PROBLEM */
  .drive-row {
    background: #FAFAFA;
    border: 2px solid #E5E7EB;
    padding: ${isVertical ? '22px 28px' : '15px 22px'};
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

  /* SCENE 2 & 3: PHOTO GALLERY ITEMS */
  .photo-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
  .photo-item {
    aspect-ratio: 1/1;
    background: linear-gradient(145deg, #F3ECE7, #FAF6F2);
    border-radius: ${isVertical ? '22px' : '18px'};
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
    background: linear-gradient(145deg, rgba(197, 160, 89, 0.32), rgba(212, 175, 55, 0.18));
    box-shadow: 0 12px 32px rgba(197, 160, 89, 0.45);
    transform: scale(0.95);
  }
  .photo-item .star-svg {
    width: ${isVertical ? '60px' : '46px'};
    height: ${isVertical ? '60px' : '46px'};
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
    bottom: 12px;
    background: var(--brass-dark);
    color: #FFFFFF;
    font-size: ${isVertical ? '13px' : '11px'};
    font-weight: 800;
    padding: 3px 10px;
    border-radius: 6px;
    font-family: 'IBM Plex Mono', monospace;
    display: none;
    box-shadow: 0 2px 8px rgba(0,0,0,0.25);
  }
  .photo-item.selected .badge-terpilih { display: block; }

  /* SCENE 4: ACTION BUTTON & WHATSAPP MESSAGE */
  .gold-cta-btn {
    background: linear-gradient(135deg, var(--brass), var(--brass-dark));
    color: #FFFFFF;
    font-weight: 700;
    font-size: ${isVertical ? '23px' : '19px'};
    padding: ${isVertical ? '22px 32px' : '16px 28px'};
    border-radius: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 14px;
    box-shadow: 0 10px 28px rgba(197, 160, 89, 0.45);
    transition: all 0.2s ease;
  }
  .gold-cta-btn.clicked {
    background: #15803D;
    box-shadow: 0 10px 28px rgba(21, 128, 61, 0.45);
    transform: scale(0.96);
  }

  /* NOTIFICATION BANNER */
  .notif-bar {
    background: rgba(21, 128, 61, 0.1);
    border: 2px solid rgba(21, 128, 61, 0.35);
    color: #15803D;
    padding: ${isVertical ? '20px 26px' : '14px 20px'};
    border-radius: 18px;
    font-size: ${isVertical ? '20px' : '16px'};
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
    padding: ${isVertical ? '18px 28px' : '14px 24px'};
    background: rgba(255, 255, 255, 0.88);
    border: 1.5px solid var(--line);
    border-radius: 20px;
    font-size: ${isVertical ? '17px' : '15px'};
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

  <!-- TOP PROGRESS BAR -->
  <div class="top-progress-container">
    <div class="top-progress-bar" id="topProgressBar"></div>
  </div>

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
    <div class="brand-badge" id="headerBadge">Demo Platform</div>
  </header>

  <!-- MAIN CONTENT -->
  <main class="main-stage">
    <div class="text-column">
      <div class="pill-tag red" id="sceneTag">❌ Masalah Kirim Drive Manual</div>
      <h1 class="main-headline" id="mainHeadline">Klien <em>Pusing</em> Pilih<br>Ribuan Foto Drive?</h1>
      <p class="main-desc" id="mainDesc">Kirim link Google Drive bikin klien repot buka file berat & mencatat nomor foto manual di WhatsApp.</p>

      ${!isVertical ? `
        <div class="feature-checklist" id="featureChecklist">
          <div class="check-item"><span class="check-circle">✓</span> 0 Byte VPS Storage — Sync Langsung Google Drive</div>
          <div class="check-item"><span class="check-circle">✓</span> Klien Pilih Foto Langsung dari Smartphone</div>
          <div class="check-item"><span class="check-circle">✓</span> Rekap Nomor File Otomatis ke WhatsApp</div>
        </div>
      ` : ''}
    </div>

    <div class="mockup-card" id="mockupCard">
      <!-- SCENE 1 VIEW -->
      <div id="scene1_view" style="display:flex; flex-direction:column; gap:18px;">
        <div style="display:flex; flex-direction:column; gap:14px;">
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

      <!-- SCENE 2 & 3 VIEW -->
      <div id="sceneGallery_view" style="display:none; flex-direction:column; gap:20px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <strong style="color:var(--brass-dark); font-size:22px;" id="galleryProjectTitle">Wedding Rama & Shinta</strong>
          <span id="galleryCounter" style="background:rgba(21,128,61,0.12); color:#15803D; font-weight:700; font-size:16px; padding:5px 14px; border-radius:12px;">0/20 Dipilih</span>
        </div>
        <div class="photo-grid">
          <div class="photo-item" id="p1"><svg class="star-svg" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg><span class="badge-terpilih">TERPILIH</span></div>
          <div class="photo-item" id="p2"><svg class="star-svg" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg><span class="badge-terpilih">TERPILIH</span></div>
          <div class="photo-item" id="p3"><svg class="star-svg" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg><span class="badge-terpilih">TERPILIH</span></div>
        </div>
        <div class="gold-cta-btn" id="btnSubmitRecap">
          💬 Kirim Seleksi Foto ke Fotografer
        </div>
        <div class="notif-bar" id="galleryNotif" style="display:none;">
          ✓ Notifikasi WhatsApp Berhasil Terkirim ke Studio!
        </div>
      </div>

      <!-- SCENE 5 VIEW (OUTRO CTA) -->
      <div id="sceneOutro_view" style="display:none; flex-direction:column; align-items:center; text-align:center; gap:20px; padding:20px 0;">
        <div style="width:80px; height:80px; border-radius:22px; background:linear-gradient(135deg, #D4AF37, #8C6D23); display:flex; align-items:center; justify-content:center; box-shadow:0 10px 24px rgba(197,160,89,0.4);">
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
        </div>
        <div style="font-family:'Fraunces', Georgia, serif; font-size:${isVertical ? '38px' : '30px'}; font-weight:700; color:var(--paper);">
          Tingkatkan Kelas Studio Anda
        </div>
        <div style="font-size:${isVertical ? '22px' : '18px'}; color:var(--muted);">
          Coba Sekarang Gratis Tanpa Daftar di:<br>
          <strong style="color:var(--brass-dark); font-size:${isVertical ? '28px' : '22px'}; font-family:'IBM Plex Mono', monospace;">pickyourphoto.com</strong>
        </div>
        <div class="gold-cta-btn" id="outroCtaBtn" style="width:100%;">
          ⚡ Mulai Instant Trial 1 Menit
        </div>
      </div>

    </div>
  </main>

  <!-- FOOTER -->
  <footer class="bottom-footer">
    <div>SaaS Platform Khusus <strong>Studio Fotografer Indonesia</strong></div>
    <div>Coba Sekarang di <strong>pickyourphoto.com</strong> ↗</div>
  </footer>

  <!-- FAST SNAPPY CURSOR -->
  <svg id="mouseCursor" viewBox="0 0 24 24" fill="none">
    <path d="M3 3l7 18 3-7 7-3L3 3z" fill="#C5A059" stroke="#FFFFFF" stroke-width="2" stroke-linejoin="round"/>
  </svg>
  <div id="mouseRipple"></div>

<script>
  // SNAPPY NATURAL HUMAN MOTION ENGINE
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

  // 30-SECOND MASTER TIMELINE CONTROLLER
  function updateFrame(t) {
    const progressPct = (t / 30) * 100;
    document.getElementById('topProgressBar').style.width = progressPct + '%';

    // ------------------------------------------------------------------
    // SCENE 1: (0.0s - 5.5s) PROBLEM HOOK (Drive Berantakan)
    // ------------------------------------------------------------------
    if (t < 5.5) {
      document.getElementById('headerBadge').textContent = '0 Byte Storage';
      document.getElementById('scene1_view').style.display = 'flex';
      document.getElementById('sceneGallery_view').style.display = 'none';
      document.getElementById('sceneOutro_view').style.display = 'none';

      document.getElementById('sceneTag').className = 'pill-tag red';
      document.getElementById('sceneTag').innerHTML = '❌ Masalah Kirim Drive Manual';
      document.getElementById('mainHeadline').innerHTML = 'Klien <em>Pusing</em> Pilih<br>Ribuan Foto Drive?';
      document.getElementById('mainDesc').innerHTML = 'Kirim link Google Drive bikin klien repot buka file berat & mencatat nomor foto manual di WhatsApp.';

      // Snappy cursor flight at 1.0s - 1.35s
      const target = getElCenter('driveConfused');
      if (t < 1.0) {
        setCursor(${W * 0.85}, ${H * 0.85});
      } else if (t < 1.35) {
        const p = easeOutCubic((t - 1.0) / 0.35);
        setCursor(${W * 0.85} + (target.x - ${W * 0.85}) * p, ${H * 0.85} + (target.y - ${H * 0.85}) * p);
      } else {
        setCursor(target.x, target.y);
        if (t >= 1.36 && t <= 1.42) triggerRipple(target.x, target.y);
      }
    }

    // ------------------------------------------------------------------
    // SCENE 2: (5.5s - 12.0s) THE SOLUTION (Pick Your Photo 0 Byte Storage)
    // ------------------------------------------------------------------
    else if (t < 12.0) {
      document.getElementById('headerBadge').textContent = '0 Byte VPS Storage';
      document.getElementById('scene1_view').style.display = 'none';
      document.getElementById('sceneGallery_view').style.display = 'flex';
      document.getElementById('sceneOutro_view').style.display = 'none';

      document.getElementById('sceneTag').className = 'pill-tag gold';
      document.getElementById('sceneTag').innerHTML = '✨ Solusi Cerdas 0 Byte VPS';
      document.getElementById('mainHeadline').innerHTML = 'Galeri Mewah Berkelas,<br><em>Sync Langsung</em> Google Drive';
      document.getElementById('mainDesc').innerHTML = 'Tanpa perlu upload ulang ke VPS. Hubungkan Google Drive Anda, sistem langsung buatkan galeri interaktif eksklusif.';

      document.getElementById('galleryCounter').textContent = '0/20 Dipilih';
      document.getElementById('p1').classList.remove('selected');
      document.getElementById('p2').classList.remove('selected');
      document.getElementById('p3').classList.remove('selected');
      document.getElementById('galleryNotif').style.display = 'none';

      // Gentle cursor rest / hover
      const p1Pos = getElCenter('p1');
      if (t < 9.0) {
        setCursor(${W * 0.25}, ${H * 0.65});
      } else if (t < 9.35) {
        const p = easeOutCubic((t - 9.0) / 0.35);
        setCursor(${W * 0.25} + (p1Pos.x - ${W * 0.25}) * p, ${H * 0.65} + (p1Pos.y - ${H * 0.65}) * p);
      } else {
        setCursor(p1Pos.x, p1Pos.y);
      }
    }

    // ------------------------------------------------------------------
    // SCENE 3: (12.0s - 20.0s) LIVE INTERACTIVE DEMO (Klien Pilih Bintang di HP)
    // ------------------------------------------------------------------
    else if (t < 20.0) {
      document.getElementById('headerBadge').textContent = 'Live Sortir Klien';
      document.getElementById('scene1_view').style.display = 'none';
      document.getElementById('sceneGallery_view').style.display = 'flex';
      document.getElementById('sceneOutro_view').style.display = 'none';

      document.getElementById('sceneTag').className = 'pill-tag gold';
      document.getElementById('sceneTag').innerHTML = '📱 Pengalaman Klien 1-Click';
      document.getElementById('mainHeadline').innerHTML = 'Klien Buka di Smartphone,<br><em>Tinggal Klik Bintang</em>';
      document.getElementById('mainDesc').innerHTML = 'Klien melihat katalog elegan di HP, cukup sentuh bintang pada foto favorit. Nomor file langsung terekam otomatis.';

      const p1 = getElCenter('p1');
      const p2 = getElCenter('p2');
      const p3 = getElCenter('p3');

      // Click 1 (13.0s - 13.35s)
      if (t < 14.5) {
        if (t < 13.0) {
          setCursor(p1.x, p1.y);
        } else if (t < 13.35) {
          setCursor(p1.x, p1.y, 0.85);
          document.getElementById('p1').classList.add('selected');
          document.getElementById('galleryCounter').textContent = '1/20 Dipilih';
          if (t >= 13.05 && t <= 13.12) triggerRipple(p1.x, p1.y);
        } else {
          setCursor(p1.x, p1.y, 1);
          document.getElementById('p1').classList.add('selected');
          document.getElementById('galleryCounter').textContent = '1/20 Dipilih';
        }
      }
      // Click 2 (15.5s - 15.9s)
      else if (t < 17.5) {
        document.getElementById('p1').classList.add('selected');
        if (t < 15.5) {
          setCursor(p1.x, p1.y);
        } else if (t < 15.85) {
          const p = easeOutCubic((t - 15.5) / 0.35);
          setCursor(p1.x + (p2.x - p1.x) * p, p1.y + (p2.y - p1.y) * p);
        } else {
          setCursor(p2.x, p2.y, t < 16.0 ? 0.85 : 1);
          document.getElementById('p2').classList.add('selected');
          document.getElementById('galleryCounter').textContent = '2/20 Dipilih';
          if (t >= 15.86 && t <= 15.92) triggerRipple(p2.x, p2.y);
        }
      }
      // Click 3 (18.0s - 18.4s)
      else {
        document.getElementById('p1').classList.add('selected');
        document.getElementById('p2').classList.add('selected');
        if (t < 18.0) {
          setCursor(p2.x, p2.y);
        } else if (t < 18.35) {
          const p = easeOutCubic((t - 18.0) / 0.35);
          setCursor(p2.x + (p3.x - p2.x) * p, p2.y + (p3.y - p2.y) * p);
        } else {
          setCursor(p3.x, p3.y, t < 18.5 ? 0.85 : 1);
          document.getElementById('p3').classList.add('selected');
          document.getElementById('galleryCounter').textContent = '3/20 Dipilih';
          if (t >= 18.36 && t <= 18.42) triggerRipple(p3.x, p3.y);
        }
      }
    }

    // ------------------------------------------------------------------
    // SCENE 4: (20.0s - 25.5s) MAGIC SORT & WHATSAPP RECAP
    // ------------------------------------------------------------------
    else if (t < 25.5) {
      document.getElementById('headerBadge').textContent = 'Auto WhatsApp Recap';
      document.getElementById('scene1_view').style.display = 'none';
      document.getElementById('sceneGallery_view').style.display = 'flex';
      document.getElementById('sceneOutro_view').style.display = 'none';

      document.getElementById('p1').classList.add('selected');
      document.getElementById('p2').classList.add('selected');
      document.getElementById('p3').classList.add('selected');
      document.getElementById('galleryCounter').textContent = '3/20 Dipilih';

      document.getElementById('sceneTag').className = 'pill-tag green';
      document.getElementById('sceneTag').innerHTML = '⚡ Rekap WhatsApp Otomatis';
      document.getElementById('mainHeadline').innerHTML = 'Nomor Foto Terdata Rapi,<br><em>Kirim via WhatsApp</em> 1 Detik';
      document.getElementById('mainDesc').innerHTML = 'Sistem otomatis merekap nomor file foto yang disukai dan langsung mengirim notifikasi WhatsApp ke fotografer.';

      const btnPos = getElCenter('btnSubmitRecap');
      if (t < 21.0) {
        setCursor(${W * 0.5}, ${H * 0.65});
      } else if (t < 21.35) {
        const p = easeOutCubic((t - 21.0) / 0.35);
        setCursor(${W * 0.5} + (btnPos.x - ${W * 0.5}) * p, ${H * 0.65} + (btnPos.y - ${H * 0.65}) * p);
      } else {
        setCursor(btnPos.x, btnPos.y, t < 21.5 ? 0.85 : 1);
        document.getElementById('btnSubmitRecap').classList.add('clicked');
        document.getElementById('btnSubmitRecap').innerHTML = '✓ Pilihan Berhasil Terkirim!';
        document.getElementById('galleryNotif').style.display = 'flex';
        if (t >= 21.36 && t <= 21.42) triggerRipple(btnPos.x, btnPos.y);
      }
    }

    // ------------------------------------------------------------------
    // SCENE 5: (25.5s - 30.0s) OUTRO & CALL TO ACTION
    // ------------------------------------------------------------------
    else {
      document.getElementById('headerBadge').textContent = 'Instant Trial 1 Menit';
      document.getElementById('scene1_view').style.display = 'none';
      document.getElementById('sceneGallery_view').style.display = 'none';
      document.getElementById('sceneOutro_view').style.display = 'flex';

      document.getElementById('sceneTag').className = 'pill-tag gold';
      document.getElementById('sceneTag').innerHTML = '🚀 Coba Sekarang Tanpa Daftar';
      document.getElementById('mainHeadline').innerHTML = 'Tingkatkan Kelas Studio Anda.<br><em>Mulai Trial 1 Menit!</em>';
      document.getElementById('mainDesc').innerHTML = 'Upload beberapa foto sampel, langsung coba galeri interaktif tanpa kartu kredit & tanpa registrasi akun.';

      const outroBtn = getElCenter('outroCtaBtn');
      if (t < 27.0) {
        setCursor(${W * 0.2}, ${H * 0.7});
      } else if (t < 27.35) {
        const p = easeOutCubic((t - 27.0) / 0.35);
        setCursor(${W * 0.2} + (outroBtn.x - ${W * 0.2}) * p, ${H * 0.7} + (outroBtn.y - ${H * 0.7}) * p);
      } else {
        setCursor(outroBtn.x, outroBtn.y);
        if (t >= 27.36 && t <= 27.42) triggerRipple(outroBtn.x, outroBtn.y);
      }
    }
  }

  window.seek = updateFrame;
</script>
</body>
</html>`;
}

async function renderMasterVideo(browser, isVertical, durationSec, filename) {
  const W = isVertical ? 1080 : 1920;
  const H = isVertical ? 1920 : 1080;
  const fps = 60;
  const totalFrames = durationSec * fps;
  const outputPath = path.join(OUTPUT_DIR, filename);
  const publicPath = path.join(PUBLIC_DIR, filename);

  console.log(`\n🎬 RENDERING MASTER 30s PROMO: ${filename} (${W}x${H} @ 60fps, ${durationSec}s, ${totalFrames} frames)...`);

  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });

  const html = getHtmlTemplate(isVertical);
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
      const currSec = t.toFixed(1);
      process.stdout.write(`   [${filename}] ${pct}% (Timeline: ${currSec}s / ${durationSec}s)\r`);
    }
  }

  ffmpeg.stdin.end();
  await new Promise(resolve => ffmpeg.on('close', resolve));
  await page.close();

  fs.copyFileSync(outputPath, publicPath);
  const sizeMb = (fs.statSync(outputPath).size / (1024 * 1024)).toFixed(2);
  console.log(`\n✅ [${filename}] SELESAI DENGAN SEMPURNA (${sizeMb} MB) -> ${outputPath}`);
}

async function main() {
  console.log('========================================================');
  console.log('🚀 MASTER 30-DETIK PROMO VIDEO RENDERER (INSTAGRAM READY)');
  console.log('========================================================');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  try {
    // 1. Instagram Story / Reels 9:16 (1080 x 1920) — 30 Detik Lengkap
    await renderMasterVideo(browser, true, 30, 'promo_lengkap_30s_story_9x16.mp4');

    // 2. Instagram Feeds / Landscape 16:9 (1920 x 1080) — 30 Detik Lengkap
    await renderMasterVideo(browser, false, 30, 'promo_lengkap_30s_feeds_16x9.mp4');

    console.log('\n🎉 SEMUA 2 MASTER VIDEO 30 DETIK LENGKAP SELESAI DENGAN KUALITAS TERTINGGI!');
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error('Fatal render error:', err);
  process.exit(1);
});
