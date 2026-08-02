'use client';

import React, { useState } from 'react';

export default function AdminOverview({ analyticsData, diskStats }) {
  const [activeHoverPoint, setActiveHoverPoint] = useState(null);

  const totalProjects = analyticsData?.systemStats?.totalProjects || analyticsData?.totalProjectCount || 0;
  const completedProjects = analyticsData?.completedProjectCount || 0;
  const activeProjects = Math.max(0, totalProjects - completedProjects);

  const mrr = analyticsData?.mrr || 0;
  const arr = analyticsData?.arr || mrr * 12;
  const activeVendorCount = analyticsData?.activeVendorCount || 0;
  const pendingVendorCount = analyticsData?.pendingVendorCount || 0;
  const expiredVendorsCount = analyticsData?.expiredVendorsCount || 0;
  const expiringSoonCount = analyticsData?.expiringSoonCount || 0;
  const trialActiveCount = analyticsData?.trialActiveCount || 0;
  const totalTrials = analyticsData?.totalTrials || 0;
  const trialsToday = analyticsData?.trialsToday || 0;
  const trialsCompleted = analyticsData?.trialsCompleted || 0;
  const trialsExpiredNoConvert = analyticsData?.trialsExpiredNoConvert || 0;
  const trialConversionRate = analyticsData?.trialConversionRate || '0.0';
  const trialTrend = analyticsData?.trialTrend || [];

  const arpu = activeVendorCount > 0 ? Math.round(mrr / activeVendorCount) : 0;

  const totalPhotos = analyticsData?.systemStats?.totalPhotos || 0;
  const selectedPhotos = analyticsData?.selectedPhotosCount || 0;
  const selectionRate = totalPhotos > 0 ? ((selectedPhotos / totalPhotos) * 100).toFixed(1) : '0.0';

  const recentProjects = analyticsData?.recentProjects || [];
  const recentVendors = analyticsData?.recentVendors || [];
  const planDistribution = analyticsData?.planDistribution || [];

  const revenueTrend = analyticsData?.revenueTrend || [];
  const selectionTrend = analyticsData?.selectionTrend || [];

  // Calculate SVG line path for Revenue Trend dynamically from SQLite
  const maxMrr = Math.max(...revenueTrend.map(r => r.mrr), 1000);
  const svgWidth = 500;
  const svgHeight = 140;
  const paddingX = 40;
  const paddingY = 20;

  const points = revenueTrend.length > 0 ? revenueTrend.map((item, idx) => {
    const divisor = revenueTrend.length > 1 ? revenueTrend.length - 1 : 1;
    const x = paddingX + (idx / divisor) * (svgWidth - paddingX * 2);
    const y = svgHeight - paddingY - (item.mrr / maxMrr) * (svgHeight - paddingY * 2);
    return { x, y, ...item };
  }) : [];

  const lineD = points.length > 0 ? points.reduce((acc, p, i) => {
    return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, '') : '';

  const areaD = points.length > 0 ? `${lineD} L ${points[points.length - 1].x} ${svgHeight - paddingY} L ${points[0].x} ${svgHeight - paddingY} Z` : '';

  // Calculate Donut SVG Slices dynamically from real planDistribution array
  const totalPlanVendors = planDistribution.reduce((sum, item) => sum + (item.count || 0), 0);
  const colors = ['#34d399', '#818cf8', '#fbbf24', '#f87171', '#38bdf8'];
  const radius = 15.91549430918954;
  const circumference = 100;
  let accumulatedPercent = 0;

  const donutSlices = planDistribution.map((item, idx) => {
    const percent = totalPlanVendors > 0 ? (item.count / totalPlanVendors) * 100 : 0;
    const strokeDasharray = `${percent} ${circumference - percent}`;
    const strokeDashoffset = (100 - accumulatedPercent + 25) % 100;
    accumulatedPercent += percent;
    return {
      ...item,
      color: colors[idx % colors.length],
      percent: percent.toFixed(0),
      strokeDasharray,
      strokeDashoffset
    };
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* ── 1. RINGKASAN UTAMA BISNIS SAAS (HERO BANNER) ── */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(99, 102, 241, 0.08) 100%)',
        border: '1px solid rgba(16, 185, 129, 0.25)',
        borderRadius: '20px',
        padding: '24px 30px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '24px',
        alignItems: 'center'
      }}>
        {/* Left Side: Hero Pendapatan */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', fontSize: '11px', padding: '4px 10px', borderRadius: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              💰 Total Pendapatan Langganan Studio
            </span>
          </div>

          <div style={{ fontSize: '36px', fontWeight: '900', color: '#ffffff', letterSpacing: '-0.5px', margin: '4px 0 8px 0' }}>
            Rp {mrr.toLocaleString('id-ID')}
            <span style={{ fontSize: '14px', fontWeight: '500', color: '#34d399', marginLeft: '8px' }}>/ bulan</span>
          </div>

          <div style={{ display: 'flex', gap: '20px', fontSize: '13px', color: '#e4e4e7', flexWrap: 'wrap' }}>
            <div>
              <span style={{ color: '#a1a1aa' }}>Proyeksi Tahunan:</span> <strong style={{ color: '#818cf8' }}>Rp {arr.toLocaleString('id-ID')}</strong>
            </div>
            <div>
              <span style={{ color: '#a1a1aa' }}>Rata-rata per Studio:</span> <strong style={{ color: '#22d3ee' }}>Rp {arpu.toLocaleString('id-ID')}</strong>
            </div>
          </div>
        </div>

        {/* Right Side: Key Metric Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '14px', padding: '14px 16px' }}>
            <div style={{ fontSize: '11px', color: '#a1a1aa' }}>Studio Aktif Berlangganan</div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: '#34d399', marginTop: '2px' }}>
              {activeVendorCount} <span style={{ fontSize: '12px', color: '#a1a1aa', fontWeight: 'normal' }}>Studio</span>
            </div>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '14px', padding: '14px 16px' }}>
            <div style={{ fontSize: '11px', color: '#a1a1aa' }}>Total Galeri Foto (Project)</div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: '#818cf8', marginTop: '2px' }}>
              {totalProjects} <span style={{ fontSize: '12px', color: '#a1a1aa', fontWeight: 'normal' }}>Galeri</span>
            </div>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '14px', padding: '14px 16px' }}>
            <div style={{ fontSize: '11px', color: '#a1a1aa' }}>Total Foto Dipilih Klien</div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: '#38bdf8', marginTop: '2px' }}>
              {selectedPhotos.toLocaleString('id-ID')} <span style={{ fontSize: '11px', color: '#a1a1aa', fontWeight: 'normal' }}>({selectionRate}%)</span>
            </div>
          </div>

          <div style={{ background: pendingVendorCount > 0 ? 'rgba(251, 191, 36, 0.1)' : 'rgba(255, 255, 255, 0.03)', border: `1px solid ${pendingVendorCount > 0 ? 'rgba(251, 191, 36, 0.3)' : 'rgba(255, 255, 255, 0.08)'}`, borderRadius: '14px', padding: '14px 16px' }}>
            <div style={{ fontSize: '11px', color: pendingVendorCount > 0 ? '#fbbf24' : '#a1a1aa' }}>Pendaftaran Menunggu Konfirmasi</div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: pendingVendorCount > 0 ? '#fbbf24' : '#e4e4e7', marginTop: '2px' }}>
              {pendingVendorCount} <span style={{ fontSize: '12px', color: '#a1a1aa', fontWeight: 'normal' }}>Studio</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. WIDGET GRAFIK UTAMA (PENDAPATAN & AKTIVITAS UNGGAH/SELEKSI FOTO) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: '24px' }}>
        
        {/* WIDGET GRAFIK 1: PENDAPATAN BULANAN (6 BULAN TERAKHIR) */}
        <div className="glass-card" style={{ padding: '24px', borderRadius: '18px', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>📈 Pendapatan Bulanan & Studio Aktif (6 Bulan Terakhir)</span>
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#a1a1aa' }}>Data riil dari tanggal pendaftaran studio & paket berlangganan</p>
            </div>
            <span style={{ fontSize: '11px', color: '#34d399', background: 'rgba(52, 211, 153, 0.1)', padding: '3px 10px', borderRadius: '8px', border: '1px solid rgba(52, 211, 153, 0.2)', fontWeight: '600' }}>
              Data Riil Database
            </span>
          </div>

          {/* SVG Area Chart */}
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
              <defs>
                <linearGradient id="mrrGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34d399" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#34d399" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1={paddingX} y1={svgHeight - paddingY} x2={svgWidth - paddingX} y2={svgHeight - paddingY} stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
              <line x1={paddingX} y1={paddingY} x2={svgWidth - paddingX} y2={paddingY} stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />

              {/* Area Fill & Line Stroke */}
              {areaD && <path d={areaD} fill="url(#mrrGradient)" />}
              {lineD && <path d={lineD} fill="none" stroke="#34d399" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}

              {/* Data Interactive Points */}
              {points.map((p, idx) => (
                <g key={idx} onMouseEnter={() => setActiveHoverPoint(p)} onMouseLeave={() => setActiveHoverPoint(null)}>
                  <circle cx={p.x} cy={p.y} r="5" fill="#18181b" stroke="#34d399" strokeWidth="2.5" style={{ cursor: 'pointer' }} />
                  <text x={p.x} y={svgHeight - 4} fontSize="10" fill="#a1a1aa" textAnchor="middle">{p.month}</text>
                </g>
              ))}
            </svg>
          </div>

          {/* Dynamic Hover Tooltip */}
          {activeHoverPoint && (
            <div style={{
              position: 'absolute',
              top: '60px',
              right: '30px',
              background: '#18181b',
              border: '1px solid rgba(52, 211, 153, 0.4)',
              borderRadius: '10px',
              padding: '8px 12px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.8)',
              zIndex: 10
            }}>
              <div style={{ fontSize: '11px', color: '#a1a1aa' }}>Bulan {activeHoverPoint.month}</div>
              <div style={{ fontSize: '14px', fontWeight: '800', color: '#34d399' }}>
                Rp {activeHoverPoint.mrr.toLocaleString('id-ID')}
              </div>
              <div style={{ fontSize: '11px', color: '#818cf8', marginTop: '2px' }}>
                {activeHoverPoint.vendors} Studio Aktif
              </div>
            </div>
          )}
        </div>

        {/* WIDGET GRAFIK 2: AKTIVITAS UNGGAH & SELEKSI FOTO (7 HARI TERAKHIR) */}
        <div className="glass-card" style={{ padding: '24px', borderRadius: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>📊 Aktivitas Unggah & Pilih Foto (7 Hari)</span>
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#a1a1aa' }}>Total Foto Diunggah (Biru) vs Foto Dipilih Klien (Hijau)</p>
            </div>
            <div style={{ display: 'flex', gap: '10px', fontSize: '10px' }}>
              <span style={{ color: '#38bdf8', fontWeight: '600' }}>■ Unggah ({totalPhotos})</span>
              <span style={{ color: '#34d399', fontWeight: '600' }}>■ Dipilih ({selectedPhotos})</span>
            </div>
          </div>

          {/* SVG Bar Chart */}
          <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end', height: '120px', paddingTop: '10px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            {selectionTrend.map((item, idx) => {
              const maxVal = Math.max(...selectionTrend.map(s => Math.max(s.uploaded, s.selected)), 1);
              const upHeight = item.uploaded > 0 ? Math.max(8, (item.uploaded / maxVal) * 90) : 0;
              const selHeight = item.selected > 0 ? Math.max(8, (item.selected / maxVal) * 90) : 0;

              return (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px' }}>
                    <div style={{ width: '10px', height: `${upHeight}px`, background: upHeight > 0 ? '#38bdf8' : 'transparent', borderRadius: '3px 3px 0 0' }} title={`Foto Unggah (${item.date}): ${item.uploaded}`} />
                    <div style={{ width: '10px', height: `${selHeight}px`, background: selHeight > 0 ? '#34d399' : 'transparent', borderRadius: '3px 3px 0 0' }} title={`Foto Dipilih (${item.date}): ${item.selected}`} />
                  </div>
                  <span style={{ fontSize: '10px', color: '#a1a1aa' }}>{item.day}</span>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* ── 2b. WIDGET ANALISIS TRIAL ── */}
      <div className="glass-card" style={{ padding: '24px', borderRadius: '18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🎯 Analisis Free Trial Gallery</span>
            </h3>
            <p style={{ margin: '3px 0 0 0', fontSize: '11px', color: '#a1a1aa' }}>Performa galeri trial — konversi, aktivitas harian, dan status</p>
          </div>
          <span style={{ fontSize: '11px', color: '#a855f7', background: 'rgba(168,85,247,0.12)', padding: '3px 10px', borderRadius: '8px', border: '1px solid rgba(168,85,247,0.25)', fontWeight: '600' }}>
            Conversion Rate {trialConversionRate}%
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.6fr)', gap: '20px', alignItems: 'start' }}>

          {/* Left: Stat Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div style={{ background: 'rgba(168, 85, 247, 0.08)', border: '1px solid rgba(168, 85, 247, 0.2)', borderRadius: '12px', padding: '14px' }}>
              <div style={{ fontSize: '10px', color: '#a855f7', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>🧪 Total Trial</div>
              <div style={{ fontSize: '26px', fontWeight: '900', color: '#ffffff', margin: '4px 0 2px 0' }}>{totalTrials}</div>
              <div style={{ fontSize: '10px', color: '#71717a' }}>Sepanjang waktu</div>
            </div>

            <div style={{ background: trialsToday > 0 ? 'rgba(52, 211, 153, 0.08)' : 'rgba(255,255,255,0.02)', border: `1px solid ${trialsToday > 0 ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.06)'}`, borderRadius: '12px', padding: '14px' }}>
              <div style={{ fontSize: '10px', color: '#34d399', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>📅 Hari Ini</div>
              <div style={{ fontSize: '26px', fontWeight: '900', color: '#ffffff', margin: '4px 0 2px 0' }}>{trialsToday}</div>
              <div style={{ fontSize: '10px', color: '#71717a' }}>Trial baru dibuat</div>
            </div>

            <div style={{ background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: '12px', padding: '14px' }}>
              <div style={{ fontSize: '10px', color: '#38bdf8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>⚡ Aktif</div>
              <div style={{ fontSize: '26px', fontWeight: '900', color: '#ffffff', margin: '4px 0 2px 0' }}>{trialActiveCount}</div>
              <div style={{ fontSize: '10px', color: '#71717a' }}>Belum kedaluwarsa</div>
            </div>

            <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '12px', padding: '14px' }}>
              <div style={{ fontSize: '10px', color: '#34d399', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>✅ Selesai</div>
              <div style={{ fontSize: '26px', fontWeight: '900', color: '#ffffff', margin: '4px 0 2px 0' }}>{trialsCompleted}</div>
              <div style={{ fontSize: '10px', color: '#71717a' }}>Klien memilih foto</div>
            </div>

            <div style={{ background: trialsExpiredNoConvert > 0 ? 'rgba(248, 113, 113, 0.08)' : 'rgba(255,255,255,0.02)', border: `1px solid ${trialsExpiredNoConvert > 0 ? 'rgba(248,113,113,0.2)' : 'rgba(255,255,255,0.06)'}`, borderRadius: '12px', padding: '14px', gridColumn: '1 / -1' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '10px', color: '#f87171', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>⏰ Expired Tanpa Konversi</div>
                  <div style={{ fontSize: '26px', fontWeight: '900', color: '#ffffff', margin: '4px 0 2px 0' }}>{trialsExpiredNoConvert}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '10px', color: '#a1a1aa' }}>Conversion Rate</div>
                  <div style={{ fontSize: '22px', fontWeight: '900', color: parseFloat(trialConversionRate) >= 30 ? '#34d399' : parseFloat(trialConversionRate) >= 10 ? '#fbbf24' : '#f87171' }}>{trialConversionRate}%</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: 7-Day Bar Chart */}
          <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '14px', padding: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#c4b5fd' }}>📊 Aktivitas Trial 7 Hari Terakhir</span>
              <div style={{ display: 'flex', gap: '12px', fontSize: '10px' }}>
                <span style={{ color: '#a855f7', fontWeight: '600' }}>■ Dibuat</span>
                <span style={{ color: '#34d399', fontWeight: '600' }}>■ Selesai</span>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end', height: '100px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0' }}>
              {trialTrend.map((item, idx) => {
                const maxVal = Math.max(...trialTrend.map(t => Math.max(t.created, t.completed)), 1);
                const createdH = item.created > 0 ? Math.max(8, (item.created / maxVal) * 80) : 0;
                const completedH = item.completed > 0 ? Math.max(6, (item.completed / maxVal) * 80) : 0;
                return (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px' }}>
                      <div
                        style={{ width: '11px', height: `${createdH}px`, background: createdH > 0 ? 'linear-gradient(to top, #7c3aed, #a855f7)' : 'transparent', borderRadius: '3px 3px 0 0', transition: 'height 0.3s' }}
                        title={`Dibuat (${item.date}): ${item.created}`}
                      />
                      <div
                        style={{ width: '11px', height: `${completedH}px`, background: completedH > 0 ? 'linear-gradient(to top, #059669, #34d399)' : 'transparent', borderRadius: '3px 3px 0 0', transition: 'height 0.3s' }}
                        title={`Selesai (${item.date}): ${item.completed}`}
                      />
                    </div>
                    <span style={{ fontSize: '10px', color: '#71717a' }}>{item.day}</span>
                  </div>
                );
              })}
            </div>
            {trialTrend.length === 0 && (
              <div style={{ textAlign: 'center', fontSize: '11px', color: '#71717a', padding: '20px 0' }}>Belum ada data trial.</div>
            )}
          </div>
        </div>
      </div>

      {/* ── 3. ASYMMETRIC SECOND ROW (STATUS STUDIO, STREAM AKTIVITAS, DONUT CHART & RINGKASAN GALERI) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: '24px' }}>
        
        {/* LEFT COLUMN: STATUS AKUN STUDIO & STREAM AKTIVITAS TERBARU */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Card A: Status Akun Studio */}
          <div className="glass-card" style={{ padding: '24px', borderRadius: '18px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: '700', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>👥 Status Akun Studio Terdaftar</span>
              <span style={{ fontSize: '12px', color: '#a1a1aa', fontWeight: 'normal' }}>Total {activeVendorCount + pendingVendorCount + expiredVendorsCount} Studio</span>
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
              <div style={{ background: 'rgba(52, 211, 153, 0.08)', border: '1px solid rgba(52, 211, 153, 0.2)', borderRadius: '12px', padding: '14px' }}>
                <div style={{ fontSize: '11px', color: '#34d399', fontWeight: '700' }}>● AKTIF BERLANGGANAN</div>
                <div style={{ fontSize: '24px', fontWeight: '900', color: '#ffffff', margin: '4px 0' }}>{activeVendorCount}</div>
                <div style={{ fontSize: '10px', color: '#71717a' }}>Akun studio aktif</div>
              </div>

              <div style={{ background: 'rgba(251, 191, 36, 0.08)', border: '1px solid rgba(251, 191, 36, 0.2)', borderRadius: '12px', padding: '14px' }}>
                <div style={{ fontSize: '11px', color: '#fbbf24', fontWeight: '700' }}>⌛ MENUNGGU KONFIRMASI</div>
                <div style={{ fontSize: '24px', fontWeight: '900', color: '#ffffff', margin: '4px 0' }}>{pendingVendorCount}</div>
                <div style={{ fontSize: '10px', color: '#71717a' }}>Pendaftaran baru</div>
              </div>

              <div style={{ background: 'rgba(248, 113, 113, 0.08)', border: '1px solid rgba(248, 113, 113, 0.2)', borderRadius: '12px', padding: '14px' }}>
                <div style={{ fontSize: '11px', color: '#f87171', fontWeight: '700' }}>🔒 NONAKTIF / KEDALUWARSA</div>
                <div style={{ fontSize: '24px', fontWeight: '900', color: '#ffffff', margin: '4px 0' }}>{expiredVendorsCount}</div>
                <div style={{ fontSize: '10px', color: '#71717a' }}>Paket berakhir</div>
              </div>

              <div style={{ background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: '12px', padding: '14px' }}>
                <div style={{ fontSize: '11px', color: '#818cf8', fontWeight: '700' }}>⚠️ EXPIRED &lt; 7 HARI</div>
                <div style={{ fontSize: '24px', fontWeight: '900', color: '#ffffff', margin: '4px 0' }}>{expiringSoonCount}</div>
                <div style={{ fontSize: '10px', color: '#71717a' }}>Mendekati masa habis</div>
              </div>
            </div>
          </div>

          {/* Card B: Live Activity Stream */}
          <div className="glass-card" style={{ padding: '24px', borderRadius: '18px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: '700', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📜 Aktivitas Terbaru Platform</span>
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {/* Recent Projects */}
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#818cf8', marginBottom: '10px' }}>📁 Galeri Project Terbaru</div>
                {recentProjects.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {recentProjects.map(p => (
                      <div key={p.id} style={{ fontSize: '11px', paddingBottom: '6px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong style={{ color: '#ffffff', display: 'block' }}>{p.name}</strong>
                          <span style={{ color: '#71717a' }}>{p.vendorName}</span>
                        </div>
                        <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '4px', background: p.status === 'completed' ? 'rgba(16,185,129,0.15)' : 'rgba(251,191,36,0.15)', color: p.status === 'completed' ? '#34d399' : '#fbbf24' }}>
                          {p.status === 'completed' ? 'Selesai' : 'Aktif'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: '11px', color: '#71717a' }}>Belum ada aktivitas project.</div>
                )}
              </div>

              {/* Recent Vendors */}
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#34d399', marginBottom: '10px' }}>👤 Pendaftaran Studio Terbaru</div>
                {recentVendors.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {recentVendors.map(v => (
                      <div key={v.id} style={{ fontSize: '11px', paddingBottom: '6px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong style={{ color: '#ffffff', display: 'block' }}>{v.name}</strong>
                          <span style={{ color: '#71717a' }}>{v.email}</span>
                        </div>
                        <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '4px', background: v.status === 'active' ? 'rgba(16,185,129,0.15)' : 'rgba(251,191,36,0.15)', color: v.status === 'active' ? '#34d399' : '#fbbf24' }}>
                          {v.status === 'active' ? 'Aktif' : 'Pending'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: '11px', color: '#71717a' }}>Belum ada pendaftaran baru.</div>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: DONUT CHART & RINGKASAN GALERI PROYEK */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* WIDGET DONUT CHART DYNAMIC DARI SQLITE */}
          <div className="glass-card" style={{ padding: '24px', borderRadius: '18px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: '700', color: '#ffffff' }}>
              🍩 Distribusi Paket Langganan Studio
            </h3>

            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '10px 0' }}>
              {/* Dynamic SVG Donut Ring */}
              <svg width="100" height="100" viewBox="0 0 42 42">
                <circle cx="21" cy="21" r={radius} fill="transparent" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
                {donutSlices.map((slice, idx) => (
                  <circle
                    key={idx}
                    cx="21"
                    cy="21"
                    r={radius}
                    fill="transparent"
                    stroke={slice.color}
                    strokeWidth="6"
                    strokeDasharray={slice.strokeDasharray}
                    strokeDashoffset={slice.strokeDashoffset}
                  />
                ))}
              </svg>

              {/* Legend List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px', flex: 1 }}>
                {donutSlices.length > 0 ? donutSlices.map((s, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#a1a1aa', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: s.color }} />
                      {s.name} ({s.percent}%)
                    </span>
                    <strong style={{ color: '#ffffff' }}>{s.count} Studio</strong>
                  </div>
                )) : (
                  <div style={{ fontSize: '11px', color: '#71717a' }}>Belum ada data paket studio.</div>
                )}
              </div>
            </div>
          </div>

          {/* Card D: Ringkasan Galeri Proyek */}
          <div className="glass-card" style={{ padding: '24px', borderRadius: '18px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: '700', color: '#ffffff' }}>
              📁 Ringkasan Galeri & Trial
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px 14px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: '#a1a1aa' }}>Project Selesai Dikerjakan</span>
                <strong style={{ fontSize: '14px', color: '#34d399' }}>✓ {completedProjects} Project</strong>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px 14px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: '#a1a1aa' }}>Project Masih Berjalan</span>
                <strong style={{ fontSize: '14px', color: '#fbbf24' }}>⌛ {activeProjects} Project</strong>
              </div>

              <div style={{ background: 'rgba(251, 191, 36, 0.06)', border: '1px solid rgba(251, 191, 36, 0.2)', padding: '12px 14px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: '#fbbf24' }}>⚡ Galeri Free Trial Aktif</span>
                <strong style={{ fontSize: '14px', color: '#fbbf24' }}>{trialActiveCount} Galeri</strong>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
