'use client';

import React, { useState } from 'react';
import styles from './AdminOverview.module.css';
import { MoneyIcon, DownloadReportIcon, AnalyticsIcon, UsersIcon } from '@/components/AdminIcons';
import { SpeedBoltIcon, PhotoIcon, GalleryViewIcon, SparklesUpgradeIcon, ClockIcon } from '@/components/StorageIcons';

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

  const topTrialGalleries = analyticsData?.topTrialGalleries || [];
  const topVendorsByPhotos = analyticsData?.topVendorsByPhotos || [];
  const photoScanStats = analyticsData?.photoScanStats || {};

  const recentProjects = analyticsData?.recentProjects || [];
  const recentVendors = analyticsData?.recentVendors || [];
  const recentSubscriptionEvents = analyticsData?.recentSubscriptionEvents || [];
  const planDistribution = analyticsData?.planDistribution || [];

  const formatTimeAgo = (timeString) => {
    if (!timeString) return 'baru saja';
    const diff = Date.now() - new Date(timeString).getTime();
    if (diff < 60000) return 'baru saja';
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m lalu`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}j lalu`;
    const days = Math.floor(hours / 24);
    return `${days}h lalu`;
  };

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
    <div className={styles.wrapper}>
      
      {/* ── 1. RINGKASAN UTAMA BISNIS SAAS (HERO BANNER) ── */}
      <div className={styles.heroBanner}>
        {/* Left Side: Hero Pendapatan */}
        <div>
          <div className={styles.heroTopRow}>
            <span className={styles.pendapatanBadge}>
              <MoneyIcon size={12} color="#34d399" />
              <span>Pendapatan</span>
            </span>
            <a
              href="/api/admin/financial-report/export-csv"
              download
              title="Unduh CSV"
              className={styles.csvBtn}
            >
              <DownloadReportIcon size={11} color="#34d399" />
              <span>Laporan CSV</span>
            </a>
          </div>

          <div className={styles.heroMrr}>
            Rp {mrr.toLocaleString('id-ID')}
            <span className={styles.heroMrrUnit}>/ bln</span>
          </div>

          <div className={styles.heroSubRow}>
            <div>
              <span style={{ color: '#a1a1aa' }}>Tahunan:</span> <strong style={{ color: '#818cf8' }}>Rp {arr.toLocaleString('id-ID')}</strong>
            </div>
            <div>
              <span style={{ color: '#a1a1aa' }}>Rata-rata:</span> <strong style={{ color: '#22d3ee' }}>Rp {arpu.toLocaleString('id-ID')}</strong>
            </div>
          </div>
        </div>

        {/* Right Side: Key Metric Cards */}
        <div className={styles.miniCardsGrid}>
          <div className={`${styles.miniCard} ${styles.miniCardGreen}`}>
            <div className={styles.miniCardLabel} style={{ color: '#34d399' }}>
              <SpeedBoltIcon size={11} color="#34d399" />
              <span>Scan Hari Ini</span>
            </div>
            <div className={styles.miniCardValue}>
              +{((photoScanStats.todayTrialPhotosScanned || 0) + (photoScanStats.todayVendorPhotosScanned || 0)).toLocaleString('id-ID')}{' '}
              <span className={styles.miniCardUnit}>Foto</span>
            </div>
            <div className={styles.miniCardSub}>
              Trial: <strong style={{ color: '#fbbf24' }}>+{(photoScanStats.todayTrialPhotosScanned || 0).toLocaleString()}</strong>{' '}•{' '}
              Vendor: <strong style={{ color: '#34d399' }}>+{(photoScanStats.todayVendorPhotosScanned || 0).toLocaleString()}</strong>
            </div>
          </div>

          <div className={`${styles.miniCard} ${styles.miniCardNeutral}`}>
            <div className={styles.miniCardLabel} style={{ color: '#a1a1aa' }}>
              <UsersIcon size={11} color="#a1a1aa" />
              <span>Studio Aktif</span>
            </div>
            <div className={styles.miniCardValue} style={{ color: '#34d399' }}>
              {activeVendorCount} <span className={styles.miniCardUnit}>Studio</span>
            </div>
          </div>

          <div className={`${styles.miniCard} ${styles.miniCardNeutral}`}>
            <div className={styles.miniCardLabel} style={{ color: '#a1a1aa' }}>
              <GalleryViewIcon size={11} color="#a1a1aa" />
              <span>Galeri</span>
            </div>
            <div className={styles.miniCardValue} style={{ color: '#818cf8' }}>
              {totalProjects} <span className={styles.miniCardUnit}>Galeri</span>
            </div>
          </div>

          <div className={`${styles.miniCard} ${styles.miniCardNeutral}`}>
            <div className={styles.miniCardLabel} style={{ color: '#a1a1aa' }}>
              <PhotoIcon size={11} color="#a1a1aa" />
              <span>Foto Terpilih</span>
            </div>
            <div className={styles.miniCardValue} style={{ color: '#38bdf8' }}>
              {selectedPhotos.toLocaleString('id-ID')} <span className={styles.miniCardUnit}>({selectionRate}%)</span>
            </div>
          </div>

          {/* Pending — warna dinamis berdasarkan jumlah */}
          <div
            className={styles.miniCard}
            style={{
              background: pendingVendorCount > 0 ? 'rgba(251,191,36,0.1)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${pendingVendorCount > 0 ? 'rgba(251,191,36,0.3)' : 'rgba(255,255,255,0.08)'}`
            }}
          >
            <div className={styles.miniCardLabel} style={{ color: pendingVendorCount > 0 ? '#fbbf24' : '#a1a1aa' }}>
              <ClockIcon size={11} color={pendingVendorCount > 0 ? '#fbbf24' : '#a1a1aa'} />
              <span>Pending</span>
            </div>
            <div className={styles.miniCardValue} style={{ color: pendingVendorCount > 0 ? '#fbbf24' : '#e4e4e7' }}>
              {pendingVendorCount} <span className={styles.miniCardUnit}>Studio</span>
            </div>
          </div>
        </div>
      </div>


      {/* ── 2. WIDGET MINIMALIS: TOP 5 IMPOR FOTO ── */}
      <div className={styles.widgetGrid2}>
        
        {/* Card Kanan: Top 5 Free Trial */}
        <div className={`glass-card ${styles.leaderCardAmber}`}>
          <div className={styles.leaderHeader}>
            <div>
              <h3 className={styles.leaderTitle} style={{ color: '#fbbf24' }}>
                <SpeedBoltIcon size={14} color="#fbbf24" />
                Top Trial
              </h3>
              <p className={styles.leaderSub}>
                Total: <strong>{(photoScanStats.totalTrialPhotosScanned || 0).toLocaleString()}</strong> • Hari Ini: <strong style={{ color: '#34d399' }}>+{(photoScanStats.todayTrialPhotosScanned || 0).toLocaleString()}</strong>
              </p>
            </div>
            <span className={`${styles.leaderBadge} badge badge-pending`}>TRIAL</span>
          </div>

          <div className={styles.leaderList}>
            {topTrialGalleries.length > 0 ? (
              topTrialGalleries.map((t, idx) => (
                <div key={t.slug || idx} className={styles.leaderRow}>
                  <div className={styles.leaderRowLeft}>
                    <span className={styles.leaderRank} style={{ color: idx === 0 ? '#fbbf24' : '#64748b' }}>#{idx + 1}</span>
                    <div className={styles.leaderName}>
                      <a href={`/trial-gallery/${t.slug}`} target="_blank" rel="noreferrer" className={styles.leaderNameText}>{t.slug}</a>
                      <span className={styles.leaderNameSub}>{t.title}</span>
                    </div>
                  </div>
                  <div className={styles.leaderRowRight}>
                    <span className={styles.leaderCount} style={{ color: '#fbbf24' }}>{(t.photoCount || 0).toLocaleString()} Foto</span>
                    <div className={styles.leaderCountSub}>{t.unlockedCount} Terbuka</div>
                  </div>
                </div>
              ))
            ) : (
              <div className={styles.leaderEmpty}>Belum ada data galeri trial.</div>
            )}
          </div>
        </div>

        {/* Card Kiri: Top 5 Vendor */}
        <div className={`glass-card ${styles.leaderCardGreen}`}>
          <div className={styles.leaderHeader}>
            <div>
              <h3 className={styles.leaderTitle} style={{ color: '#34d399' }}>
                <UsersIcon size={14} color="#34d399" />
                Top Vendor
              </h3>
              <p className={styles.leaderSub}>
                Total: <strong>{(photoScanStats.totalVendorPhotosScanned || 0).toLocaleString()}</strong> • Hari Ini: <strong style={{ color: '#34d399' }}>+{(photoScanStats.todayVendorPhotosScanned || 0).toLocaleString()}</strong>
              </p>
            </div>
            <span className={`${styles.leaderBadge} badge badge-active`}>VENDOR</span>
          </div>

          <div className={styles.leaderList}>
            {topVendorsByPhotos.length > 0 ? (
              topVendorsByPhotos.map((v, idx) => (
                <div key={v.id || idx} className={styles.leaderRow}>
                  <div className={styles.leaderRowLeft}>
                    <span className={styles.leaderRank} style={{ color: idx === 0 ? '#34d399' : '#64748b' }}>#{idx + 1}</span>
                    <div className={styles.leaderName}>
                      <span className={styles.leaderNameText}>{v.brandName || v.name}</span>
                      <span className={styles.leaderNameSub}>{v.planName || 'Vendor'} • {v.email}</span>
                    </div>
                  </div>
                  <div className={styles.leaderRowRight}>
                    <span className={styles.leaderCount} style={{ color: '#34d399' }}>{(v.totalPhotos || 0).toLocaleString()} Foto</span>
                    <div className={styles.leaderCountSub}>{v.totalProjects || 0} Proyek</div>
                  </div>
                </div>
              ))
            ) : (
              <div className={styles.leaderEmpty}>Belum ada data vendor.</div>
            )}
          </div>
        </div>

      </div>

      {/* ── 3. WIDGET GRAFIK UTAMA ── */}
      <div className={styles.chartsGrid}>
        
        {/* GRAFIK 1: PENDAPATAN BULANAN */}
        <div className={`glass-card ${styles.chartCard}`}>
          <div className={styles.chartHeader}>
            <div>
              <h3 className={styles.chartTitle}>
                <AnalyticsIcon size={13} color="#34d399" />
                <span>Tren Pendapatan</span>
              </h3>
              <p className={styles.chartSub}>6 Bulan Terakhir</p>
            </div>
            <span className={styles.chartBadge} style={{ color: '#34d399', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)' }}>
              Database
            </span>
          </div>

          {/* SVG Area Chart */}
          <div style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ width: '100%', minWidth: '280px', height: 'auto', overflow: 'visible' }}>
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
              right: '20px',
              background: '#18181b',
              border: '1px solid rgba(52, 211, 153, 0.4)',
              borderRadius: '8px',
              padding: '6px 10px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.8)',
              zIndex: 10
            }}>
              <div style={{ fontSize: '10.5px', color: '#a1a1aa' }}>Bulan {activeHoverPoint.month}</div>
              <div style={{ fontSize: '13px', fontWeight: '800', color: '#34d399' }}>
                Rp {activeHoverPoint.mrr.toLocaleString('id-ID')}
              </div>
              <div style={{ fontSize: '10px', color: '#818cf8', marginTop: '2px' }}>
                {activeHoverPoint.vendors} Studio Aktif
              </div>
            </div>
          )}
        </div>

        {/* WIDGET GRAFIK 2: AKTIVITAS UNGGAH & SELEKSI FOTO (7 HARI TERAKHIR) */}
        <div className="glass-card" style={{ padding: 'clamp(16px, 3vw, 24px)', borderRadius: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '14.5px', fontWeight: '700', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PhotoIcon size={14} color="#38bdf8" />
                <span>Aktivitas Unggah &amp; Pilih Foto (7 Hari)</span>
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#a1a1aa' }}>Unggah (Biru) vs Dipilih Klien (Hijau)</p>
            </div>
            <div style={{ display: 'flex', gap: '8px', fontSize: '10px' }}>
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
      <div className="glass-card" style={{ padding: 'clamp(14px, 2.5vw, 20px)', borderRadius: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '6px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '13.5px', fontWeight: '700', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <SpeedBoltIcon size={13} color="#a855f7" />
              <span>Performa Trial</span>
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '10.5px', color: '#a1a1aa' }}>Konversi &amp; Aktivitas Galeri Trial</p>
          </div>
          <span style={{ fontSize: '10.5px', color: '#a855f7', background: 'rgba(168,85,247,0.12)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(168,85,247,0.25)', fontWeight: '600' }}>
            Konversi {trialConversionRate}%
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '12px', alignItems: 'start' }}>

          {/* Left: Stat Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '6px' }}>
            <div style={{ background: 'rgba(168, 85, 247, 0.08)', border: '1px solid rgba(168, 85, 247, 0.2)', borderRadius: '8px', padding: '8px 10px' }}>
              <div style={{ fontSize: '9px', color: '#a855f7', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Trial</div>
              <div style={{ fontSize: '18px', fontWeight: '900', color: '#ffffff', margin: '2px 0' }}>{totalTrials}</div>
              <div style={{ fontSize: '9px', color: '#71717a' }}>Sepanjang waktu</div>
            </div>

            <div style={{ background: trialsToday > 0 ? 'rgba(52, 211, 153, 0.08)' : 'rgba(255,255,255,0.02)', border: `1px solid ${trialsToday > 0 ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.06)'}`, borderRadius: '8px', padding: '8px 10px' }}>
              <div style={{ fontSize: '9px', color: '#34d399', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Hari Ini</div>
              <div style={{ fontSize: '18px', fontWeight: '900', color: '#ffffff', margin: '2px 0' }}>{trialsToday}</div>
              <div style={{ fontSize: '9px', color: '#71717a' }}>Trial baru</div>
            </div>

            <div style={{ background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: '8px', padding: '8px 10px' }}>
              <div style={{ fontSize: '9px', color: '#38bdf8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Aktif</div>
              <div style={{ fontSize: '18px', fontWeight: '900', color: '#ffffff', margin: '2px 0' }}>{trialActiveCount}</div>
              <div style={{ fontSize: '9px', color: '#71717a' }}>Berjalan</div>
            </div>

            <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '8px', padding: '8px 10px' }}>
              <div style={{ fontSize: '9px', color: '#34d399', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Selesai</div>
              <div style={{ fontSize: '18px', fontWeight: '900', color: '#ffffff', margin: '2px 0' }}>{trialsCompleted}</div>
              <div style={{ fontSize: '9px', color: '#71717a' }}>Foto terpilih</div>
            </div>
          </div>

          {/* Right: 7-Day Bar Chart */}
          <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '10px', padding: '10px 12px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', color: '#c4b5fd' }}>Aktivitas 7 Hari</span>
              <div style={{ display: 'flex', gap: '6px', fontSize: '9px' }}>
                <span style={{ color: '#a855f7', fontWeight: '600' }}>■ Dibuat</span>
                <span style={{ color: '#34d399', fontWeight: '600' }}>■ Selesai</span>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end', height: '80px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0' }}>
              {trialTrend.map((item, idx) => {
                const maxVal = Math.max(...trialTrend.map(t => Math.max(t.created, t.completed)), 1);
                const createdH = item.created > 0 ? Math.max(8, (item.created / maxVal) * 65) : 0;
                const completedH = item.completed > 0 ? Math.max(6, (item.completed / maxVal) * 65) : 0;
                return (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px' }}>
                      <div
                        style={{ width: '8px', height: `${createdH}px`, background: createdH > 0 ? 'linear-gradient(to top, #7c3aed, #a855f7)' : 'transparent', borderRadius: '2px 2px 0 0', transition: 'height 0.3s' }}
                        title={`Dibuat (${item.date}): ${item.created}`}
                      />
                      <div
                        style={{ width: '8px', height: `${completedH}px`, background: completedH > 0 ? 'linear-gradient(to top, #059669, #34d399)' : 'transparent', borderRadius: '2px 2px 0 0', transition: 'height 0.3s' }}
                        title={`Selesai (${item.date}): ${item.completed}`}
                      />
                    </div>
                    <span style={{ fontSize: '9px', color: '#71717a' }}>{item.day}</span>
                  </div>
                );
              })}
            </div>
            {trialTrend.length === 0 && (
              <div style={{ textAlign: 'center', fontSize: '10px', color: '#71717a', padding: '12px 0' }}>Belum ada data trial.</div>
            )}
          </div>
        </div>
      </div>

      {/* ── 3. SECOND ROW (STATUS STUDIO, DONUT CHART & RINGKASAN GALERI) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: '14px' }}>
        
        {/* LEFT COLUMN: STATUS AKUN STUDIO */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* Card A: Status Akun Studio */}
          <div className="glass-card" style={{ padding: 'clamp(14px, 2.5vw, 20px)', borderRadius: '14px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '13.5px', fontWeight: '700', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <UsersIcon size={13} color="#818cf8" />
                <span>Status Vendor</span>
              </span>
              <span style={{ fontSize: '10.5px', color: '#a1a1aa', fontWeight: 'normal' }}>Total {activeVendorCount + pendingVendorCount + expiredVendorsCount} Studio</span>
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '6px' }}>
              <div style={{ background: 'rgba(52, 211, 153, 0.08)', border: '1px solid rgba(52, 211, 153, 0.2)', borderRadius: '8px', padding: '8px 10px' }}>
                <div style={{ fontSize: '9px', color: '#34d399', fontWeight: '700' }}>● AKTIF</div>
                <div style={{ fontSize: '18px', fontWeight: '900', color: '#ffffff', margin: '2px 0' }}>{activeVendorCount}</div>
                <div style={{ fontSize: '9px', color: '#71717a' }}>Studio aktif</div>
              </div>

              <div style={{ background: 'rgba(251, 191, 36, 0.08)', border: '1px solid rgba(251, 191, 36, 0.2)', borderRadius: '8px', padding: '8px 10px' }}>
                <div style={{ fontSize: '9px', color: '#fbbf24', fontWeight: '700' }}>⌛ PENDING</div>
                <div style={{ fontSize: '18px', fontWeight: '900', color: '#ffffff', margin: '2px 0' }}>{pendingVendorCount}</div>
                <div style={{ fontSize: '9px', color: '#71717a' }}>Menunggu</div>
              </div>

              <div style={{ background: 'rgba(248, 113, 113, 0.08)', border: '1px solid rgba(248, 113, 113, 0.2)', borderRadius: '8px', padding: '8px 10px' }}>
                <div style={{ fontSize: '9px', color: '#f87171', fontWeight: '700' }}>🔒 EXPIRED</div>
                <div style={{ fontSize: '18px', fontWeight: '900', color: '#ffffff', margin: '2px 0' }}>{expiredVendorsCount}</div>
                <div style={{ fontSize: '9px', color: '#71717a' }}>Paket habis</div>
              </div>

              <div style={{ background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: '8px', padding: '8px 10px' }}>
                <div style={{ fontSize: '9px', color: '#818cf8', fontWeight: '700' }}>⚠️ &lt; 7 HARI</div>
                <div style={{ fontSize: '18px', fontWeight: '900', color: '#ffffff', margin: '2px 0' }}>{expiringSoonCount}</div>
                <div style={{ fontSize: '9px', color: '#71717a' }}>Hampir habis</div>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: DONUT CHART & RINGKASAN GALERI PROYEK */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* WIDGET DONUT CHART DYNAMIC DARI SQLITE */}
          <div className="glass-card" style={{ padding: 'clamp(14px, 2.5vw, 20px)', borderRadius: '14px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '13.5px', fontWeight: '700', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AnalyticsIcon size={13} color="#818cf8" />
              <span>Distribusi Paket</span>
            </h3>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '4px 0', flexWrap: 'wrap' }}>
              {/* Dynamic SVG Donut Ring */}
              <svg width="80" height="80" viewBox="0 0 42 42">
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '10.5px', flex: 1, minWidth: '130px' }}>
                {donutSlices.length > 0 ? donutSlices.map((s, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#a1a1aa', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: s.color }} />
                      {s.name} ({s.percent}%)
                    </span>
                    <strong style={{ color: '#ffffff' }}>{s.count} Studio</strong>
                  </div>
                )) : (
                  <div style={{ color: '#71717a' }}>Belum ada data paket.</div>
                )}
              </div>
            </div>
          </div>

          {/* Card D: Ringkasan Galeri Proyek */}
          <div className="glass-card" style={{ padding: 'clamp(14px, 2.5vw, 20px)', borderRadius: '14px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '13.5px', fontWeight: '700', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <GalleryViewIcon size={13} color="#34d399" />
              <span>Ringkasan Galeri</span>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '8px 10px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: '#a1a1aa' }}>Project Selesai</span>
                <strong style={{ fontSize: '12px', color: '#34d399' }}>✓ {completedProjects}</strong>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '8px 10px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: '#a1a1aa' }}>Project Berjalan</span>
                <strong style={{ fontSize: '12px', color: '#fbbf24' }}>⌛ {activeProjects}</strong>
              </div>

              <div style={{ background: 'rgba(251, 191, 36, 0.06)', border: '1px solid rgba(251, 191, 36, 0.2)', padding: '8px 10px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: '#fbbf24' }}>⚡ Trial Aktif</span>
                <strong style={{ fontSize: '12px', color: '#fbbf24' }}>{trialActiveCount}</strong>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── 4. FULL-WIDTH LIVE ACTIVITY STREAM (PROJECTS, VENDORS, SUBSCRIPTIONS & ADD-ONS) ── */}
      <div className="glass-card" style={{ padding: 'clamp(14px, 2.5vw, 20px)', borderRadius: '14px' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '13.5px', fontWeight: '700', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ClockIcon size={13} color="#818cf8" />
          <span>Aktivitas Terbaru</span>
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '12px' }}>
          {/* Recent Projects */}
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#818cf8', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Galeri Baru</span>
                <span style={{ fontSize: '8.5px', background: 'rgba(129,140,248,0.15)', color: '#818cf8', padding: '1px 5px', borderRadius: '4px', fontWeight: 'bold' }}>Top 5</span>
              </div>
              {recentProjects.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {recentProjects.map(p => (
                    <div key={p.id} style={{ fontSize: '10.5px', paddingBottom: '5px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '6px' }}>
                        <strong style={{ color: '#ffffff', display: 'block', textOverflow: 'ellipsis', overflow: 'hidden' }}>{p.name}</strong>
                        <span style={{ color: '#71717a', fontSize: '9px' }}>{p.vendorName}</span>
                      </div>
                      <span style={{ fontSize: '8px', padding: '2px 5px', borderRadius: '4px', background: p.status === 'completed' ? 'rgba(16,185,129,0.15)' : 'rgba(251,191,36,0.15)', color: p.status === 'completed' ? '#34d399' : '#fbbf24', flexShrink: 0, fontWeight: 'bold' }}>
                        {p.status === 'completed' ? 'Selesai' : 'Aktif'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '10.5px', color: '#71717a' }}>Belum ada aktivitas project.</div>
              )}
            </div>
          </div>

          {/* Recent Vendors */}
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#34d399', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Studio Baru</span>
                <span style={{ fontSize: '8.5px', background: 'rgba(52,211,153,0.15)', color: '#34d399', padding: '1px 5px', borderRadius: '4px', fontWeight: 'bold' }}>Top 5</span>
              </div>
              {recentVendors.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {recentVendors.map(v => (
                    <div key={v.id} style={{ fontSize: '10.5px', paddingBottom: '5px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '6px' }}>
                        <strong style={{ color: '#ffffff', display: 'block', textOverflow: 'ellipsis', overflow: 'hidden' }}>{v.name}</strong>
                        <span style={{ color: '#71717a', fontSize: '9px' }}>{v.email}</span>
                      </div>
                      <span style={{ fontSize: '8px', padding: '2px 5px', borderRadius: '4px', background: v.status === 'active' ? 'rgba(16,185,129,0.15)' : 'rgba(251,191,36,0.15)', color: v.status === 'active' ? '#34d399' : '#fbbf24', flexShrink: 0, fontWeight: 'bold' }}>
                        {v.status === 'active' ? 'Aktif' : 'Pending'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '10.5px', color: '#71717a' }}>Belum ada pendaftaran baru.</div>
              )}
            </div>
          </div>

          {/* Recent Active Subscriptions & Add-On Events (Top 5) */}
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(16,185,129,0.2)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#34d399', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Transaksi Baru</span>
                <span style={{ fontSize: '8.5px', background: 'rgba(16,185,129,0.15)', color: '#34d399', padding: '1px 5px', borderRadius: '4px', fontWeight: 'bold' }}>Top 5</span>
              </div>
              {recentSubscriptionEvents.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {recentSubscriptionEvents.map(ev => {
                    const quotaGb = ev.addonQuotaBytes ? Math.round(ev.addonQuotaBytes / (1024 * 1024 * 1024)) : 0;
                    
                    let label = '';
                    let badgeColor = '#34d399';
                    let badgeBg = 'rgba(52,211,153,0.15)';

                    if (ev.transactionType === 'addon') {
                      label = ev.addonName ? `Add-On ${ev.addonName}` : (quotaGb > 0 ? `+${quotaGb} GB` : 'Storage');
                      badgeColor = '#38bdf8';
                      badgeBg = 'rgba(56,189,248,0.15)';
                    } else if (ev.planName && ev.addonPlanId) {
                      label = `${ev.planName} + Add-On`;
                      badgeColor = '#fbbf24';
                      badgeBg = 'rgba(251,191,36,0.15)';
                    } else {
                      label = ev.planName ? `${ev.planName}` : 'Paket';
                      badgeColor = '#818cf8';
                      badgeBg = 'rgba(129,140,248,0.15)';
                    }

                    return (
                      <div key={ev.id} style={{ fontSize: '10.5px', paddingBottom: '5px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '6px' }}>
                          <strong style={{ color: '#ffffff', display: 'block', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                            {ev.vendorName || 'Studio'}
                          </strong>
                          <span style={{ color: '#a1a1aa', fontSize: '9px' }}>{label}</span>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <span style={{ fontSize: '8.5px', padding: '1px 5px', borderRadius: '4px', background: badgeBg, color: badgeColor, fontWeight: 'bold', display: 'block' }}>
                            Rp {(ev.amount || 0).toLocaleString('id-ID')}
                          </span>
                          <span style={{ fontSize: '8px', color: '#71717a', display: 'block', marginTop: '1px' }}>
                            {formatTimeAgo(ev.eventTime)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ fontSize: '10.5px', color: '#71717a' }}>Belum ada transaksi.</div>
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
