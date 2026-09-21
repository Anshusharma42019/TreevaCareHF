import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAppointments, updateAppointment } from '../services/appointment.service';
import { fetchStats } from '../services/dashboard.service';
import { getVerificationRecords } from '../services/task.service';
import { getLeads } from '../services/lead.service';
import * as smxSvc from '../services/shipmaxx.service';
import API from '../api';
import * as attendanceSvc from '../services/attendance.service';
import { useToast } from '../context/ToastContext';
import PrescriptionModal from '../components/PrescriptionModal';
import Modal from '../components/ui/Modal';

const extractArray = (input) => {
  if (!input) return [];
  if (Array.isArray(input)) return input;
  if (Array.isArray(input.data)) return input.data;
  if (Array.isArray(input.records)) return input.records;
  if (Array.isArray(input.data?.data)) return input.data.data;
  if (Array.isArray(input.data?.records)) return input.data.records;
  if (Array.isArray(input.appointments)) return input.appointments;
  if (Array.isArray(input.leads)) return input.leads;
  if (Array.isArray(input.orders)) return input.orders;
  if (Array.isArray(input.data?.leads)) return input.data.leads;
  if (Array.isArray(input.data?.orders)) return input.data.orders;
  return [];
};

export default function DoctorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { success, error } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState([]);
  const [verifications, setVerifications] = useState([]);
  const [leads, setLeads] = useState([]);
  const [rtsRecords, setRtsRecords] = useState([]);
  const [shipmaxxOrders, setShipmaxxOrders] = useState([]);
  const [statsData, setStatsData] = useState(null);
  const [attStatus, setAttStatus] = useState(null);

  // Prescription Modal State
  const [prescriptionOpen, setPrescriptionOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);

  // View Appointment Details Modal State
  const [viewApptModalOpen, setViewApptModalOpen] = useState(false);
  const [selectedApptDetail, setSelectedApptDetail] = useState(null);
  const [updatingStatusId, setUpdatingStatusId] = useState(null);
  const [apptTab, setApptTab] = useState('active'); // 'active' | 'completed' | 'all'
  const [dispatchTab, setDispatchTab] = useState('active'); // 'active' | 'completed' | 'all'
  const [completedDispatchIds, setCompletedDispatchIds] = useState(() => {
    try {
      const saved = localStorage.getItem('doctor_completed_dispatches');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const userDepts = user?.departments?.length ? user.departments : (user?.department ? [user.department] : []);
  const defaultDept = userDepts.length === 1 ? userDepts[0].toLowerCase() : 'all';
  const [selectedDept, setSelectedDept] = useState(defaultDept);

  const todayStr = new Date().toISOString().split('T')[0];
  const formattedTodayDate = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'short', year: 'numeric'
  });

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const [apptsRes, statsRes, verifRes, leadsRes, rtsRes, smxRes, attRes] = await Promise.allSettled([
        getAppointments({ limit: 300 }),
        fetchStats(todayStr),
        getVerificationRecords({ limit: 100 }),
        getLeads({ limit: 100 }),
        API.get('/ready-to-shipment'),
        smxSvc.getOrders({ limit: 100 }),
        attendanceSvc.getTodayStatus(),
      ]);

      if (apptsRes.status === 'fulfilled') {
        setAppointments(extractArray(apptsRes.value));
      } else {
        setAppointments([]);
      }

      if (statsRes.status === 'fulfilled') {
        setStatsData(statsRes.value || null);
      }

      if (verifRes.status === 'fulfilled') {
        setVerifications(extractArray(verifRes.value));
      } else {
        setVerifications([]);
      }

      if (leadsRes.status === 'fulfilled') {
        setLeads(extractArray(leadsRes.value));
      } else {
        setLeads([]);
      }

      if (rtsRes.status === 'fulfilled') {
        setRtsRecords(extractArray(rtsRes.value?.data));
      } else {
        setRtsRecords([]);
      }

      if (smxRes.status === 'fulfilled') {
        setShipmaxxOrders(extractArray(smxRes.value?.data));
      } else {
        setShipmaxxOrders([]);
      }

      if (attRes.status === 'fulfilled') {
        setAttStatus(attRes.value);
      }
    } catch (e) {
      console.error('Failed loading doctor dashboard data', e);
      setAppointments([]);
      setVerifications([]);
      setLeads([]);
      setRtsRecords([]);
      setShipmaxxOrders([]);
    } finally {
      setLoading(false);
    }
  }, [todayStr]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleCompleteAppointment = async (apptId, e) => {
    if (e) e.stopPropagation();
    setUpdatingStatusId(apptId);
    try {
      await updateAppointment(apptId, { status: 'completed' });
      success('Appointment marked as completed!');
      loadDashboardData();
    } catch (err) {
      error(err?.response?.data?.message || 'Failed to complete appointment');
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleCompleteDispatch = async (dispatchItem, e) => {
    if (e) e.stopPropagation();
    const idStr = String(dispatchItem.id || dispatchItem._id);
    const updated = [...new Set([...completedDispatchIds, idStr])];
    setCompletedDispatchIds(updated);
    try {
      localStorage.setItem('doctor_completed_dispatches', JSON.stringify(updated));
      if (dispatchItem.type === 'shipmaxx') {
        await smxSvc.completeFollowUp(dispatchItem.id, { notes: 'Marked completed from Doctor Dashboard' }).catch(() => {});
      }
    } catch (err) {
      console.error(err);
    }
    success(`Dispatch for ${dispatchItem.name || 'patient'} marked as done!`);
  };

  /* ── Dynamic Calculations from Database (with Safety Array Checks) ─────── */
  const safeAppointments = extractArray(appointments);
  const safeVerifications = extractArray(verifications);
  const safeLeads = extractArray(leads);
  const safeRts = extractArray(rtsRecords);
  const safeSmx = extractArray(shipmaxxOrders);

  // 1. Today's appointments from appointments API & RTS/ShipMaxx
  const todayAppts = safeAppointments.filter((a) => {
    const aDate = a.appointmentDate || a.date || a.createdAt;
    return aDate && aDate.toString().slice(0, 10) === todayStr;
  });

  const todayRts = safeRts.filter((r) => {
    const rDate = r.createdAt || r.updatedAt;
    return rDate && rDate.toString().slice(0, 10) === todayStr;
  });

  const todaySmx = safeSmx.filter((o) => {
    const oDate = o.createdAt || o.updatedAt;
    return oDate && oDate.toString().slice(0, 10) === todayStr;
  });

  const matchesDept = (item, targetDept) => {
    if (!targetDept || targetDept === 'all') return true;
    const itemDept = (item.department || item.dept || item.problem || item.purpose || item.disease || item.condition || '').toLowerCase();
    if (targetDept === 'male') {
      return itemDept.includes('male') || itemDept.includes('sperm') || itemDept.includes('erect') || itemDept.includes('ed');
    }
    if (targetDept === 'ortho') {
      return itemDept.includes('ortho') || itemDept.includes('joint') || itemDept.includes('spine') || itemDept.includes('pain') || itemDept.includes('knee');
    }
    if (targetDept === 'skin') {
      return itemDept.includes('skin') || itemDept.includes('acne') || itemDept.includes('derma') || itemDept.includes('eczema');
    }
    return itemDept.includes(targetDept);
  };

  // Display only real booked appointments in Current Appointments & Patients table
  const displayAppointments = safeAppointments.map((a) => ({
    _id: a._id || a.id,
    patientName: a.patientName || a.name || a.leadName || 'Appointment Patient',
    phone: a.phone || a.mobile || a.leadPhone || '',
    doctorName: a.doctorName || a.doctor || `Dr. ${user?.name?.split(' ')[0] || 'Anshu'}`,
    problem: a.problem || a.purpose || a.disease || 'Consultation',
    status: a.status || 'Confirmed',
    amount: a.amount || 0,
    department: a.department,
    type: 'appointment',
    createdAt: a.appointmentDate || a.date || a.createdAt,
    time: a.timeSlot || a.time || (a.appointmentDate ? new Date(a.appointmentDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'),
    raw: a,
  }));

  // Sort by appointment date / creation date descending
  displayAppointments.sort((a, b) => new Date(b.createdAt || Date.now()) - new Date(a.createdAt || Date.now()));

  const deptFilteredAppointments = displayAppointments.filter((a) => matchesDept(a, selectedDept));
  const activeAppointments = deptFilteredAppointments.filter((a) => a.status !== 'completed');
  const completedAppointments = deptFilteredAppointments.filter((a) => a.status === 'completed');

  const filteredAppointments =
    apptTab === 'active' ? activeAppointments :
    apptTab === 'completed' ? completedAppointments :
    deptFilteredAppointments;

  // 2. Dynamic Dispatches & Follow-ups from Ready to Ship & ShipMaxx Orders
  const dispatchRecordsPool = (todayRts.length > 0 || todaySmx.length > 0)
    ? [...todayRts, ...todaySmx]
    : [...safeRts.slice(0, 10), ...safeSmx.slice(0, 10)];

  const combinedDispatchList = [
    ...dispatchRecordsPool.map((item) => {
      const vDate = new Date(item.createdAt || Date.now());
      const isSmx = item.sub_total !== undefined || item.order_id !== undefined;
      return {
        id: item.order_id || item._id,
        dateDay: String(vDate.getDate()).padStart(2, '0'),
        dateMonth: vDate.toLocaleString('en-US', { month: 'short' }).toUpperCase(),
        name: item.billing_customer_name || item.lead?.name || item.name || item.title || 'Patient',
        mobile: item.billing_phone || item.lead?.phone || item.mobile || item.phone || '',
        condition: item.problem || item.medicine || item.description || item.department || 'Dispatched Order',
        status: item.status || (isSmx ? 'Dispatched' : 'Ready to Ship'),
        department: item.department || item.lead?.department,
        type: isSmx ? 'shipmaxx' : 'rts',
        amount: item.sub_total || item.price || 0,
        raw: item,
        createdAt: item.createdAt,
      };
    }),
  ];

  // Sort by creation date descending
  combinedDispatchList.sort((a, b) => new Date(b.createdAt || Date.now()) - new Date(a.createdAt || Date.now()));

  const deptFilteredDispatches = combinedDispatchList.filter((d) => matchesDept(d, selectedDept));
  const activeDispatches = deptFilteredDispatches.filter((d) => !completedDispatchIds.includes(String(d.id)) && d.status !== 'completed' && d.status !== 'delivered');
  const completedDispatches = deptFilteredDispatches.filter((d) => completedDispatchIds.includes(String(d.id)) || d.status === 'completed' || d.status === 'delivered');

  const filteredDispatches =
    dispatchTab === 'active' ? activeDispatches :
    dispatchTab === 'completed' ? completedDispatches :
    deptFilteredDispatches;

  const upcomingFollowups = filteredDispatches.slice(0, 20);

  // 3. Overall Dynamic Summary Stats (Filtered by Department & excluding historical verifications)
  const deptLeads = safeLeads.filter((l) => matchesDept(l, selectedDept));
  const totalPatientsCount = Math.max(deptLeads.length, deptFilteredDispatches.length, deptFilteredAppointments.length, statsData?.totalLeads || 0);
  
  const deptTodayAppts = todayAppts.filter((a) => matchesDept(a, selectedDept));
  const todayApptsCount = deptTodayAppts.length;
  
  const totalPrescriptionsCount = deptFilteredDispatches.length + deptFilteredAppointments.length;
  
  const rtsRev = safeRts.filter((r) => matchesDept(r, selectedDept)).reduce((sum, r) => sum + (Number(r.price) || 0), 0);
  const smxRev = safeSmx.filter((o) => matchesDept(o, selectedDept)).reduce((sum, o) => sum + (Number(o.sub_total) || 0), 0);
  const apptRev = safeAppointments.filter((a) => matchesDept(a, selectedDept)).reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
  const totalRevenueNum = rtsRev + smxRev + apptRev;
  const formattedRevenue = `₹${totalRevenueNum.toLocaleString('en-IN')}`;

  // 4. Dynamic Department Breakdown for Case Distribution
  const deptCounts = { male: 0, ortho: 0, skin: 0, other: 0 };
  const allRecords = [...safeLeads, ...safeAppointments, ...safeVerifications, ...safeRts, ...safeSmx];
  allRecords.forEach((r) => {
    const dept = (r.department || r.dept || r.problem || r.medicine || r.title || '').toLowerCase();
    if (dept.includes('male') || dept.includes('sperm') || dept.includes('erect') || dept.includes('ed')) deptCounts.male++;
    else if (dept.includes('ortho') || dept.includes('joint') || dept.includes('spine') || dept.includes('pain') || dept.includes('knee')) deptCounts.ortho++;
    else if (dept.includes('skin') || dept.includes('acne') || dept.includes('derma') || dept.includes('eczema')) deptCounts.skin++;
    else deptCounts.other++;
  });
  const totalDepts = (deptCounts.male + deptCounts.ortho + deptCounts.skin + deptCounts.other);
  const malePct = totalDepts > 0 ? Math.round((deptCounts.male / totalDepts) * 100) : 0;
  const orthoPct = totalDepts > 0 ? Math.round((deptCounts.ortho / totalDepts) * 100) : 0;
  const skinPct = totalDepts > 0 ? Math.round((deptCounts.skin / totalDepts) * 100) : 0;
  const otherPct = totalDepts > 0 ? (100 - (malePct + orthoPct + skinPct)) : 0;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="w-10 h-10 border-[3px] border-emerald-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-semibold text-gray-500">Loading Real Dynamic Medical Records...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 animate-slide-up">
      {/* ── Greeting Banner ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Good Morning, {user?.name?.toLowerCase().includes('dr') ? user?.name : `Dr. ${user?.name || 'Anshu'}`}!
          </h1>
          <p className="text-sm font-medium text-gray-500 mt-1">
            Real-time live medical overview & prescription dispatch hub.
          </p>
        </div>
        <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
          {['admin', 'manager', 'doctor'].includes(user?.role) && (
            <button
              type="button"
              onClick={() => {
                setSelectedPatient(null);
                setPrescriptionOpen(true);
              }}
              className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-sky-600/20 flex items-center gap-2"
            >
              <span className="text-sm font-extrabold">Rx</span>
              <span>+ Create Prescription</span>
            </button>
          )}
          <div className="text-left md:text-right">
            <p className="text-sm font-bold text-gray-800 tracking-wide">{formattedTodayDate}</p>
            <p className="text-xs font-semibold text-emerald-600 mt-0.5 flex items-center md:justify-end gap-1">
              <span>Stay Healthy, Keep Healing</span>
              <span>🍃</span>
            </p>
          </div>
        </div>
      </div>

      {/* ── Department Filter Tabs (Male | Skin | Ortho) ─────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-2 bg-white/80 backdrop-blur-md rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-extrabold text-gray-500 uppercase tracking-wider px-2">
            Filter Department:
          </span>
          {[
            { id: 'all', label: '🌐 All Departments' },
            { id: 'male', label: '👨‍⚕️ Male Health' },
            { id: 'skin', label: '✨ Skin Care' },
            { id: 'ortho', label: '🦴 Ortho Care' },
          ].map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setSelectedDept(d.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                selectedDept === d.id
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20 font-black'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-200/60'
              }`}
            >
              <span>{d.label}</span>
            </button>
          ))}
        </div>
        {selectedDept !== 'all' && (
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200">
            Filtered: {selectedDept.toUpperCase()} Department
          </span>
        )}
      </div>

      {/* ── 4 Top Stat Summary Cards (Dynamic Database Totals) ────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Patients */}
        <div className="bg-white/80 backdrop-blur-md rounded-2xl p-5 shadow-sm hover:shadow-md transition-all border border-white/80">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100/70 border border-emerald-200/60 flex items-center justify-center text-emerald-600 shrink-0 shadow-inner">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500">Total Live Patients</p>
              <p className="text-2xl font-black text-gray-900 tracking-tight mt-0.5">{totalPatientsCount.toLocaleString('en-IN')}</p>
              <p className="text-[11px] font-bold text-emerald-600 flex items-center gap-0.5 mt-1">
                <span>Active CRM Leads</span>
              </p>
            </div>
          </div>
        </div>

        {/* Today's Appointments */}
        <div className="bg-white/80 backdrop-blur-md rounded-2xl p-5 shadow-sm hover:shadow-md transition-all border border-white/80">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100/70 border border-emerald-200/60 flex items-center justify-center text-emerald-600 shrink-0 shadow-inner">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
                <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"/>
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500">Today's Appointments</p>
              <p className="text-2xl font-black text-gray-900 tracking-tight mt-0.5">{todayApptsCount}</p>
              <p className="text-[11px] font-bold text-emerald-600 flex items-center gap-0.5 mt-1">
                <span>Scheduled for today</span>
              </p>
            </div>
          </div>
        </div>

        {/* Prescriptions Issued */}
        <div className="bg-white/80 backdrop-blur-md rounded-2xl p-5 shadow-sm hover:shadow-md transition-all border border-white/80">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100/70 border border-emerald-200/60 flex items-center justify-center text-emerald-600 shrink-0 shadow-inner">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5A3.375 3.375 0 0010.125 2.25H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/>
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500">Prescriptions & Orders</p>
              <p className="text-2xl font-black text-gray-900 tracking-tight mt-0.5">{totalPrescriptionsCount.toLocaleString('en-IN')}</p>
              <p className="text-[11px] font-bold text-emerald-600 flex items-center gap-0.5 mt-1">
                <span>Dispatched</span>
              </p>
            </div>
          </div>
        </div>

        {/* Total Revenue */}
        <div className="bg-white/80 backdrop-blur-md rounded-2xl p-5 shadow-sm hover:shadow-md transition-all border border-white/80">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100/70 border border-emerald-200/60 flex items-center justify-center text-emerald-600 shrink-0 shadow-inner">
              <span className="text-xl font-black text-emerald-700">₹</span>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500">Verified Revenue</p>
              <p className="text-2xl font-black text-gray-900 tracking-tight mt-0.5">{formattedRevenue}</p>
              <p className="text-[11px] font-bold text-emerald-600 flex items-center gap-0.5 mt-1">
                <span>Calculated Total</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Middle Row: Today's Appointments & Upcoming Follow-ups ────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (66%): Dynamic Appointments Table */}
        <div className="lg:col-span-2 bg-white/80 backdrop-blur-md rounded-2xl p-5 shadow-sm border border-white/80 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 gap-3">
              <div>
                <h3 className="font-extrabold text-gray-900 text-base tracking-tight flex items-center gap-2">
                  <span>Appointments & Patients</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold">
                    {filteredAppointments.length}
                  </span>
                </h3>
              </div>

              <div className="flex items-center gap-2">
                {/* Active vs Done Section Segmented Control */}
                <div className="flex items-center p-1 bg-gray-100/90 rounded-xl text-xs font-bold border border-gray-200/80">
                  <button
                    type="button"
                    onClick={() => setApptTab('active')}
                    className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                      apptTab === 'active'
                        ? 'bg-white text-emerald-700 shadow-sm font-black'
                        : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    <span>Active</span>
                    <span className={`px-1.5 py-0.2 text-[10px] rounded-md ${apptTab === 'active' ? 'bg-emerald-100 text-emerald-800 font-extrabold' : 'bg-gray-200 text-gray-600'}`}>
                      {activeAppointments.length}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setApptTab('completed')}
                    className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                      apptTab === 'completed'
                        ? 'bg-white text-emerald-700 shadow-sm font-black'
                        : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    <span>Done Section</span>
                    <span className={`px-1.5 py-0.2 text-[10px] rounded-md ${apptTab === 'completed' ? 'bg-emerald-100 text-emerald-800 font-extrabold' : 'bg-gray-200 text-gray-600'}`}>
                      {completedAppointments.length}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setApptTab('all')}
                    className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                      apptTab === 'all'
                        ? 'bg-white text-emerald-700 shadow-sm font-black'
                        : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    <span>All</span>
                    <span className={`px-1.5 py-0.2 text-[10px] rounded-md ${apptTab === 'all' ? 'bg-emerald-100 text-emerald-800 font-extrabold' : 'bg-gray-200 text-gray-600'}`}>
                      {displayAppointments.length}
                    </span>
                  </button>
                </div>

                <button
                  onClick={() => navigate('/appointments')}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 transition hidden sm:inline"
                >
                  Book →
                </button>
              </div>
            </div>

            <div className="overflow-x-auto mt-2">
              {filteredAppointments.length === 0 ? (
                <div className="py-12 text-center text-gray-400 text-xs italic">
                  {apptTab === 'completed'
                    ? 'No completed appointments in the Done Section.'
                    : apptTab === 'active'
                    ? 'No active appointments. All booked appointments are completed!'
                    : 'No appointments registered.'}
                  <div className="mt-2">
                    <button
                      onClick={() => navigate('/appointments')}
                      className="px-3 py-1.5 bg-emerald-600 text-white font-bold rounded-lg text-xs"
                    >
                      + Book Appointment
                    </button>
                  </div>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[11px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                      <th className="py-3 px-2">#</th>
                      <th className="py-3 px-3">Patient Name</th>
                      <th className="py-3 px-3">Time</th>
                      <th className="py-3 px-3">Doctor</th>
                      <th className="py-3 px-3">Purpose / Disease</th>
                      <th className="py-3 px-2 text-center">Status</th>
                      <th className="py-3 px-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-xs font-medium">
                    {filteredAppointments.map((item, idx) => {
                      const isCompleted = item.status === 'completed';
                      const isConfirmed = item.status?.toLowerCase().includes('confirm') || item.status === 'Confirmed' || isCompleted;
                      const patName = item.patientName || item.customer_name || item.name || 'Patient';
                      const patPhone = item.phone || item.mobile || item.phoneNumber || '';
                      const patProblem = item.problem || item.purpose || item.disease || 'Consultation';
                      const patDoctor = item.doctorName || item.doctor || `Dr. ${user?.name?.split(' ')[0] || 'Anshu'}`;
                      const patTime = item.time || (item.createdAt ? new Date(item.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—');

                      return (
                        <tr key={item._id || item.id || idx} className="hover:bg-emerald-50/40 transition-colors">
                          <td className="py-3.5 px-2 text-gray-400 font-bold">{idx + 1}</td>
                          <td className="py-3.5 px-3">
                            <p className="font-bold text-gray-800">{patName}</p>
                            {patPhone && <p className="text-[10px] text-gray-400 font-mono">{patPhone}</p>}
                          </td>
                          <td className="py-3.5 px-3 text-gray-600">{patTime}</td>
                          <td className="py-3.5 px-3 text-gray-600">{patDoctor}</td>
                          <td className="py-3.5 px-3 text-gray-600 max-w-[150px] truncate" title={patProblem}>
                            {patProblem}
                          </td>
                          <td className="py-3.5 px-2 text-center">
                            <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold ${
                              isCompleted ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                              isConfirmed ? 'bg-sky-100 text-sky-700 border border-sky-200' : 'bg-amber-100 text-amber-700 border border-amber-200'
                            }`}>
                              {item.status || 'Confirmed'}
                            </span>
                          </td>
                          <td className="py-3.5 px-2 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* View Appointment Details Button */}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedApptDetail(item.raw || item);
                                  setViewApptModalOpen(true);
                                }}
                                className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 rounded-lg text-[11px] font-bold transition flex items-center gap-1"
                                title="View Appointment Details"
                              >
                                <span>👁</span>
                                <span>View</span>
                              </button>

                              {/* Rx Prescription Button */}
                              {['admin', 'manager', 'doctor'].includes(user?.role) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedPatient({
                                      patientName: patName,
                                      mobile: patPhone,
                                      problem: patProblem,
                                      department: item.department || item.dept,
                                      amount: item.amount || item.sub_total,
                                      pid: item._id || item.id || item.lead_id,
                                      verifiedBy: item.verifiedBy?.name || item.verified_by?.name || item.createdBy?.name,
                                      doctorName: item.doctorName || item.doctor || item.createdBy?.name || user?.name,
                                    });
                                    setPrescriptionOpen(true);
                                  }}
                                  className="px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-lg text-[11px] font-bold transition flex items-center gap-1"
                                  title="Generate Department Prescription"
                                >
                                  <span>Rx</span>
                                  <span>Prescription</span>
                                </button>
                              )}

                              {/* Mark as Completed Button */}
                              {isCompleted ? (
                                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[11px] font-bold flex items-center gap-1">
                                  <span>✓</span>
                                  <span>Completed</span>
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  disabled={updatingStatusId === (item._id || item.id)}
                                  onClick={(e) => handleCompleteAppointment(item._id || item.id, e)}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition flex items-center gap-1 shadow-sm disabled:opacity-50"
                                  title="Mark Appointment as Completed"
                                >
                                  <span>✓</span>
                                  <span>{updatingStatusId === (item._id || item.id) ? 'Completing...' : 'Complete'}</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (33%): Dynamic Dispatches & Follow-ups */}
        <div className="bg-white/80 backdrop-blur-md rounded-2xl p-5 shadow-sm border border-white/80">
          <div className="flex flex-col gap-2 pb-3 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-gray-900 text-base tracking-tight flex items-center gap-1.5">
                  <span>Prescriptions</span>
                  {filteredDispatches.length > 0 && (
                    <span className="text-[11px] px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-extrabold">
                      {filteredDispatches.length}
                    </span>
                  )}
                </h3>
                <p className="text-[10px] text-gray-400 font-bold mt-0.5">Ready to Ship & ShipMaxx Prescriptions</p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => navigate('/ready-to-shipment')}
                  className="text-[11px] font-bold text-amber-600 hover:text-amber-700 transition"
                >
                  RTS →
                </button>
                <button
                  onClick={() => navigate('/shipmaxx')}
                  className="text-[11px] font-bold text-blue-600 hover:text-blue-700 transition"
                >
                  ShipMaxx →
                </button>
              </div>
            </div>

            {/* Segmented Tab Filter: Active | Done Section | All */}
            <div className="flex items-center p-1 bg-gray-100/90 rounded-xl text-xs font-bold border border-gray-200/80 justify-between">
              <button
                type="button"
                onClick={() => setDispatchTab('active')}
                className={`flex-1 py-1 rounded-lg transition-all flex items-center justify-center gap-1 ${
                  dispatchTab === 'active'
                    ? 'bg-white text-emerald-700 shadow-sm font-black'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <span>Active</span>
                {activeDispatches.length > 0 && (
                  <span className={`px-1.5 py-0.2 text-[9px] rounded-md ${dispatchTab === 'active' ? 'bg-emerald-100 text-emerald-800 font-extrabold' : 'bg-gray-200 text-gray-600'}`}>
                    {activeDispatches.length}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setDispatchTab('completed')}
                className={`flex-1 py-1 rounded-lg transition-all flex items-center justify-center gap-1 ${
                  dispatchTab === 'completed'
                    ? 'bg-white text-emerald-700 shadow-sm font-black'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <span>Done Section</span>
                {completedDispatches.length > 0 && (
                  <span className={`px-1.5 py-0.2 text-[9px] rounded-md ${dispatchTab === 'completed' ? 'bg-emerald-100 text-emerald-800 font-extrabold' : 'bg-gray-200 text-gray-600'}`}>
                    {completedDispatches.length}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setDispatchTab('all')}
                className={`flex-1 py-1 rounded-lg transition-all flex items-center justify-center gap-1 ${
                  dispatchTab === 'all'
                    ? 'bg-white text-emerald-700 shadow-sm font-black'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <span>All</span>
                {combinedDispatchList.length > 0 && (
                  <span className={`px-1.5 py-0.2 text-[9px] rounded-md ${dispatchTab === 'all' ? 'bg-emerald-100 text-emerald-800 font-extrabold' : 'bg-gray-200 text-gray-600'}`}>
                    {combinedDispatchList.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          <div className="space-y-3 mt-4 max-h-[460px] overflow-y-auto pr-1 custom-scrollbar">
            {upcomingFollowups.length === 0 ? (
              <div className="py-8 text-center text-gray-400 text-xs italic">
                {dispatchTab === 'completed'
                  ? 'No completed dispatches in the Done Section.'
                  : dispatchTab === 'active'
                  ? 'No active dispatches. All orders marked as done!'
                  : 'No dispatches or follow-ups found.'}
              </div>
            ) : (
              upcomingFollowups.map((f, i) => {
                const isDispatchDone = completedDispatchIds.includes(String(f.id)) || f.status === 'completed' || f.status === 'delivered';

                return (
                  <div
                    key={f.id || i}
                    onClick={() => {
                      setSelectedPatient({
                        patientName: f.name,
                        mobile: f.mobile,
                        problem: f.condition,
                        department: f.department,
                        amount: f.amount,
                        pid: f.id,
                      });
                      setPrescriptionOpen(true);
                    }}
                    className="flex items-center justify-between p-3 rounded-xl bg-gray-50/70 border border-gray-100 hover:bg-emerald-50/40 transition-colors cursor-pointer group gap-2"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex flex-col items-center justify-center shrink-0">
                        <span className="text-xs font-black text-gray-800 leading-none">{f.dateDay}</span>
                        <span className="text-[8px] font-bold text-gray-400 uppercase leading-none mt-0.5">{f.dateMonth}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-xs font-bold text-gray-800 truncate">{f.name}</p>
                          {f.type === 'rts' && (
                            <span className="px-1.5 py-0.2 text-[8px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200 rounded">
                              RTS
                            </span>
                          )}
                          {f.type === 'shipmaxx' && (
                            <span className="px-1.5 py-0.2 text-[8px] font-extrabold bg-blue-100 text-blue-800 border border-blue-200 rounded">
                              ShipMaxx
                            </span>
                          )}
                          {f.type === 'verification' && (
                            <span className="px-1.5 py-0.2 text-[8px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 rounded">
                              Verified
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] font-semibold text-gray-400 truncate max-w-[130px] mt-0.5">{f.condition}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Rx Button */}
                      {['admin', 'manager', 'doctor'].includes(user?.role) && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPatient({
                              patientName: f.name,
                              mobile: f.mobile,
                              problem: f.condition,
                              department: f.department,
                              amount: f.amount,
                              pid: f.id,
                            });
                            setPrescriptionOpen(true);
                          }}
                          className="px-2 py-1 bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 text-[10px] font-extrabold rounded-lg transition"
                          title="Generate Prescription"
                        >
                          Rx
                        </button>
                      )}

                      {/* Done Button */}
                      {isDispatchDone ? (
                        <span className="px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold rounded-lg flex items-center gap-0.5">
                          <span>✓</span>
                          <span>Done</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => handleCompleteDispatch(f, e)}
                          className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-extrabold rounded-lg transition flex items-center gap-0.5 shadow-sm"
                          title="Mark as Done"
                        >
                          <span>✓</span>
                          <span>Done</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom Row: Dynamic Department Case Distribution ─────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-6">
        {/* Dynamic Department Case Distribution Breakdown (4 Columns) */}
        <div className="lg:col-span-4 bg-white/80 backdrop-blur-md rounded-2xl p-5 shadow-sm border border-white/80">
          <h3 className="font-extrabold text-gray-900 text-base tracking-tight pb-3">
            Real Department Case Breakdown
          </h3>

          <div className="flex flex-col sm:flex-row items-center gap-6 mt-2">
            {/* Donut Circle */}
            <div className="relative w-32 h-32 rounded-full border-[12px] border-emerald-600 flex items-center justify-center border-t-emerald-400 border-r-sky-500 border-b-amber-500 shrink-0 shadow-inner">
              <div className="text-center">
                <p className="text-lg font-black text-gray-900 leading-none">{totalPatientsCount}</p>
                <p className="text-[10px] font-bold text-gray-400 mt-0.5">Patients</p>
              </div>
            </div>

            {/* Legend List */}
            <div className="space-y-2.5 text-xs font-semibold text-gray-700 flex-1 w-full">
              <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50/50 border border-emerald-100">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-600" /> Male Health & Sperm Count
                </span>
                <span className="font-bold text-emerald-900">{malePct}%</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-sky-50/50 border border-sky-100">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-sky-500" /> Ortho & Joint Spine Care
                </span>
                <span className="font-bold text-sky-900">{orthoPct}%</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-pink-50/50 border border-pink-100">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-pink-500" /> Dermatology & Skin Care
                </span>
                <span className="font-bold text-pink-900">{skinPct}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Inspirational Nature Card (3 Columns) */}
        <div
          className="lg:col-span-3 rounded-2xl p-6 shadow-sm border border-emerald-200/60 relative overflow-hidden flex flex-col justify-between"
          style={{ background: 'linear-gradient(135deg, #dcfce7 0%, #ecfdf5 100%)' }}
        >
          {/* Decorative Leaf Icon */}
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-700">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1.41-3.53C8.73 18.16 10.86 18 13 18c3 0 5.5-2.5 5.5-5.5a5.5 5.5 0 0 0-1.5-3.8" />
            </svg>
          </div>

          <div className="mt-6 z-10">
            <h2 className="text-2xl font-black text-emerald-950 leading-tight">
              Dynamic Medical CRM.<br />Healing Made Simple.
            </h2>
            <p className="text-xs text-emerald-800 font-semibold mt-2">
              All records, patient lists & prescription dispatches updated live from database.
            </p>
          </div>
        </div>
      </div>

      {/* View Appointment Details Modal */}
      {viewApptModalOpen && selectedApptDetail && (
        <Modal
          title={`Appointment Details: ${selectedApptDetail.patientName || selectedApptDetail.name || 'Patient'}`}
          onClose={() => setViewApptModalOpen(false)}
        >
          <div className="space-y-3.5 text-xs text-gray-700 py-1">
            <div className="grid grid-cols-2 gap-3 bg-gray-50/80 p-3.5 rounded-xl border border-gray-100">
              <div>
                <p className="text-[10px] font-extrabold uppercase text-gray-400">Patient Name</p>
                <p className="font-bold text-gray-900 text-sm mt-0.5">{selectedApptDetail.patientName || selectedApptDetail.name || '—'}</p>
              </div>
              <div>
                <p className="text-[10px] font-extrabold uppercase text-gray-400">Phone</p>
                <p className="font-bold text-gray-900 text-sm mt-0.5 font-mono">{selectedApptDetail.phone || selectedApptDetail.mobile || '—'}</p>
              </div>
              <div>
                <p className="text-[10px] font-extrabold uppercase text-gray-400">Doctor Assigned</p>
                <p className="font-bold text-gray-800 mt-0.5">{selectedApptDetail.doctorName || selectedApptDetail.doctor || '—'}</p>
              </div>
              <div>
                <p className="text-[10px] font-extrabold uppercase text-gray-400">Department</p>
                <p className="font-bold text-emerald-700 uppercase mt-0.5">{selectedApptDetail.department || '—'}</p>
              </div>
              <div>
                <p className="text-[10px] font-extrabold uppercase text-gray-400">Appointment Date & Time</p>
                <p className="font-bold text-gray-800 mt-0.5">
                  {selectedApptDetail.appointmentDate ? new Date(selectedApptDetail.appointmentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'} {selectedApptDetail.timeSlot || selectedApptDetail.time || ''}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-extrabold uppercase text-gray-400">Status</p>
                <span className={`inline-block mt-0.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  selectedApptDetail.status === 'completed' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-amber-100 text-amber-800 border border-amber-200'
                }`}>
                  {selectedApptDetail.status || 'scheduled'}
                </span>
              </div>
            </div>

            {selectedApptDetail.problem && (
              <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-100">
                <p className="text-[10px] font-extrabold uppercase text-amber-600">Problem / Disease Complaint</p>
                <p className="font-medium text-gray-800 mt-1">{selectedApptDetail.problem}</p>
              </div>
            )}

            {(selectedApptDetail.houseNo || selectedApptDetail.cityVillage || selectedApptDetail.district || selectedApptDetail.state) && (
              <div className="bg-blue-50/40 p-3 rounded-xl border border-blue-100">
                <p className="text-[10px] font-extrabold uppercase text-blue-600">Delivery Address</p>
                <p className="font-medium text-gray-800 mt-1">
                  {[selectedApptDetail.houseNo, selectedApptDetail.cityVillage, selectedApptDetail.postOffice, selectedApptDetail.landmark, selectedApptDetail.district, selectedApptDetail.state, selectedApptDetail.pincode].filter(Boolean).join(', ')}
                </p>
              </div>
            )}

            {selectedApptDetail.notes && (
              <div>
                <p className="text-[10px] font-extrabold uppercase text-gray-400">Doctor Notes</p>
                <p className="font-medium text-gray-700 bg-gray-50 p-2.5 rounded-xl border border-gray-100 mt-1">{selectedApptDetail.notes}</p>
              </div>
            )}

            {/* Action Buttons in Modal */}
            <div className="pt-3 border-t border-gray-100 flex flex-wrap gap-2">
              {['admin', 'manager', 'doctor'].includes(user?.role) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPatient({
                      patientName: selectedApptDetail.patientName || selectedApptDetail.name,
                      mobile: selectedApptDetail.phone || selectedApptDetail.mobile,
                      problem: selectedApptDetail.problem,
                      department: selectedApptDetail.department,
                      amount: selectedApptDetail.amount,
                      pid: selectedApptDetail._id || selectedApptDetail.id,
                    });
                    setViewApptModalOpen(false);
                    setPrescriptionOpen(true);
                  }}
                  className="flex-1 px-3 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <span>Rx</span>
                  <span>Generate Prescription</span>
                </button>
              )}

              {selectedApptDetail.status !== 'completed' && (
                <button
                  type="button"
                  disabled={updatingStatusId === (selectedApptDetail._id || selectedApptDetail.id)}
                  onClick={async () => {
                    await handleCompleteAppointment(selectedApptDetail._id || selectedApptDetail.id);
                    setViewApptModalOpen(false);
                  }}
                  className="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  <span>✓</span>
                  <span>{updatingStatusId ? 'Completing...' : 'Mark as Completed'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setViewApptModalOpen(false);
                  navigate(`/appointments?openId=${selectedApptDetail._id || selectedApptDetail.id}`);
                }}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition"
              >
                Open in Book →
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Prescription Modal */}
      <PrescriptionModal
        isOpen={prescriptionOpen}
        onClose={() => setPrescriptionOpen(false)}
        patientData={selectedPatient}
      />
    </div>
  );
}
