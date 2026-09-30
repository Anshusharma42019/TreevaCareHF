import React, { useState, useEffect, useCallback, Fragment, useMemo } from 'react';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { useSearchParams } from 'react-router-dom';
import * as smxSvc from '../services/shipmaxx.service';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import PrescriptionModal from '../components/PrescriptionModal';

const PER_PAGE = 20;
const TOTAL_FU = 5;
const GAP_DAYS = 6;

const inputCls = "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition";

const ordinal = n => {
  const v = Number(n) + 1;
  const s = v % 10 === 1 && v % 100 !== 11 ? 'st' : v % 10 === 2 && v % 100 !== 12 ? 'nd' : v % 10 === 3 && v % 100 !== 13 ? 'rd' : 'th';
  return `${v}${s}`;
};

const ROLE_GRADIENT = [
  'from-purple-500 to-violet-600',
  'from-blue-500 to-cyan-500',
  'from-emerald-500 to-teal-500',
  'from-orange-500 to-amber-500',
  'from-rose-500 to-red-500',
];

const initials = name => (name || '').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';

const formatDate = (value, options) => {
  if (!value) return '-';
  const date = new Date(value);
  if (isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-IN', options);
};

const toDateInputValue = (value = new Date()) => {
  const date = new Date(value);
  if (isNaN(date.getTime())) return '';
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

const getFollowup = (order, n) => (order.followups || []).find(f => f.followup_number === Number(n));

const previousFollowupsDone = (order, n) =>
  (order.followups || []).filter(f => f.followup_number < Number(n)).every(f => f.completed);

const isDue = (value, inputDate) => {
  if (!value) return false;
  const date = new Date(value);
  if (!inputDate) { const t = new Date(); t.setHours(23, 59, 59, 999); return date <= t; }
  return toDateInputValue(value) <= inputDate;
};

const matchReply = (replyText, filterValue) => {
  if (!replyText) return false;
  const text = replyText.toLowerCase();
  switch (filterValue) {
    case 'हाँ, समय पर ले रहा हूँ':
      return text.includes('हाँ, समय पर ले रहा हूँ');
    case 'नहीं, नियमित नहीं':
      return text.includes('नहीं, नियमित नहीं');
    case 'आराम मिल रहा है':
      if (text.includes('कम') || text.includes('kam')) return false;
      return text.includes('आराम मिल रहा है') || text.includes('aaram mil raha hai');
    case 'कम आराम मिल रहा है':
      return text.includes('कम आराम मिल रहा है') || text.includes('kam aaram mil raha hai');
    case 'आराम नहीं है':
      return text.includes('aaram nahi') || text.includes('aaram nhi') || text.includes('fayda nahi') || text.includes('fayda nhi') || text.includes('kuch bhi aaram') || text.includes('koi aaram') || text.includes('farak nahi') || text.includes('farak nhi') || text.includes('relief nahi') || text.includes('relief nhi') || text.includes('no relief') || text.includes('नहीं पहुँचा') || text.includes('नहीं हुआ');
    case 'अगले महीने की दवाइयाँ बुक करें':
      return text.includes('अगले महीने') || text.includes('अगle महीने') || text.includes('agle mahine') || text.includes('अगले महीने की दवाइयाँ बुक करें');
    case 'डॉक्टर से बात करें':
      return text.includes('डॉक्टर से बात करें') || text.includes('doctor se baat karni hai') || text.includes('doctor se baat');
    case 'कॉल करें':
      return text.includes('call me') || text.includes('please call') || text.includes('call kr') || text.includes('call kre') || text.includes('call karo') || text.includes('cl me') || text.includes('call back') || text.includes('कॉल करें') || text.includes('बात करें') || text.includes('baat kre');
    case 'दवाई कैसे लें':
      return text.includes('kaise le') || text.includes('kaise lena') || text.includes('kaise khana') || text.includes('kaise khaye') || text.includes('sevan kaise') || text.includes('use kaise') || text.includes('how to take') || text.includes('कैसे खाएं') || text.includes('कैसे लेना');
    case 'दवाई नहीं मिली':
      return text.includes('nahi mili') || text.includes('nhi mili') || text.includes('nahi aaya') || text.includes('nhi aaya') || text.includes('not received') || text.includes('kab tak') || text.includes('kab aayega') || text.includes('delivery kab') || text.includes('नहीं मिला') || text.includes('नही मिला') || text.includes('नहीं आया') || text.includes('नही आया');
    case 'ready':
      return text.includes('ready') || text.includes('तैयार') || text.includes('taiyar') || text.includes('tayar') || text.includes('tayaar');
    default:
      return false;
  }
};

const DetailRow = ({ label, value }) =>
  value ? (
    <div className="flex items-start gap-2 sm:gap-3 py-2 border-b border-gray-50 last:border-0">
      <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-gray-400 w-20 sm:w-28 shrink-0 mt-0.5">{label}</span>
      <span className="text-xs sm:text-sm text-gray-800 font-medium flex-1">{value}</span>
    </div>
  ) : null;

const SectionHead = ({ label }) => (
  <div className="flex items-center gap-2 mt-5 mb-2">
    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500">{label}</span>
    <div className="flex-1 h-px bg-emerald-100" />
  </div>
);

export default function ShipmaxxFollowup() {
  const { user } = useAuth();
  const canManage = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'support';
  const [searchParams, setSearchParams] = useSearchParams();
  const [department, setDepartment] = useState('');
  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [filterDelivered, setFilterDelivered] = useState(() => toDateInputValue(new Date()));
  const [filterFollowupNum, setFilterFollowupNum] = useState('1');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);
  const [completedMap, setCompletedMap] = useState({});
  const [doneLoading, setDoneLoading] = useState(null);
  const [completedList, setCompletedList] = useState([]);
  const [completedTotal, setCompletedTotal] = useState(0);
  const [completedPage, setCompletedPage] = useState(1);
  const [completedLoading, setCompletedLoading] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [bookedSearchAll, setBookedSearchAll] = useState([]); // all booked kits for searched phone
  const [filterKitType, setFilterKitType] = useState('all'); // 'all' | 'new' | 'old' | '1' | '2' | '3' | '4' | '5+'
  const [filterScheduleType, setFilterScheduleType] = useState('all'); // 'all' | 'today' | 'overdue' | 'picked'
  const [pickedDate, setPickedDate] = useState(() => toDateInputValue(new Date()));
  const [staffFilter, setStaffFilter] = useState('');
  const [staffUsers, setStaffUsers] = useState([]);
  const [distributing, setDistributing] = useState(false);
  const [showAddonForm, setShowAddonForm] = useState(false);
  const [addonFields, setAddonFields] = useState({ medicine: '', price: '', notes: '' });
  const [addonModalOpen, setAddonModalOpen] = useState(false);
  const [addonForm, setAddonForm] = useState({ medicine: '', price: '', notes: '', targetOrder: null });
  const [addonSaving, setAddonSaving] = useState(false);
  const [rxModalOpen, setRxModalOpen] = useState(false);
  const [selectedRxOrder, setSelectedRxOrder] = useState(null);

  const openPrescriptionModal = (targetOrder) => {
    const ord = targetOrder || selected;
    if (!ord) return;
    const dept = detectDept(ord);
    const ageVal = ord.age || ord.lead_id?.age || ord.lead?.age || ord.doctor_prescription?.age || '';
    const weightVal = ord.weight || ord.lead_id?.weight || ord.lead?.weight || ord.doctor_prescription?.weight || '';
    const genderVal = ord.gender || ord.lead_id?.gender || ord.lead?.gender || ord.doctor_prescription?.gender || 'Male';
    const maritalVal = ord.maritalStatus || ord.marriedStatus || ord.lead_id?.maritalStatus || ord.lead?.maritalStatus || ord.doctor_prescription?.maritalStatus || '';
    const occVal = ord.occupation || ord.profession || ord.lead_id?.occupation || ord.lead?.occupation || ord.doctor_prescription?.occupation || '';
    const sinceVal = ord.since || ord.problemDuration || ord.lead_id?.problemDuration || ord.lead?.problemDuration || ord.doctor_prescription?.problemDuration || '';

    setSelectedRxOrder({
      ...ord,
      patientName: ord.billing_customer_name,
      mobile: ord.billing_phone,
      pid: ord.order_id,
      amount: ord.sub_total ?? ord.amount,
      department: dept,
      problem: ord.verification_problem || ord.problem || ord.lead_id?.problem || '',
      verifiedBy: ord.verified_by?.name || ord.verifiedBy?.name || '',
      doctorName: ord.doctorName || ord.created_by?.name || ord.task_created_by?.name || '',
      age: ageVal,
      weight: weightVal,
      gender: genderVal,
      maritalStatus: maritalVal,
      marriedStatus: maritalVal,
      occupation: occVal,
      profession: occVal,
      since: sinceVal,
      problemDuration: sinceVal,
    });
    setRxModalOpen(true);
  };

  const openAddonModal = (order) => {
    const target = order || selected;
    if (!target) return;
    setAddonForm({
      targetOrder: target,
      medicine: target.order_items?.[0]?.name || '',
      price: target.sub_total ?? target.amount ?? '',
      notes: ''
    });
    setAddonModalOpen(true);
  };

  const handleAddonSubmit = async (e) => {
    e.preventDefault();
    if (!addonForm.targetOrder) return;
    setAddonSaving(true);
    try {
      await handleSendToVerification(addonForm.targetOrder._id, {
        medicine: addonForm.medicine,
        price: addonForm.price,
        notes: addonForm.notes,
        source: 'add_on'
      });
      setAddonModalOpen(false);
    } catch (err) {
      alert(err?.response?.data?.message || err.message);
    } finally {
      setAddonSaving(false);
    }
  };
  const [activity, setActivity] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editFields, setEditFields] = useState({});
  const [editSaving, setEditSaving] = useState(false);
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manualForm, setManualForm] = useState({
    name: '', phone: '', city: '', state: '', medicine: '',
    delivered_date: '', amount: '', order_id: '', courier_name: '',
    payment_method: '', pincode: '', address: ''
  });
  const [manualSaving, setManualSaving] = useState(false);
  const [autofilling, setAutofilling] = useState(false);
  const [replyFilter, setReplyFilter] = useState('all');

  // Appointment Booking States
  const [apptModalOpen, setApptModalOpen] = useState(false);
  const [apptDoctors, setApptDoctors] = useState([]);
  const [apptLoading, setApptLoading] = useState(false);
  const [apptError, setApptError] = useState('');
  const [apptForm, setApptForm] = useState({
    patientName: '',
    phone: '',
    email: '',
    doctorName: '',
    appointmentDate: '',
    type: 'follow_up',
    status: 'scheduled',
    patientType: 'old',
    problem: '',
    address: '',
    houseNo: '',
    cityVillage: '',
    postOffice: '',
    landmark: '',
    district: '',
    state: '',
    pincode: '',
    medicineDeliveryDate: '',
    notes: '',
    department: 'male',
    lead: null
  });

  const REPLY_OPTIONS = [
    { label: 'All Replies', value: 'any_reply' },
    { label: 'हाँ, समय पर ले रहा हूँ', value: 'हाँ, समय पर ले रहा हूँ' },
    { label: 'नहीं, नियमित नहीं', value: 'नहीं, नियमित नहीं' },
    { label: 'आराम मिल रहा है / Aaram Mil Raha Hai', value: 'आराम मिल रहा है' },
    { label: 'कम आराम मिल रहा है / Kam Aaram Mil Raha Hai', value: 'कम आराम मिल रहा है' },
    { label: 'आराम नहीं है / No Relief', value: 'आराम नहीं है' },
    { label: 'अगले महीने की दवाइयाँ बुक करें', value: 'अगले महीने की दवाइयाँ बुक करें' },
    { label: 'डॉक्टर से बात करें / Doctor Se Baat Karni Hai', value: 'डॉक्टर से बात करें' },
    { label: 'कॉल करें / Call Request', value: 'कॉल करें' },
    { label: 'दवाई कैसे लें / Dosage Inquiry', value: 'दवाई कैसे लें' },
    { label: 'दवाई नहीं मिली / Delivery Inquiry', value: 'दवाई नहीं मिली' },
    { label: 'तैयार हूँ / Ready', value: 'ready' }
  ];

  const followupNumbers = Array.from({ length: TOTAL_FU }, (_, i) => i + 1);

  const load = useCallback(async (silent = false) => {
    if (!silent) { setLoading(true); setError(''); }
    try {
      const res = await smxSvc.getOrdersWithFollowUps({ department: department || undefined });
      const list = Array.isArray(res.data?.data) ? res.data.data : [];
      list.sort((a, b) => {
        const da = new Date(a.delivered_at || a.status_updated_at || a.createdAt || 0).getTime();
        const db = new Date(b.delivered_at || b.status_updated_at || b.createdAt || 0).getTime();
        return db - da;
      });
      setAll(list);
    } catch (e) { if (!silent) setError(e?.response?.data?.message || e.message); }
    finally { if (!silent) setLoading(false); }
  }, [department]);

  const loadCompleted = useCallback(async (silent = false, pg = 1, q = '') => {
    if (!silent) setCompletedLoading(true);
    try {
      const res = await smxSvc.getCompletedFollowUps({ page: pg, per_page: PER_PAGE, search: q || undefined, department: department || undefined });
      setCompletedList(Array.isArray(res.data?.data?.data) ? res.data.data.data : []);
      setCompletedTotal(res.data?.data?.total || 0);
    } catch { }
    finally { if (!silent) setCompletedLoading(false); }
  }, [department]);

  const syncAndLoad = async () => {
    setSyncing(true);
    try { await smxSvc.syncShipmaxx(); } catch { }
    finally { setSyncing(false); }
    await load();
  };

  const handleAutoDistribute = async () => {
    if (!window.confirm('Auto-distribute all pending follow-ups equally among active sales and support staff?')) return;
    setDistributing(true);
    try {
      const res = await smxSvc.autoDistribute({ department: department || undefined });
      alert(res.data?.message || 'Auto-distributed follow-ups successfully!');
      await load();
    } catch (e) {
      alert('Distribution failed: ' + (e?.response?.data?.message || e.message));
    } finally {
      setDistributing(false);
    }
  };

  const autoFetch = useCallback((silent) => {
    load(silent);
    if (showCompleted) loadCompleted(silent, completedPage, search);
  }, [load, loadCompleted, showCompleted, completedPage, search]);

  useAutoRefresh(autoFetch, 15000);

  useEffect(() => {
    load(false).then(() => loadCompleted(false, 1));
  }, [load, loadCompleted]);

  // Fetch ALL booked orders for the searched phone (unlimited — Kit 3,4,5,6... all included)
  useEffect(() => {
    if (!search) { setBookedSearchAll([]); return; }
    smxSvc.getCompletedFollowUps({ page: 1, per_page: 500, search })
      .then(res => setBookedSearchAll(Array.isArray(res.data?.data?.data) ? res.data.data.data : []))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // Re-fetch completed list when search changes while on Done tab
  useEffect(() => {
    if (showCompleted) {
      setCompletedPage(1);
      loadCompleted(false, 1, search);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, showCompleted]);

  // Auto-switch to Done tab when active has NO results but bookedSearchAll has matches
  useEffect(() => {
    if (!search || showCompleted) return;
    const activeMatch = all.some(o => {
      const q = search.toLowerCase();
      return (
        o.billing_customer_name?.toLowerCase().includes(q) ||
        o.billing_phone?.includes(q) ||
        o.order_id?.toString().includes(q) ||
        o.awb_code?.toLowerCase().includes(q)
      );
    });
    if (!activeMatch && bookedSearchAll.length > 0) {
      setShowCompleted(true);
      setCompletedPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, bookedSearchAll]);

  useEffect(() => {
    const openId = searchParams.get('openId');
    if (openId) {
      const match = all.find(o => String(o._id) === openId) || completedList.find(o => String(o._id) === openId);
      if (match) {
        setSelected(match);
        setShowCompleted(!!completedList.find(o => String(o._id) === openId));
        setSearchParams({}, { replace: true });
      } else {
        smxSvc.getOrder(openId).then(res => {
          if (res.data?.data) {
            const order = res.data.data;
            setSelected(order);
            if (order.followups?.length >= TOTAL_FU && order.followups.every(f => f.completed)) {
              setCompletedList(prev => [order, ...prev]);
              setShowCompleted(true);
            } else {
              setAll(prev => [order, ...prev.filter(o => o._id !== order._id)]);
              setShowCompleted(false);
            }
          }
        }).catch(() => {});
        setSearchParams({}, { replace: true });
      }
    }
  }, [searchParams, all, completedList, setSearchParams]);

  // Phone autofill for manual form
  useEffect(() => {
    const digits = manualForm.phone.replace(/\D/g, '');
    if (digits.length >= 10 && manualModalOpen) {
      const last10 = digits.slice(-10);
      setAutofilling(true);
      smxSvc.searchOrderByPhone(last10).then(res => {
        const d = res.data?.data;
        if (d) setManualForm(p => ({
          ...p,
          name: d.billing_customer_name || p.name,
          city: d.billing_city || p.city,
          state: d.billing_state || p.state,
          medicine: d.order_items?.[0]?.name || p.medicine,
          amount: d.sub_total || p.amount,
          delivered_date: d.delivered_at ? toDateInputValue(d.delivered_at) : (d.createdAt ? toDateInputValue(d.createdAt) : p.delivered_date),
          order_id: d.order_id || p.order_id,
          courier_name: d.courier_name || p.courier_name,
          payment_method: d.payment_method || p.payment_method,
          pincode: d.billing_pincode || p.pincode,
          address: d.billing_address || p.address,
        }));
      }).catch(() => {}).finally(() => setAutofilling(false));
    }
  }, [manualForm.phone, manualModalOpen]);

  const handleFollowUpDone = async (orderId) => {
    const oid = String(orderId);
    setDoneLoading(oid);
    try {
      const res = await smxSvc.completeFollowUp(oid, noteText ? { note: noteText } : {});
      const { completedCount, next_follow_up } = res.data.data;
      setCompletedMap(prev => ({ ...prev, [oid]: completedCount }));
      if (completedCount >= TOTAL_FU) {
        const doneOrder = selected && String(selected._id) === oid ? selected : all.find(o => String(o._id) === oid);
        setAll(prev => prev.filter(o => String(o._id) !== oid));
        if (doneOrder) { setCompletedList(prev => [{ ...doneOrder, all_followups_done: true }, ...prev]); setCompletedTotal(prev => prev + 1); }
        setSelected(null);
        return;
      }
      setAll(prev => prev.map(o => {
        if (String(o._id) !== oid) return o;
        let base = new Date();
        const updatedFUs = (o.followups || []).map(f => {
          if (f.followup_number === completedCount) return { ...f, completed: true, completed_at: new Date().toISOString() };
          if (f.followup_number > completedCount) { base = new Date(base.getTime() + GAP_DAYS * 86400000); return { ...f, scheduled_date: new Date(base).toISOString() }; }
          return f;
        });
        return { ...o, next_follow_up, followups: updatedFUs };
      }));
      if (selected?._id === orderId) {
        setSelected(prev => ({ ...prev, next_follow_up }));
        smxSvc.getOrderActivity(oid).then(r => setActivity(Array.isArray(r.data?.data) ? r.data.data : [])).catch(() => {});
      }
    } catch (e) { setError(e?.response?.data?.message || e.message); }
    finally { setDoneLoading(null); }
  };

  const handleSendToVerification = async (oid, customPayload = {}) => {
    const isAddon = customPayload?.source === 'add_on';
    const confirmMsg = isAddon
      ? `Send Add-on Order (Amount: ₹${customPayload.price || 'N/A'}) to Verification?`
      : 'Send this customer back to Verification for a new cycle?';
    if (!window.confirm(confirmMsg)) return;
    setDoneLoading(String(oid));
    try {
      await smxSvc.sendToVerification(oid, customPayload);
      const orderData = (selected && String(selected._id) === String(oid)) ? selected : all.find(o => String(o._id) === String(oid));
      setAll(prev => prev.filter(o => String(o._id) !== String(oid)));
      if (orderData) {
        const sentOrder = { ...orderData, sent_to_verification: true };
        setCompletedList(prev => {
          const exists = prev.some(o => String(o._id) === String(oid));
          if (exists) return prev.map(o => String(o._id) === String(oid) ? sentOrder : o);
          setCompletedTotal(t => t + 1);
          return [sentOrder, ...prev];
        });
      }
      if (selected && String(selected._id) === String(oid)) setSelected(prev => prev ? { ...prev, sent_to_verification: true } : prev);
    } catch (e) { alert(e?.response?.data?.message || e.message); }
    finally { setDoneLoading(null); }
  };

  const handleDeleteOrder = async (e, orderId, orderName) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete "${orderName || 'this order'}" permanently?`)) return;
    try {
      await smxSvc.deleteOrder(orderId);
      setAll(prev => prev.filter(o => String(o._id) !== String(orderId) && String(o.order_id) !== String(orderId)));
      setCompletedList(prev => prev.filter(o => String(o._id) !== String(orderId) && String(o.order_id) !== String(orderId)));
      if (selected && (String(selected._id) === String(orderId) || String(selected.order_id) === String(orderId))) {
        setSelected(null);
      }
    } catch (err) {
      alert('Failed to delete order: ' + (err?.response?.data?.message || err.message));
    }
  };

  const saveNote = async () => {
    if (!selected || !noteText.trim()) return;
    setNoteSaving(true);
    try {
      const res = await smxSvc.saveOrderNote(selected._id, noteText, 'followup');
      const newComments = res.data.data;
      setAll(prev => prev.map(o => String(o._id) === String(selected._id) ? { ...o, comments: newComments } : o));
      setSelected(prev => ({ ...prev, comments: newComments }));
      setNoteText('');
    } catch (e) { alert('Failed: ' + (e?.response?.data?.message || e.message)); }
    finally { setNoteSaving(false); }
  };

  const saveContact = async () => {
    if (!selected) return;
    setEditSaving(true);
    try {
      await smxSvc.updateOrderContact(selected._id, editFields);
      const updated = { ...selected, ...editFields };
      setSelected(updated);
      setAll(prev => prev.map(o => String(o._id) === String(selected._id) ? { ...o, ...editFields } : o));
      setEditMode(false);
    } catch (e) { alert('Failed: ' + (e?.response?.data?.message || e.message)); }
    finally { setEditSaving(false); }
  };

  const handleMarkReplyRead = async (e, id) => {
    e.stopPropagation();
    setAll(prev => prev.map(o => String(o._id) === String(id) ? { ...o, interakt_reply_read: true } : o));
    try {
      await api.patch(`/shipmaxx/orders/${id}/read-reply`);
    } catch(e) {
      console.error(e);
      setAll(prev => prev.map(o => String(o._id) === String(id) ? { ...o, interakt_reply_read: false } : o));
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setManualSaving(true);
    try {
      await smxSvc.createManualFollowup(manualForm);
      setManualModalOpen(false);
      setManualForm({ name: '', phone: '', city: '', state: '', medicine: '', delivered_date: '', amount: '', order_id: '', courier_name: '', payment_method: '', pincode: '', address: '' });
      await syncAndLoad();
    } catch (err) { alert(err?.response?.data?.message || err.message); }
    finally { setManualSaving(false); }
  };

  // Load Doctors list for Appointment modal
  useEffect(() => {
    if (apptModalOpen && apptDoctors.length === 0) {
      api.get('/users', { params: { role: 'doctor' } })
        .then(res => {
          const list = res.data?.data?.results || res.data?.data?.users || (Array.isArray(res.data?.data) ? res.data.data : []);
          setApptDoctors(list);
        })
        .catch(() => {});
    }
  }, [apptModalOpen, apptDoctors.length]);

  const openBookAppointment = () => {
    if (!selected) return;
    const deliveryDate = selected.delivered_date || selected.delivered_at;
    const deliveryDateStr = deliveryDate ? new Date(deliveryDate).toISOString().split('T')[0] : '';
    const cleanPhone = String(selected.billing_phone || '').replace(/\D/g, '');

    setApptForm({
      patientName: selected.billing_customer_name || '',
      phone: cleanPhone,
      email: selected.billing_email || '',
      doctorName: '',
      appointmentDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // tomorrow
      type: 'follow_up',
      status: 'scheduled',
      patientType: 'old',
      problem: selected.verification_problem || selected.problem || selected.lead_id?.problem || '',
      houseNo: '',
      address: selected.billing_address || '',
      cityVillage: selected.billing_city || '',
      postOffice: '',
      landmark: '',
      district: '',
      state: selected.billing_state || '',
      pincode: String(selected.billing_pincode || ''),
      medicineDeliveryDate: deliveryDateStr,
      notes: '',
      department: selected.lead_id?.department || 'male',
      lead: selected.lead_id?._id || selected.lead_id || null
    });
    setApptError('');
    setApptModalOpen(true);
  };

  const handleApptSubmit = async (e) => {
    e.preventDefault();
    if (!apptForm.doctorName) {
      setApptError('Please select a doctor');
      return;
    }
    setApptLoading(true);
    setApptError('');
    try {
      await api.post('/appointments', apptForm);
      setApptModalOpen(false);
      alert('Appointment booked successfully!');
    } catch (err) {
      setApptError(err.response?.data?.message || 'Failed to book appointment');
    } finally {
      setApptLoading(false);
    }
  };

  const handleSelect = (order) => {
    setSelected(order); setNoteText(''); setActivity([]); setEditMode(false); setEditFields({});
    setShowAddonForm(false);
    setAddonFields({
      medicine: order.order_items?.[0]?.name || '',
      price: order.sub_total || '',
      notes: ''
    });
    setActivityLoading(true);
    smxSvc.getOrderActivity(order._id)
      .then(res => setActivity(Array.isArray(res.data?.data) ? res.data.data : []))
      .catch(() => setActivity([]))
      .finally(() => setActivityLoading(false));

    // Fetch live Doctor Prescription
    const cleanPhone = String(order.billing_phone || '').replace(/\D/g, '').slice(-10);
    api.get('/prescriptions/get-by-target', {
      params: {
        targetId: order._id,
        leadId: order.lead_id?._id || order.lead_id || undefined,
        phone: cleanPhone || undefined
      }
    }).then(res => {
      if (res.data?.data) {
        const rx = res.data.data;
        setSelected(prev => prev && String(prev._id) === String(order._id) ? {
          ...prev,
          doctor_prescription: rx,
          prescribed_medicines: rx.prescribedMedicines || prev.prescribed_medicines || [],
          doctor_name: rx.doctorName || prev.doctor_name || ''
        } : prev);
      }
    }).catch(() => {});
  };

  const ALLOWED_DEPTS = ['male', 'ortho', 'skin', 'migraine', 'piles'];

  const detectDept = (o) => {
    if (o.department && ALLOWED_DEPTS.includes(o.department.toLowerCase())) return o.department.toLowerCase();
    if (o.lead_id?.department && ALLOWED_DEPTS.includes(o.lead_id.department.toLowerCase())) return o.lead_id.department.toLowerCase();
    const prodStr = ((o.order_items || []).map(p => p.name || '').join(' ') + ' ' + (o.verification_problem || o.problem || o.lead_id?.problem || '')).toLowerCase();
    if (/migraine/i.test(prodStr)) return 'migraine';
    if (/piles/i.test(prodStr)) return 'piles';
    if (/\b(male|men|man|sexual|erectile|testosterone|prostate|semen|penis|ed|nightfall|sperm|discharge)\b/i.test(prodStr)) return 'male';
    if (/\b(ortho|joint|knee|bone|fracture|arthritis|spine|back pain|shoulder|ligament|gout)\b/i.test(prodStr)) return 'ortho';
    if (/\b(skin|acne|pimple|rash|eczema|psoriasis|derma|pigmentation|face)\b/i.test(prodStr)) return 'skin';
    return 'other';
  };

  const getActiveCallStage = useCallback((order) => {
    const allFUs = (order.followups || []).slice().sort((a, b) => a.followup_number - b.followup_number);
    const uncompleted = allFUs.filter(f => !f.completed);
    if (uncompleted.length === 0) return null; // All 5 done

    const todayStr = toDateInputValue(new Date());

    const dueUncompleted = uncompleted.filter(f => {
      if (!f.scheduled_date) return true;
      return toDateInputValue(f.scheduled_date) <= todayStr;
    });

    if (dueUncompleted.length > 0) {
      return dueUncompleted[dueUncompleted.length - 1].followup_number;
    }

    return uncompleted[0].followup_number;
  }, []);

  const activeOrders = useMemo(() => {
    return all.filter(o => {
      const allFUs = (o.followups || []);
      const completedCount = completedMap[o._id] ?? allFUs.filter(f => f.completed).length;
      return completedCount < TOTAL_FU && !o.sent_to_verification && !o.followup_done;
    });
  }, [all, completedMap]);

  const dueCounts = followupNumbers.reduce((acc, n) => {
    acc[n] = activeOrders.filter(o => {
      const activeStage = getActiveCallStage(o);
      return activeStage === Number(n);
    }).length;
    return acc;
  }, {});

  const kitCounts = useMemo(() => {
    let newCount = 0;
    let oldCount = 0;
    let todayCount = 0;
    let overdueCount = 0;
    let pickedCount = 0;
    let k1 = 0, k2 = 0, k3 = 0, k4 = 0, k5plus = 0;

    const todayStr = toDateInputValue(new Date());

    activeOrders.forEach(o => {
      const kNum = o.kit_number || 1;
      if (kNum <= 1) { newCount++; k1++; }
      else {
        oldCount++;
        if (kNum === 2) k2++;
        else if (kNum === 3) k3++;
        else if (kNum === 4) k4++;
        else if (kNum >= 5) k5plus++;
      }

      const nextFU = (o.followups || []).find(f => !f.completed);
      if (nextFU && nextFU.scheduled_date) {
        const fuDateStr = toDateInputValue(nextFU.scheduled_date);
        if (fuDateStr === todayStr) todayCount++;
        if (fuDateStr < todayStr) overdueCount++;
        if (pickedDate && fuDateStr === pickedDate) pickedCount++;
      }
    });

    return {
      all: activeOrders.length,
      new: newCount,
      old: oldCount,
      today: todayCount,
      overdue: overdueCount,
      picked: pickedCount,
      k1, k2, k3, k4, k5plus
    };
  }, [activeOrders, pickedDate]);

  const filtered = activeOrders.filter(o => {
    const orderDept = detectDept(o);
    if (department && department !== 'all') {
      if (orderDept !== department) return false;
    }

    if (staffFilter) {
      const assignedId = o.lead_id?.assignedTo?._id || o.lead_id?.assignedTo || o.created_by?._id || o.created_by;
      if (String(assignedId) !== String(staffFilter)) return false;
    }

    if (filterFollowupNum === 'replies') {
      if (!o.interakt_reply_text || o.interakt_reply_read) return false;
      if (replyFilter !== 'any_reply' && !matchReply(o.interakt_reply_text, replyFilter)) return false;
    } else if (filterFollowupNum) {
      const activeStage = getActiveCallStage(o);
      if (activeStage !== Number(filterFollowupNum)) return false;
    }

    const kNum = o.kit_number || 1;
    if (filterKitType === 'new' && kNum > 1) return false;
    if (filterKitType === 'old' && kNum <= 1) return false;
    if (filterKitType === '1' && kNum !== 1) return false;
    if (filterKitType === '2' && kNum !== 2) return false;
    if (filterKitType === '3' && kNum !== 3) return false;
    if (filterKitType === '4' && kNum !== 4) return false;
    if (filterKitType === '5+' && kNum < 5) return false;

    if (filterScheduleType !== 'all') {
      const nextFU = (o.followups || []).find(f => !f.completed);
      if (!nextFU || !nextFU.scheduled_date) return false;
      const fuDateStr = toDateInputValue(nextFU.scheduled_date);
      const todayStr = toDateInputValue(new Date());

      if (filterScheduleType === 'today' && fuDateStr !== todayStr) return false;
      if (filterScheduleType === 'overdue' && fuDateStr >= todayStr) return false;
      if (filterScheduleType === 'picked' && pickedDate && fuDateStr !== pickedDate) return false;
    }

    if (search) {
      const q = search.toLowerCase();
      return (
        o.billing_customer_name?.toLowerCase().includes(q) ||
        o.billing_phone?.includes(q) ||
        o.order_id?.toString().includes(q) ||
        o.awb_code?.toLowerCase().includes(q) ||
        (o.order_items || []).some(item => item.name?.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const bookedSearchMatches = bookedSearchAll;

  const displayCompletedList = completedList.filter(o => {
    const orderDept = detectDept(o);
    if (department && department !== 'all') {
      if (orderDept !== department) return false;
    }
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      o.billing_customer_name?.toLowerCase().includes(q) ||
      o.billing_phone?.includes(q) ||
      o.order_id?.toString().includes(q) ||
      o.awb_code?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-full bg-glow pb-10 px-3 sm:px-6 lg:px-8 space-y-5 pt-4">

      {/* ── Row 1: Call Tabs Bar ── */}
      <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 p-1.5 shadow-sm overflow-x-auto no-scrollbar gap-1">
        <button
          type="button"
          onClick={() => { setShowCompleted(false); setFilterFollowupNum(''); setPage(1); }}
          className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
            !showCompleted && !filterFollowupNum ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100/80'
          }`}
        >
          <span>All Pending</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${!showCompleted && !filterFollowupNum ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'}`}>
            {activeOrders.length}
          </span>
        </button>

        {followupNumbers.map(n => {
          const active = !showCompleted && filterFollowupNum === String(n);
          const count = dueCounts[n] || 0;
          return (
            <button
              key={n}
              type="button"
              onClick={() => { setShowCompleted(false); setFilterFollowupNum(String(n)); setPage(1); }}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                active ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100/80'
              }`}
            >
              <span className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center ${active ? 'bg-white/30 text-white' : 'bg-emerald-100 text-emerald-700'}`}>
                {n}
              </span>
              <span>{ordinal(n - 1)} Call</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${active ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'}`}>
                {count}
              </span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => { setShowCompleted(false); setFilterFollowupNum('replies'); setPage(1); }}
          className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
            !showCompleted && filterFollowupNum === 'replies' ? 'bg-indigo-600 text-white shadow-md' : 'text-indigo-600 hover:bg-indigo-50'
          }`}
        >
          <span>Replies</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${!showCompleted && filterFollowupNum === 'replies' ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-700'}`}>
            {activeOrders.filter(o => !!o.interakt_reply_text && !o.interakt_reply_read).length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => { setShowCompleted(true); setCompletedPage(1); loadCompleted(false, 1, search); }}
          className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ml-auto ${
            showCompleted ? 'bg-gray-900 text-white shadow-md' : 'bg-gray-800 text-white hover:bg-gray-900'
          }`}
        >
          <span>Done</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-white/20 text-white">
            {completedTotal}
          </span>
        </button>
      </div>

      {/* ── Row 2: Sub-Filters Bar (Kits, Today, Overdue, Date Picker, Kit Badges) ── */}
      <div className="flex flex-wrap items-center bg-white rounded-2xl border border-gray-100 p-2 shadow-sm gap-2">
        <button
          type="button"
          onClick={() => { setFilterKitType('all'); setFilterScheduleType('all'); setPage(1); }}
          className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition flex items-center gap-1.5 ${
            filterKitType === 'all' && filterScheduleType === 'all' ? 'bg-gray-800 text-white shadow' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <span>All Kits</span>
          <span className="px-1.5 py-0.5 rounded-md text-[9px] bg-white/20 text-current">{kitCounts.all}</span>
        </button>

        <button
          type="button"
          onClick={() => { setFilterKitType('new'); setPage(1); }}
          className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition flex items-center gap-1.5 ${
            filterKitType === 'new' ? 'bg-emerald-600 text-white shadow' : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
          }`}
        >
          <span>New (1st Kit)</span>
          <span className="px-1.5 py-0.5 rounded-md text-[9px] bg-emerald-200/50">{kitCounts.new}</span>
        </button>

        <button
          type="button"
          onClick={() => { setFilterKitType('old'); setPage(1); }}
          className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition flex items-center gap-1.5 ${
            filterKitType === 'old' ? 'bg-purple-600 text-white shadow' : 'text-purple-700 bg-purple-50 hover:bg-purple-100'
          }`}
        >
          <span>Old (2nd+ Kit)</span>
          <span className="px-1.5 py-0.5 rounded-md text-[9px] bg-purple-200/50">{kitCounts.old}</span>
        </button>

        <div className="h-4 w-px bg-gray-200 mx-1" />

        <button
          type="button"
          onClick={() => { setFilterScheduleType('today'); setPage(1); }}
          className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition flex items-center gap-1.5 ${
            filterScheduleType === 'today' ? 'bg-blue-600 text-white shadow' : 'text-blue-700 bg-blue-50 hover:bg-blue-100'
          }`}
        >
          <span>Today</span>
          <span className="px-1.5 py-0.5 rounded-md text-[9px] bg-blue-200/50">{kitCounts.today}</span>
        </button>

        <button
          type="button"
          onClick={() => { setFilterScheduleType('overdue'); setPage(1); }}
          className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition flex items-center gap-1.5 ${
            filterScheduleType === 'overdue' ? 'bg-rose-600 text-white shadow' : 'text-rose-700 bg-rose-50 hover:bg-rose-100'
          }`}
        >
          <span>Overdue</span>
          <span className="px-1.5 py-0.5 rounded-md text-[9px] bg-rose-200/50">{kitCounts.overdue}</span>
        </button>

        <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1">
          <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Pick:</span>
          <input
            type="date"
            value={pickedDate}
            onChange={e => { setPickedDate(e.target.value); setFilterScheduleType('picked'); setPage(1); }}
            className="bg-transparent text-xs font-bold text-gray-800 focus:outline-none cursor-pointer"
          />
          <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-gray-200 text-gray-700">{kitCounts.picked}</span>
        </div>

        <div className="h-4 w-px bg-gray-200 mx-1 hidden sm:block" />

        <div className="flex items-center gap-1 flex-wrap">
          {[
            { key: '1', label: '1st Kit', count: kitCounts.k1 },
            { key: '2', label: '2nd Kit', count: kitCounts.k2 },
            { key: '3', label: '3rd Kit', count: kitCounts.k3 },
            { key: '4', label: '4th Kit', count: kitCounts.k4 },
            { key: '5+', label: '5th+', count: kitCounts.k5plus },
          ].map(k => (
            <button
              key={k.key}
              type="button"
              onClick={() => { setFilterKitType(k.key); setPage(1); }}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition flex items-center gap-1 ${
                filterKitType === k.key ? 'bg-purple-700 text-white shadow' : 'text-purple-700 bg-purple-50 hover:bg-purple-100'
              }`}
            >
              <span>{k.label}</span>
              <span className="font-bold">{k.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Row 3: Actions & Search Controls Bar ── */}
      <div className="flex flex-col sm:flex-row flex-wrap items-center justify-between gap-3">
        <div className="relative w-full sm:flex-1 sm:max-w-[320px]">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35" />
          </svg>
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); setCompletedPage(1); }}
            placeholder="Search name, phone, order, AWB..."
            className="w-full pl-11 pr-5 py-2.5 rounded-2xl border border-gray-100 bg-white text-xs font-bold text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-emerald-400/20 transition shadow-sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setManualModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-[11px] font-black text-white shadow-md hover:-translate-y-0.5 transition-all uppercase tracking-wider active:scale-95 bg-blue-600 hover:bg-blue-700"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            + Manual Add
          </button>

          <button
            type="button"
            onClick={syncAndLoad}
            disabled={syncing || loading}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-[11px] font-black text-white shadow-md hover:-translate-y-0.5 transition-all uppercase tracking-wider active:scale-95 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
          >
            <svg className={`w-4 h-4 ${syncing || loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path d="M21 2v6h-6" /><path d="M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
            </svg>
            {syncing ? 'Syncing...' : 'Sync Live'}
          </button>

          <select
            value={department}
            onChange={e => { setDepartment(e.target.value); setPage(1); }}
            className="bg-white border border-gray-200 rounded-2xl px-3.5 py-2.5 text-xs font-black text-gray-700 uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-emerald-400 shadow-sm cursor-pointer"
          >
            <option value="">ALL DEPTS ({activeOrders.length})</option>
            <option value="male">MALE ({activeOrders.filter(o => detectDept(o) === 'male').length})</option>
            <option value="skin">SKIN ({activeOrders.filter(o => detectDept(o) === 'skin').length})</option>
            <option value="ortho">ORTHO ({activeOrders.filter(o => detectDept(o) === 'ortho').length})</option>
            <option value="migraine">MIGRAINE ({activeOrders.filter(o => detectDept(o) === 'migraine').length})</option>
            <option value="piles">PILES ({activeOrders.filter(o => detectDept(o) === 'piles').length})</option>
          </select>

          <select
            value={staffFilter}
            onChange={e => { setStaffFilter(e.target.value); setPage(1); }}
            className="bg-white border border-gray-200 rounded-2xl px-3.5 py-2.5 text-xs font-black text-gray-700 uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-emerald-400 shadow-sm cursor-pointer"
          >
            <option value="">ALL STAFF ({activeOrders.length})</option>
            {staffUsers.map(u => (
              <option key={u._id} value={u._id}>
                {u.name.toUpperCase()} ({activeOrders.filter(o => String(o.lead_id?.assignedTo?._id || o.lead_id?.assignedTo || o.created_by?._id || o.created_by) === String(u._id)).length})
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleAutoDistribute}
            disabled={distributing}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-[11px] font-black text-indigo-700 bg-indigo-50 border border-indigo-200 shadow-sm hover:bg-indigo-100 transition-all uppercase tracking-wider active:scale-95 disabled:opacity-50"
          >
            <svg className={`w-4 h-4 text-indigo-600 ${distributing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            {distributing ? 'Distributing...' : 'Auto-Distribute'}
          </button>

          <select
            value={replyFilter}
            onChange={e => { setReplyFilter(e.target.value); setPage(1); }}
            className="bg-white border border-gray-200 rounded-2xl px-3.5 py-2.5 text-xs font-black text-gray-700 uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-emerald-400 shadow-sm cursor-pointer"
          >
            <option value="all">ALL REPLIES ({activeOrders.length})</option>
            {REPLY_OPTIONS.map(opt => {
              const count = opt.value === 'any_reply'
                ? activeOrders.filter(o => !!o.interakt_reply_text && !o.interakt_reply_read).length
                : activeOrders.filter(o => o.interakt_reply_text && !o.interakt_reply_read && matchReply(o.interakt_reply_text, opt.value)).length;
              return (
                <option key={opt.value} value={opt.value}>
                  {opt.label.toUpperCase()} ({count})
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-100 rounded-2xl px-6 py-4 text-red-600 text-sm font-bold shadow-sm">{error}</div>}

      {/* ── Completed Table ── */}
      {showCompleted ? (
        <div className="premium-card overflow-hidden">
          {completedLoading ? (
            <div className="flex items-center justify-center h-64 gap-3 text-gray-400">
              <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />Loading completed follow ups...
            </div>
          ) : displayCompletedList.length === 0 ? (
            <div className="p-20 text-center">
              <div className="w-20 h-20 rounded-[2.5rem] bg-gray-100 flex items-center justify-center mx-auto mb-6 text-gray-300">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              </div>
              <p className="text-xl font-bold text-gray-400">{search ? 'No matching completed follow-ups found' : 'No completed follow-ups yet'}</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50/50">
              {displayCompletedList.map((o, i) => (
                <div key={o._id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/30 transition-colors">
                  <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${ROLE_GRADIENT[i % 5]} flex items-center justify-center text-white font-black shrink-0 shadow`}>{initials(o.billing_customer_name)}</div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-gray-800 text-sm truncate">
                        {o.billing_customer_name}
                        <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-purple-100 text-purple-700 border border-purple-200">Kit {o.kit_number || 1}</span>
                      </p>
                      <p className="text-[10px] text-gray-400 font-mono mt-0.5 truncate">{o.billing_phone} · {o.awb_code}</p>
                      {o.interakt_reply_text && !o.interakt_reply_read && (
                        <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-[9px] font-bold shadow-sm whitespace-normal leading-tight relative pr-6 max-w-full">
                          <span className="shrink-0">💬</span>
                          <span className="break-words line-clamp-2">{o.interakt_reply_text}</span>
                          <button onClick={(e) => handleMarkReplyRead(e, o._id)} className="absolute right-1 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-emerald-200 text-emerald-800 flex items-center justify-center hover:bg-emerald-300 shrink-0">
                            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-2 shrink-0 w-full sm:w-auto justify-between sm:justify-end mt-3 sm:mt-0 pt-3 sm:pt-0 border-t border-gray-50 sm:border-0">
                    <div className="flex items-center justify-between w-full sm:w-auto">
                      <div className="flex items-center gap-1">
                        {Array.from({ length: TOTAL_FU }, (_, idx) => (
                          <div key={idx} className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg text-[9px] sm:text-[10px] font-black flex items-center justify-center bg-emerald-100 text-emerald-600 border border-emerald-200">{idx + 1}</div>
                        ))}
                      </div>
                      <span className="text-sm font-black text-gray-700 sm:hidden">₹{o.sub_total}</span>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-2">
                      <span className="text-sm font-black text-gray-700 hidden sm:block mr-2">₹{o.sub_total}</span>
                      <button onClick={() => !o.sent_to_verification && handleSendToVerification(o._id)}
                        disabled={doneLoading === String(o._id) || !!o.sent_to_verification}
                        className={`flex-1 sm:flex-none px-3 py-2 sm:py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition ${o.sent_to_verification ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-orange-50 text-orange-600 hover:bg-orange-500 hover:text-white disabled:opacity-50'}`}>
                        {o.sent_to_verification ? '✓ Order Booked' : doneLoading === String(o._id) ? '...' : 'Verification'}
                      </button>
                      <button onClick={() => handleSelect(o)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-100 text-gray-700 hover:bg-emerald-600 hover:text-white transition-all shadow-sm shrink-0">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {(() => { const tp = Math.ceil(completedTotal / PER_PAGE); return tp > 1 ? (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50">
              <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Page {completedPage} of {tp}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => { const p = Math.max(1, completedPage - 1); setCompletedPage(p); loadCompleted(false, p, search); }} disabled={completedPage === 1}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-white disabled:opacity-30 transition-all">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m15 18-6-6 6-6" /></svg>
                </button>
                <button onClick={() => { const p = Math.min(tp, completedPage + 1); setCompletedPage(p); loadCompleted(false, p, search); }} disabled={completedPage === tp}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-white disabled:opacity-30 transition-all">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" /></svg>
                </button>
              </div>
            </div>
          ) : null; })()}
        </div>
      ) : (
        /* ── Active Follow-ups Table ── */
        <div className="premium-card overflow-hidden">
          {loading && all.length === 0 ? (
            <div className="flex items-center justify-center h-64 gap-3 text-gray-400">
              <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />Loading follow ups...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-14 text-center">
              <div className="w-20 h-20 rounded-[2.5rem] bg-emerald-50 flex items-center justify-center mx-auto mb-6 text-emerald-300">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <p className="text-xl font-bold text-gray-400">No {filterFollowupNum && filterFollowupNum !== 'replies' ? `${ordinal(Number(filterFollowupNum) - 1)} ` : ''}follow-ups found</p>
              <p className="text-sm text-gray-300 mt-2">{search ? 'Try a different search' : 'No pending calls found in this category'}</p>
            </div>
          ) : (
            <div className="space-y-3 p-3 bg-gray-50/50">
              {paged.map((o, i) => {
                const gradient = ROLE_GRADIENT[i % ROLE_GRADIENT.length];
                const allFUs = (o.followups || []).sort((a, b) => a.followup_number - b.followup_number);
                const completedCount = completedMap[o._id] ?? allFUs.filter(f => f.completed).length;
                const allDone = completedCount >= TOTAL_FU;
                const activeFU = getFollowup(o, filterFollowupNum) || allFUs[completedCount];
                const deptStr = detectDept(o).toUpperCase();

                return (
                  <div key={o._id} className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white rounded-2xl border border-gray-100/80 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-black text-sm shrink-0 shadow`}>
                        {initials(o.billing_customer_name)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-gray-900 text-sm truncate">{o.billing_customer_name || '—'}</span>

                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                            (o.kit_number || 1) <= 1 ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-purple-100 text-purple-700 border border-purple-200'
                          }`}>
                            KIT {o.kit_number || 1} ({(o.kit_number || 1) <= 1 ? 'NEW' : 'OLD'})
                          </span>

                          <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-cyan-100 text-cyan-800 border border-cyan-200">
                            {deptStr}
                          </span>
                        </div>

                        <p className="text-[10px] text-gray-400 font-mono mt-1">
                          {o.billing_phone} / {o.awb_code || o.order_id || '—'}
                        </p>

                        {filterFollowupNum === 'replies' && o.interakt_reply_text && !o.interakt_reply_read && (
                          <div className="inline-flex items-center gap-1 mt-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] font-bold shadow-sm">
                            <span>💬</span>
                            <span>{o.interakt_reply_text}</span>
                            <button onClick={(e) => handleMarkReplyRead(e, o._id)} className="ml-2 w-4 h-4 rounded-full bg-emerald-200 text-emerald-800 flex items-center justify-center hover:bg-emerald-300">
                              ✓
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 flex-wrap md:flex-nowrap justify-between md:justify-end pt-2 md:pt-0 border-t md:border-0 border-gray-100">
                      {/* Step circles 1 2 3 4 5 */}
                      <div className="flex items-center gap-1.5">
                        {Array.from({ length: TOTAL_FU }, (_, idx) => {
                          const callNum = idx + 1;
                          const activeStage = getActiveCallStage(o);
                          const fu = (o.followups || []).find(f => f.followup_number === callNum);
                          const isDone = fu ? fu.completed : idx < completedCount;
                          const isCurrent = activeStage === callNum;
                          return (
                            <div
                              key={idx}
                              className={`w-7 h-7 rounded-lg text-xs font-black flex items-center justify-center border transition-all ${
                                isDone
                                  ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                  : isCurrent
                                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm ring-2 ring-emerald-500/20'
                                  : 'bg-emerald-50/50 text-emerald-400 border-emerald-100'
                              }`}
                            >
                              {callNum}
                            </div>
                          );
                        })}
                      </div>

                      {/* Amount */}
                      <span className="text-base font-black text-gray-900">₹{o.sub_total || 0}</span>

                      {/* Verification / Order Booked Tag */}
                      <button
                        type="button"
                        onClick={() => !o.sent_to_verification && handleSendToVerification(o._id)}
                        disabled={doneLoading === String(o._id) || !!o.sent_to_verification}
                        className={`px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                          o.sent_to_verification
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 cursor-default'
                            : 'bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-500 hover:text-white'
                        }`}
                      >
                        {o.sent_to_verification ? '✓ ORDER BOOKED' : doneLoading === String(o._id) ? '...' : 'VERIFICATION'}
                      </button>

                      {/* Action buttons */}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); openPrescriptionModal(o); }}
                        className="px-2.5 py-2 flex items-center gap-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-200 text-[10px] font-black tracking-wider transition-all shadow-sm shrink-0"
                        title="View Doctor Prescription (Rx)"
                      >
                        <span>📋 Rx</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSelect(o)}
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-100 text-gray-700 hover:bg-emerald-600 hover:text-white transition-all shadow-sm shrink-0"
                        title="View Details"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-3xl">
              <span className="text-[10px] sm:text-[11px] font-black text-gray-400 uppercase tracking-widest">Page {page} of {totalPages}</span>
              <div className="flex items-center gap-2 sm:gap-3">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-white hover:shadow-md disabled:opacity-30 transition-all active:scale-95">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m15 18-6-6 6-6" /></svg>
                </button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-white hover:shadow-md disabled:opacity-30 transition-all active:scale-95">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" /></svg>
                </button>
              </div>
            </div>
          )}
          {/* ── Booked orders from same phone (shown inline during search) ── */}
          {!showCompleted && bookedSearchMatches.length > 0 && (
            <div className="border-t-2 border-orange-100 mt-2">
              <div className="px-4 sm:px-6 py-3 bg-orange-50 flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-orange-600">🔖 Order Booked ({bookedSearchMatches.length})</span>
                <span className="text-[10px] text-orange-400 font-bold">— Same number, sent to verification</span>
              </div>
              <div className="divide-y divide-orange-50">
                {bookedSearchMatches.map((o, i) => (
                  <div key={o._id} className="p-4 bg-orange-50/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white font-black shrink-0 shadow">{initials(o.billing_customer_name)}</div>
                      <div className="min-w-0">
                        <p className="font-bold text-gray-800 text-sm truncate">
                          {o.billing_customer_name}
                          <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-purple-100 text-purple-700 border border-purple-200">Kit {o.kit_number || (i + 1)}</span>
                          <span className="ml-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest bg-orange-100 text-orange-600 border border-orange-200">✓ Order Booked</span>
                        </p>
                        <p className="text-[10px] text-gray-400 font-mono mt-0.5">{o.billing_phone} · {o.awb_code}</p>
                        <p className="text-[10px] text-orange-500 font-bold mt-0.5">{o.order_items?.[0]?.name} · ₹{o.sub_total} · Delivered: {formatDate(o.delivered_at || o.createdAt, { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                      </div>
                    </div>
                    <button onClick={() => handleSelect(o)}
                      className="shrink-0 px-4 py-2 rounded-xl bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest shadow active:scale-95 transition-all">
                      View Details
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Detail Modal ── */}
      {selected && (() => {
        const allFUs = (selected.followups || []).sort((a, b) => a.followup_number - b.followup_number);
        const completedCount = completedMap[selected._id] ?? allFUs.filter(f => f.completed).length;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}>
            <div className="bg-white rounded-[1.5rem] sm:rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>

              {/* Modal Header */}
              <div className="px-3 sm:px-6 py-3 sm:py-5 shrink-0" style={{ background: 'linear-gradient(135deg, #064e3b, #065f46)' }}>
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-base sm:text-xl font-black shadow-lg shrink-0">
                    {initials(selected.billing_customer_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-black text-base sm:text-xl tracking-tight truncate">{selected.billing_customer_name || 'Order Detail'}</h3>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mt-0.5 sm:mt-1">
                      <p className="text-emerald-300 font-bold text-xs sm:text-sm">{selected.billing_phone}</p>
                      <span className="hidden sm:inline w-1 h-1 rounded-full bg-emerald-400/50" />
                      <p className="text-emerald-300 font-bold text-xs sm:text-sm font-mono">{selected.awb_code}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <button onClick={() => { if (editMode) { setEditMode(false); setEditFields({}); } else { setEditMode(true); setEditFields({ billing_phone: selected.billing_phone, billing_city: selected.billing_city, billing_state: selected.billing_state, billing_pincode: selected.billing_pincode, billing_address: selected.billing_address }); } }}
                      className="px-2.5 sm:px-3 py-1.5 rounded-lg sm:rounded-xl bg-white/10 text-emerald-100 hover:bg-white/20 text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all">
                      {editMode ? 'EXIT' : 'EDIT'}
                    </button>
                    <button onClick={() => setSelected(null)} className="w-8 h-8 flex items-center justify-center rounded-lg sm:rounded-xl bg-white/10 text-emerald-100 hover:bg-white/20 hover:text-white transition-all text-xl leading-none">×</button>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5 custom-scrollbar bg-gray-50/30">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  {/* Left Column */}
                  <div>
                    <SectionHead label="Order Details" />
                    <DetailRow label="Order ID" value={selected.order_id} />
                    <DetailRow label="Kit Count" value={`Kit ${selected.kit_number || 1}`} />
                    <DetailRow label="Medicine" value={selected.order_items?.[0]?.name || '—'} />
                    <DetailRow label="Courier" value={selected.courier_name} />
                    <DetailRow label="Payment" value={selected.payment_method} />
                    <DetailRow label="Amount" value={selected.sub_total != null ? `₹${selected.sub_total}` : (selected.amount != null ? `₹${selected.amount}` : '—')} />
                    <DetailRow label="Delivered" value={formatDate(selected.delivered_at || selected.createdAt, { day: '2-digit', month: 'short', year: 'numeric' })} />
                    {editMode ? (
                      <div className="flex items-start gap-3 py-2 border-b border-gray-50">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 w-28 shrink-0 mt-2">Phone</span>
                        <input className={inputCls} value={editFields.billing_phone || ''} onChange={e => setEditFields(p => ({ ...p, billing_phone: e.target.value }))} placeholder="Phone" />
                      </div>
                    ) : <DetailRow label="Phone" value={selected.billing_phone} />}

                    <SectionHead label="Address" />
                    {editMode ? (
                      <div className="space-y-2">
                        {[['City', 'billing_city'], ['State', 'billing_state'], ['Pincode', 'billing_pincode']].map(([lbl, key]) => (
                          <div key={key} className="flex items-center gap-3 py-1">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 w-28 shrink-0">{lbl}</span>
                            <input className={inputCls} value={editFields[key] || ''} onChange={e => setEditFields(p => ({ ...p, [key]: e.target.value }))} />
                          </div>
                        ))}
                        <div className="flex items-start gap-3 py-1">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 w-28 shrink-0 mt-2">Address</span>
                          <textarea className={inputCls + ' resize-none'} rows={3} value={editFields.billing_address || ''} onChange={e => setEditFields(p => ({ ...p, billing_address: e.target.value }))} />
                        </div>
                        <button onClick={saveContact} disabled={editSaving}
                          className="w-full py-2 rounded-xl text-[11px] font-black text-white tracking-widest disabled:opacity-50 transition-all active:scale-95"
                          style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                          {editSaving ? 'SAVING...' : 'SAVE CHANGES'}
                        </button>
                      </div>
                    ) : (
                      <>
                        <DetailRow label="City" value={selected.billing_city} />
                        <DetailRow label="State" value={selected.billing_state} />
                        <DetailRow label="Pincode" value={selected.billing_pincode} />
                        <DetailRow label="Address" value={selected.billing_address} />
                      </>
                    )}
                  </div>

                  {/* Right Column */}
                  <div>
                    <SectionHead label="Medicines" />
                    <div className="space-y-2 mt-2">
                      {(selected.order_items || []).map((p, i) => (
                        <div key={i} className="flex justify-between items-center p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                          <span className="text-sm text-gray-700 font-bold truncate pr-2">{p.name}</span>
                          <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 shrink-0">×{p.units || 1}</span>
                        </div>
                      ))}
                    </div>

                    <SectionHead label="Problem & Remarks" />
                    <div className="space-y-2 mt-2">
                      <div className="p-3 bg-red-50/50 rounded-xl border border-red-100 shadow-sm">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-red-400 block mb-1">Reported Problem</span>
                        <span className="text-sm text-gray-800 font-medium whitespace-pre-wrap">
                          {(() => {
                            const raw = selected.verification_problem || selected.problem || selected.lead_id?.problem || '';
                            if (raw.startsWith('Add-on Medicine:')) {
                              return selected.lead_id?.problem || selected.problem || 'No problem recorded';
                            }
                            return raw || 'No problem recorded';
                          })()}
                        </span>
                      </div>
                      <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 shadow-sm">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400 block mb-1">Order Remarks</span>
                        <span className="text-sm text-gray-800 font-medium whitespace-pre-wrap">{selected.verification_notes || selected.notes || selected.lead_id?.note || 'No remarks added'}</span>
                      </div>
                    </div>

                    <SectionHead label="Feedback Notes" />
                    <div className="mt-2 space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                      {(selected.comments || []).filter(c => c.type === 'followup').map((c, i) => (
                        <div key={i} className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                          <p className="text-xs text-gray-700 font-medium">{c.text}</p>
                          <p className="text-[9px] text-gray-400 font-bold mt-1 uppercase tracking-wider">{formatDate(c.createdAt, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      ))}
                      {!(selected.comments?.some(c => c.type === 'followup')) && (
                        <p className="text-xs text-gray-400 italic py-2 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">No notes yet</p>
                      )}
                    </div>
                    <div className="mt-3 relative">
                      <textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Type a new note..." rows={2}
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none transition shadow-sm" />
                      <button onClick={saveNote} disabled={noteSaving || !noteText.trim()}
                        className="absolute bottom-3 right-3 px-4 py-1.5 rounded-lg text-[10px] font-black text-white shadow-md transition-all active:scale-95 disabled:opacity-50 tracking-widest"
                        style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                        {noteSaving ? 'SAVING...' : 'ADD NOTE'}
                      </button>
                    </div>
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {/* Button 1: Book Doctor Appointment */}
                      <button
                        onClick={openBookAppointment}
                        className="group relative overflow-hidden py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-xs tracking-wider shadow-md hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center text-white shrink-0 group-hover:bg-white/30 transition-colors">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-wider truncate">Book Appointment</span>
                        </div>
                        <svg className="w-3.5 h-3.5 text-blue-200 group-hover:translate-x-0.5 transition-transform shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                        </svg>
                      </button>

                      {/* Button 2: View Prescription (Rx) */}
                      <button
                        onClick={() => openPrescriptionModal(selected)}
                        className="group relative overflow-hidden py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-xs tracking-wider shadow-md hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center text-white shrink-0 group-hover:bg-white/30 transition-colors">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-wider truncate">View Prescription (Rx)</span>
                        </div>
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-white/20 text-white shrink-0">
                          Rx
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Follow-up Timeline */}
                <div className="mt-8">
                  <SectionHead label="Follow-up Timeline" />
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-3">
                    {allFUs.map((fu, i) => {
                      const isCurrent = !fu.completed && (i === 0 || allFUs[i - 1]?.completed);
                      return (
                        <div key={i} className={`flex flex-col p-4 rounded-2xl border transition-all ${fu.completed ? 'bg-gray-50 border-gray-100 opacity-70' : isCurrent ? 'bg-emerald-50 border-emerald-200 shadow-sm ring-2 ring-emerald-500/10' : 'bg-white border-gray-100'}`}>
                          <div className="flex items-center justify-between mb-3">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black ${fu.completed ? 'bg-gray-200 text-gray-500' : isCurrent ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg' : 'bg-gray-100 text-gray-400'}`}>
                              {fu.followup_number}
                            </div>
                            {fu.completed && <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-[10px] font-bold">✓</span>}
                          </div>
                          <p className={`text-[11px] font-black uppercase tracking-widest ${fu.completed ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{ordinal(i)} Call</p>
                          <p className="text-[10px] font-bold text-gray-400 mt-0.5">{formatDate(fu.scheduled_date, { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                          <p className="text-[10px] font-bold text-gray-500 mt-2 capitalize">{fu.status || (fu.completed ? 'completed' : 'scheduled')}</p>
                          {(fu.notes || fu.note) && <p className="text-[10px] text-gray-500 mt-2 line-clamp-2">{fu.notes || fu.note}</p>}
                          {isCurrent && (
                            <button onClick={() => handleFollowUpDone(selected._id)} disabled={doneLoading === String(selected._id)}
                              className="mt-3 w-full py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-[10px] font-black rounded-xl shadow-md hover:shadow-lg active:scale-95 transition-all disabled:opacity-50 tracking-widest">
                              {doneLoading === String(selected._id) ? 'WAIT...' : 'MARK DONE'}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Activity */}
                <div className="mt-8">
                  <SectionHead label="Order Activity" />
                  <div className="mt-3 space-y-2">
                    {activityLoading ? (
                      <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 text-xs font-bold text-gray-400">Loading activity...</div>
                    ) : activity.filter(item => item.title !== 'Note Added' && item.title !== 'NOTE ADDED').length === 0 ? (
                      <div className="bg-white rounded-xl border border-dashed border-gray-200 px-4 py-3 text-xs font-bold text-gray-400">No activity recorded yet</div>
                    ) : activity.filter(item => item.title !== 'Note Added' && item.title !== 'NOTE ADDED').map(item => (
                      <div key={item._id} className="bg-white rounded-xl border border-gray-100 px-4 py-3 shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                          <p className="text-xs font-black text-gray-800 uppercase tracking-wider">{item.title}</p>
                          <span className="text-[10px] font-bold text-gray-400">{formatDate(item.createdAt, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        {item.description && <p className="text-xs text-gray-500 mt-1">{item.description}</p>}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Send to Verification & Add-on Order Section */}
                <div className="mt-6 space-y-3">
                  {/* Add-on Order Popup Trigger Card */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50/80 border border-orange-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-white flex items-center justify-center font-bold text-sm shadow-md shrink-0">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path d="M12 5v14m-7-7h14"/></svg>
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-orange-950 uppercase tracking-wider">Add-on / Re-Order Verification</h4>
                        <p className="text-[10px] font-bold text-orange-600">Open popup to enter custom Add-on medicine, price & remarks</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => openAddonModal(selected)}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 text-white hover:from-orange-600 hover:to-amber-700 text-xs font-black uppercase tracking-widest transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5 shrink-0">
                      OPEN ADD-ON POPUP
                    </button>
                  </div>

                  {/* Standard Re-Verification Button */}
                  <button onClick={() => !selected.sent_to_verification && handleSendToVerification(selected._id)}
                    disabled={doneLoading === String(selected._id) || !!selected.sent_to_verification}
                    className={`w-full py-3 text-xs font-black rounded-xl transition-all uppercase tracking-widest flex items-center justify-center gap-2 ${selected.sent_to_verification ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none' : 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg hover:shadow-xl active:scale-[0.98]'}`}>
                    {doneLoading === String(selected._id) ? (
                      <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> SENDING...</>
                    ) : selected.sent_to_verification ? (
                      <><svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> ORDER BOOKED</>
                    ) : (
                      <><svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> QUICK SEND TO VERIFICATION</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Manual Add Modal ── */}
      {manualModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-blue-50">
              <h3 className="text-lg font-black text-blue-900 tracking-tight flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                Manually Add Followup
              </h3>
              <button onClick={() => setManualModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-100/50 text-blue-600 hover:bg-blue-200 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <form id="smx-manual-form" onSubmit={handleManualSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Customer Name *</label>
                    <input required className={inputCls} value={manualForm.name} onChange={e => setManualForm(p => ({ ...p, name: e.target.value }))} placeholder="Full name" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 flex items-center gap-2">
                      Phone * {autofilling && <div className="w-3 h-3 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />}
                    </label>
                    <input required className={inputCls} value={manualForm.phone} onChange={e => setManualForm(p => ({ ...p, phone: e.target.value }))} placeholder="10-digit phone" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">City</label>
                    <input className={inputCls} value={manualForm.city} onChange={e => setManualForm(p => ({ ...p, city: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">State</label>
                    <input className={inputCls} value={manualForm.state} onChange={e => setManualForm(p => ({ ...p, state: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Medicine / Product *</label>
                    <input required className={inputCls} value={manualForm.medicine} onChange={e => setManualForm(p => ({ ...p, medicine: e.target.value }))} placeholder="e.g. Male Wellness Kit" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Delivered Date *</label>
                    <input required type="date" className={inputCls} value={manualForm.delivered_date} onChange={e => setManualForm(p => ({ ...p, delivered_date: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Amount (₹)</label>
                    <input type="number" className={inputCls} value={manualForm.amount} onChange={e => setManualForm(p => ({ ...p, amount: e.target.value }))} placeholder="e.g. 2000" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Order ID</label>
                    <input className={inputCls} value={manualForm.order_id} onChange={e => setManualForm(p => ({ ...p, order_id: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Courier</label>
                    <input className={inputCls} value={manualForm.courier_name} onChange={e => setManualForm(p => ({ ...p, courier_name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Payment Method</label>
                    <input className={inputCls} value={manualForm.payment_method} onChange={e => setManualForm(p => ({ ...p, payment_method: e.target.value }))} placeholder="cod / prepaid" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Pincode</label>
                    <input className={inputCls} value={manualForm.pincode} onChange={e => setManualForm(p => ({ ...p, pincode: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Address</label>
                  <textarea className={inputCls} rows={2} value={manualForm.address} onChange={e => setManualForm(p => ({ ...p, address: e.target.value }))} />
                </div>
              </form>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex gap-3">
              <button type="button" onClick={() => setManualModalOpen(false)} className="flex-1 py-3.5 rounded-xl text-sm font-bold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-colors">Cancel</button>
              <button type="submit" form="smx-manual-form" disabled={manualSaving} className="flex-1 py-3.5 rounded-xl text-sm font-bold text-white shadow-md transition-all active:scale-95 disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}>
                {manualSaving ? 'Saving...' : 'Add Followup'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Book Appointment Modal ── */}
      {apptModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-emerald-50">
              <h3 className="text-lg font-black text-emerald-900 tracking-tight flex items-center gap-2">
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" /></svg>
                Book Doctor Appointment
              </h3>
              <button onClick={() => setApptModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-emerald-100/50 text-emerald-600 hover:bg-emerald-200 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {apptError && (
                <div className="bg-red-50 text-red-600 text-xs p-3 rounded-xl font-bold border border-red-100 mb-4">{apptError}</div>
              )}
              <form id="smx-appt-form" onSubmit={handleApptSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Patient Name *</label>
                    <input required className={inputCls} value={apptForm.patientName} onChange={e => setApptForm(p => ({ ...p, patientName: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Phone *</label>
                    <input required className={inputCls} value={apptForm.phone} onChange={e => setApptForm(p => ({ ...p, phone: e.target.value }))} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Department *</label>
                    <select required className={inputCls} value={apptForm.department} onChange={e => setApptForm(p => ({ ...p, department: e.target.value, doctorName: '' }))}>
                      <option value="">Select Department</option>
                      {(user?.role === 'admin' || user?.role === 'manager' || !user?.departments?.length ? ['male', 'ortho', 'skin'] : user.departments).map(d => (
                        <option key={d} value={d}>{d.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Doctor Name *</label>
                    <select required className={inputCls} value={apptForm.doctorName} onChange={e => setApptForm(p => ({ ...p, doctorName: e.target.value }))}>
                      <option value="">Select Doctor</option>
                      {apptDoctors.filter(d => !apptForm.department || !d.departments?.length || d.departments.includes(apptForm.department)).map(d => (
                        <option key={d._id} value={d.name}>
                          {d.name}{d.specialization ? ` — ${d.specialization}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Appointment Date *</label>
                  <input type="date" required className={inputCls} value={apptForm.appointmentDate} onChange={e => setApptForm(p => ({ ...p, appointmentDate: e.target.value }))} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Appointment Type</label>
                    <select className={inputCls} value={apptForm.type} onChange={e => setApptForm(p => ({ ...p, type: e.target.value }))}>
                      {['consultation', 'follow_up', 'panchakarma', 'ayurveda', 'other'].map(t => (
                        <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Patient Type</label>
                    <select className={inputCls} value={apptForm.patientType} onChange={e => setApptForm(p => ({ ...p, patientType: e.target.value }))}>
                      <option value="new">New Patient</option>
                      <option value="old">Old Patient</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Problem / Complaint</label>
                  <textarea className={inputCls} rows={2} value={apptForm.problem} onChange={e => setApptForm(p => ({ ...p, problem: e.target.value }))} />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Notes</label>
                  <textarea className={inputCls} rows={2} value={apptForm.notes} onChange={e => setApptForm(p => ({ ...p, notes: e.target.value }))} />
                </div>
              </form>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex gap-3">
              <button type="button" onClick={() => setApptModalOpen(false)} className="flex-1 py-3.5 rounded-xl text-sm font-bold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-colors">Cancel</button>
              <button type="submit" form="smx-appt-form" disabled={apptLoading} className="flex-1 py-3.5 rounded-xl text-sm font-bold text-white shadow-md transition-all active:scale-95 disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                {apptLoading ? 'Booking...' : 'Book Appointment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add-on Re-Order Verification Popup Modal ── */}
      {addonModalOpen && addonForm.targetOrder && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-white rounded-[2rem] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-fadeIn">
            <div className="px-6 py-5 border-b border-orange-100 flex items-center justify-between bg-gradient-to-r from-orange-500 to-amber-600 text-white">
              <div>
                <h3 className="text-lg font-black tracking-tight flex items-center gap-2">
                  <span>➕</span> Add-on Re-Order Verification
                </h3>
                <p className="text-xs text-orange-100 font-bold mt-0.5">
                  {addonForm.targetOrder.billing_customer_name} · {addonForm.targetOrder.billing_phone}
                </p>
              </div>
              <button onClick={() => setAddonModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <form id="smx-addon-modal-form" onSubmit={handleAddonSubmit} className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-orange-900 mb-1 block">Add-on Product / Medicine *</label>
                  <input required className={inputCls} value={addonForm.medicine} onChange={e => setAddonForm(p => ({ ...p, medicine: e.target.value }))} placeholder="e.g. Male Wellness / Extra Syrup" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-orange-900 mb-1 block">Price / Amount (₹) *</label>
                  <input required type="number" className={inputCls} value={addonForm.price} onChange={e => setAddonForm(p => ({ ...p, price: e.target.value }))} placeholder="e.g. 700" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-orange-900 mb-1 block">Add-on Remarks / Problem Notes</label>
                  <textarea className={inputCls + ' resize-none'} rows={3} value={addonForm.notes} onChange={e => setAddonForm(p => ({ ...p, notes: e.target.value }))} placeholder="Enter specific add-on order notes or patient complaint..." />
                </div>
              </form>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex gap-3">
              <button type="button" onClick={() => setAddonModalOpen(false)} className="flex-1 py-3.5 rounded-xl text-sm font-bold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-colors">Cancel</button>
              <button type="submit" form="smx-addon-modal-form" disabled={addonSaving} className="flex-1 py-3.5 rounded-xl text-sm font-bold text-white shadow-md transition-all active:scale-95 disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}>
                {addonSaving ? 'Saving & Sending...' : '🚀 Save & Send to Verification'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── Prescription Modal ── */}
      <PrescriptionModal
        isOpen={rxModalOpen}
        onClose={() => setRxModalOpen(false)}
        patientData={selectedRxOrder}
      />
    </div>
  );
}
