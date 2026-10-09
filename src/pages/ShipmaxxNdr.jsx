import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import * as smxSvc from '../services/shipmaxx.service';
import OrderStatusBoard from '../components/OrderStatusBoard';

const inp = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 bg-white';
const Field = ({ label, children }) => (
  <div>
    <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">{label}</label>
    {children}
  </div>
);

const DEPARTMENTS = ['male', 'ortho', 'skin'];

const ATTEMPT_OPTIONS = [
  { value: 'all', label: 'All Attempts' },
  { value: '1',   label: '1st Attempt' },
  { value: '2',   label: '2nd Attempt' },
  { value: '3',   label: '3rd Attempt' },
  { value: '4+',  label: '4+ Attempts' },
];

const statusBadge = (s) => {
  const v = String(s || '').toUpperCase();
  if (v.includes('UNDELIVERED') || v.includes('NDR') || v.includes('EXCEPTION')) return 'bg-red-50 text-red-700 border-red-200';
  if (v.includes('DELIVERED'))                         return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (v.includes('TRANSIT') || v.includes('PICKUP'))   return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-slate-50 text-slate-700 border-slate-200';
};

const fmt = (v) => {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
};

// ── NDR Detail Panel ──────────────────────────────────────────────────────────
function NdrDetailPanel({ ndr, onClose, onUseAwb }) {
  const [phone, setPhone] = useState(ndr?.customer_phone || '');

  useEffect(() => {
    if (!ndr) return;
    const masked = String(ndr.customer_phone || '');
    const isHidden = !masked || /^x+$/i.test(masked) || masked.replace(/\D/g, '').length < 10;
    if (!isHidden) { setPhone(masked); return; }
    setPhone('');
    
    // Look up local order lookup using order_id / channel_id
    const orderId = ndr.channel_order_id || ndr.order_id || '';
    if (orderId) {
      smxSvc.getOrder(orderId).then(r => {
        const p = r.data?.data?.billing_phone || '';
        if (p) setPhone(p);
      }).catch(() => {});
    }
  }, [ndr]);

  if (!ndr) return null;

  const FIELDS = [
    ['AWB Code',       ndr.awb_code],
    ['Channel Order',  ndr.channel_order_id],
    ['Shipment ID',    ndr.shipment_id],
    ['Customer',       ndr.customer_name],
    ['Phone',          phone || ndr.customer_phone],
    ['Email',          ndr.customer_email],
    ['Courier',        ndr.courier_name],
    ['Status',         ndr.status || ndr.current_status],
    ['Reason',         ndr.reason],
    ['Remarks',        ndr.remarks],
    ['Comment',        ndr.comment],
    ['Attempts',       ndr.attempts],
    ['NDR Raised',     ndr.ndr_raised_at],
    ['Payment',        ndr.payment_method],
    ['EDD',            ndr.edd],
    ['Address',        ndr.address],
    ['City',           ndr.city],
    ['State',          ndr.state],
    ['Pincode',        ndr.pincode],
  ].filter(([, v]) => v !== null && v !== undefined && v !== '');

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
      <div className="h-1 bg-blue-500" />
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <button onClick={onClose} className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.4} viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
            Back to list
          </button>
          <h3 className="font-bold text-gray-800 text-base">{ndr.customer_name?.trim() || 'NDR Detail'}</h3>
          <p className="text-xs text-gray-400 mt-0.5">{ndr.awb_code}</p>
        </div>
        <div className="flex gap-2">
          <span className={`text-xs font-bold px-3 py-1 rounded-full border ${statusBadge(ndr.status || ndr.current_status)}`}>
            {fmt(ndr.status || ndr.current_status)}
          </span>
          <button onClick={() => onUseAwb(ndr.awb_code)}
            className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition">
            Use AWB in Action
          </button>
        </div>
      </div>
      <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {FIELDS.map(([label, value]) => (
          <div key={label} className="bg-gray-50 rounded-xl p-3">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">{label}</p>
            <p className="text-sm font-semibold text-gray-800 break-words">{fmt(value)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── NDR List ──────────────────────────────────────────────────────────────────
function NdrList({ department: externalDept, setDepartment: externalSetDept, onSelectNdr, onUseAwb }) {
  const [ndrs, setNdrs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo]     = useState('');
  const [department, setDepartment] = useState(externalDept || 'all');

  useEffect(() => {
    if (externalDept !== undefined) setDepartment(externalDept);
  }, [externalDept]);
  const [attempt, setAttempt] = useState('all');
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState(null);

  const fetchNDR = useCallback((f = from, t = to) => {
    setLoading(true);
    const params = {};
    if (f) params.from = f;
    if (t) params.to = t;
    smxSvc.getNdrList(params)
      .then(r => {
        let rawData = r.data?.data;
        while (rawData && typeof rawData === 'object' && !Array.isArray(rawData)) {
          if (Array.isArray(rawData.shipments)) { rawData = rawData.shipments; break; }
          if (Array.isArray(rawData.data)) { rawData = rawData.data; break; }
          if (Array.isArray(rawData.items)) { rawData = rawData.items; break; }
          if (rawData.data !== undefined) { rawData = rawData.data; }
          else { break; }
        }
        const finalArr = Array.isArray(rawData) ? rawData : (Array.isArray(r.data?.shipments) ? r.data.shipments : []);
        setNdrs(finalArr);
      })
      .catch(() => setNdrs([]))
      .finally(() => setLoading(false));
  }, [from, to]);

  useEffect(() => { fetchNDR(); }, []);

  const getTrackingUrl = (n) => {
    const c = (n.courier_name || '').toLowerCase();
    if (c.includes('shadowfax')) return `https://tracker.shadowfax.in/track?awb=${n.awb_code}`;
    if (c.includes('xpressbees')) return `https://www.xpressbees.com/track?awb=${n.awb_code}`;
    if (c.includes('delhivery')) return `https://www.delhivery.com/tracking`;
    if (c.includes('bluedart')) return `https://www.bluedart.com/tracking`;
    return `https://shipmaxx.in/track/${n.awb_code}`;
  };

  const getDept = (n) => {
    if (!n) return 'male';
    const dept = String(n.department || '').toLowerCase();
    if (dept === 'male') return 'male';
    if (dept === 'ortho') return 'ortho';
    if (dept === 'skin') return 'skin';
    return dept || 'male';
  };

  const safeNdrs = Array.isArray(ndrs) ? ndrs : [];
  const filtered = safeNdrs.filter(n => {
    if (department !== 'all') {
      const d = getDept(n);
      if (department !== d) return false;
    }
    if (attempt !== 'all') {
      const a = Number(n.attempts ?? 1);
      if (attempt === '4+' ? a < 4 : a !== Number(attempt)) return false;
    }
    if (search) {
      const q = search.toLowerCase();
      return (
        (n.awb_code || '').toLowerCase().includes(q) ||
        (n.customer_name || '').toLowerCase().includes(q) ||
        (n.channel_order_id || '').toLowerCase().includes(q) ||
        (n.reason || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const maleCount = safeNdrs.filter(n => getDept(n) === 'male').length;
  const orthoCount = safeNdrs.filter(n => getDept(n) === 'ortho').length;
  const skinCount = safeNdrs.filter(n => getDept(n) === 'skin').length;

  if (detail) {
    return (
      <NdrDetailPanel
        ndr={detail}
        onClose={() => setDetail(null)}
        onUseAwb={(awb) => { onUseAwb(awb); setDetail(null); }}
      />
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
      <div className="h-1 bg-blue-600" />
      {/* Filters */}
      <div className="px-5 py-3 border-b border-gray-100 space-y-3 bg-gray-50/30">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="font-bold text-gray-700 text-sm">ShipMaxx NDR List</span>
          <span className="text-[10px] font-bold text-gray-400 bg-white px-2 py-0.5 rounded-full border">{filtered.length} records</span>
        </div>

        {/* Department Filter Buttons */}
        <div className="flex items-center gap-2 flex-wrap py-1">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wide mr-1">Department:</span>
          <button
            type="button"
            onClick={() => setDepartment('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              department === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <span>All</span>
            <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${department === 'all' ? 'bg-blue-700 text-white' : 'bg-gray-100 text-gray-600'}`}>{safeNdrs.length}</span>
          </button>

          <button
            type="button"
            onClick={() => setDepartment('male')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              department === 'male'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
            }`}
          >
            <span>Male</span>
            <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${department === 'male' ? 'bg-blue-700 text-white' : 'bg-blue-100 text-blue-800'}`}>{maleCount}</span>
          </button>

          <button
            type="button"
            onClick={() => setDepartment('ortho')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              department === 'ortho'
                ? 'bg-green-600 text-white shadow-sm'
                : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
            }`}
          >
            <span>Ortho</span>
            <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${department === 'ortho' ? 'bg-green-700 text-white' : 'bg-green-100 text-green-800'}`}>{orthoCount}</span>
          </button>

          <button
            type="button"
            onClick={() => setDepartment('skin')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              department === 'skin'
                ? 'bg-pink-600 text-white shadow-sm'
                : 'bg-pink-50 text-pink-700 hover:bg-pink-100 border border-pink-200'
            }`}
          >
            <span>Skin</span>
            <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${department === 'skin' ? 'bg-pink-700 text-white' : 'bg-pink-100 text-pink-800'}`}>{skinCount}</span>
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <input placeholder="Search AWB / name / order…" value={search} onChange={e => setSearch(e.target.value)}
            className="flex-1 min-w-[180px] border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white" />
          <select value={attempt} onChange={e => setAttempt(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-xs bg-white font-semibold focus:outline-none focus:ring-1 focus:ring-blue-400">
            {ATTEMPT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-400" />
          <input type="date" value={to} onChange={e => setTo(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-400" />
          <button onClick={() => fetchNDR(from, to)} disabled={loading}
            className="px-5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition disabled:opacity-50">
            {loading ? '…' : 'Search'}
          </button>
          <button onClick={() => { setFrom(''); setTo(''); setSearch(''); setAttempt('all'); setDepartment('all'); fetchNDR('', ''); }}
            className="px-4 py-2 rounded-xl bg-gray-200 text-gray-600 text-xs font-bold hover:bg-gray-300 transition">
            Reset
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="px-5 py-10 text-center text-gray-400 text-sm">
          {loading ? 'Loading NDR records…' : 'No NDR records found.'}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="overflow-x-auto">
            <table className="hidden sm:table w-full text-sm">
              <thead className="bg-gray-50 text-[10px] text-gray-500 uppercase tracking-[0.1em] sticky top-0">
                <tr>
                  {['AWB', 'Order ID', 'Customer', 'Department', 'Reason', 'Attempts', 'Raised', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-bold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((n, i) => (
                  <tr key={i} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3">
                      <a href={getTrackingUrl(n)} target="_blank" rel="noreferrer"
                        className="font-mono text-[11px] text-blue-600 font-bold hover:underline">
                        {n.awb_code}
                      </a>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-gray-600">{n.channel_order_id}</td>
                    <td className="px-4 py-3 font-semibold text-gray-800 text-[13px]">{n.customer_name?.trim() || '—'}</td>
                    <td className="px-4 py-3">
                      {(() => {
                        const d = getDept(n);
                        const cls = d === 'ortho' ? 'bg-green-50 text-green-700 border-green-200'
                          : d === 'skin' ? 'bg-pink-50 text-pink-700 border-pink-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200';
                        return <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold border uppercase ${cls}`}>{d}</span>;
                      })()}
                    </td>
                    <td className="px-4 py-3 text-[11px] text-gray-500 max-w-[200px] truncate" title={n.reason}>{n.reason || '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex w-6 h-6 items-center justify-center rounded-lg bg-red-50 text-red-700 font-bold text-[11px] border border-red-100">
                        {n.attempts ?? 1}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-gray-400">{String(n.ndr_raised_at || '').split('T')[0].split(' ')[0]}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        <button onClick={() => setDetail(n)}
                          className="text-[10px] font-bold px-3 py-1.5 rounded-xl bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 transition">
                          VIEW
                        </button>
                        <button onClick={() => onUseAwb(n.awb_code, 'reattempt')}
                          className="text-[10px] font-bold px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-600 hover:text-white transition">
                          RE-TRY
                        </button>
                        <button onClick={() => onUseAwb(n.awb_code, 'rto')}
                          className="text-[10px] font-bold px-3 py-1.5 rounded-xl bg-orange-50 text-orange-600 border border-orange-100 hover:bg-orange-600 hover:text-white transition">
                          RTO
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile cards */}
            <div className="sm:hidden divide-y divide-gray-50">
              {filtered.map((n, i) => (
                <div key={i} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 text-sm truncate">{n.customer_name?.trim() || 'Unknown'}</p>
                      <a href={getTrackingUrl(n)} target="_blank" rel="noreferrer"
                        className="text-[10px] font-mono text-blue-600 font-bold hover:underline">
                        {n.awb_code}
                      </a>
                    </div>
                    <span className="inline-flex w-7 h-7 items-center justify-center rounded-lg bg-red-50 text-red-700 font-bold text-xs border border-red-100 shrink-0">
                      {n.attempts ?? 1}
                    </span>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 text-xs space-y-1">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Reason</p>
                    <p className="text-xs text-gray-700 mt-1">{n.reason || '—'}</p>
                    <p className="text-[10px] text-gray-400 font-bold mt-2">ORDER: {n.channel_order_id} · RAISED: {String(n.ndr_raised_at || '').split('T')[0]}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setDetail(n)} className="flex-1 text-[11px] font-bold py-2 rounded-xl bg-white text-gray-600 border border-gray-200">VIEW</button>
                    <button onClick={() => onUseAwb(n.awb_code, 'reattempt')} className="flex-1 text-[11px] font-bold py-2 rounded-xl bg-blue-600 text-white">RE-TRY</button>
                    <button onClick={() => onUseAwb(n.awb_code, 'rto')} className="flex-1 text-[11px] font-bold py-2 rounded-xl bg-orange-600 text-white">RTO</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── NDR Action Panel ──────────────────────────────────────────────────────────
function NdrActionPanel({ prefillAwb, prefillAction }) {
  const [form, setForm] = useState({ awb: prefillAwb || '', action: prefillAction || 'reattempt', comment: '' });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (prefillAwb) setForm(p => ({ ...p, awb: prefillAwb, action: prefillAction || p.action }));
  }, [prefillAwb, prefillAction]);

  const submit = async () => {
    if (!form.awb) { setError('AWB is required'); return; }
    setLoading(true); setError(''); setResult('');
    try {
      await smxSvc.ndrAction(form.awb, { action: form.action, notes: form.comment });
      setResult('NDR action submitted successfully to ShipMaxx');
      setForm(p => ({ ...p, comment: '' }));
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
      <div className="h-1 bg-blue-600" />
      <div className="px-5 py-3 border-b border-gray-100">
        <span className="font-semibold text-gray-700 text-sm">ShipMaxx NDR Action</span>
        <p className="text-xs text-gray-400 mt-0.5">Submit an instruction directly to the ShipMaxx/Losung platform</p>
      </div>
      <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="AWB Code *">
          <input className={inp} placeholder="Enter AWB or Shipment ID" value={form.awb} onChange={e => setForm(p => ({ ...p, awb: e.target.value }))} />
        </Field>
        <Field label="Action *">
          <select className={inp} value={form.action} onChange={e => setForm(p => ({ ...p, action: e.target.value }))}>
            <option value="reattempt">Re-attempt Delivery</option>
            <option value="rto">Return to Origin (RTO)</option>
            <option value="escalate">Escalate</option>
            <option value="follow_up">Follow Up</option>
          </select>
        </Field>
        <Field label="Notes / Comment">
          <input className={inp} placeholder="Optional notes to attach" value={form.comment} onChange={e => setForm(p => ({ ...p, comment: e.target.value }))} />
        </Field>
      </div>
      <div className="px-5 pb-5 flex items-center gap-3 flex-wrap">
        <button onClick={submit} disabled={loading}
          className="px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition disabled:opacity-50">
          {loading ? 'Submitting…' : 'Submit NDR Action'}
        </button>
        {result && <span className="text-sm font-semibold text-green-600">{result}</span>}
        {error  && <span className="text-sm font-semibold text-red-500">{error}</span>}
      </div>
    </div>
  );
}

const MONTHS = [
  { value: 'all', label: 'All Months' },
  { value: '1',  label: 'January' },
  { value: '2',  label: 'February' },
  { value: '3',  label: 'March' },
  { value: '4',  label: 'April' },
  { value: '5',  label: 'May' },
  { value: '6',  label: 'June' },
  { value: '7',  label: 'July' },
  { value: '8',  label: 'August' },
  { value: '9',  label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

const currentYearNum = new Date().getFullYear();
const YEARS = [
  { value: 'all', label: 'All Years' },
  ...Array.from({ length: 5 }, (_, i) => {
    const y = String(currentYearNum - i);
    return { value: y, label: y };
  })
];

// ── NDR Notes Panel ───────────────────────────────────────────────────────────
function NdrNotesPanel() {
  const [notes, setNotes]       = useState([]);
  const [loading, setLoading]   = useState(false);
  const [filterDate, setFilterDate] = useState('');
  const [search, setSearch]     = useState('');
  const [rangeFilter, setRangeFilter] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedYear, setSelectedYear]   = useState('all');
  const [form, setForm]         = useState({ name: '', phone_number: '', reason: '', awb_number: '', price: '', date: new Date().toISOString().split('T')[0] });
  const [editId, setEditId]     = useState(null);
  const [error, setError]       = useState('');
  const [saving, setSaving]     = useState(false);

  const fetchNotes = useCallback((date = filterDate, q = search, range = rangeFilter, m = selectedMonth, y = selectedYear) => {
    setLoading(true);
    const params = {};
    if (date) {
      params.date = date;
    } else if (m !== 'all' || y !== 'all') {
      if (m !== 'all') params.month = m;
      if (y !== 'all') params.year = y;
    } else if (range && range !== 'all') {
      params.range = range;
    }
    if (q) params.search = q;
    if (range === 'all' && !date && m === 'all' && y === 'all') params.all = 'true';
    smxSvc.getNdrNotes(params)
      .then(r => setNotes(r.data?.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filterDate, search, rangeFilter, selectedMonth, selectedYear]);

  useEffect(() => { fetchNotes(); }, []);

  const save = async () => {
    const { name, phone_number, reason, awb_number, price } = form;
    if (!name || !phone_number || !reason || !awb_number) {
      setError('All fields except price are required'); return;
    }
    setSaving(true); setError('');
    try {
      if (editId) {
        const res = await smxSvc.updateNdrNote(editId, { name, phone_number, reason, awb_number, price: price !== '' ? Number(price) : null });
        const updated = res.data?.data || res.data;
        if (updated && updated._id) {
          setNotes(prev => prev.map(n => n._id === updated._id ? { ...n, ...updated } : n));
        }
        setEditId(null);
      } else {
        const res = await smxSvc.createNdrNote({ name, phone_number, reason, awb_number, price: price !== '' ? Number(price) : null });
        const newNote = res.data?.data || res.data;
        if (newNote && newNote._id) {
          setNotes(prev => [newNote, ...prev.filter(n => n._id !== newNote._id)]);
        }
        setFilterDate('');
        setRangeFilter('all');
        setSelectedMonth('all');
        setSelectedYear('all');
        fetchNotes('', search, 'all', 'all', 'all');
      }
      setForm({ name: '', phone_number: '', reason: '', awb_number: '', price: '', date: new Date().toISOString().split('T')[0] });
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteNote = async (id) => {
    if (!window.confirm('Delete this note?')) return;
    await smxSvc.deleteNdrNote(id).catch(() => {});
    setNotes(p => p.filter(n => n._id !== id));
  };

  const startEdit = (note) => {
    setEditId(note._id);
    setForm({ name: note.name, phone_number: note.phone_number, reason: note.reason, awb_number: note.awb_number, price: note.price !== undefined && note.price !== null ? note.price : '', date: '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-4">
      {/* Add / Edit form */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
        <div className="h-1 bg-yellow-400" />
        <div className="px-5 py-3 border-b border-gray-100">
          <span className="font-semibold text-gray-700 text-sm">{editId ? 'Edit Note' : 'Add New Note'}</span>
        </div>
        <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <Field label="Customer Name *">
            <input className={inp} placeholder="Name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          </Field>
          <Field label="Phone Number *">
            <input className={inp} placeholder="Phone" value={form.phone_number} onChange={e => setForm(p => ({ ...p, phone_number: e.target.value }))} />
          </Field>
          <Field label="AWB Number *">
            <input className={inp} placeholder="AWB" value={form.awb_number} onChange={e => setForm(p => ({ ...p, awb_number: e.target.value }))} />
          </Field>
          <Field label="Price (₹)">
            <input type="number" className={inp} placeholder="Price" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} />
          </Field>
          <Field label="Reason / Note *">
            <input className={inp} placeholder="Reason" value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} />
          </Field>
        </div>
        <div className="px-5 pb-4 flex items-center gap-3 flex-wrap">
          <button onClick={save} disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-yellow-500 text-white text-sm font-bold hover:bg-yellow-600 transition disabled:opacity-50">
            {saving ? 'Saving…' : editId ? 'Update Note' : '+ Add Note'}
          </button>
          {editId && (
            <button onClick={() => { setEditId(null); setForm({ name: '', phone_number: '', reason: '', awb_number: '', price: '', date: '' }); }}
              className="px-5 py-2.5 rounded-xl bg-gray-200 text-gray-600 text-sm font-bold hover:bg-gray-300 transition">
              Cancel
            </button>
          )}
          {error && <span className="text-red-500 text-sm font-semibold">{error}</span>}
        </div>
      </div>

      {/* Notes list */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
        <div className="h-1 bg-yellow-400" />
        <div className="px-5 py-3 border-b border-gray-100 flex flex-wrap items-center gap-3">
          <span className="font-semibold text-gray-700 text-sm flex-1 min-w-[140px]">
            ShipMaxx Notes {notes.length > 0 && <span className="text-xs text-gray-400 font-normal ml-1">({notes.length})</span>}
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: 'all',       label: 'All' },
              { id: 'today',     label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
            ].map(r => {
              const active = rangeFilter === r.id && !filterDate && selectedMonth === 'all' && selectedYear === 'all';
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    setFilterDate('');
                    setSelectedMonth('all');
                    setSelectedYear('all');
                    setRangeFilter(r.id);
                    fetchNotes('', search, r.id, 'all', 'all');
                  }}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition border ${
                    active
                      ? 'bg-yellow-500 text-white border-yellow-500 shadow-sm'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-200'
                  }`}
                >
                  {r.label}
                </button>
              );
            })}

            {/* Month Select */}
            <select
              value={selectedMonth}
              onChange={e => {
                const m = e.target.value;
                setSelectedMonth(m);
                setFilterDate('');
                setRangeFilter('custom');
                fetchNotes('', search, 'custom', m, selectedYear);
              }}
              className="border border-gray-200 rounded-xl px-2.5 py-1 text-xs bg-white font-semibold focus:outline-none focus:ring-1 focus:ring-yellow-400"
            >
              {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>

            {/* Year Select */}
            <select
              value={selectedYear}
              onChange={e => {
                const y = e.target.value;
                setSelectedYear(y);
                setFilterDate('');
                setRangeFilter('custom');
                fetchNotes('', search, 'custom', selectedMonth, y);
              }}
              className="border border-gray-200 rounded-xl px-2.5 py-1 text-xs bg-white font-semibold focus:outline-none focus:ring-1 focus:ring-yellow-400"
            >
              {YEARS.map(y => <option key={y.value} value={y.value}>{y.label}</option>)}
            </select>
          </div>
          <input placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchNotes(filterDate, search, rangeFilter, selectedMonth, selectedYear)}
            className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-yellow-400 w-32" />
          <input type="date" value={filterDate} onChange={e => { setFilterDate(e.target.value); setRangeFilter('custom'); fetchNotes(e.target.value, search, 'custom', selectedMonth, selectedYear); }}
            className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-yellow-400" />
          {(filterDate || search || rangeFilter !== 'all' || selectedMonth !== 'all' || selectedYear !== 'all') && (
            <button onClick={() => { setFilterDate(''); setSearch(''); setRangeFilter('all'); setSelectedMonth('all'); setSelectedYear('all'); fetchNotes('', '', 'all', 'all', 'all'); }}
              className="text-xs text-gray-400 hover:text-gray-600 font-semibold">Reset</button>
          )}
          <button onClick={() => fetchNotes(filterDate, search, rangeFilter, selectedMonth, selectedYear)}
            className="px-4 py-1.5 rounded-xl bg-yellow-500 text-white text-xs font-bold hover:bg-yellow-600 transition">
            {loading ? '…' : 'Refresh'}
          </button>
        </div>

        {notes.length === 0 ? (
          <div className="px-5 py-10 text-center text-gray-400 text-sm">
            {loading ? 'Loading…' : 'No notes found.'}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <table className="hidden sm:table w-full text-sm">
              <thead className="bg-gray-50 text-[10px] text-gray-500 uppercase tracking-[0.1em] sticky top-0">
                <tr>{['S.N', 'Date', 'Name', 'Phone', 'AWB', 'Price', 'Reason', 'By', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-bold">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {notes.map((n, idx) => (
                  <tr key={n._id} className="hover:bg-yellow-50/30 transition-colors">
                    <td className="px-4 py-3 text-[11px] text-gray-500 font-bold whitespace-nowrap">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-3 text-[11px] text-gray-400 font-medium whitespace-nowrap">
                      {new Date(n.createdAt).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-800 text-[13px]">{n.name}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-gray-600">{n.phone_number}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-gray-700 font-semibold whitespace-nowrap">
                      {n.awb_number}
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-800 text-[12px] whitespace-nowrap">
                      {n.price !== undefined && n.price !== null && n.price !== '' ? `₹${n.price}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-[12px] text-gray-600 max-w-[220px] truncate" title={n.reason}>{n.reason}</td>
                    <td className="px-4 py-3 text-[11px] text-gray-500">{n.createdBy?.name || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        <button onClick={() => startEdit(n)}
                          className="w-8 h-8 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center hover:bg-blue-500 hover:text-white transition border border-blue-100">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile */}
            <div className="sm:hidden divide-y divide-gray-50">
              {notes.map(n => (
                <div key={n._id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 text-sm">{n.name}</p>
                      <p className="text-xs text-gray-400 font-mono">{n.phone_number}</p>
                    </div>
                    <p className="text-[10px] text-gray-400 shrink-0">{new Date(n.createdAt).toLocaleDateString('en-IN')}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 text-xs space-y-1">
                    <p><span className="font-bold text-gray-400">AWB:</span> <span className="font-mono text-gray-700 font-semibold">{n.awb_number}</span></p>
                    <p><span className="font-bold text-gray-400">Price:</span> {n.price !== undefined && n.price !== null && n.price !== '' ? `₹${n.price}` : '—'}</p>
                    <p><span className="font-bold text-gray-400">Reason:</span> {n.reason}</p>
                    <p><span className="font-bold text-gray-400">By:</span> {n.createdBy?.name || '—'}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => startEdit(n)} className="w-full text-[11px] font-bold py-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">Edit</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main NDR Page ─────────────────────────────────────────────────────────────
const TABS = [
  { id: 'board',  label: 'Status Board',   icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> },
  { id: 'list',   label: 'NDR List',       icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> },
  { id: 'action', label: 'NDR Action',     icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
  { id: 'notes',  label: 'Notes',          icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg> },
];

export default function ShipmaxxNdr() {
  const [tab, setTab] = useState('board');
  const [department, setDepartment] = useState('all');
  const [actionAwb, setActionAwb] = useState('');
  const [actionType, setActionType] = useState('reattempt');

  const handleUseAwb = (awb, type = 'reattempt') => {
    setActionAwb(awb);
    setActionType(type);
    setTab('action');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-4">
      {/* Tab bar with Department Filter */}
      <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 pb-1 scrollbar-hide">
        <select
          value={department}
          onChange={e => setDepartment(e.target.value)}
          className="h-11 px-3.5 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-700 shadow-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer uppercase tracking-wider transition hover:border-gray-300 shrink-0"
        >
          <option value="all">ALL DEPARTMENTS</option>
          <option value="male">MALE</option>
          <option value="ortho">ORTHO</option>
          <option value="skin">SKIN</option>
        </select>

        <div className="inline-flex gap-1 rounded-xl border border-gray-200 bg-white p-1 shadow-sm whitespace-nowrap">
          {TABS.map(t => {
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`h-9 rounded-lg px-3 text-xs font-semibold transition-all inline-flex items-center gap-2 ${
                  active ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                }`}>
                <span className={`grid h-5 w-5 place-items-center rounded-md ${active ? 'bg-white/15' : 'bg-blue-50 text-blue-600'}`}>
                  {t.icon}
                </span>
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {tab === 'board'  && (
        <OrderStatusBoard
          platform="shipmaxx"
          title="ShipMaxx Orders Status Board"
          department={department}
          defaultPreset="all"
          defaultStatus="IN_TRANSIT"
          allowedStatuses={[
            'NEW',
            'PICKUP_SCHEDULED',
            'OUT_FOR_PICKUP',
            'SHIPPED',
            'IN_TRANSIT',
            'OUT_FOR_DELIVERY',
            'DELIVERED',
            'UNDELIVERED_1ST_ATTEMPT',
            'UNDELIVERED_2ND_ATTEMPT',
            'UNDELIVERED_3RD_ATTEMPT',
            'UNDELIVERED',
            'DELIVERY_EXCEPTION',
            'RTO_INITIATED',
            'RTO_INTRANSIT',
            'RTO_DELIVERED',
            'CANCELLED'
          ]}
        />
      )}
      {tab === 'list'   && <NdrList department={department} setDepartment={setDepartment} onSelectNdr={() => {}} onUseAwb={handleUseAwb} />}
      {tab === 'action' && <NdrActionPanel prefillAwb={actionAwb} prefillAction={actionType} />}
      {tab === 'notes'  && <NdrNotesPanel />}
    </div>
  );
}
