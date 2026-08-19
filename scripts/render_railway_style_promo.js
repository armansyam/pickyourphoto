const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer-core');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUTPUT_DIR = path.join(__dirname, '../videos_instagram');
const PUBLIC_DIR = path.join(__dirname, '../public/videos');
const SCRATCH_DIR = path.join(__dirname, '../scratch');

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR, { recursive: true });
if (!fs.existsSync(SCRATCH_DIR)) fs.mkdirSync(SCRATCH_DIR, { recursive: true });

function getPhotoCardHtml(id, title, tag, color1, color2, iconType) {
  return `
    <div id="${id}" class="photo-card">
      <div class="photo-card-bg" style="background: linear-gradient(145deg, ${color1}, ${color2});">
        <div class="photo-overlay-gradient"></div>
        <div class="photo-tag-pill">${tag}</div>
        <div class="photo-art-icon">
          ${iconType === 'ring' ? `
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="rgba(255,255,255,0.85)" stroke-width="1.5">
              <circle cx="9" cy="14" r="5"/><circle cx="15" cy="10" r="5"/><path d="M12 2l1.5 2.5h-3L12 2z"/>
            </svg>` : iconType === 'couple' ? `
            <svg viewBox="0 0 24 24" width="56" height="56" fill="none" stroke="rgba(255,255,255,0.85)" stroke-width="1.5">
              <circle cx="8" cy="8" r="3.5"/><circle cx="16" cy="7" r="3"/><path d="M3 20c0-3.5 3-5 5-5s5 1.5 5 5M12 20c0-3 2.5-4.5 4.5-4.5S21 17 21 20"/>
            </svg>` : `
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="rgba(255,255,255,0.85)" stroke-width="1.5">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
            </svg>`}
        </div>
        <div class="photo-caption-box">
          <div class="photo-fname">${title}</div>
          <div class="photo-spec">Sony A7 IV &bull; 85mm f/1.4 GM &bull; RAW</div>
        </div>
      </div>
      <div class="star-btn">
        <svg viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
      </div>
      <div class="selected-badge">TERPILIH</div>
    </div>
  `;
}

