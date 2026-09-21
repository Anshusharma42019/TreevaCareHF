import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  fetchKPIs, fetchTrend, fetchFunnel, fetchRtoReasons,
  fetchAging, fetchLeaderboard, fetchShipments, fetchAlerts
} from '../services/opsDashboard.service';
import RtoVerificationModal from '../components/RtoVerificationModal';
import OpsInteraktModal from '../components/OpsInteraktModal';
import InvoiceModal from '../components/InvoiceModal';
import BulkInvoiceModal from '../components/BulkInvoiceModal';

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
const fmtNum = (n) => {
  if (n === null || n === undefined) return '—';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
};
const fmtPct = (n) => (n === null || n === undefined ? '—' : `${n}%`);
const fmtDays = (n) => (n === null || n === undefined ? '—' : `${n}d`);
const fmtCurr = (n) => (n === null || n === undefined ? '—' : `₹${fmtNum(n)}`);

function ChangeChip({ value }) {
  if (value === undefined || value === null) return null;
  const up = value >= 0;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 11, fontWeight: 700,
      color: up ? '#16a34a' : '#dc2626',
      background: up ? 'rgba(22,163,74,0.1)' : 'rgba(220,38,38,0.1)',
      padding: '2px 6px', borderRadius: 8,
    }}>
      {up ? '↑' : '↓'} {Math.abs(value)}%
    </span>
  );
}

const STATUS_COLORS = {
  totalShipments: '#0f172a',
  inTransit: '#8b5cf6',
  delivered: '#16a34a', oldDelivered: '#059669', ofd: '#2563eb', undelivered: '#d97706',
  rto: '#dc2626', rtoIntersite: '#7c3aed', verified: '#0891b2',
  revenue: '#10b981', blOfd: '#3b82f6', blUndelivered: '#f59e0b', blRto: '#ef4444', blRtoIntersite: '#9333ea',
  interaktReplies: '#16a34a', replyReattempt: '#2563eb', replyDawa: '#059669',
};