function generateHtmlContent(isVertical) {
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Pick Your Photo Master Demo</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; user-select: none; }
    body {
      width: ${isVertical ? '1080px' : '1920px'};
      height: ${isVertical ? '1920px' : '1080px'};
      background: #090D14;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #F8FAFC;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
    }

    /* Ambient Subtle Grid Background */
    .bg-grid {
      position: absolute;
      inset: 0;
      background-image: radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px);
      background-size: 36px 36px;
      opacity: 0.5;
      pointer-events: none;
      z-index: 0;
    }

    .ambient-glow {
      position: absolute;
      width: 700px;
      height: 700px;
      border-radius: 50%;
      filter: blur(140px);
      opacity: 0.16;
      pointer-events: none;
      z-index: 0;
    }
    .glow-gold { top: -100px; left: 15%; background: #C5A059; }
    .glow-blue { bottom: -100px; right: 15%; background: #3B82F6; }

    /* Top Brand & Timeline Navigation */
    .top-nav {
      position: relative;
      z-index: 10;
      padding: ${isVertical ? '48px 48px 24px' : '28px 60px 16px'};
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .brand-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .brand-logo-group {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .logo-icon-box {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: linear-gradient(135deg, #C5A059, #996515);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 16px rgba(197, 160, 89, 0.35);
    }
    .logo-icon-box svg { width: 24px; height: 24px; fill: #FFFFFF; }

    .brand-text-title {
      font-size: ${isVertical ? '26px' : '22px'};
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #FFFFFF;
    }
    .brand-text-title span {
      font-style: italic;
      color: #E6CA85;
      font-weight: 600;
    }

    .tag-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 16px;
      border-radius: 20px;
      background: rgba(197, 160, 89, 0.15);
      border: 1px solid rgba(197, 160, 89, 0.4);
      color: #E6CA85;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .tag-pulse-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #10B981;
      box-shadow: 0 0 8px #10B981;
    }

    /* Steps Progress Bar */
    .steps-container {
      display: flex;
      gap: 10px;
      width: 100%;
    }
    .step-segment {
      flex: 1;
      height: 6px;
      background: rgba(255, 255, 255, 0.12);
      border-radius: 4px;
      overflow: hidden;
      position: relative;
    }
    .step-fill {
      position: absolute;
      top: 0; left: 0; bottom: 0;
      width: 0%;
      background: linear-gradient(90deg, #C5A059, #F5D77F);
      border-radius: 4px;
      transition: width 0.05s linear;
    }

    /* Step Heading Header */
    .step-header-banner {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .step-number-tag {
      font-size: 13px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #C5A059;
    }
    .step-main-headline {
      font-size: ${isVertical ? '34px' : '26px'};
      font-weight: 800;
      color: #FFFFFF;
      letter-spacing: -0.5px;
      line-height: 1.25;
    }
    .step-main-headline span {
      color: #F3CA68;
      font-style: italic;
    }

    /* Main Stage */
    .main-stage {
      position: relative;
      z-index: 10;
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: ${isVertical ? '10px 48px' : '10px 60px'};
      overflow: hidden;
    }

    /* Scene Containers — Strictly Isolated */
    .scene-view {
      position: absolute;
      inset: ${isVertical ? '10px 48px' : '10px 60px'};
      display: none;
      align-items: center;
      justify-content: center;
      pointer-events: none;
    }
    .scene-view.active {
      display: flex !important;
      pointer-events: auto;
    }

    /* Mockup: Mac OS Window Frame */
    .mac-window {
      width: 100%;
      max-width: ${isVertical ? '980px' : '1360px'};
      height: ${isVertical ? '1280px' : '720px'};
      background: #141A23;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 18px;
      box-shadow: 0 32px 80px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.05);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      position: relative;
    }

    .mac-titlebar {
      height: 48px;
      background: #0F141C;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      padding: 0 18px;
      gap: 16px;
    }

    .mac-traffic-lights {
      display: flex;
      gap: 8px;
    }
    .traffic-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
    }
    .dot-red { background: #FF5F56; }
    .dot-yellow { background: #FFBD2E; }
    .dot-green { background: #27C93F; }

    .mac-address-bar {
      flex: 1;
      height: 30px;
      background: rgba(255, 255, 255, 0.06);
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      color: #94A3B8;
      font-family: monospace;
      gap: 6px;
    }
    .mac-address-bar svg { width: 14px; height: 14px; fill: #10B981; }

    /* Scene 1: Dashboard Modal & Project Form */
    .dashboard-content {
      flex: 1;
      padding: ${isVertical ? '32px' : '28px 40px'};
      display: flex;
      flex-direction: column;
      gap: 24px;
      position: relative;
      background: #121722;
    }

    .dash-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .dash-title {
      font-size: 24px;
      font-weight: 800;
      color: #FFFFFF;
    }
    .dash-subtitle {
      font-size: 14px;
      color: #94A3B8;
      margin-top: 4px;
    }

    .btn-create-project {
      padding: 12px 24px;
      border-radius: 10px;
      background: linear-gradient(135deg, #C5A059, #996515);
      color: #FFFFFF;
      font-weight: 700;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 4px 16px rgba(197, 160, 89, 0.35);
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    /* Modal Form Box */
    .modal-box {
      width: 100%;
      max-width: ${isVertical ? '100%' : '720px'};
      margin: 0 auto;
      background: #1A2230;
      border: 1px solid rgba(197, 160, 89, 0.35);
      border-radius: 16px;
      padding: ${isVertical ? '32px' : '28px 32px'};
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4);
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .form-label {
      font-size: 13px;
      font-weight: 700;
      color: #E2E8F0;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .form-input {
      width: 100%;
      height: 48px;
      background: #0F141C;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 10px;
      padding: 0 16px;
      font-size: 15px;
      color: #FFFFFF;
      font-family: inherit;
      display: flex;
      align-items: center;
    }
    .form-input.highlight {
      border-color: #C5A059;
      box-shadow: 0 0 0 3px rgba(197, 160, 89, 0.2);
    }

    .sync-success-card {
      padding: 16px 20px;
      border-radius: 12px;
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.4);
      display: flex;
      align-items: center;
      justify-content: space-between;
      opacity: 0;
      transform: translateY(10px);
      transition: all 0.3s ease;
    }
    .sync-success-card.active {
      opacity: 1;
      transform: translateY(0);
    }

    /* Scene 2: Smartphone Mockup (Client Gallery Experience) */
    .phone-mockup {
      width: ${isVertical ? '660px' : '440px'};
      height: ${isVertical ? '1200px' : '680px'};
      background: #090D14;
      border: 8px solid #232D3F;
      border-radius: 48px;
      box-shadow: 0 35px 80px rgba(0, 0, 0, 0.8), 0 0 0 2px rgba(255, 255, 255, 0.1);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      position: relative;
    }

    .phone-island {
      width: 120px;
      height: 26px;
      background: #000000;
      border-radius: 16px;
      position: absolute;
      top: 10px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 50;
    }

    .phone-screen {
      flex: 1;
      padding: 44px 20px 20px;
      overflow-y: hidden;
      display: flex;
      flex-direction: column;
      gap: 16px;
      background: #0D111A;
    }

    .client-gallery-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 14px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 14px;
      border: 1px solid rgba(255, 255, 255, 0.08);
    }

    .client-quota-badge {
      padding: 6px 12px;
      border-radius: 20px;
      background: linear-gradient(135deg, #C5A059, #996515);
      color: #FFFFFF;
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.5px;
    }

    .photo-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      flex: 1;
    }

    .photo-card {
      border-radius: 14px;
      overflow: hidden;
      position: relative;
      background: #171E2B;
      border: 2px solid transparent;
      aspect-ratio: 4/5;
      display: flex;
      flex-direction: column;
      transition: all 0.25s ease;
    }
    .photo-card-bg {
      width: 100%;
      height: 100%;
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 12px;
    }
    .photo-overlay-gradient {
      position: absolute;
      inset: 0;
      background: linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.65) 100%);
      pointer-events: none;
    }
    .photo-tag-pill {
      align-self: flex-start;
      padding: 4px 8px;
      background: rgba(0,0,0,0.5);
      border-radius: 6px;
      font-size: 10px;
      font-weight: 800;
      color: #FFFFFF;
      letter-spacing: 0.5px;
      z-index: 2;
    }
    .photo-art-icon {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2;
    }
    .photo-caption-box {
      z-index: 2;
    }
    .photo-fname {
      font-size: 13px;
      font-weight: 800;
      color: #FFFFFF;
    }
    .photo-spec {
      font-size: 9px;
      color: rgba(255, 255, 255, 0.7);
      font-family: monospace;
      margin-top: 2px;
    }

    .photo-card.selected {
      border-color: #F5D77F;
      box-shadow: 0 0 20px rgba(197, 160, 89, 0.6);
    }
    .selected-badge {
      position: absolute;
      bottom: 10px;
      right: 10px;
      padding: 4px 8px;
      background: #F5D77F;
      color: #1A1408;
      border-radius: 6px;
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 0.5px;
      opacity: 0;
      transform: scale(0.8);
      transition: all 0.2s ease;
      z-index: 5;
    }
    .photo-card.selected .selected-badge {
      opacity: 1;
      transform: scale(1);
    }

    .star-btn {
      position: absolute;
      top: 10px;
      right: 10px;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.65);
      border: 1px solid rgba(255, 255, 255, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      z-index: 5;
    }
    .star-btn svg { width: 18px; height: 18px; fill: rgba(255, 255, 255, 0.5); }
    .photo-card.selected .star-btn {
      background: #F5D77F;
      border-color: #F5D77F;
      transform: scale(1.1);
    }
    .photo-card.selected .star-btn svg {
      fill: #1A1408;
    }

    .btn-submit-selection {
      width: 100%;
      padding: 14px;
      border-radius: 12px;
      background: linear-gradient(135deg, #C5A059, #996515);
      color: #FFFFFF;
      font-weight: 800;
      font-size: 14px;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      box-shadow: 0 4px 20px rgba(197, 160, 89, 0.4);
    }

    /* Scene 3: Auto RAW Sorter & Lightroom Sync */
    .sorter-view {
      width: 100%;
      height: 100%;
      display: grid;
      grid-template-columns: ${isVertical ? '1fr' : '1.1fr 1fr'};
      gap: 24px;
      padding: ${isVertical ? '24px' : '24px 32px'};
    }

    .sorter-panel {
      background: #161D28;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .sorter-list-box {
      flex: 1;
      background: #0E131C;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      font-family: monospace;
      font-size: 13px;
      overflow: hidden;
    }
    .raw-item-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 12px;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.03);
      color: #CBD5E1;
    }
    .raw-item-row.matched {
      background: rgba(197, 160, 89, 0.15);
      color: #F5D77F;
      border: 1px solid rgba(197, 160, 89, 0.3);
    }

    .lightroom-mockup-panel {
      background: #1A1F2C;
      border: 1px solid rgba(59, 130, 246, 0.3);
      border-radius: 16px;
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    /* Scene 4: Closing CTA */
    .cta-hero-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 24px;
      max-width: 780px;
    }
    .cta-logo-big {
      width: 96px;
      height: 96px;
      border-radius: 26px;
      background: linear-gradient(135deg, #C5A059, #996515);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 16px 40px rgba(197, 160, 89, 0.45);
    }
    .cta-logo-big svg { width: 54px; height: 54px; fill: #FFFFFF; }

    .cta-heading {
      font-size: ${isVertical ? '48px' : '44px'};
      font-weight: 900;
      color: #FFFFFF;
      letter-spacing: -1px;
      line-height: 1.2;
    }
    .cta-heading span {
      font-style: italic;
      color: #F5D77F;
    }
    .cta-subtext {
      font-size: ${isVertical ? '22px' : '18px'};
      color: #94A3B8;
      max-width: 600px;
      line-height: 1.5;
    }

    .cta-action-badge {
      display: inline-flex;
      align-items: center;
      gap: 12px;
      padding: 16px 36px;
      border-radius: 16px;
      background: linear-gradient(135deg, #C5A059, #996515);
      color: #FFFFFF;
      font-size: ${isVertical ? '22px' : '18px'};
      font-weight: 800;
      box-shadow: 0 8px 32px rgba(197, 160, 89, 0.5);
      border: 1px solid rgba(255, 255, 255, 0.25);
    }

    /* Bottom Bar */
    .bottom-bar {
      position: relative;
      z-index: 10;
      padding: ${isVertical ? '24px 48px 48px' : '16px 60px 28px'};
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      font-size: ${isVertical ? '15px' : '13px'};
      color: #64748B;
    }
    .bottom-bar strong { color: #CBD5E1; }
    .bottom-bar-cta { color: #E6CA85; font-weight: 700; }

    /* Natural Mac OS Cursor */
    #macCursor {
      position: absolute;
      top: 0; left: 0;
      width: 28px;
      height: 28px;
      z-index: 9999;
      pointer-events: none;
      filter: drop-shadow(0 4px 10px rgba(0,0,0,0.6));
      transform: translate(-2px, -2px);
      transition: transform 0.05s ease-out;
    }
    #macCursor svg {
      width: 100%;
      height: 100%;
    }

    /* Click Ripple Effect */
    .click-ripple {
      position: absolute;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: rgba(197, 160, 89, 0.4);
      border: 2px solid #F5D77F;
      transform: translate(-50%, -50%) scale(0);
      opacity: 1;
      pointer-events: none;
      z-index: 9998;
    }
    .click-ripple.animate {
      animation: rippleAnim 0.35s ease-out forwards;
    }
    @keyframes rippleAnim {
      0% { transform: translate(-50%, -50%) scale(0.2); opacity: 1; }
      100% { transform: translate(-50%, -50%) scale(2.2); opacity: 0; }
    }
  </style>
</head>
<body>
  <div class="bg-grid"></div>
  <div class="ambient-glow glow-gold"></div>
  <div class="ambient-glow glow-blue"></div>

  <!-- Ripple Element -->
  <div id="clickRipple" class="click-ripple"></div>

  <!-- Mac Cursor -->
  <div id="macCursor">
    <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 2L22 13.5L13.5 15.5L8.5 24.5L4 2Z" fill="#FFFFFF" stroke="#000000" stroke-width="1.8" stroke-linejoin="round"/>
    </svg>
  </div>

  <!-- Top Navigation & Progress -->
  <div class="top-nav">
    <div class="brand-row">
      <div class="brand-logo-group">
        <div class="logo-icon-box">
          <svg viewBox="0 0 24 24"><path d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z"/><path d="M9 2 7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9Zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5Z"/></svg>
        </div>
        <div class="brand-text-title">Pick Your Photo <span>Studio</span></div>
      </div>
      <div class="tag-badge">
        <div class="tag-pulse-dot"></div>
        <span id="navLiveTag">Live Demo</span>
      </div>
    </div>

    <!-- 4-Stage Progress Segments -->
    <div class="steps-container">
      <div class="step-segment"><div id="stepFill1" class="step-fill"></div></div>
      <div class="step-segment"><div id="stepFill2" class="step-fill"></div></div>
      <div class="step-segment"><div id="stepFill3" class="step-fill"></div></div>
      <div class="step-segment"><div id="stepFill4" class="step-fill"></div></div>
    </div>

    <!-- Step Heading Text -->
    <div class="step-header-banner">
      <div id="stepNumberTag" class="step-number-tag">LANGKAH 1 DARI 3: FOTOGRAFER</div>
      <div id="stepMainHeadline" class="step-main-headline">Hubungkan Google Drive &amp; <span>Buat Galeri 1 Menit</span></div>
    </div>
  </div>

  <!-- Main Stage -->
  <div class="main-stage">

    <!-- SCENE 1: Fotografer Sambungkan Drive di Dashboard -->
    <div id="scene1" class="scene-view active">
      <div class="mac-window">
        <div class="mac-titlebar">
          <div class="mac-traffic-lights">
            <div class="traffic-dot dot-red"></div>
            <div class="traffic-dot dot-yellow"></div>
            <div class="traffic-dot dot-green"></div>
          </div>
          <div class="mac-address-bar">
            <svg viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2Zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2Zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2Z"/></svg>
            pickyourphoto.com/dashboard/new-project
          </div>
        </div>
        <div class="dashboard-content">
          <div class="dash-header-row">
            <div>
              <div class="dash-title">Buat Galeri Seleksi Foto Klien</div>
              <div class="dash-subtitle">Hubungkan Google Drive fotografer tanpa upload ulang</div>
            </div>
            <button id="btnCreateProj" class="btn-create-project">
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
              + Proyek Baru
            </button>
          </div>

          <div class="modal-box">
            <div class="form-group">
              <label class="form-label">Nama Proyek / Acara Klien</label>
              <div id="inputProjName" class="form-input">Wedding Arya &amp; Nadine</div>
            </div>
            <div class="form-group">
              <label class="form-label">Link Folder Google Drive (Fotografer)</label>
              <div id="inputDriveLink" class="form-input highlight">https://drive.google.com/drive/folders/1wX9A...</div>
            </div>
            <div class="form-group">
              <label class="form-label">Batas Kuota Seleksi Klien</label>
              <div id="inputQuota" class="form-input">20 Foto Terpilih</div>
            </div>

            <div id="syncCard" class="sync-success-card">
              <div style="display:flex;align-items:center;gap:10px;">
                <span style="font-size:20px;">⚡</span>
                <div>
                  <div style="font-size:14px;font-weight:700;color:#10B981;">Galeri Berhasil Dibuat (0 Byte Storage)</div>
                  <div style="font-size:12px;color:#94A3B8;">Link siap dikirim ke WhatsApp klien</div>
                </div>
              </div>
              <div style="padding:6px 14px;border-radius:8px;background:#10B981;color:#FFFFFF;font-size:12px;font-weight:700;">
                ✓ SIAP DISORTR
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- SCENE 2: Klien Milih Foto di Smartphone -->
    <div id="scene2" class="scene-view">
      <div class="phone-mockup">
        <div class="phone-island"></div>
        <div class="phone-screen">
          <div class="client-gallery-header">
            <div>
              <div style="font-size:14px;font-weight:800;color:#FFFFFF;">Arya &amp; Nadine</div>
              <div style="font-size:11px;color:#94A3B8;">Artha Studio Photography</div>
            </div>
            <div id="clientQuotaBadge" class="client-quota-badge">0 / 20 DIPILIH</div>
          </div>

          <div class="photo-grid">
            ${getPhotoCardHtml('pCard1', 'IMG_0492.CR3', 'AKAD', '#4A2E18', '#784E34', 'couple')}
            ${getPhotoCardHtml('pCard2', 'IMG_0495.CR3', 'RESEPSI', '#1E293B', '#334155', 'ring')}
            ${getPhotoCardHtml('pCard3', 'IMG_0512.CR3', 'PORTRAIT', '#2A3439', '#4E5D6C', 'camera')}
            ${getPhotoCardHtml('pCard4', 'IMG_0520.CR3', 'PREWED', '#3D2817', '#6B4423', 'couple')}
          </div>

          <button id="btnSubmitClient" class="btn-submit-selection">
            <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
            Kirim Pilihan Foto ke Fotografer
          </button>
        </div>
      </div>
    </div>

    <!-- SCENE 3: Auto RAW Sorter & Lightroom Sync -->
    <div id="scene3" class="scene-view">
      <div class="mac-window">
        <div class="mac-titlebar">
          <div class="mac-traffic-lights">
            <div class="traffic-dot dot-red"></div>
            <div class="traffic-dot dot-yellow"></div>
            <div class="traffic-dot dot-green"></div>
          </div>
          <div class="mac-address-bar">
            <svg viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2Zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2Zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2Z"/></svg>
            pickyourphoto.com/dashboard/raw-sorter
          </div>
        </div>
        <div class="sorter-view">
          <!-- Left: Sorter Drawer Panel -->
          <div class="sorter-panel">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <div>
                <div style="font-size:18px;font-weight:800;color:#FFFFFF;">Auto RAW Sorter</div>
                <div style="font-size:13px;color:#94A3B8;">Project: Wedding Arya &amp; Nadine</div>
              </div>
              <div style="padding:4px 10px;border-radius:6px;background:rgba(16,185,129,0.15);color:#10B981;font-size:12px;font-weight:700;">
                20 Foto Terpilih
              </div>
            </div>

            <div class="sorter-list-box">
              <div class="raw-item-row matched"><span>IMG_0492.CR3</span><span>✓ TERPILIH</span></div>
              <div class="raw-item-row matched"><span>IMG_0495.CR3</span><span>✓ TERPILIH</span></div>
              <div class="raw-item-row matched"><span>IMG_0512.CR3</span><span>✓ TERPILIH</span></div>
              <div class="raw-item-row matched"><span>IMG_0520.CR3</span><span>✓ TERPILIH</span></div>
            </div>

            <div style="display:flex;gap:12px;">
              <button id="btnCopyLr" style="flex:1;padding:12px;border-radius:10px;background:#C5A059;color:#FFFFFF;font-weight:700;font-size:13px;border:none;box-shadow:0 4px 14px rgba(197,160,89,0.3);">
                📋 Copy Query Lightroom
              </button>
              <button id="btnRunSort" style="flex:1;padding:12px;border-radius:10px;background:#3B82F6;color:#FFFFFF;font-weight:700;font-size:13px;border:none;box-shadow:0 4px 14px rgba(59,130,246,0.3);">
                ⚡ Pisahkan File RAW di Laptop
              </button>
            </div>
          </div>

          <!-- Right: Lightroom Mockup / Result Panel -->
          <div class="lightroom-mockup-panel">
            <div style="display:flex;align-items:center;gap:10px;">
              <div style="width:36px;height:36px;border-radius:8px;background:#31A8FF;color:#000000;font-weight:900;display:flex;align-items:center;justify-content:center;font-size:18px;">Lr</div>
              <div>
                <div style="font-size:16px;font-weight:800;color:#FFFFFF;">Adobe Lightroom Classic</div>
                <div style="font-size:12px;color:#94A3B8;">Library Filter &bull; Text Match</div>
              </div>
            </div>

            <div id="lrSearchBox" style="background:#0F141C;border:1px solid #3B82F6;border-radius:8px;padding:12px 14px;font-family:monospace;font-size:13px;color:#60A5FA;">
              IMG_0492, IMG_0495, IMG_0512, IMG_0520
            </div>

            <div id="sortDoneNotice" style="margin-top:auto;padding:14px;border-radius:10px;background:rgba(16,185,129,0.15);border:1px solid #10B981;color:#10B981;font-size:13px;font-weight:700;display:flex;align-items:center;gap:8px;">
              ✓ 20 Foto Pilihan Klien Langsung Muncul Siap Diedit!
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- SCENE 4: Closing CTA -->
    <div id="scene4" class="scene-view">
      <div class="cta-hero-box">
        <div class="cta-logo-big">
          <svg viewBox="0 0 24 24"><path d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z"/><path d="M9 2 7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9Zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5Z"/></svg>
        </div>
        <div class="cta-heading">
          Tingkatkan Kelas Studio Anda.<br>
          <span>Hemat Waktu Sortir Foto.</span>
        </div>
        <div class="cta-subtext">
          Gak perlu lagi rekap manual dari WhatsApp. Klien pilih dari HP, file RAW di laptop Anda langsung tersortir seketika.
        </div>
        <div class="cta-action-badge">
          ⚡ Mulai Instant Trial 1 Menit &bull; pickyourphoto.com
        </div>
      </div>
    </div>

  </div>

  <!-- Bottom Bar -->
  <div class="bottom-bar">
    <div>Platform Khusus <strong>Studio Fotografer Indonesia</strong></div>
    <div class="bottom-bar-cta">Coba Sekarang di <strong>pickyourphoto.com &rarr;</strong></div>
  </div>

  <script>
    function easeInOutCubic(t) {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
    function easeOutQuad(t) {
      return 1 - (1 - t) * (1 - t);
    }

    const cursor = document.getElementById('macCursor');
    const ripple = document.getElementById('clickRipple');

    function triggerRipple(x, y) {
      ripple.style.left = x + 'px';
      ripple.style.top = y + 'px';
      ripple.classList.remove('animate');
      void ripple.offsetWidth;
      ripple.classList.add('animate');
    }

    window.setTimeline = function(timeSec) {
      const p1 = Math.min(1, Math.max(0, timeSec / 7.5));
      const p2 = Math.min(1, Math.max(0, (timeSec - 7.5) / 10.0));
      const p3 = Math.min(1, Math.max(0, (timeSec - 17.5) / 9.0));
      const p4 = Math.min(1, Math.max(0, (timeSec - 26.5) / 3.5));

      document.getElementById('stepFill1').style.width = (p1 * 100) + '%';
      document.getElementById('stepFill2').style.width = (p2 * 100) + '%';
      document.getElementById('stepFill3').style.width = (p3 * 100) + '%';
      document.getElementById('stepFill4').style.width = (p4 * 100) + '%';

      const s1 = document.getElementById('scene1');
      const s2 = document.getElementById('scene2');
      const s3 = document.getElementById('scene3');
      const s4 = document.getElementById('scene4');

      const tagEl = document.getElementById('stepNumberTag');
      const headEl = document.getElementById('stepMainHeadline');

      let cx = 300, cy = 400;

      if (timeSec < 7.5) {
        s1.classList.add('active');
        s2.classList.remove('active');
        s3.classList.remove('active');
        s4.classList.remove('active');

        tagEl.innerText = 'LANGKAH 1 DARI 3: FOTOGRAFER';
        headEl.innerHTML = 'Hubungkan Google Drive &amp; <span>Buat Galeri 1 Menit</span>';

        const btnCreate = document.getElementById('btnCreateProj').getBoundingClientRect();
        const syncCard = document.getElementById('syncCard');

        if (timeSec < 2.0) {
          const t = easeInOutCubic(timeSec / 2.0);
          cx = 200 + (btnCreate.left + 50 - 200) * t;
          cy = 600 + (btnCreate.top + 20 - 600) * t;
        } else if (timeSec < 4.5) {
          cx = btnCreate.left + 50;
          cy = btnCreate.top + 20;
          if (timeSec >= 2.1 && timeSec <= 2.2) triggerRipple(cx, cy);
          syncCard.classList.add('active');
        } else {
          const scRect = syncCard.getBoundingClientRect();
          const t = easeOutQuad((timeSec - 4.5) / 2.5);
          cx = (btnCreate.left + 50) + (scRect.left + 150 - (btnCreate.left + 50)) * t;
          cy = (btnCreate.top + 20) + (scRect.top + 20 - (btnCreate.top + 20)) * t;
        }

      } else if (timeSec < 17.5) {
        s1.classList.remove('active');
        s2.classList.add('active');
        s3.classList.remove('active');
        s4.classList.remove('active');

        tagEl.innerText = 'LANGKAH 2 DARI 3: PENGALAMAN KLIEN';
        headEl.innerHTML = 'Klien Buka di Smartphone, <span>Tinggal Klik Bintang</span>';

        const localT = timeSec - 7.5;
        const pCard1 = document.getElementById('pCard1');
        const pCard2 = document.getElementById('pCard2');
        const pCard3 = document.getElementById('pCard3');
        const quotaBadge = document.getElementById('clientQuotaBadge');

        const r1 = pCard1.getBoundingClientRect();
        const r2 = pCard2.getBoundingClientRect();
        const r3 = pCard3.getBoundingClientRect();

        if (localT < 3.0) {
          const t = easeInOutCubic(localT / 3.0);
          cx = (r1.left + 40) * t + 300 * (1 - t);
          cy = (r1.top + 40) * t + 700 * (1 - t);
          if (localT >= 2.8) {
            pCard1.classList.add('selected');
            quotaBadge.innerText = '1 / 20 DIPILIH';
            triggerRipple(r1.right - 20, r1.top + 20);
          }
        } else if (localT < 6.0) {
          const t = easeInOutCubic((localT - 3.0) / 3.0);
          cx = (r1.left + 40) + (r2.left + 40 - (r1.left + 40)) * t;
          cy = (r1.top + 40) + (r2.top + 40 - (r1.top + 40)) * t;
          if (localT >= 5.8) {
            pCard2.classList.add('selected');
            quotaBadge.innerText = '2 / 20 DIPILIH';
            triggerRipple(r2.right - 20, r2.top + 20);
          }
        } else if (localT < 8.5) {
          const t = easeInOutCubic((localT - 6.0) / 2.5);
          cx = (r2.left + 40) + (r3.left + 40 - (r2.left + 40)) * t;
          cy = (r2.top + 40) + (r3.top + 40 - (r2.top + 40)) * t;
          if (localT >= 8.2) {
            pCard3.classList.add('selected');
            quotaBadge.innerText = '20 / 20 LENGKAP';
            triggerRipple(r3.right - 20, r3.top + 20);
          }
        } else {
          const btnSub = document.getElementById('btnSubmitClient').getBoundingClientRect();
          const t = easeOutQuad((localT - 8.5) / 1.5);
          cx = (r3.left + 40) + (btnSub.left + 100 - (r3.left + 40)) * t;
          cy = (r3.top + 40) + (btnSub.top + 20 - (r3.top + 40)) * t;
          if (localT >= 9.8 && localT <= 9.9) triggerRipple(cx, cy);
        }

      } else if (timeSec < 26.5) {
        s1.classList.remove('active');
        s2.classList.remove('active');
        s3.classList.add('active');
        s4.classList.remove('active');

        tagEl.innerText = 'LANGKAH 3 DARI 3: FITUR UNGGULAN';
        headEl.innerHTML = 'Sortir File RAW &amp; <span>Sync Adobe Lightroom Seketika</span>';

        const localT = timeSec - 17.5;
        const btnCopy = document.getElementById('btnCopyLr').getBoundingClientRect();
        const btnSort = document.getElementById('btnRunSort').getBoundingClientRect();

        if (localT < 3.5) {
          const t = easeInOutCubic(localT / 3.5);
          cx = 250 + (btnCopy.left + 60 - 250) * t;
          cy = 600 + (btnCopy.top + 20 - 600) * t;
          if (localT >= 3.2 && localT <= 3.3) {
            triggerRipple(cx, cy);
            document.getElementById('btnCopyLr').innerText = '✓ Query Disalin!';
          }
        } else if (localT < 6.5) {
          const t = easeInOutCubic((localT - 3.5) / 3.0);
          cx = (btnCopy.left + 60) + (btnSort.left + 60 - (btnCopy.left + 60)) * t;
          cy = (btnCopy.top + 20) + (btnSort.top + 20 - (btnCopy.top + 20)) * t;
          if (localT >= 6.2 && localT <= 6.3) {
            triggerRipple(cx, cy);
            document.getElementById('btnRunSort').innerText = '✓ 20 File Terpisah!';
          }
        } else {
          const lrBox = document.getElementById('lrSearchBox').getBoundingClientRect();
          const t = easeOutQuad((localT - 6.5) / 2.5);
          cx = (btnSort.left + 60) + (lrBox.left + 150 - (btnSort.left + 60)) * t;
          cy = (btnSort.top + 20) + (lrBox.top + 20 - (btnSort.top + 20)) * t;
        }

      } else {
        s1.classList.remove('active');
        s2.classList.remove('active');
        s3.classList.remove('active');
        s4.classList.add('active');

        tagEl.innerText = 'MULAI SEKARANG';
        headEl.innerHTML = 'Tingkatkan Kelas Studio &amp; <span>Hemat Waktu Kerja</span>';

        cx = ${isVertical ? '540' : '960'};
        cy = ${isVertical ? '1100' : '650'};
      }

      cursor.style.transform = \`translate(\${cx}px, \${cy}px)\`;
    };
  </script>
</body>
</html>`;
}

function writeBufferToStream(stream, buffer) {
  return new Promise((resolve) => {
    if (!stream.write(buffer)) {
      stream.once('drain', resolve);
    } else {
      process.nextTick(resolve);
    }
  });
}

async function renderVideo(isVertical) {
  const width = isVertical ? 1080 : 1920;
  const height = isVertical ? 1920 : 1080;
  const filename = isVertical ? 'promo_lengkap_30s_story_9x16.mp4' : 'promo_lengkap_30s_feeds_16x9.mp4';
  const outPath = path.join(OUTPUT_DIR, filename);
  const pubPath = path.join(PUBLIC_DIR, filename);

  const durationSec = 30.0;
  const fps = 30; // 30 fps for reliable high-def render
  const totalFrames = Math.round(durationSec * fps);

  const tempHtmlPath = path.join(SCRATCH_DIR, `temp_render_${isVertical ? '9x16' : '16x9'}.html`);
  fs.writeFileSync(tempHtmlPath, generateHtmlContent(isVertical), 'utf8');

  console.log(`\n🎬 [${filename}] RENDERING MASTER 30s PROMO (${width}x${height} @ ${fps}fps, ${totalFrames} frames)...`);

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      `--window-size=${width},${height}`
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1 });

  await page.goto('file://' + path.resolve(tempHtmlPath), { waitUntil: 'load' });

  const ffmpeg = spawn('ffmpeg', [
    '-y',
    '-f', 'image2pipe',
    '-vcodec', 'png',
    '-r', `${fps}`,
    '-i', '-',
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '14',
    '-b:v', '18M',
    '-maxrate', '30M',
    '-bufsize', '45M',
    '-pix_fmt', 'yuv420p',
    '-colorspace', 'bt709',
    '-color_primaries', 'bt709',
    '-color_trc', 'bt709',
    '-color_range', 'tv',
    '-movflags', '+faststart',
    outPath
  ]);

  ffmpeg.stderr.on('data', () => {});

  const startTime = Date.now();

  for (let f = 0; f < totalFrames; f++) {
    const timeSec = f / fps;
    await page.evaluate((t) => window.setTimeline(t), timeSec);

    const buffer = await page.screenshot({ type: 'png', omitBackground: false });
    await writeBufferToStream(ffmpeg.stdin, buffer);

    if (f % (fps * 2) === 0 || f === totalFrames - 1) {
      const pct = Math.round((f / totalFrames) * 100);
      process.stdout.write(`   [${filename}] ${pct}% (Timeline: ${timeSec.toFixed(1)}s / 30s)  \r`);
    }
  }

  ffmpeg.stdin.end();

  await new Promise((resolve, reject) => {
    ffmpeg.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg exited with code ${code}`));
    });
    ffmpeg.on('error', reject);
  });

  await browser.close();

  fs.copyFileSync(outPath, pubPath);
  const sizeMb = (fs.statSync(outPath).size / (1024 * 1024)).toFixed(2);
  const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`\n✅ [${filename}] BERHASIL DIRENDER (${sizeMb} MB dalam ${elapsedSec}s) -> ${outPath}`);
}

async function run() {
  console.log('===========================================================');
  console.log('🚀 MASTER 30-DETIK PROMO VIDEO RENDERER (RETINA 60 FPS)');
  console.log('===========================================================');
  
  // Render 9:16 Vertical first (Instagram Reels / Story)
  await renderVideo(true);

  // Render 16:9 Landscape next (Instagram Feeds / Desktop)
  await renderVideo(false);

  console.log('\n🎉 SEMUA 2 MASTER VIDEO 30 DETIK LENGKAP SELESAI DENGAN KUALITAS TERTINGGI!');
}

if (require.main === module) {
  run().catch(err => {
    console.error('Fatal render error:', err);
    process.exit(1);
  });
}

module.exports = { generateHtmlContent, renderVideo, run };