/* ─── Sparkline (mini SVG line) ──────────────────────────────────────────── */
function Sparkline({ data = [], color = '#16a34a', height = 28 }) {
  if (data.length <= 1) return null;
  const safeData = data.map(v => (typeof v === 'number' && !isNaN(v)) ? v : 0);
  const max = Math.max(...safeData, 1);
  const w = 80; const h = height;
  const pts = safeData.map((v, i) => `${(i / (safeData.length - 1)) * w},${h - (v / max) * h}`).join(' ');
  return (
    <svg width={w} height={h} style={{ overflow: 'visible' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ─── KPI Card ────────────────────────────────────────────────────────────── */
function KpiCard({ label, value, change, color, formatter = fmtNum, sparkData = [], onClick, icon, subtext, unit }) {
  // Derive unit label from formatter type when not provided
  const unitLabel = unit !== undefined ? unit
    : formatter === fmtPct ? 'Rate'
    : formatter === fmtDays ? 'Days'
    : formatter === fmtCurr ? 'Revenue'
    : 'Orders';

  return (
    <div
      onClick={onClick}
      className="group relative overflow-hidden transition-all duration-300 ease-out active:scale-95 flex flex-col justify-between"
      style={{
        background: `linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.92) 100%)`,
        border: `1.5px solid ${color}35`,
        borderRadius: 16, padding: '20px', cursor: onClick ? 'pointer' : 'default',
        boxShadow: `0 10px 30px -4px rgba(15, 23, 42, 0.08), 0 2px 6px -1px ${color}20`,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        minHeight: 110,
      }}
      onMouseEnter={e => { 
        e.currentTarget.style.boxShadow = `0 12px 32px -4px ${color}40`; 
        e.currentTarget.style.transform = 'translateY(-4px)'; 
        e.currentTarget.style.borderColor = `${color}60`;
      }}
      onMouseLeave={e => { 
        e.currentTarget.style.boxShadow = `0 10px 30px -4px rgba(15, 23, 42, 0.08), 0 2px 6px -1px ${color}20`; 
        e.currentTarget.style.transform = 'none'; 
        e.currentTarget.style.borderColor = `${color}35`;
      }}
    >
      {/* Ambient glow in corner */}
      <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700 pointer-events-none" style={{ background: color, opacity: 0.12 }}></div>
      {/* Glass reflection */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
      
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative', zIndex: 10, width: '100%', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ fontSize: 11.5, fontWeight: 800, color: '#1e293b', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
          {subtext && <div title={subtext} style={{ fontSize: 10, background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#334155', padding: '2px 6px', borderRadius: 4, cursor: 'help', fontWeight: 700 }}>ℹ</div>}
        </div>
        <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#ffffff', border: '1px solid rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }} className="group-hover:scale-110 transition-transform">
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}` }}></div>
        </div>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', position: 'relative', zIndex: 10, marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <div style={{ fontSize: 36, fontWeight: 900, color: color, lineHeight: 1, letterSpacing: '-0.02em' }}>
            {value !== undefined ? formatter(value) : <span style={{ opacity: .4, fontSize: 20 }}>—</span>}
          </div>
          <span style={{ fontSize: 10, fontWeight: 800, opacity: 0.85, textTransform: 'uppercase', letterSpacing: 1, color: '#475569' }}>{unitLabel}</span>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <ChangeChip value={change} />
          {sparkData && sparkData.length > 0 && <div style={{ width: 60 }}><Sparkline data={sparkData} color={color} /></div>}
        </div>
      </div>
      
      {/* Accent line at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-1 transition-opacity pointer-events-none group-hover:opacity-40" style={{ background: color, opacity: 0.25 }}></div>
    </div>
  );
}

/* ─── Trend Chart (SVG area) ─────────────────────────────────────────────── */
function TrendChart({ data = [] }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  if (!data || !data.length) {
    return (
      <div className="flex flex-col items-center justify-center p-10 text-center bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl">
        <span className="text-3xl mb-2">📈</span>
        <div className="text-slate-900 font-extrabold text-sm">No Shipment Trend Data</div>
        <div className="text-slate-600 font-bold text-xs mt-1">No daily order records match the selected filters.</div>
      </div>
    );
  }

  const keys = ['delivered', 'ofd', 'undelivered', 'rto', 'rtoIntersite'];
  const colors = [STATUS_COLORS.delivered, STATUS_COLORS.ofd, STATUS_COLORS.undelivered, STATUS_COLORS.rto, STATUS_COLORS.rtoIntersite];
  const labels = ['Delivered', 'OFD', 'Undelivered', 'RTO', 'RTO Intersite'];

  const width = 600;
  const height = 220;
  const paddingLeft = 40;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 40;
  const graphWidth = width - paddingLeft - paddingRight;
  const graphHeight = height - paddingTop - paddingBottom;

  const maxVal = Math.max(...data.map(d => Math.max(...keys.map(k => d[k] || 0))), 1);

  const getX = (i) => {
    if (data.length <= 1) return paddingLeft + graphWidth / 2;
    return paddingLeft + (i / (data.length - 1)) * graphWidth;
  };
  const getY = (val) => {
    return paddingTop + graphHeight - (val / maxVal) * graphHeight;
  };

  const buildPath = (key) => {
    if (data.length <= 1) return "";
    return data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(d[key] || 0).toFixed(1)}`).join(' ');
  };

  return (
    <div className="space-y-4">
      {/* SVG Chart */}
      <div className="relative w-full overflow-hidden bg-slate-50/90 border border-slate-200 rounded-xl p-3">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-56 overflow-visible">
          {/* Horizontal Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
            const y = paddingTop + graphHeight * (1 - pct);
            const val = Math.round(maxVal * pct);
            return (
              <g key={idx}>
                <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="#cbd5e1" strokeDasharray="3 3" strokeWidth={1} />
                <text x={paddingLeft - 8} y={y + 4} textAnchor="end" fontSize={11} fontWeight={800} fill="#1e293b">{val}</text>
              </g>
            );
          })}

          {/* Lines & Data dots for each key */}
          {keys.map((key, ki) => {
            const pathD = buildPath(key);
            if (!pathD) return null;
            return (
              <g key={key}>
                <path d={pathD} fill="none" stroke={colors[ki]} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
                {data.map((d, i) => (
                  <circle
                    key={i}
                    cx={getX(i)}
                    cy={getY(d[key] || 0)}
                    r={hoveredIdx === i ? 6 : 4}
                    fill="#ffffff"
                    stroke={colors[ki]}
                    strokeWidth={2.5}
                    className="transition-all cursor-pointer"
                    onMouseEnter={() => setHoveredIdx(i)}
                    onMouseLeave={() => setHoveredIdx(null)}
                  />
                ))}
              </g>
            );
          })}

          {/* X-axis labels (Dates) */}
          {data.map((d, i) => {
            const showLabel = data.length <= 10 || i % Math.ceil(data.length / 8) === 0 || i === data.length - 1;
            if (!showLabel) return null;
            return (
              <text key={i} x={getX(i)} y={height - 10} fontSize={11} fontWeight={800} fill="#1e293b" textAnchor="middle">
                {d.date ? d.date.slice(5) : ''}
              </text>
            );
          })}
        </svg>

        {/* Hover Tooltip */}
        {hoveredIdx !== null && data[hoveredIdx] && (
          <div className="absolute top-2 right-2 bg-slate-900/95 text-white backdrop-blur-md px-3.5 py-2.5 rounded-xl text-xs shadow-xl border border-slate-700 pointer-events-none z-20">
            <div className="font-black text-emerald-400 border-b border-slate-700 pb-1 mb-1">
              Date: {data[hoveredIdx].date}
            </div>
            {keys.map((k, ki) => (
              <div key={k} className="flex items-center justify-between gap-4 py-0.5">
                <span className="flex items-center gap-1.5 font-bold text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: colors[ki] }} />
                  {labels[ki]}
                </span>
                <span className="font-black text-white">{data[hoveredIdx][k] || 0}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-3 flex-wrap bg-slate-100/90 border border-slate-200 rounded-xl p-2.5">
        {keys.map((key, ki) => {
          const totalForKey = data.reduce((s, d) => s + (d[key] || 0), 0);
          return (
            <div key={key} className="flex items-center gap-2 text-xs font-extrabold text-slate-900 bg-white border border-slate-300 px-3 py-1.5 rounded-lg shadow-sm">
              <span className="w-3 h-3 rounded-full shadow-sm" style={{ background: colors[ki] }} />
              <span>{labels[ki]}:</span>
              <span className="text-slate-900 font-black">{totalForKey}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Funnel ─────────────────────────────────────────────────────────────── */
function FunnelChart({ data }) {
  if (!data) return null;
  const steps = [
    { label: 'Verified', value: data.verified, color: STATUS_COLORS.verified },
    { label: 'OFD', value: data.ofd, color: STATUS_COLORS.ofd },
    { label: 'Delivered', value: data.delivered, color: STATUS_COLORS.delivered },
    { label: 'Undelivered', value: data.undelivered, color: STATUS_COLORS.undelivered },
    { label: 'RTO', value: data.rto, color: STATUS_COLORS.rto },
  ];
  const max = Math.max(...steps.map(s => s.value || 0), 1);
  return (
    <div className="space-y-3.5 py-1">
      {steps.map((s) => {
        const val = s.value || 0;
        const pct = ((val / max) * 100).toFixed(0);
        return (
          <div key={s.label} className="flex items-center gap-3">
            <div className="w-24 text-xs font-black text-slate-900 text-right shrink-0">{s.label}</div>
            <div className="flex-1 bg-slate-100 border border-slate-300 rounded-xl overflow-hidden h-7 p-0.5 relative shadow-inner">
              <div
                style={{ width: `${Math.max(val > 0 ? 6 : 0, (val / max) * 100)}%`, background: s.color }}
                className="h-full rounded-lg transition-all duration-700 shadow-sm flex items-center justify-end px-2"
              >
                {val > 0 && parseFloat(pct) > 15 && (
                  <span className="text-[10px] font-black text-white drop-shadow">{pct}%</span>
                )}
              </div>
            </div>
            <div className="w-16 text-sm font-black text-slate-900 text-right shrink-0 font-mono">
              {fmtNum(val)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Donut for RTO Reasons ──────────────────────────────────────────────── */
const RTO_REASON_COLORS = ['#dc2626', '#d97706', '#7c3aed', '#2563eb', '#64748b'];

function DonutChart({ reasons = [] }) {
  if (!reasons || !reasons.length) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl">
        <span className="text-3xl mb-2">↩</span>
        <div className="text-slate-900 font-extrabold text-sm">No RTO Reason Data Available</div>
        <div className="text-slate-600 font-bold text-xs mt-1">No return records found for the currently selected filter period.</div>
      </div>
    );
  }

  const total = reasons.reduce((s, r) => s + r.count, 0) || 1;
  const R = 40, CX = 50, CY = 50;
  const segments = [];
  reasons.slice(0, 5).reduce((cumulative, r, i) => {
    const pct = r.count / total;
    const startAngle = cumulative * 2 * Math.PI - Math.PI / 2;
    const newCumulative = cumulative + pct;
    const endAngle = newCumulative * 2 * Math.PI - Math.PI / 2;
    const x1 = CX + R * Math.cos(startAngle);
    const y1 = CY + R * Math.sin(startAngle);
    const x2 = CX + R * Math.cos(endAngle);
    const y2 = CY + R * Math.sin(endAngle);
    const largeArc = pct > 0.5 ? 1 : 0;
    segments.push({ d: `M ${CX} ${CY} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${R} ${R} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`, color: RTO_REASON_COLORS[i], pct, reason: r.reason, count: r.count });
    return newCumulative;
  }, 0);

  return (
    <div className="flex items-center gap-6 flex-wrap">
      <svg viewBox="0 0 100 100" width={140} height={140} className="shrink-0">
        {segments.map((s, i) => <path key={i} d={s.d} fill={s.color} opacity={0.9} />)}
        <circle cx={CX} cy={CY} r={22} fill="white" />
        <text x={CX} y={CY + 1} textAnchor="middle" dominantBaseline="middle" fontSize={11} fontWeight="900" fill="#0f172a">{total}</text>
        <text x={CX} y={CY + 10} textAnchor="middle" fontSize={6} fontWeight="800" fill="#475569">total</text>
      </svg>
      <div className="flex flex-col gap-2 flex-1 min-w-[200px]">
        {segments.map((s, i) => (
          <div key={i} className="flex items-center gap-2.5 text-xs bg-slate-50 p-2 rounded-xl border border-slate-200 shadow-sm">
            <span className="w-2.5 h-2.5 rounded-md shrink-0" style={{ background: s.color }} />
            <span className="text-slate-900 font-extrabold truncate">{s.reason}</span>
            <span className="text-slate-900 font-black ml-auto pl-2 shrink-0">{s.count} ({(s.pct * 100).toFixed(0)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Aging Row ──────────────────────────────────────────────────────────── */
function AgingTable({ rows = [], title, color, emptyMsg, onVerifyClick, showVerify, showInterakt, onSendInterakt }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? rows : rows.slice(0, 5);
  if (!rows.length) return (
    <div style={{ padding: '16px 0', color: '#94a3b8', fontSize: 13, textAlign: 'center' }}>{emptyMsg}</div>
  );
  return (
    <div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
              {['AWB', 'Customer', 'City/State', 'Courier', 'Status', 'Updated', 'Attempts', 'Amount'].map(h => (
                <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: '#64748b', fontSize: 11, whiteSpace: 'nowrap' }}>{h}</th>
              ))}
              {(showVerify || showInterakt) && <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#64748b', fontSize: 11, whiteSpace: 'nowrap' }}>Action</th>}
            </tr>
          </thead>
          <tbody>
            {shown.map((r, i) => {
              const isNoNeed = r.rto_verification_action === 'no_need';
              const isVerif = r.rto_verification_action === 'send_to_verification';
              const isCancelled = isNoNeed || isVerif;
              const textStyle = { 
                textDecoration: isCancelled ? 'line-through' : 'none', 
                textDecorationColor: isVerif ? '#16a34a' : (isNoNeed ? '#dc2626' : 'inherit'),
                textDecorationThickness: isCancelled ? '2px' : 'auto',
                opacity: isCancelled ? 0.7 : 1 
              };
              
              return (
                <tr key={i} style={{ borderBottom: '1px solid #f8fafc', transition: 'background .15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '10px 10px', fontFamily: 'monospace', fontSize: 12, color: '#0f172a', fontWeight: 600, ...textStyle }}>{r.awb_code || '—'}</td>
                  <td style={{ padding: '10px 10px', color: '#374151', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', ...textStyle }}>{r.billing_customer_name || '—'}</td>
                  <td style={{ padding: '10px 10px', color: '#64748b', whiteSpace: 'nowrap', ...textStyle }}>{[r.billing_city, r.billing_state].filter(Boolean).join(', ') || '—'}</td>
                  <td style={{ padding: '10px 10px', color: '#64748b', whiteSpace: 'nowrap', ...textStyle }}>{r.courier_name || '—'}</td>
                  <td style={{ padding: '10px 10px', ...textStyle }}>
                    <span style={{ background: color + '18', color, padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>{r.status}</span>
                  </td>
                  <td style={{ padding: '10px 10px', color: '#94a3b8', fontSize: 12, whiteSpace: 'nowrap', ...textStyle }}>
                    {r.status_updated_at ? new Date(r.status_updated_at).toLocaleDateString('en-IN') : '—'}
                  </td>
                  <td style={{ padding: '10px 10px', textAlign: 'center', fontWeight: 700, color: r.delivery_attempt >= 3 ? '#dc2626' : '#374151', ...textStyle }}>{r.delivery_attempt || 1}</td>
                  <td style={{ padding: '10px 10px', color: '#374151', fontWeight: 600, ...textStyle }}>₹{(r.sub_total || 0).toLocaleString('en-IN')}</td>
                  {(showVerify || showInterakt) && (
                    <td style={{ padding: '10px 10px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {showInterakt && (
                        <button
                          onClick={() => onSendInterakt(r)}
                          style={{
                            padding: '4px 8px', borderRadius: 6, border: '1px solid #bbf7d0', background: '#f0fdf4',
                            color: '#16a34a', fontSize: 11, fontWeight: 700, cursor: 'pointer', marginRight: 6
                          }}
                        >
                          💬 WhatsApp
                        </button>
                      )}
                      {showVerify && (
                        r.rto_verification_action === 'wants_again' ? (
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#16a34a', background: '#dcfce7', padding: '2px 6px', borderRadius: 4, display: 'inline-flex', alignItems: 'center', gap: 3 }}>Verified <IconCheck size={12} /></span>
                        ) : (
                          <button 
                            onClick={() => onVerifyClick(r)}
                            style={{
                              padding: '4px 10px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff',
                              color: '#3b82f6', fontSize: 11, fontWeight: 600, cursor: 'pointer'
                            }}
                          >
                            RTO Verification
                          </button>
                        )
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {rows.length > 5 && (
        <button onClick={() => setExpanded(!expanded)} style={{
          marginTop: 8, background: 'none', border: 'none', color: '#2563eb', fontSize: 12, fontWeight: 600,
          cursor: 'pointer', padding: '4px 0',
        }}>{expanded ? 'Show less ↑' : `Show all ${rows.length} ↓`}</button>
      )}
    </div>
  );
}

/* ─── Leaderboard ────────────────────────────────────────────────────────── */
function LeaderboardTable({ rows = [], sortKey, sortDir, onSort }) {
  const cols = [
    { key: 'courier', label: 'Courier / Partner' },
    { key: 'total', label: 'Total' },
    { key: 'delivered', label: 'Delivered' },
    { key: 'deliveryRate', label: 'Delivery %' },
    { key: 'rto', label: 'RTO' },
    { key: 'rtoRate', label: 'RTO %' },
    { key: 'undelivered', label: 'NDR' },
    { key: 'avgTat', label: 'Avg TAT (d)' },
  ];

  const badge = (rate) => {
    if (rate >= 80) return { bg: '#dcfce7', color: '#16a34a', icon: <IconStar size={12} />, label: 'Excellent' };
    if (rate >= 60) return { bg: '#fef9c3', color: '#ca8a04', icon: <IconAlert size={12} />, label: 'Average' };
    return { bg: '#fee2e2', color: '#dc2626', icon: null, label: 'Poor' };
  };

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
            <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#64748b', fontSize: 11 }}>#</th>
            {cols.map(c => (
              <th key={c.key} onClick={() => onSort(c.key)}
                style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#64748b', fontSize: 11, cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>
                {c.label} {sortKey === c.key ? (sortDir === 'asc' ? '↑' : '↓') : ''}
              </th>
            ))}
            <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#64748b', fontSize: 11 }}>Grade</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const b = badge(r.deliveryRate);
            return (
              <tr key={i} style={{ borderBottom: '1px solid #f8fafc', transition: 'background .15s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td style={{ padding: '12px 12px', color: '#94a3b8', fontWeight: 700 }}>{i + 1}</td>
                <td style={{ padding: '12px 12px', fontWeight: 700, color: '#0f172a', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.courier}</td>
                <td style={{ padding: '12px 12px', color: '#374151' }}>{r.total}</td>
                <td style={{ padding: '12px 12px', color: STATUS_COLORS.delivered, fontWeight: 700 }}>{r.delivered}</td>
                <td style={{ padding: '12px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ flex: 1, background: '#f1f5f9', borderRadius: 4, height: 6, maxWidth: 60, overflow: 'hidden' }}>
                      <div style={{ width: `${r.deliveryRate}%`, height: '100%', background: STATUS_COLORS.delivered, borderRadius: 4 }} />
                    </div>
                    <span style={{ fontWeight: 700, color: r.deliveryRate >= 70 ? STATUS_COLORS.delivered : '#dc2626', fontSize: 12 }}>{r.deliveryRate}%</span>
                  </div>
                </td>
                <td style={{ padding: '12px 12px', color: STATUS_COLORS.rto, fontWeight: 600 }}>{r.rto}</td>
                <td style={{ padding: '12px 12px', color: '#dc2626', fontWeight: 600, fontSize: 12 }}>{r.rtoRate}%</td>
                <td style={{ padding: '12px 12px', color: STATUS_COLORS.undelivered }}>{r.undelivered}</td>
                <td style={{ padding: '12px 12px', color: '#374151' }}>{r.avgTat}d</td>
                <td style={{ padding: '12px 12px' }}>
                  <span style={{ background: b.bg, color: b.color, padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>{b.label}</span>
                </td>
              </tr>
            );
          })}
          {!rows.length && <tr><td colSpan={10} style={{ padding: 32, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No leaderboard data</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

/* ─── SVG Vector Icons (Replaces all raw emojis) ───────────────────────────── */
const IconChart = ({ size = 16, className = "" }) => (
  <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" className={className}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
);
const IconReturn = ({ size = 16, className = "" }) => (
  <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" className={className}><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg>
);
const IconClock = ({ size = 16, className = "" }) => (
  <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" className={className}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
);
const IconTrophy = ({ size = 16, className = "" }) => (
  <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" className={className}><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg>
);
const IconPackage = ({ size = 16, className = "" }) => (
  <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" className={className}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
);
const IconMessage = ({ size = 16, className = "" }) => (
  <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" className={className}><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
);
const IconClipboard = ({ size = 16, className = "" }) => (
  <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" className={className}><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>
);
const IconRefresh = ({ size = 16, className = "" }) => (
  <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" className={className}><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
);
const IconPill = ({ size = 16, className = "" }) => (
  <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" className={className}><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/></svg>
);
const IconCheck = ({ size = 16, className = "" }) => (
  <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" className={className}><polyline points="20 6 9 17 4 12"/></svg>
);
const IconShopping = ({ size = 16, className = "" }) => (
  <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" className={className}><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
);
const IconHeadphones = ({ size = 16, className = "" }) => (
  <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" className={className}><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2H3z"/></svg>
);
const IconTruck = ({ size = 16, className = "" }) => (
  <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" className={className}><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
);
const IconScooter = ({ size = 16, className = "" }) => (
  <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" className={className}><circle cx="7" cy="17" r="3"/><circle cx="17" cy="17" r="3"/><path d="M10 17h4V9H2"/><path d="M14 9l3-4h3"/></svg>
);
const IconAlert = ({ size = 16, className = "" }) => (
  <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" className={className}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
);
const IconGlobe = ({ size = 16, className = "" }) => (
  <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" className={className}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
);
const IconRocket = ({ size = 16, className = "" }) => (
  <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" className={className}><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.71.79-1.81.79-1.81l-1.98-1.98s-1.1.08-1.81.79z"/><path d="M12 15l-3-3 7.6-7.6a3.5 3.5 0 0 1 4.95 4.95L12 15z"/></svg>
);
const IconZap = ({ size = 16, className = "" }) => (
  <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" className={className}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
);
const IconPin = ({ size = 16, className = "" }) => (
  <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" className={className}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
);
const IconSearch = ({ size = 16, className = "" }) => (
  <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" className={className}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
);
const IconFileText = ({ size = 16, className = "" }) => (
  <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" className={className}><path d="M14 2H6a2 2 0 0 1-2 2v16a2 2 0 0 1 2 2h12a2 2 0 0 1 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
);
const IconStar = ({ size = 14, className = "" }) => (
  <svg width={size} height={size} fill="currentColor" viewBox="0 0 24 24" className={className}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
);

/* ─── Custom Dropdown Select (Always opens DOWNWARDS) ────────────────────────── */
const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses', icon: <IconClipboard size={14} /> },
  { value: 'interaktReplies', label: 'All WhatsApp Replies', icon: <IconMessage size={14} /> },
  { value: 'reply_reattempt', label: 'Reattempt kar dijiye (Replies)', icon: <IconRefresh size={14} /> },
  { value: 'reply_dawa', label: 'Mujhe apni dawa chahiye (Replies)', icon: <IconPill size={14} /> },
  { value: 'verified', label: 'Verified', icon: <IconCheck size={14} /> },
  { value: 'totalSales', label: 'Sales Orders', icon: <IconShopping size={14} /> },
  { value: 'totalSupport', label: 'Support Orders', icon: <IconHeadphones size={14} /> },
  { value: 'inTransit', label: 'In Transit', icon: <IconTruck size={14} /> },
  { value: 'delivered', label: 'Delivered', icon: <IconPackage size={14} /> },
  { value: 'salesDelivered', label: 'Sales Delivered', icon: <IconCheck size={14} /> },
  { value: 'supportDelivered', label: 'Support Delivered', icon: <IconCheck size={14} /> },
  { value: 'ofd', label: 'Out for Delivery (OFD)', icon: <IconScooter size={14} /> },
  { value: 'undelivered', label: 'Undelivered (NDR)', icon: <IconAlert size={14} /> },
  { value: 'rto', label: 'RTO', icon: <IconReturn size={14} /> },
  { value: 'rtoIntersite', label: 'RTO Intersite', icon: <IconRefresh size={14} /> },
  { value: 'blOfd', label: 'Old OFD (Backlog)', icon: <IconClock size={14} /> },
  { value: 'blUndelivered', label: 'Old Undelivered (Backlog)', icon: <IconClock size={14} /> },
  { value: 'blRto', label: 'Old RTO (Backlog)', icon: <IconClock size={14} /> },
  { value: 'blRtoIntersite', label: 'Old RTO Intersite (Backlog)', icon: <IconClock size={14} /> },
];

const PLATFORM_OPTIONS = [
  { value: '', label: 'Both Platforms', icon: <IconGlobe size={14} /> },
  { value: 'shiprocket', label: 'Shiprocket', icon: <IconRocket size={14} /> },
  { value: 'shipmaxx', label: 'ShipMaxx', icon: <IconZap size={14} /> },
];

function CustomSelect({ options = [], value, onChange, placeholder = 'Select...', className = '' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 200 });
  const triggerRef = useRef(null);

  const selectedOpt = options.find(o => String(o.value) === String(value)) || options[0];

  const updateCoords = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + 6,
        left: rect.left,
        width: Math.max(rect.width, 220),
      });
    }
  }, []);

  const toggleOpen = () => {
    if (!isOpen) {
      updateCoords();
    }
    setIsOpen(p => !p);
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleScrollOrResize = () => updateCoords();
    const handleClickOutside = (e) => {
      if (triggerRef.current && triggerRef.current.contains(e.target)) return;
      if (e.target.closest('.custom-select-portal-menu')) return;
      setIsOpen(false);
    };

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, updateCoords]);

  return (
    <div className={`inline-block ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleOpen}
        style={{ background: '#ffffff', color: '#0f172a' }}
        className="border-2 border-slate-300 hover:border-emerald-600 focus:border-emerald-600 rounded-xl px-3.5 py-2 text-xs font-extrabold flex items-center justify-between gap-3 shadow-sm transition-all cursor-pointer outline-none active:scale-[0.99] min-w-[170px]"
      >
        <span style={{ color: '#0f172a' }} className="truncate flex items-center gap-1.5 font-extrabold">
          {selectedOpt?.icon && <span>{selectedOpt.icon}</span>}
          <span>{selectedOpt?.label || placeholder}</span>
        </span>
        <svg
          className={`w-4 h-4 text-slate-600 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180 text-emerald-600' : ''}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {isOpen &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              top: coords.top,
              left: coords.left,
              minWidth: coords.width,
              zIndex: 99999,
              background: '#ffffff',
              borderColor: '#cbd5e1',
            }}
            className="custom-select-portal-menu max-w-xs border-2 rounded-2xl shadow-2xl max-h-72 overflow-y-auto p-1.5 space-y-1 animate-in fade-in slide-in-from-top-1 duration-150"
          >
            {options.map((opt) => {
              const isSelected = String(opt.value) === String(value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  style={{
                    background: isSelected ? '#16a34a' : 'transparent',
                    color: isSelected ? '#ffffff' : '#0f172a',
                  }}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                    isSelected
                      ? 'hover:bg-emerald-700'
                      : 'hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <span style={{ color: isSelected ? '#ffffff' : '#0f172a' }} className="flex items-center gap-2 truncate font-extrabold">
                    {opt.icon && <span>{opt.icon}</span>}
                    <span>{opt.label}</span>
                  </span>
                  {isSelected && (
                    <svg className="w-4 h-4 shrink-0 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </div>
  );
}

/* ─── Shipments Table ────────────────────────────────────────────────────── */
function ShipmentsTable({ data, filters, onFilterChange, onExportCsv, onVerifyClick, onSendInterakt, onCreateInvoice, loading }) {
  const { shipments = [], total = 0, pages = 1, page = 1 } = data || {};
  const isUndeliveredView = ['undelivered', 'blUndelivered', 'interaktReplies', 'reply_reattempt', 'reply_dawa'].includes(filters.status);
  const isDeliveredView = ['delivered', 'salesDelivered', 'supportDelivered'].includes(filters.status);
  const showActionColumn = isUndeliveredView || isDeliveredView || ['rto', 'rtoIntersite', 'blRto', 'blRtoIntersite', ''].includes(filters.status || '');
  const statusChip = (status) => {
    const cat = (() => {
      const s = (status || '').toLowerCase();
      if (/^delivered|^del$/.test(s)) return 'delivered';
      if (/out.?for.?delivery|^ofd$/.test(s)) return 'ofd';
      if (/^und|^ndr|^dex|^pcn|undelivered/.test(s)) return 'undelivered';
      if (/rto.*in.*transit|rra|rto_ofd/.test(s)) return 'rtoIntersite';
      if (/^rto/.test(s)) return 'rto';
      return 'other';
    })();
    const col = STATUS_COLORS[cat] || '#64748b';
    return <span style={{ background: col + '18', color: col, padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>{status || '—'}</span>;
  };

  return (
    <div>
      {/* Quick Switch Filter Pills for WhatsApp Replies */}
      {isUndeliveredView && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14, alignItems: 'center', background: '#f8fafc', padding: '10px 14px', borderRadius: 12, border: '1px dashed #cbd5e1' }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: '#475569', marginRight: 6, display: 'inline-flex', alignItems: 'center', gap: 4 }}><IconZap size={14} className="text-amber-500" /> WhatsApp Quick Filters:</span>
          <button onClick={() => onFilterChange('status', filters.status === 'interaktReplies' ? '' : 'interaktReplies')} style={{ padding: '6px 14px', borderRadius: 20, border: '1px solid #16a34a', background: filters.status === 'interaktReplies' ? '#16a34a' : '#f0fdf4', color: filters.status === 'interaktReplies' ? '#fff' : '#15803d', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.15s' }}>
            <IconMessage size={14} /> All WhatsApp Replies
          </button>
          <button onClick={() => onFilterChange('status', filters.status === 'reply_reattempt' ? '' : 'reply_reattempt')} style={{ padding: '6px 14px', borderRadius: 20, border: '1px solid #2563eb', background: filters.status === 'reply_reattempt' ? '#2563eb' : '#eff6ff', color: filters.status === 'reply_reattempt' ? '#fff' : '#1d4ed8', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.15s' }}>
            <IconRefresh size={14} /> Reattempt kar dijiye
          </button>
          <button onClick={() => onFilterChange('status', filters.status === 'reply_dawa' ? '' : 'reply_dawa')} style={{ padding: '6px 14px', borderRadius: 20, border: '1px solid #059669', background: filters.status === 'reply_dawa' ? '#059669' : '#ecfdf5', color: filters.status === 'reply_dawa' ? '#fff' : '#047857', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.15s' }}>
            <IconPill size={14} /> Mujhe apni dawa chahiye
          </button>
        </div>
      )}

      {/* Filters row */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center', background: 'rgba(255, 255, 255, 0.95)', padding: '12px 16px', borderRadius: 14, border: '1.5px solid #cbd5e1', boxShadow: '0 4px 12px rgba(15,23,42,0.05)' }}>
        <CustomSelect
          options={STATUS_OPTIONS}
          value={filters.status || ''}
          onChange={val => onFilterChange('status', val)}
          placeholder="All Statuses"
        />
        <CustomSelect
          options={PLATFORM_OPTIONS}
          value={filters.platform || ''}
          onChange={val => onFilterChange('platform', val)}
          placeholder="Both Platforms"
        />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <input value={filters.awb || ''} onChange={e => onFilterChange('awb', e.target.value)}
            placeholder="Search AWB..." style={{ padding: '8px 28px 8px 14px', borderRadius: 10, border: '1.5px solid #cbd5e1', fontSize: 13, fontWeight: 700, color: '#0f172a', background: '#ffffff', minWidth: 200, outline: 'none' }} />
          {filters.awb && (
            <button onClick={() => onFilterChange('awb', '')} style={{ position: 'absolute', right: 8, background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b', padding: 2, display: 'flex' }} title="Clear AWB">
              <svg width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          )}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {isUndeliveredView && (
            <button onClick={() => onSendInterakt && onSendInterakt(null)} style={{
              padding: '8px 16px', borderRadius: 10, border: '1px solid #16a34a', background: 'linear-gradient(135deg, #15803d 0%, #16a34a 100%)',
              color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              boxShadow: '0 2px 6px rgba(22, 163, 74, 0.2)'
            }}>
              <IconMessage size={14} /> Send Interakt ({filters.status?.toLowerCase().includes('undelivered') ? 'Undelivered Data-Wise' : 'Filtered Data-Wise'})
            </button>
          )}
          <button onClick={onExportCsv} style={{
            padding: '8px 16px', borderRadius: 10, border: '1.5px solid #16a34a', background: '#ffffff',
            color: '#15803d', fontSize: 13, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <svg width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1={12} y1={15} x2={12} y2={3} /></svg>
            Export CSV
          </button>
        </div>
      </div>
      <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>{total.toLocaleString()} shipments found</div>
      {loading ? <Skeleton h={400} /> : (
      <>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
              {[(['verified', 'verifiedSales', 'verifiedSupport'].includes(filters.status) ? 'Phone Number' : 'AWB'), 'Customer', 'City/State', (['verified', 'verifiedSales', 'verifiedSupport'].includes(filters.status) ? 'Staff / Verifier' : 'Courier'), 'Status', 'Platform', 'Order Date', 'Status Date', 'Attempts', '₹ Amount'].map(h => (
                <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: '#64748b', fontSize: 11, whiteSpace: 'nowrap' }}>{h}</th>
              ))}
              {showActionColumn && <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#64748b', fontSize: 11, whiteSpace: 'nowrap' }}>Action</th>}
            </tr>
          </thead>
          <tbody>
            {shipments.map((s, i) => {
              const isNoNeed = s.rto_verification_action === 'no_need';
              const isVerif = s.rto_verification_action === 'send_to_verification';
              const isCancelled = isNoNeed || isVerif;
              const textStyle = { 
                textDecoration: isCancelled ? 'line-through' : 'none', 
                textDecorationColor: isVerif ? '#16a34a' : (isNoNeed ? '#dc2626' : 'inherit'),
                textDecorationThickness: isCancelled ? '2px' : 'auto',
                opacity: isCancelled ? 0.7 : 1 
              };
              
              return (
              <tr key={i} style={{ borderBottom: '1px solid #f8fafc', transition: 'background .15s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td style={{ padding: '10px 10px', fontFamily: 'monospace', fontSize: 11, color: '#0f172a', fontWeight: 600, whiteSpace: 'nowrap', ...textStyle }}>
                  {s.platform === 'verification' ? (s.billing_phone || '—') : (s.awb_code || '—')}
                </td>
                <td style={{ padding: '10px 10px', color: '#374151', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', ...textStyle }}>
                  <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.billing_customer_name || '—'}</div>
                  {s.interakt_reply_text && (
                    <div title={`Reply received: ${s.interakt_reply_text}`} style={{ 
                      display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '4px', 
                      padding: '2px 7px', background: '#f0fdf4', color: '#15803d', border: '1px solid #86efac', 
                      borderRadius: '6px', fontSize: '10px', fontWeight: 800, whiteSpace: 'normal', lineHeight: '1.25',
                      boxShadow: '0 1px 2px rgba(22, 163, 74, 0.1)' 
                    }}>
                      <IconMessage size={11} />
                      <span>{s.interakt_reply_text}</span>
                    </div>
                  )}
                </td>
                <td style={{ padding: '10px 10px', color: '#64748b', whiteSpace: 'nowrap', fontSize: 12, ...textStyle }}>{[s.billing_city, s.billing_state].filter(Boolean).join(', ') || '—'}</td>
                <td style={{ padding: '10px 10px', color: '#64748b', whiteSpace: 'nowrap', fontSize: 12, ...textStyle }}>{s.courier_name || '—'}</td>
                <td style={{ padding: '10px 10px', ...textStyle }}>{statusChip(s.status)}</td>
                <td style={{ padding: '10px 10px', ...textStyle }}>
                  <span style={{ background: s.platform === 'verification' ? '#e0f2fe' : (s.platform === 'shiprocket' ? '#eff6ff' : '#f0fdf4'), color: s.platform === 'verification' ? '#0369a1' : (s.platform === 'shiprocket' ? '#2563eb' : '#16a34a'), padding: '2px 7px', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                    {s.platform === 'verification' ? 'VER' : (s.platform === 'shiprocket' ? 'SR' : 'SM')}
                  </span>
                </td>
                <td style={{ padding: '10px 10px', color: '#94a3b8', fontSize: 12, whiteSpace: 'nowrap', ...textStyle }}>
                  {s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-IN') : '—'}
                </td>
                <td style={{ padding: '10px 10px', color: '#0f172a', whiteSpace: 'nowrap', fontSize: 12, fontWeight: 600, ...textStyle }}>
                  {(s.delivered_at || s.status_updated_at) ? new Date(s.delivered_at || s.status_updated_at).toLocaleDateString('en-IN') : '—'}
                </td>
                <td style={{ padding: '10px 10px', textAlign: 'center', fontWeight: 700, color: s.delivery_attempt >= 3 ? '#dc2626' : '#374151', ...textStyle }}>{s.delivery_attempt || 1}</td>
                <td style={{ padding: '10px 10px', color: '#374151', fontWeight: 600, whiteSpace: 'nowrap', ...textStyle }}>₹{(s.sub_total || 0).toLocaleString('en-IN')}</td>
                {showActionColumn && (
                  <td style={{ padding: '10px 10px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {onSendInterakt && isUndeliveredView && (
                      <button
                        onClick={() => onSendInterakt(s)}
                        title="Send Interakt WhatsApp Template Message Data-Wise"
                        style={{
                          padding: '4px 8px', borderRadius: 6, border: '1px solid #bbf7d0', background: '#f0fdf4',
                          color: '#16a34a', fontSize: 11, fontWeight: 700, cursor: 'pointer', marginRight: 6, display: 'inline-flex', alignItems: 'center', gap: 4
                        }}
                      >
                        <IconMessage size={12} /> WhatsApp
                      </button>
                    )}
                    {(s.status.toLowerCase().includes('rto')) && (
                      s.rto_verification_action === 'wants_again' ? (
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#16a34a', background: '#dcfce7', padding: '2px 6px', borderRadius: 4, display: 'inline-flex', alignItems: 'center', gap: 3 }}>Verified <IconCheck size={12} /></span>
                      ) : (
                        <button 
                          onClick={() => onVerifyClick(s)}
                          style={{
                            padding: '4px 10px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff',
                            color: '#3b82f6', fontSize: 11, fontWeight: 600, cursor: 'pointer'
                          }}
                        >
                          RTO Verification
                        </button>
                      )
                    )}
                    {/^delivered$|^del$/i.test(s.status) && (
                      <button
                        onClick={() => onCreateInvoice && onCreateInvoice(s, i + 1)}
                        style={{
                          padding: '4px 10px', borderRadius: 6, border: '1px solid #86efac',
                          background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', color: '#15803d',
                          fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'inline-flex',
                          alignItems: 'center', gap: 4, transition: 'all .15s',
                        }}
                      >
                        <IconFileText size={12} /> Invoice
                      </button>
                    )}
                  </td>
                )}
              </tr>
            )})}
            {!shipments.length && <tr><td colSpan={9} style={{ padding: 32, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No shipments found</td></tr>}
          </tbody>
        </table>
      </div>
      {/* Pagination */}
      {pages > 1 && (
        <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'center', alignItems: 'center' }}>
          <button onClick={() => onFilterChange('page', Math.max(1, page - 1))} disabled={page <= 1}
            style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: page > 1 ? 'pointer' : 'not-allowed', opacity: page <= 1 ? 0.4 : 1 }}>‹</button>
          <span style={{ fontSize: 13, color: '#64748b' }}>Page {page} of {pages}</span>
          <button onClick={() => onFilterChange('page', Math.min(pages, page + 1))} disabled={page >= pages}
            style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: page < pages ? 'pointer' : 'not-allowed', opacity: page >= pages ? 0.4 : 1 }}>›</button>
        </div>
      )}
      </>
      )}
    </div>
  );
}

/* ─── Alert Banner ───────────────────────────────────────────────────────── */
function AlertBanner({ alerts = [] }) {
  const [dismissed, setDismissed] = useState([]);
  const visible = alerts.filter((_, i) => !dismissed.includes(i));
  if (!visible.length) return null;
  const sevColors = {
    critical: { bg: '#fee2e2', border: '#fca5a5', text: '#991b1b', icon: <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block shrink-0" /> },
    high: { bg: '#fef3c7', border: '#fcd34d', text: '#92400e', icon: <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block shrink-0" /> },
    medium: { bg: '#dbeafe', border: '#93c5fd', text: '#1e3a8a', icon: <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block shrink-0" /> }
  };
  return (
    <div className="flex flex-col gap-2.5 mb-6">
      {visible.map((a, i) => {
        const sev = sevColors[a.severity] || sevColors.medium;
        return (
          <div key={i} style={{ background: sev.bg, border: `2px solid ${sev.border}` }} className="rounded-2xl px-5 py-3 flex items-center gap-3 shadow-sm">
            <span className="flex items-center justify-center">{sev.icon}</span>
            <span style={{ color: sev.text }} className="flex-1 text-xs sm:text-sm font-extrabold">{a.message}</span>
            <button onClick={() => setDismissed(d => [...d, alerts.indexOf(a)])} style={{ color: sev.text }} className="text-xl font-bold opacity-70 hover:opacity-100 cursor-pointer px-1">×</button>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Global Filters Bar ─────────────────────────────────────────────────── */
const PRESETS = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'Last 7 Days', value: 'last7' },
  { label: 'This Month', value: 'month' },
  { label: 'Last Month', value: 'last_month' },
  { label: 'All Time', value: 'all' },
  { label: 'Custom', value: 'custom' },
];

function FilterBar({ filters, onChange, lastUpdated, onRefresh, autoRefresh, onToggleAutoRefresh, kpis, onOpenBulkInvoice }) {
  // Local state for text inputs — prevents API call on every keystroke.
  // Commits to parent filter only on blur or Enter.
  const [stateInput, setStateInput] = useState(filters.state || '');
  const [courierInput, setCourierInput] = useState(filters.courier || '');
  const [awbInput, setAwbInput] = useState(filters.awb || '');

  // Sync if parent clears the filter (e.g. preset change resets state)
  useEffect(() => { setStateInput(filters.state || ''); }, [filters.state]);
  useEffect(() => { setCourierInput(filters.courier || ''); }, [filters.courier]);
  useEffect(() => { setAwbInput(filters.awb || ''); }, [filters.awb]);

  return (
    <div className="bg-white/95 border-2 border-slate-300 rounded-2xl p-3.5 mb-4 shadow-md shadow-slate-900/5 backdrop-blur-xl flex flex-col gap-3">
      {/* Row 1: Date Presets (Left) + Rate Badges & Bulk Invoices (Right) */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
        {/* Date Presets */}
        <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 rounded-xl p-1 overflow-x-auto no-scrollbar">
          {PRESETS.map(p => {
            const isSel = filters.preset === p.value;
            return (
              <button
                key={p.value}
                onClick={() => onChange('preset', p.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                  isSel
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                    : 'text-slate-700 hover:bg-slate-200/70'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Custom date range */}
        {filters.preset === 'custom' && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={filters.from || ''}
              onChange={e => onChange('from', e.target.value)}
              className="bg-slate-50 border-2 border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-emerald-600"
            />
            <span className="text-slate-500 font-bold text-xs">to</span>
            <input
              type="date"
              value={filters.to || ''}
              onChange={e => onChange('to', e.target.value)}
              className="bg-slate-50 border-2 border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-emerald-600"
            />
          </div>
        )}

        {/* Rate Badges & Bulk Invoices */}
        <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
          {kpis?.kpis && (
            <>
              <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', padding: '4px 12px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: '#15803d', textTransform: 'uppercase' }}>Delivered</span>
                <span style={{ fontSize: 13, fontWeight: 900, color: '#166534' }}>
                  {kpis.kpis?.deliveredRate?.value !== undefined ? `${kpis.kpis.deliveredRate.value}%` : '—'}
                </span>
              </div>
              <div style={{ background: '#fef2f2', border: '1.5px solid #fca5a5', padding: '4px 12px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: '#b91c1c', textTransform: 'uppercase' }}>RTO</span>
                <span style={{ fontSize: 13, fontWeight: 900, color: '#991b1b' }}>
                  {kpis.kpis?.rtoRate?.value !== undefined ? `${kpis.kpis.rtoRate.value}%` : '—'}
                </span>
              </div>
            </>
          )}
          <button
            onClick={onOpenBulkInvoice}
            title="Download all invoices for a month as PDF"
            style={{
              background: 'linear-gradient(135deg, #15803d 0%, #16a34a 100%)',
              color: '#ffffff',
              border: 'none',
              padding: '6px 14px',
              borderRadius: 10,
              fontSize: 12,
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 2px 6px rgba(22, 163, 74, 0.3)',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}
          >
            <IconFileText size={14} /> Bulk Invoices
          </button>
        </div>
      </div>

      {/* Row 2: Search Inputs (Left) + Action Controls & Timestamp (Right) */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Inputs */}
        <div className="flex items-center gap-2.5 flex-wrap flex-1">
          {/* State Input */}
          <div className="relative flex items-center min-w-[130px] flex-1 max-w-[170px]">
            <span className="absolute left-3 text-slate-400 pointer-events-none flex items-center"><IconPin size={13} /></span>
            <input
              value={stateInput}
              onChange={e => setStateInput(e.target.value)}
              onBlur={() => onChange('state', stateInput)}
              onKeyDown={e => e.key === 'Enter' && onChange('state', stateInput)}
              placeholder="State..."
              className="w-full bg-slate-50 border-2 border-slate-300 focus:border-emerald-600 focus:bg-white rounded-xl pl-8 pr-3 py-1.5 text-xs font-bold text-slate-900 placeholder:text-slate-500 outline-none transition-all shadow-inner"
            />
          </div>

          {/* Courier Input */}
          <div className="relative flex items-center min-w-[140px] flex-1 max-w-[180px]">
            <span className="absolute left-3 text-slate-400 pointer-events-none flex items-center"><IconTruck size={13} /></span>
            <input
              value={courierInput}
              onChange={e => setCourierInput(e.target.value)}
              onBlur={() => onChange('courier', courierInput)}
              onKeyDown={e => e.key === 'Enter' && onChange('courier', courierInput)}
              placeholder="Courier..."
              className="w-full bg-slate-50 border-2 border-slate-300 focus:border-emerald-600 focus:bg-white rounded-xl pl-8 pr-3 py-1.5 text-xs font-bold text-slate-900 placeholder:text-slate-500 outline-none transition-all shadow-inner"
            />
          </div>

          {/* AWB Input */}
          <div className="relative flex items-center min-w-[160px] flex-1 max-w-[210px]">
            <span className="absolute left-3 text-slate-400 pointer-events-none flex items-center"><IconSearch size={13} /></span>
            <input
              value={awbInput}
              onChange={e => setAwbInput(e.target.value)}
              onBlur={() => onChange('awb', awbInput)}
              onKeyDown={e => e.key === 'Enter' && onChange('awb', awbInput)}
              placeholder="AWB / Track #"
              className="w-full bg-slate-50 border-2 border-slate-300 focus:border-emerald-600 focus:bg-white rounded-xl pl-8 pr-7 py-1.5 text-xs font-bold text-slate-900 placeholder:text-slate-500 outline-none transition-all shadow-inner"
            />
            {awbInput && (
              <button
                onClick={() => { setAwbInput(''); onChange('awb', ''); }}
                className="absolute right-2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                title="Clear AWB"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Action Controls & Timestamp */}
        <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
          {lastUpdated && <span className="text-[11px] font-extrabold text-slate-500 mr-1">Updated {lastUpdated}</span>}

          <button
            onClick={onRefresh}
            title="Refresh Dashboard"
            className="bg-slate-100 hover:bg-slate-200 border-2 border-slate-300 text-slate-800 px-3 py-1.5 rounded-xl text-xs font-extrabold cursor-pointer flex items-center gap-1.5 transition-all active:scale-95"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            Refresh
          </button>

          <label className="flex items-center gap-2 text-xs font-extrabold text-slate-700 bg-slate-100 border-2 border-slate-300 px-3 py-1.5 rounded-xl cursor-pointer select-none">
            <div
              onClick={onToggleAutoRefresh}
              className={`w-8 h-4 rounded-full relative transition-colors cursor-pointer ${autoRefresh ? 'bg-emerald-600' : 'bg-slate-300'}`}
            >
              <div className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-all shadow-sm ${autoRefresh ? 'left-4.5' : 'left-0.5'}`} />
            </div>
            Auto-refresh
          </label>

          <button
            onClick={() => window.print()}
            title="Print Dashboard"
            className="bg-slate-100 hover:bg-slate-200 border-2 border-slate-300 text-slate-800 p-2 rounded-xl text-xs font-extrabold cursor-pointer flex items-center justify-center transition-all active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Section Card ───────────────────────────────────────────────────────── */
function SectionCard({ title, subtitle, children, action }) {
  return (
    <div className="bg-white/95 border-2 border-slate-300 rounded-2xl p-6 shadow-md shadow-slate-900/5 backdrop-blur-xl transition-all">
      <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
        <div>
          <div className="text-base sm:text-lg font-black text-slate-900 tracking-tight font-outfit">{title}</div>
          {subtitle && <div className="text-xs font-extrabold text-slate-600 mt-0.5">{subtitle}</div>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

/* ─── Loading skeleton ───────────────────────────────────────────────────── */
function Skeleton({ h = 80, w = '100%' }) {
  return <div style={{ height: h, width: w, borderRadius: 12, background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />;
}

/* ─── KPI Icons ──────────────────────────────────────────────────────────── */
const kpiIcons = {
  totalShipments: <svg width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16v-2"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
  totalSales: <svg width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  totalSupport: <svg width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>,
  verified: <svg width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
  ofd: <svg width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
  delivered: <svg width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>,
  salesDelivered: <svg width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/><circle cx="12" cy="12" r="10" strokeOpacity={0.4}/></svg>,
  supportDelivered: <svg width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/><rect x="2" y="2" width="20" height="20" rx="4" strokeOpacity={0.4}/></svg>,
  undelivered: <svg width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>,
  rto: <svg width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>,
  rtoIntersite: <svg width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>,
  revenue: <svg width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  deliveredRate: <svg width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  rtoRate: <svg width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="16 12 12 8 8 12"/><line x1="12" y1="16" x2="12" y2="8"/></svg>,
  ndrRate: <svg width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>,
  fadr: <svg width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>,
  avgTat: <svg width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  inTransit: <svg width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>,
  blOfd: <svg width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/><circle cx="12" cy="12" r="3" fill="currentColor" fillOpacity={0.2}/></svg>,
  blUndelivered: <svg width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/><circle cx="18" cy="18" r="4"/><polyline points="18 16 18 18 19 19"/></svg>,
  blRto: <svg width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/><circle cx="18" cy="18" r="4"/><polyline points="18 16 18 18 19 19"/></svg>,
  blRtoIntersite: <svg width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/><circle cx="19" cy="19" r="3" stroke="currentColor"/></svg>,
  interaktReplies: <svg width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>,
  replyReattempt: <svg width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>,
  replyDawa: <svg width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>,
};


/* ─── TABS ────────────────────────────────────────────────────────────────── */
const TABS = [
  { id: 'overview', label: 'Overview', icon: <IconChart size={15} /> },
  { id: 'rto', label: 'RTO Reasons', icon: <IconReturn size={15} /> },
  { id: 'aging', label: 'Aging', icon: <IconClock size={15} /> },
  { id: 'leaderboard', label: 'Leaderboard', icon: <IconTrophy size={15} /> },
  { id: 'shipments', label: 'Shipments', icon: <IconPackage size={15} /> },
  { id: 'interakt_replies', label: 'WhatsApp Replies', icon: <IconMessage size={15} /> },
];

/* ─── Main Component ─────────────────────────────────────────────────────── */
export default function OpsDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [filters, setFilters] = useState({ preset: 'month' });
  const [shipmentFilters, setShipmentFilters] = useState({ page: 1, limit: 50 });
  const [kpis, setKpis] = useState(null);
  const [trend, setTrend] = useState([]);
  const [funnel, setFunnel] = useState(null);
  const [rtoReasons, setRtoReasons] = useState([]);
  const [aging, setAging] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [shipments, setShipments] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState({});
  const [lastUpdated, setLastUpdated] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lbSort, setLbSort] = useState({ key: 'deliveryRate', dir: 'desc' });
  const [verificationModalOpen, setVerificationModalOpen] = useState(false);
  const [verificationShipment, setVerificationShipment] = useState(null);
  const [interaktModalOpen, setInteraktModalOpen] = useState(false);
  const [interaktTargetShipment, setInteraktTargetShipment] = useState(null);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [invoiceShipment, setInvoiceShipment] = useState(null);
  const [invoiceDeliveryIndex, setInvoiceDeliveryIndex] = useState(1);
  const [invoiceDoctorFee, setInvoiceDoctorFee] = useState(0);
  const [invoiceTaxMode, setInvoiceTaxMode] = useState('inter');
  const [bulkInvoiceModalOpen, setBulkInvoiceModalOpen] = useState(false);
  const autoRefreshTimer = useRef(null);

  const handleOpenInteraktModal = (shipment = null) => {
    setInteraktTargetShipment(shipment);
    setInteraktModalOpen(true);
  };

  const setLoad = (key, val) => setLoading(l => ({ ...l, [key]: val }));

  const handleVerifySuccess = (orderId, action) => {
    // Update aging locally
    if (aging) {
      setAging(prev => ({
        ...prev,
        rto_intersite_stuck: prev.rto_intersite_stuck.map(s => s.order_id === orderId ? { ...s, rto_verification_action: action } : s)
      }));
    }
    // Update shipments locally
    if (shipments?.shipments) {
      setShipments(prev => ({
        ...prev,
        shipments: prev.shipments.map(s => s.order_id === orderId ? { ...s, rto_verification_action: action } : s)
      }));
    }
  };

  const loadOverview = useCallback(async (f) => {
    setLoad('kpis', true); setLoad('trend', true); setLoad('funnel', true); setLoad('alerts', true);
    try {
      const [k, t, fn, al] = await Promise.all([
        fetchKPIs(f).catch(() => null),
        fetchTrend(f).catch(() => []),
        fetchFunnel(f).catch(() => null),
        fetchAlerts(f).catch(() => ({ alerts: [] })),
      ]);
      setKpis(k); setTrend(t || []); setFunnel(fn); setAlerts(al?.alerts || []);
      setLastUpdated(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
    } finally {
      setLoad('kpis', false); setLoad('trend', false); setLoad('funnel', false); setLoad('alerts', false);
    }
  }, []);

  const loadRto = useCallback(async (f) => {
    setLoad('rto', true);
    try { const d = await fetchRtoReasons(f).catch(() => []); setRtoReasons(d || []); }
    finally { setLoad('rto', false); }
  }, []);

  const loadAging = useCallback(async (f) => {
    setLoad('aging', true);
    try { const d = await fetchAging(f).catch(() => null); setAging(d); }
    finally { setLoad('aging', false); }
  }, []);

  const loadLeaderboard = useCallback(async (f) => {
    setLoad('lb', true);
    try { const d = await fetchLeaderboard(f).catch(() => []); setLeaderboard(d || []); }
    finally { setLoad('lb', false); }
  }, []);

  const loadShipments = useCallback(async (f) => {
    setLoad('ships', true);
    try { const d = await fetchShipments(f).catch(() => null); setShipments(d); }
    finally { setLoad('ships', false); }
  }, []);

  // Always load top-level KPIs on filter change so Delivered Rate & RTO Rate percentages are always active at top
  useEffect(() => {
    fetchKPIs(filters).then(k => { if (k) setKpis(k); }).catch(() => {});
  }, [filters]);

  // Load on tab/filter change
  useEffect(() => {
    if (activeTab === 'overview') loadOverview(filters);
    else if (activeTab === 'rto') loadRto(filters);
    else if (activeTab === 'aging') loadAging(filters);
    else if (activeTab === 'leaderboard') loadLeaderboard(filters);
    else if (activeTab === 'shipments') loadShipments({ ...filters, ...shipmentFilters });
  }, [activeTab, filters]);

  useEffect(() => {
    if (activeTab === 'shipments') loadShipments({ ...filters, ...shipmentFilters });
  }, [shipmentFilters]);

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      autoRefreshTimer.current = setInterval(() => {
        if (activeTab === 'overview') loadOverview(filters);
      }, 30000);
    }
    return () => clearInterval(autoRefreshTimer.current);
  }, [autoRefresh, activeTab, filters]);

  const handleFilterChange = useCallback((key, val) => {
    setFilters(f => ({ ...f, [key]: val }));
  }, []);

  const handleShipmentFilterChange = useCallback((key, val) => {
    setShipmentFilters(f => ({ ...f, [key]: val, ...(key !== 'page' ? { page: 1 } : {}) }));
  }, []);

  const handleRefresh = () => {
    if (activeTab === 'overview') loadOverview(filters);
    else if (activeTab === 'rto') loadRto(filters);
    else if (activeTab === 'aging') loadAging(filters);
    else if (activeTab === 'leaderboard') loadLeaderboard(filters);
    else if (activeTab === 'shipments') loadShipments({ ...filters, ...shipmentFilters });
  };

  // Leaderboard sort
  const sortedLeaderboard = [...leaderboard].sort((a, b) => {
    const va = a[lbSort.key]; const vb = b[lbSort.key];
    return lbSort.dir === 'asc' ? va - vb : vb - va;
  });
  const handleLbSort = (key) => setLbSort(s => ({ key, dir: s.key === key && s.dir === 'desc' ? 'asc' : 'desc' }));

  // CSV Export
  const handleExportCsv = () => {
    const rows = shipments?.shipments || [];
    if (!rows.length) return;
    const headers = ['AWB', 'Customer', 'City', 'State', 'Courier', 'Status', 'Platform', 'Order Date', 'Attempts', 'Amount'];
    const csv = [
      headers.join(','),
      ...rows.map(r => [
        r.awb_code, r.billing_customer_name, r.billing_city, r.billing_state,
        r.courier_name, r.status, r.platform,
        r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN') : '',
        r.delivery_attempt, r.sub_total,
      ].map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `shipments_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  // KPI cards config — role-based visibility
  const isAdminOrManager = ['admin', 'manager'].includes(user?.role?.toLowerCase());
  const kpiCards = kpis ? [
    { key: 'verified',     label: 'Verified (Total)',   color: STATUS_COLORS.verified,      formatter: fmtNum, subtext: 'Total verified orders sent from Verification to Ready to Ship' },
    { key: 'totalShipments', label: 'Total Shipments',  color: STATUS_COLORS.totalShipments,formatter: fmtNum, subtext: 'Orders created this period — all other cards are subsets of this number' },
    ...(isAdminOrManager ? [
      { key: 'verifiedSales',   label: 'Verified Sales',   color: '#0284c7', formatter: fmtNum, subtext: 'Sales team verified & sent to Ready to Ship' },
      { key: 'verifiedSupport', label: 'Verified Support', color: '#06b6d4', formatter: fmtNum, subtext: 'Support team verified & sent to Ready to Ship' },
      { key: 'totalSales',    label: 'Sales Orders',    color: '#7c3aed',                   formatter: fmtNum, subtext: 'Orders created by Sales team' },
      { key: 'totalSupport',  label: 'Support Orders',  color: '#0891b2',                   formatter: fmtNum, subtext: 'Orders created by Support team' },
    ] : []),
    { key: 'inTransit',    label: 'In Transit',         color: STATUS_COLORS.inTransit,     formatter: fmtNum },
    { key: 'ofd',          label: 'Out for Delivery',   color: STATUS_COLORS.ofd,           formatter: fmtNum },
    { key: 'delivered',    label: 'Delivered',          color: STATUS_COLORS.delivered,     formatter: fmtNum, subtext: 'Orders created this period now delivered. Delivered + OFD + Undelivered + RTO + In Transit = Total Shipments' },
    ...(isAdminOrManager ? [
      { key: 'salesDelivered',   label: 'Sales Delivered',   color: '#059669', formatter: fmtNum, subtext: 'Sales team delivered orders' },
      { key: 'supportDelivered', label: 'Support Delivered', color: '#0d9488', formatter: fmtNum, subtext: 'Support team delivered orders' },
    ] : []),
    { key: 'undelivered',  label: 'Undelivered',        color: STATUS_COLORS.undelivered,   formatter: fmtNum },
    { key: 'rto',          label: 'RTO',                color: STATUS_COLORS.rto,           formatter: fmtNum },
    { key: 'rtoIntersite', label: 'RTO Intersite',      color: STATUS_COLORS.rtoIntersite,  formatter: fmtNum },
    { key: 'blOfd',        label: 'Old OFD',            color: STATUS_COLORS.blOfd,         formatter: fmtNum, subtext: 'Backlog orders from prior periods currently out for delivery' },
    { key: 'blUndelivered',label: 'Old Undelivered',    color: STATUS_COLORS.blUndelivered, formatter: fmtNum, subtext: 'Backlog orders from prior periods currently undelivered / NDR' },
    { key: 'blRto',        label: 'Old RTO',            color: STATUS_COLORS.blRto,         formatter: fmtNum, subtext: 'Backlog orders from prior periods marked RTO' },
    { key: 'blRtoIntersite',label: 'Old RTO Intersite', color: STATUS_COLORS.blRtoIntersite,formatter: fmtNum, subtext: 'Backlog orders from prior periods returning in transit' },
    { key: 'deliveredRate',label: 'Delivery Rate',      color: '#16a34a',                   formatter: fmtPct, subtext: 'Delivered ÷ Total Shipments — both from the same cohort' },
    { key: 'rtoRate',      label: 'RTO Rate',           color: '#dc2626',                   formatter: fmtPct },
    { key: 'ndrRate',      label: 'NDR Rate',           color: '#f59e0b',                   formatter: fmtPct },
    { key: 'fadr',         label: '1st Attempt Delivery', color: '#10b981',                formatter: fmtPct, subtext: 'Percentage of delivered orders succeeding on 1st attempt' },
    { key: 'avgTat',       label: 'Avg TAT',            color: '#6366f1',                   formatter: fmtDays, subtext: 'Average turnaround time to delivery' },
  ] : [];

  // Spark data from trend
  const sparkFor = (key) => trend.slice(-14).map(d => d[key] || 0);

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f0', fontFamily: "'Inter', sans-serif" }}>
      {/* Print styles injected */}
      <style>{`
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .print-break { page-break-after: always; }
        }
      `}</style>

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '4px 20px 24px' }}>
        {/* Alert banners */}
        <AlertBanner alerts={alerts} />

        {/* Filter bar */}
        <div className="no-print">
          <FilterBar filters={filters} onChange={handleFilterChange} lastUpdated={lastUpdated}
            onRefresh={handleRefresh} autoRefresh={autoRefresh} onToggleAutoRefresh={() => setAutoRefresh(v => !v)}
            kpis={kpis} onOpenBulkInvoice={() => setBulkInvoiceModalOpen(true)} />
        </div>

        {/* Tabs */}
        <div className="no-print flex items-center gap-2 mb-4 bg-slate-200/80 border-2 border-slate-300 rounded-2xl p-1.5 flex-wrap w-fit shadow-sm">
          {TABS.map(t => {
            const isReplyStatus = ['interaktReplies', 'reply_reattempt', 'reply_dawa'].includes(shipmentFilters.status);
            const isSelected = (activeTab === t.id && t.id !== 'shipments') || 
                               (t.id === 'interakt_replies' && activeTab === 'shipments' && isReplyStatus) ||
                               (t.id === 'shipments' && activeTab === 'shipments' && !isReplyStatus);
            return (
              <button key={t.id} onClick={() => {
                if (t.id === 'interakt_replies') {
                  setActiveTab('shipments');
                  setShipmentFilters(f => ({ ...f, status: 'interaktReplies', page: 1 }));
                } else {
                  setActiveTab(t.id);
                  if (t.id === 'shipments' && isReplyStatus) {
                    setShipmentFilters(f => ({ ...f, status: '' }));
                  }
                }
              }} className={`px-4 py-2 rounded-xl text-xs font-extrabold cursor-pointer flex items-center gap-2 transition-all ${
                isSelected
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 border border-emerald-500'
                  : 'bg-white text-slate-800 hover:bg-slate-100 border border-slate-300'
              }`}>
                <span>{t.icon}</span> {t.label}
              </button>
            );
          })}
        </div>

        {/* ── Overview Tab ── */}
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* KPI Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
              {loading.kpis
                ? Array.from({ length: kpiCards.length || (isAdminOrManager ? 22 : 18) }).map((_, i) => <Skeleton key={i} h={130} />)
                : kpiCards.map(card => (
                  <KpiCard key={card.key} label={card.label} color={card.color} formatter={card.formatter}
                    value={kpis?.kpis?.[card.key]?.value}
                    change={kpis?.kpis?.[card.key]?.change}
                    sparkData={sparkFor(card.key)}
                    icon={kpiIcons[card.key]}
                    subtext={card.subtext}
                    onClick={['ndrRate', 'fadr', 'avgTat', 'deliveredRate', 'rtoRate', 'revenue'].includes(card.key) ? undefined : () => {
                      setActiveTab('shipments');
                      handleShipmentFilterChange('status', card.key === 'totalShipments' ? '' : card.key);
                    }}
                  />
                ))
              }
            </div>

            {/* Trend + Funnel row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2">
                <SectionCard title="Shipment Trend" subtitle="Daily breakdown over the selected period">
                  {loading.trend ? <Skeleton h={200} /> : <TrendChart data={trend} />}
                </SectionCard>
              </div>
              <div className="lg:col-span-1">
                <SectionCard title="Delivery Funnel" subtitle="Verified ➔ OFD ➔ Outcome">
                  {loading.funnel ? <Skeleton h={200} /> : <FunnelChart data={{ ...funnel, delivered: kpis?.kpis?.delivered?.value ?? funnel?.delivered }} />}
                </SectionCard>
              </div>
            </div>
          </div>
        )}

        {/* ── RTO Reasons Tab ── */}
        {activeTab === 'rto' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <SectionCard title="RTO Reason Breakdown" subtitle="Why shipments are being returned">
              {loading.rto ? <Skeleton h={200} /> : <DonutChart reasons={rtoReasons} />}
            </SectionCard>
            <SectionCard title="Reason Details">
              {loading.rto ? <Skeleton h={200} /> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {rtoReasons.length ? rtoReasons.map((r, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: i < rtoReasons.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                      <span style={{ width: 10, height: 10, borderRadius: 3, background: RTO_REASON_COLORS[i] || '#94a3b8', flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 13, color: '#374151', fontWeight: 600 }}>{r.reason}</span>
                      <span style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>{r.count}</span>
                    </div>
                  )) : <div style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: 32 }}>No RTO reason data available</div>}
                </div>
              )}
            </SectionCard>
          </div>
        )}

        {/* ── Aging Tab ── */}
        {activeTab === 'aging' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <SectionCard title={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><IconClock size={18} className="text-amber-600 shrink-0" /> OFD &gt; 2 Days</span>} subtitle="Shipments stuck out-for-delivery for over 48 hours">
              {loading.aging ? <Skeleton h={120} /> : <AgingTable rows={aging?.ofd_stuck || []} title="OFD Stuck" color={STATUS_COLORS.ofd} emptyMsg="No OFD-stuck shipments" />}
            </SectionCard>
            <SectionCard title={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><IconRefresh size={18} className="text-blue-600 shrink-0" /> Undelivered — 3+ Attempts</span>} subtitle="Shipments that have failed delivery 3 or more times"
              action={
                <button onClick={() => handleOpenInteraktModal(null)} style={{
                  padding: '6px 14px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #15803d 0%, #16a34a 100%)',
                  color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                  boxShadow: '0 2px 6px rgba(22, 163, 74, 0.25)'
                }}>
                  <IconMessage size={14} /> Interakt Template Send (Undelivered Data-Wise)
                </button>
              }
            >
              {loading.aging ? <Skeleton h={120} /> : <AgingTable rows={aging?.undelivered_3plus || []} title="3+ Attempts" color={STATUS_COLORS.undelivered} emptyMsg="No high-attempt shipments" showInterakt={true} onSendInterakt={handleOpenInteraktModal} />}
            </SectionCard>
            <SectionCard title={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><IconTruck size={18} className="text-purple-600 shrink-0" /> RTO Intersite &gt; 5 Days</span>} subtitle="Return-in-transit shipments stuck for over 5 days">
              {loading.aging ? <Skeleton h={120} /> : <AgingTable rows={aging?.rto_intersite_stuck || []} title="RTO Intersite Stuck" color={STATUS_COLORS.rtoIntersite} emptyMsg="No stuck RTO intersite shipments" showVerify={true} onVerifyClick={(r) => { setVerificationShipment(r); setVerificationModalOpen(true); }} />}
            </SectionCard>
          </div>
        )}

        {/* ── Leaderboard Tab ── */}
        {activeTab === 'leaderboard' && (
          <SectionCard title={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><IconTrophy size={20} className="text-amber-500 shrink-0" /> Courier Leaderboard</span>} subtitle="Ranked by delivery success rate — click column headers to sort">
            {loading.lb ? <Skeleton h={300} /> : <LeaderboardTable rows={sortedLeaderboard} sortKey={lbSort.key} sortDir={lbSort.dir} onSort={handleLbSort} />}
          </SectionCard>
        )}

        {/* ── Shipments Tab ── */}
        {activeTab === 'shipments' && (
          <SectionCard title={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><IconClipboard size={20} className="text-emerald-600 shrink-0" /> Shipment Detail</span>} subtitle="All shipments with full filtering and export"
            action={
              shipmentFilters.status?.toLowerCase().includes('undelivered') ? (
                <div style={{ background: '#dcfce7', color: '#15803d', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 800, border: '1px solid #86efac', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <IconZap size={14} /> Undelivered Data-Wise Messaging Active
                </div>
              ) : undefined
            }
          >
            <ShipmentsTable loading={loading.ships} data={shipments} filters={shipmentFilters} onFilterChange={handleShipmentFilterChange} onExportCsv={handleExportCsv} onVerifyClick={(r) => { setVerificationShipment(r); setVerificationModalOpen(true); }} onSendInterakt={handleOpenInteraktModal} onCreateInvoice={(s, idx) => {
              setInvoiceShipment(s);
              setInvoiceDeliveryIndex(idx || 1);
              const cleanState = (s.billing_state || '').toLowerCase().replace(/[^a-z]/g, '');
              const isUP = cleanState === 'up' || cleanState === 'uttarpradesh' || cleanState.includes('uttarpradesh');
              setInvoiceTaxMode(isUP ? 'intra' : 'inter');
              setInvoiceModalOpen(true);
            }} />
          </SectionCard>
        )}
      </div>

      <RtoVerificationModal
        isOpen={verificationModalOpen}
        onClose={() => { setVerificationModalOpen(false); setVerificationShipment(null); }}
        shipment={verificationShipment}
        onSuccess={handleVerifySuccess}
      />
      <OpsInteraktModal
        isOpen={interaktModalOpen}
        onClose={() => { setInteraktModalOpen(false); setInteraktTargetShipment(null); }}
        targetShipment={interaktTargetShipment}
        filters={activeTab === 'shipments' ? shipmentFilters : { ...filters, status: 'undelivered' }}
        totalCount={interaktTargetShipment ? 1 : (activeTab === 'aging' ? aging?.undelivered_3plus?.length : shipments?.total)}
      />
      <InvoiceModal
        isOpen={invoiceModalOpen}
        onClose={() => { setInvoiceModalOpen(false); setInvoiceShipment(null); }}
        shipment={invoiceShipment}
        deliveryIndex={invoiceDeliveryIndex}
        doctorFee={invoiceDoctorFee}
        onDoctorFeeChange={setInvoiceDoctorFee}
        taxMode={invoiceTaxMode}
        onTaxModeChange={setInvoiceTaxMode}
      />
      <BulkInvoiceModal
        isOpen={bulkInvoiceModalOpen}
        onClose={() => setBulkInvoiceModalOpen(false)}
      />
    </div>
  );
}
