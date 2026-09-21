import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, Edit3, Eye, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/* ─── Clinic Defaults ─────────────────────────────────────────────────────── */
const DEFAULT_CLINIC = {
  name: 'TreevaCare™ Homeopathy',
  subText: 'An ISO 9001 : 2015 Certified Clinic',
  website: 'www.treevacarehomeopathy.in',
  doctorName: 'Dr. Dheeraj Sharma',
  doctorDegree: 'Consultant & Physician (BHMS)',
  staffTag: 'Vinay Pal | Dr. Abhinash Gupta',
};

/* ─── Department Presets ──────────────────────────────────────────────────── */
export const DEPARTMENT_PRESETS = {
  male: {
    id: 'male',
    name: 'Male Health / Sperm Count',
    treatmentTitle: 'Sperm Count & Male Health Treatment',
    motherTinctures: [
      { id: 'wm40', code: 'WM 40', name: 'Clematis Erecta Q' },
      { id: 'wm38', code: 'WM 38', name: 'Eryngium Aqua Q' },
      { id: 'wm11', code: 'WM 11', name: 'Damiana Q' },
      { id: 'wm12', code: 'WM 12', name: 'Yohimbinum Q' },
      { id: 'wm13', code: 'WM 13', name: 'Nuphar Luta Q' },
      { id: 'wm14', code: 'WM 14', name: 'Avena Sativa Q' },
      { id: 'wm15', code: 'WM 15', name: 'Ginseng Q' },
      { id: 'wm23', code: 'WM 23', name: 'Cydonia Q' },
      { id: 'wm24', code: 'WM 24', name: 'Agnus Q' },
      { id: 'wm26', code: 'WM 26', name: 'Aswagandha Q' },
      { id: 'wm27', code: 'WM 27', name: 'Withania Q' },
      { id: 'wm30', code: 'WM 30', name: 'Tribulus Q' },
      { id: 'wm31', code: 'WM 31', name: 'Maria Puma Q' },
      { id: 'wm32', code: 'WM 32', name: 'WMP Q' },
      { id: 'wm36', code: 'WM 36', name: 'Coca Q' },
      { id: 'wm37', code: 'WM 37', name: 'Chimaphila Q' },
    ],
    potencyGrid: [
      { id: 'wm41', code: 'WM 41', name: 'Sarsaparilla Q', dosages: [] },
      { id: 'wm39', code: 'WM 39', name: 'Sabal Serrulata Q', dosages: [] },
      { id: 'wm16', code: 'WM 16', name: 'Acid Phos', dosages: ['3', '2', '1'] },
      { id: 'wm17', code: 'WM 17', name: 'Selenium', dosages: ['3X', '3', '2', '1'] },
      { id: 'wm18', code: 'WM 18', name: 'Agnus', dosages: ['3', '2', '1'] },
      { id: 'wm19', code: 'WM 19', name: 'Caladium', dosages: ['3', '2', '1'] },
      { id: 'wm20', code: 'WM 20', name: 'Nuphar Luta', dosages: ['3', '2', '1'] },
      { id: 'wm21', code: 'WM 21', name: 'Staphysagria', dosages: ['3', '2', '1'] },
      { id: 'wm22', code: 'WM 22', name: 'Cydonia', dosages: ['3', '2', '1'] },
      { id: 'wm25', code: 'WM 25', name: 'Yohimbinum', dosages: ['3', '2', '1'] },
      { id: 'wm28', code: 'WM 28', name: 'Moschus', dosages: ['3X', '3', '2', '1'] },
      { id: 'wm29', code: 'WM 29', name: 'Titanium', dosages: ['3X', '3', '2', '1'] },
      { id: 'wm33', code: 'WM 33', name: 'Thymolum', dosages: ['3', '2', '1'] },
      { id: 'wm34', code: 'WM 34', name: 'Testis Siccati', dosages: ['3X', '3', '2', '1'] },
      { id: 'wm35', code: 'WM 35', name: 'Uranium Nitricum', dosages: ['2X', '3', '2', '1'] },
    ],
    formulations: [
      { id: 'wf30', name: 'Wild Fire- 30Tab', price: '₹800' },
      { id: 'kext', name: 'K Extreme Spray', price: '₹250' },
      { id: 'vigorm', name: 'Vigor M - 15Tab', price: '₹150' },
      { id: 'afr-oil', name: 'Afrikan Oil', price: '₹180' },
      { id: 'power20', name: 'Poweromin 20 Tab', price: '₹420' },
      { id: 'fene10', name: 'Fene Q10 :10 Tab', price: '₹480' },
    ],
    complaints: [
      'Timing-1st time main timing bahut kam hai 2nd time main sex nhi hota hai',
      'Semen patla hai',
      'Sex karne ke time main erection incomplete aata hai',
      'Morning main erection kam aata hai',
      'Desire problem low hai erection kam aata hai',
    ],
  },
  ortho: {
    id: 'ortho',
    name: 'Ortho & Joint Care',
    treatmentTitle: 'Joint Care & Ortho Spine Treatment',
    motherTinctures: [
      { id: 'wm50', code: 'WM 50', name: 'Arnica Montana Q' },
      { id: 'wm51', code: 'WM 51', name: 'Rhus Tox Q' },
      { id: 'wm52', code: 'WM 52', name: 'Bryonia Alba Q' },
      { id: 'wm53', code: 'WM 53', name: 'Gaultheria Q' },
      { id: 'wm54', code: 'WM 54', name: 'Ruta Graveolens Q' },
      { id: 'wm55', code: 'WM 55', name: 'Guaiacum Q' },
      { id: 'wm56', code: 'WM 56', name: 'Symphytum Q' },
      { id: 'wm57', code: 'WM 57', name: 'Ledum Palustre Q' },
      { id: 'wm58', code: 'WM 58', name: 'Stellaria Media Q' },
      { id: 'wm59', code: 'WM 59', name: 'Actaea Spicata Q' },
    ],
    potencyGrid: [
      { id: 'wm60', code: 'WM 60', name: 'Causticum', dosages: ['3X', '3', '2', '1'] },
      { id: 'wm61', code: 'WM 61', name: 'Calcarea Fluor', dosages: ['3X', '3', '2', '1'] },
      { id: 'wm62', code: 'WM 62', name: 'Hypericum', dosages: ['3', '2', '1'] },
      { id: 'wm63', code: 'WM 63', name: 'Colchicum', dosages: ['3', '2', '1'] },
      { id: 'wm64', code: 'WM 64', name: 'Kalmia Latifolia', dosages: ['3', '2', '1'] },
      { id: 'wm65', code: 'WM 65', name: 'Dulcamara', dosages: ['3', '2', '1'] },
      { id: 'wm66', code: 'WM 66', name: 'Guaiacum 30', dosages: ['3X', '3', '2', '1'] },
    ],
    formulations: [
      { id: 'of-oil', name: 'Ortho Flex Relief Oil', price: '₹250' },
      { id: 'jg-caps', name: 'Joint Guard Caps - 30Tab', price: '₹450' },
      { id: 'pr-spray', name: 'Pain Relief Fast Spray', price: '₹200' },
      { id: 'calc-boost', name: 'Calcium Booster Tablets', price: '₹350' },
    ],
    complaints: [
      'Severe joint stiffness and morning joint pain',
      'Knee joint swelling, inflammation & cracking sound on movement',
      'Lower back stiffness and lumbar spine discomfort',
      'Difficulty in walking or climbing stairs for extended duration',
    ],
  },
  skin: {
    id: 'skin',
    name: 'Dermatology & Skin Care',
    treatmentTitle: 'Dermatology & Skin Care Treatment',
    motherTinctures: [
      { id: 'wm70', code: 'WM 70', name: 'Berberis Aquifolium Q' },
      { id: 'wm71', code: 'WM 71', name: 'Echinacea Q' },
      { id: 'wm72', code: 'WM 72', name: 'Azadirachta Indica Q' },
      { id: 'wm73', code: 'WM 73', name: 'Hydrocotyle Q' },
      { id: 'wm74', code: 'WM 74', name: 'Sarsaparilla Q' },
      { id: 'wm75', code: 'WM 75', name: 'Chrysarobinum Q' },
      { id: 'wm76', code: 'WM 76', name: 'Calendula Q' },
    ],
    potencyGrid: [
      { id: 'wm77', code: 'WM 77', name: 'Sulphur', dosages: ['3X', '3', '2', '1'] },
      { id: 'wm78', code: 'WM 78', name: 'Graphites', dosages: ['3X', '3', '2', '1'] },
      { id: 'wm79', code: 'WM 79', name: 'Arsenic Album', dosages: ['3', '2', '1'] },
      { id: 'wm80', code: 'WM 80', name: 'Petroleum', dosages: ['3', '2', '1'] },
      { id: 'wm81', code: 'WM 81', name: 'Psorinum', dosages: ['3X', '3', '2', '1'] },
      { id: 'wm82', code: 'WM 82', name: 'Natrum Mur', dosages: ['3', '2', '1'] },
    ],
    formulations: [
      { id: 'dg-soap', name: 'Derma Glow Herbal Soap', price: '₹180' },
      { id: 'hs-oint', name: 'Herbal Skin Ointment', price: '₹220' },
      { id: 'bp-syrup', name: 'Blood Purifier Syrup', price: '₹280' },
      { id: 'af-oil', name: 'Anti-Fungal Bio Oil', price: '₹250' },
    ],
    complaints: [
      'Severe skin itching, redness and burning sensation',
      'Ringworm / Fungal infection circular patches on body',
      'Eczema skin dryness, cracking and peeling',
      'Facial acne, pimples & dark spot pigmentation',
    ],
  },
};

/* ─── Print Styles Injection ─────────────────────────────────────────────── */
const PRINT_STYLES = `
  .prescription-print-only { display: none !important; }
  @media print {
    #root { display: none !important; }
    body > *:not(.prescription-portal-container) { display: none !important; }
    
    .prescription-portal-container {
      display: block !important;
      position: static !important;
      width: 100% !important;
      background: #fff !important;
    }
    
    .prescription-overlay {
      position: static !important;
      background: none !important;
      backdrop-filter: none !important;
      display: block !important;
      padding: 0 !important;
      overflow: visible !important;
      width: 100% !important;
      height: auto !important;
    }
    
    .prescription-modal-box {
      position: static !important;
      box-shadow: none !important;
      max-height: none !important;
      overflow: visible !important;
      width: 100% !important;
      max-width: none !important;
      background: #fff !important;
      border-radius: 0 !important;
      border: none !important;
    }
    
    .prescription-print-area {
      padding: 6mm 8mm !important;
      margin: 0 !important;
      width: 100% !important;
      box-sizing: border-box !important;
    }

    .prescription-no-print { display: none !important; }
    .prescription-print-only { display: block !important; }
    
    @page {
      margin: 4mm;
      size: A4 portrait;
    }
  }
`;

export default function PrescriptionModal({ isOpen, onClose, patientData }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('preview'); // 'preview' | 'edit'
  const [selectedDeptKey, setSelectedDeptKey] = useState('male');

  // Header & Patient Info State
  const [clinic, setClinic] = useState(DEFAULT_CLINIC);
  const [patientInfo, setPatientInfo] = useState({
    name: '',
    gender: 'Male',
    statusTag: '(New)',
    mobile: '',
    pid: '',
    date: new Date().toISOString().replace('T', ' ').slice(0, 19),
    amount: '',
    prescriptionId: '',
    age: '',
    weight: '',
    since: '',
    profession: '',
    previousMedicines: 'No',
    otherMedicines: 'No',
    treatingFor: '',
    printTime: new Date().toISOString().replace('T', ' ').slice(0, 19),
    extraDetails: '',
    marriedStatus: '',
    assasaryComplain: 'No',
    verifierName: '',
  });

  // Complaints State
  const [complaints, setComplaints] = useState([]);
  const [newComplaintText, setNewComplaintText] = useState('');

  // Medicines Datasets based on selected Department
  const [motherTinctures, setMotherTinctures] = useState([]);
  const [potencyGrid, setPotencyGrid] = useState([]);
  const [extraFormulations, setExtraFormulations] = useState([]);

  // Selected Checkboxes
  const [selectedMotherTinctures, setSelectedMotherTinctures] = useState({});
  const [selectedPotencies, setSelectedPotencies] = useState({}); // { [id]: { selected: boolean, selectedDosages: { [dose]: boolean } } }
  const [selectedExtras, setSelectedExtras] = useState({});

  // Helper to load department dataset
  const applyDepartmentPreset = (deptKey, keepCustomComplaints = false) => {
    const preset = DEPARTMENT_PRESETS[deptKey] || DEPARTMENT_PRESETS.male;
    setSelectedDeptKey(preset.id);
    setClinic((prev) => ({ ...prev, treatmentTitle: preset.treatmentTitle }));
    setMotherTinctures(preset.motherTinctures);
    setPotencyGrid(preset.potencyGrid);
    setExtraFormulations(preset.formulations);

    if (!keepCustomComplaints) {
      setComplaints(preset.complaints);
    }

    // Default selection
    const initialPot = {};
    preset.potencyGrid.forEach((med) => {
      if (med.dosages.length > 0) {
        initialPot[med.id] = {
          selected: true,
          selectedDosages: {},
        };
      }
    });
    setSelectedPotencies(initialPot);
  };

  // Pre-fill patient data & department detection on load
  useEffect(() => {
    if (!isOpen) return;

    // Dynamically set doctor name based on patient record or currently logged in doctor/user
    let docName = patientData?.doctorName || patientData?.doctor_name || patientData?.doctor || patientData?.createdBy?.name;
    if (!docName) {
      if (user?.name) {
        docName = user.name.trim().toLowerCase().startsWith('dr') ? user.name : `Dr. ${user.name}`;
      } else {
        docName = DEFAULT_CLINIC.doctorName;
      }
    }

    let docDegree = patientData?.doctorDegree || user?.specialization || DEFAULT_CLINIC.doctorDegree;

    setClinic((prev) => ({
      ...prev,
      name: 'TreevaCare™ Homeopathy',
      website: 'www.treevacarehomeopathy.in',
      doctorName: docName,
      doctorDegree: docDegree,
    }));

    if (patientData) {
      const pidVal = patientData.pid || patientData.lead_id || patientData.order_id || patientData._id || '';
      const cleanPid = pidVal ? (pidVal.toString().replace(/\D/g, '') || pidVal).slice(-6) : '';
      const randomPrescId = `treeva${Math.floor(10000000 + Math.random() * 90000000)}`;

      // Detect Department
      const rawDept = (patientData.department || patientData.dept || patientData.treatingFor || patientData.problem || '').toLowerCase();
      let targetDept = 'male';
      if (rawDept.includes('ortho') || rawDept.includes('joint') || rawDept.includes('spine') || rawDept.includes('bone') || rawDept.includes('pain')) {
        targetDept = 'ortho';
      } else if (rawDept.includes('skin') || rawDept.includes('derma') || rawDept.includes('acne') || rawDept.includes('eczema') || rawDept.includes('psoriasis')) {
        targetDept = 'skin';
      }

      applyDepartmentPreset(targetDept, !!patientData.problem);

      setPatientInfo((prev) => {
        const verifierVal =
          (typeof patientData.verifiedBy === 'object' ? patientData.verifiedBy?.name : patientData.verifiedBy) ||
          (typeof patientData.verified_by === 'object' ? patientData.verified_by?.name : patientData.verified_by) ||
          patientData.verifiedByName ||
          patientData.verifierName ||
          (typeof patientData.assignedTo === 'object' ? patientData.assignedTo?.name : patientData.assignedTo) ||
          patientData.lead?.assignedTo?.name ||
          patientData.lead?.createdBy?.name ||
          patientData.task?.assignedTo?.name ||
          patientData.createdBy?.name ||
          patientData.created_by?.name ||
          patientData.staffName ||
          (user?.role !== 'doctor' && user?.name ? user.name : '') ||
          prev.verifierName ||
          '';

        return {
          ...prev,
          name: patientData.patientName || patientData.billing_customer_name || patientData.customer_name || patientData.name || 'Patient',
          mobile: patientData.mobile || patientData.billing_phone || patientData.phone_number || patientData.phone || '',
          pid: cleanPid,
          prescriptionId: patientData.prescriptionId || `${randomPrescId} (${(patientData.state || 'INDIA').toUpperCase()})`,
          amount: patientData.amount ? `₹${patientData.amount} (${patientData.payment_type || patientData.paymentMethod || 'cod'})` : patientData.sub_total ? `₹${patientData.sub_total} (cod)` : '',
          age: patientData.age || prev.age || '',
          weight: patientData.weight || prev.weight || '',
          treatingFor: patientData.problem || patientData.disease || patientData.treatingFor || DEPARTMENT_PRESETS[targetDept].treatmentTitle,
          verifierName: verifierVal,
        };
      });

      // Custom complaints override if provided in patientData
      if (patientData.problem || patientData.complaints) {
        const rawProblem = patientData.problem || patientData.complaints;
        if (Array.isArray(rawProblem)) {
          setComplaints(rawProblem);
        } else if (typeof rawProblem === 'string' && rawProblem.trim()) {
          const split = rawProblem.split('\n').filter(Boolean);
          if (split.length > 0) setComplaints(split);
        }
      }
    } else {
      applyDepartmentPreset('male');
    }
  }, [patientData, isOpen, user]);

  const allowedRoles = ['admin', 'manager', 'doctor'];
  if (!isOpen || !allowedRoles.includes(user?.role)) return null;

  /* ─── Handlers ─────────────────────────────────────────────────────────── */
  const toggleMotherTincture = (id) => {
    setSelectedMotherTinctures((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const togglePotencyMed = (id) => {
    setSelectedPotencies((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        selected: !prev[id]?.selected,
      },
    }));
  };

  const toggleDosage = (medId, dose) => {
    setSelectedPotencies((prev) => {
      const currentMed = prev[medId] || { selected: true, selectedDosages: {} };
      const currentDosages = currentMed.selectedDosages || {};
      return {
        ...prev,
        [medId]: {
          ...currentMed,
          selected: true,
          selectedDosages: {
            ...currentDosages,
            [dose]: !currentDosages[dose],
          },
        },
      };
    });
  };

  const toggleExtra = (id) => {
    setSelectedExtras((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const addComplaint = () => {
    if (!newComplaintText.trim()) return;
    setComplaints([...complaints, newComplaintText.trim()]);
    setNewComplaintText('');
  };

  const removeComplaint = (index) => {
    setComplaints(complaints.filter((_, i) => i !== index));
  };

  const handlePrint = () => {
    window.print();
  };

  /* ─── Render Modal ─────────────────────────────────────────────────────── */
  return createPortal(
    <div className="prescription-portal-container" style={{ position: 'fixed', inset: 0, zIndex: 99999 }}>
      <style>{PRINT_STYLES}</style>

      {/* Overlay Background */}
      <div
        className="prescription-overlay"
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '16px',
          overflowY: 'auto',
        }}
      >
        {/* Modal Window Container */}
        <div
          className="prescription-modal-box"
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            width: '100%',
            maxWidth: '1000px',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header Bar (No Print) */}
          <div
            className="prescription-no-print"
            style={{
              padding: '14px 24px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#f8fafc',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  backgroundColor: '#0284c7',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                }}
              >
                Rx
              </div>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  Doctor Prescription ({DEPARTMENT_PRESETS[selectedDeptKey]?.name})
                </h3>
                <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                  {patientInfo.name} ({patientInfo.mobile}) - PID: {patientInfo.pid}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {/* Tab Selector */}
              <div
                style={{
                  display: 'flex',
                  backgroundColor: '#e2e8f0',
                  padding: '3px',
                  borderRadius: '8px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: activeTab === 'preview' ? '#ffffff' : 'transparent',
                    color: activeTab === 'preview' ? '#0284c7' : '#64748b',
                    boxShadow: activeTab === 'preview' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  }}
                >
                  <Eye size={14} /> Preview & Print
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('edit')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: activeTab === 'edit' ? '#ffffff' : 'transparent',
                    color: activeTab === 'edit' ? '#0284c7' : '#64748b',
                    boxShadow: activeTab === 'edit' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  }}
                >
                  <Edit3 size={14} /> Edit Details
                </button>
              </div>

              {/* Print Button */}
              <button
                type="button"
                onClick={handlePrint}
                style={{
                  backgroundColor: '#0284c7',
                  color: '#ffffff',
                  padding: '8px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 4px rgba(2, 132, 199, 0.25)',
                }}
              >
                <Printer size={16} /> Print Prescription
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                style={{
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  border: 'none',
                  width: '34px',
                  height: '34px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Modal Body / Scroll Container */}
          <div style={{ flex: 1, overflowY: 'auto', backgroundColor: '#f8fafc', padding: '16px' }}>
            {/* EDIT MODE TAB */}
            {activeTab === 'edit' && (
              <div
                className="prescription-no-print"
                style={{
                  backgroundColor: '#ffffff',
                  padding: '24px',
                  borderRadius: '12px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                    Patient & Department Prescription Settings
                  </h4>

                  {/* Department Preset Selector */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                      Select Department Preset:
                    </label>
                    <select
                      value={selectedDeptKey}
                      onChange={(e) => applyDepartmentPreset(e.target.value)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13px',
                        fontWeight: 600,
                        backgroundColor: '#f1f5f9',
                        color: '#0f172a',
                      }}
                    >
                      <option value="male">Male Health / Sperm Count</option>
                      <option value="ortho">Ortho & Joint Care</option>
                      <option value="skin">Dermatology & Skin Care</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '20px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                      Doctor Name (Medicines Checked By)
                    </label>
                    <input
                      type="text"
                      value={clinic.doctorName}
                      onChange={(e) => setClinic({ ...clinic, doctorName: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 600, color: '#0f172a' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                      Verification Added By (Staff Name)
                    </label>
                    <input
                      type="text"
                      value={patientInfo.verifierName}
                      onChange={(e) => setPatientInfo({ ...patientInfo, verifierName: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 600, color: '#0f172a' }}
                      placeholder="e.g. Vinay Pal"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                      Doctor Degree / Qualification
                    </label>
                    <input
                      type="text"
                      value={clinic.doctorDegree}
                      onChange={(e) => setClinic({ ...clinic, doctorDegree: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                      Clinic Name
                    </label>
                    <input
                      type="text"
                      value={clinic.name}
                      onChange={(e) => setClinic({ ...clinic, name: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 600 }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                      Patient Name
                    </label>
                    <input
                      type="text"
                      value={patientInfo.name}
                      onChange={(e) => setPatientInfo({ ...patientInfo, name: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                      Mobile Number
                    </label>
                    <input
                      type="text"
                      value={patientInfo.mobile}
                      onChange={(e) => setPatientInfo({ ...patientInfo, mobile: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                      PID / Order ID
                    </label>
                    <input
                      type="text"
                      value={patientInfo.pid}
                      onChange={(e) => setPatientInfo({ ...patientInfo, pid: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                      Age & Weight
                    </label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        placeholder="Age (e.g. 27)"
                        value={patientInfo.age}
                        onChange={(e) => setPatientInfo({ ...patientInfo, age: e.target.value })}
                        style={{ width: '50%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                      />
                      <input
                        type="text"
                        placeholder="Weight (e.g. 53KG)"
                        value={patientInfo.weight}
                        onChange={(e) => setPatientInfo({ ...patientInfo, weight: e.target.value })}
                        style={{ width: '50%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                      Since (Duration) & Profession
                    </label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        placeholder="Since (e.g. 6 Year)"
                        value={patientInfo.since}
                        onChange={(e) => setPatientInfo({ ...patientInfo, since: e.target.value })}
                        style={{ width: '50%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                      />
                      <input
                        type="text"
                        placeholder="Profession (e.g. Work)"
                        value={patientInfo.profession}
                        onChange={(e) => setPatientInfo({ ...patientInfo, profession: e.target.value })}
                        style={{ width: '50%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                      Treating For / Problem
                    </label>
                    <input
                      type="text"
                      value={patientInfo.treatingFor}
                      onChange={(e) => setPatientInfo({ ...patientInfo, treatingFor: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                    />
                  </div>
                </div>

                {/* Chief Complaints List */}
                <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', marginBottom: '10px' }}>
                  Chief Complaints List
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                  {complaints.map((c, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', width: '24px' }}>{idx + 1}.</span>
                      <input
                        type="text"
                        value={c}
                        onChange={(e) => {
                          const copy = [...complaints];
                          copy[idx] = e.target.value;
                          setComplaints(copy);
                        }}
                        style={{ flex: 1, padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                      />
                      <button
                        type="button"
                        onClick={() => removeComplaint(idx)}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                    <input
                      type="text"
                      placeholder="Add new chief complaint..."
                      value={newComplaintText}
                      onChange={(e) => setNewComplaintText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addComplaint()}
                      style={{ flex: 1, padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                    />
                    <button
                      type="button"
                      onClick={addComplaint}
                      style={{
                        backgroundColor: '#0284c7',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '6px 14px',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Plus size={14} /> Add
                    </button>
                  </div>
                </div>

                <div style={{ marginTop: '20px', textAlign: 'right' }}>
                  <button
                    type="button"
                    onClick={() => setActiveTab('preview')}
                    style={{
                      backgroundColor: '#0284c7',
                      color: '#fff',
                      padding: '10px 24px',
                      borderRadius: '8px',
                      border: 'none',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    View Printable Prescription Grid →
                  </button>
                </div>
              </div>
            )}

            {/* PREVIEW & PRINTABLE LAYOUT */}
            <div
              className="prescription-print-area"
              style={{
                backgroundColor: '#ffffff',
                padding: '20px',
                borderRadius: activeTab === 'preview' ? '8px' : '0',
                boxShadow: activeTab === 'preview' ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : 'none',
                maxWidth: '900px',
                margin: '0 auto',
                fontFamily: 'Arial, Helvetica, sans-serif',
                color: '#000000',
              }}
            >
              {/* Header Container */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  borderBottom: '2px solid #000',
                  paddingBottom: '8px',
                  marginBottom: '10px',
                }}
              >
                {/* Left: Logo & Subheader */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        backgroundColor: '#0284c7',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontWeight: 'bold',
                        fontSize: '18px',
                      }}
                    >
                      +
                    </div>
                    <div>
                      <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0, color: '#1e3a8a', lineHeight: 1.1 }}>
                        {clinic.name}
                      </h1>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: '#334155', marginTop: '2px' }}>
                        {clinic.subText}
                      </div>
                      <div style={{ fontSize: '10px', color: '#0284c7', textDecoration: 'underline' }}>
                        {clinic.website}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569', marginTop: '6px' }}>
                    {clinic.treatmentTitle}
                  </div>
                </div>

                {/* Right: Doctor Info & QR Code */}
                <div style={{ textAlign: 'right', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div>
                    <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, color: '#0f172a' }}>
                      {clinic.doctorName}
                    </h2>
                    <div style={{ fontSize: '11px', color: '#475569', fontWeight: 500 }}>
                      {clinic.doctorDegree}
                    </div>
                    <div style={{ fontSize: '11px', color: '#000', marginTop: '6px' }}>
                      Date : <span style={{ fontWeight: 600 }}>{patientInfo.date}</span>
                    </div>
                  </div>

                  {/* QR Code Graphic */}
                  <div
                    style={{
                      width: '64px',
                      height: '64px',
                      border: '1px solid #000',
                      padding: '2px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#fff',
                    }}
                  >
                    <svg viewBox="0 0 100 100" width="56" height="56">
                      <path d="M0 0h35v35H0zM10 10h15v15H10zM65 0h35v35H65zM75 10h15v15H75zM0 65h35v35H0zM10 75h15v15H10z" fill="#000" />
                      <rect x="45" y="10" width="10" height="20" fill="#000" />
                      <rect x="10" y="45" width="25" height="10" fill="#000" />
                      <rect x="45" y="45" width="20" height="20" fill="#000" />
                      <rect x="75" y="45" width="15" height="10" fill="#000" />
                      <rect x="65" y="65" width="20" height="25" fill="#000" />
                      <rect x="45" y="75" width="10" height="20" fill="#000" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Patient Meta Block */}
              <div style={{ fontSize: '12px', borderBottom: '1px solid #000', paddingBottom: '6px', marginBottom: '8px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 2fr 1.5fr', gap: '4px', marginBottom: '4px' }}>
                  <div>
                    Patient Name : <strong style={{ textTransform: 'capitalize' }}>{patientInfo.name}</strong> {patientInfo.statusTag}
                  </div>
                  <div>
                    Pid: <strong>{patientInfo.pid}</strong>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    Mobile : <strong>{patientInfo.mobile}</strong>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 4fr', gap: '4px', marginBottom: '4px' }}>
                  <div>
                    Amount : <strong>{patientInfo.amount}</strong>
                  </div>
                  <div style={{ fontSize: '11px', color: '#334155' }}>
                    ID : <strong>{patientInfo.prescriptionId}</strong>{patientInfo.verifierName ? ` | ${patientInfo.verifierName}` : ''} | {clinic.doctorName}
                  </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '11px', borderTop: '1px dashed #ccc', paddingTop: '4px' }}>
                  <div>Age: <strong>{patientInfo.age}</strong></div>
                  <div>Weight: <strong>{patientInfo.weight}</strong></div>
                  <div>Since: <strong>{patientInfo.since}</strong></div>
                  <div>Profession: <strong>{patientInfo.profession}</strong></div>
                  <div>Previous Medicines: <strong>{patientInfo.previousMedicines}</strong></div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '11px', marginTop: '3px' }}>
                  <div>Treating For: <span style={{ textDecoration: 'underline', fontWeight: 600 }}>{patientInfo.treatingFor}</span></div>
                  <div>Print Time: {patientInfo.printTime}</div>
                  <div>Extra Details: {patientInfo.extraDetails}</div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginTop: '3px', fontWeight: 'bold' }}>
                  <div>Patient Name: {patientInfo.name} ({patientInfo.gender})</div>
                  <div>{patientInfo.marriedStatus}</div>
                </div>
              </div>

              {/* Chief Complaints List */}
              <div style={{ marginBottom: '10px', fontSize: '12px' }}>
                {complaints.map((c, idx) => (
                  <div key={idx} style={{ lineHeight: 1.35, marginBottom: '2px' }}>
                    {idx + 1}. {c}
                  </div>
                ))}
                <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
                  Assasary Complain - {patientInfo.assasaryComplain}
                </div>
              </div>

              {/* 3 Column Medicine Grid matching physical sheet */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1.2fr 0.9fr',
                  gap: '8px',
                  borderTop: '1px solid #000',
                  paddingTop: '8px',
                  fontSize: '11px',
                }}
              >
                {/* Column 1: Mother Tinctures (Q) */}
                <div>
                  <div style={{ fontWeight: 'bold', borderBottom: '1px solid #94a3b8', paddingBottom: '3px', marginBottom: '4px' }}>
                    Mother Tinctures (Q)
                  </div>
                  {motherTinctures.map((med) => {
                    const isChecked = selectedMotherTinctures[med.id];
                    return (
                      <div
                        key={med.id}
                        onClick={() => toggleMotherTincture(med.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          marginBottom: '3px',
                          cursor: 'pointer',
                          userSelect: 'none',
                        }}
                      >
                        <div
                          style={{
                            width: '12px',
                            height: '12px',
                            border: '1px solid #000',
                            backgroundColor: isChecked ? '#000' : '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontSize: '9px',
                            lineHeight: 1,
                          }}
                        >
                          {isChecked ? '✓' : ''}
                        </div>
                        <span>
                          <strong>{med.code}</strong> - {med.name}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Column 2: Potencies & Dosage Grid */}
                <div>
                  <div style={{ fontWeight: 'bold', borderBottom: '1px solid #94a3b8', paddingBottom: '3px', marginBottom: '4px' }}>
                    Potencies & Dosage Grid
                  </div>
                  {potencyGrid.map((med) => {
                    const medState = selectedPotencies[med.id] || {};
                    const isSelected = medState.selected;

                    return (
                      <div
                        key={med.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '3px',
                        }}
                      >
                        <div
                          onClick={() => togglePotencyMed(med.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            cursor: 'pointer',
                            userSelect: 'none',
                          }}
                        >
                          <div
                            style={{
                              width: '12px',
                              height: '12px',
                              border: '1px solid #000',
                              backgroundColor: isSelected ? '#000' : '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#fff',
                              fontSize: '9px',
                              lineHeight: 1,
                            }}
                          >
                            {isSelected ? '✓' : ''}
                          </div>
                          <span>
                            <strong>{med.code}</strong> - {med.name}
                          </span>
                        </div>

                        {/* Dosage checkboxes [3X] [3] [2] [1] */}
                        {med.dosages.length > 0 && (
                          <div style={{ display: 'flex', gap: '3px' }}>
                            {med.dosages.map((dose) => {
                              const doseChecked = medState.selectedDosages?.[dose];
                              return (
                                <button
                                  key={dose}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleDosage(med.id, dose);
                                  }}
                                  style={{
                                    border: '1px solid #000',
                                    backgroundColor: doseChecked ? '#000' : '#fff',
                                    color: doseChecked ? '#fff' : '#000',
                                    fontSize: '9px',
                                    padding: '1px 3px',
                                    minWidth: '18px',
                                    textAlign: 'center',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    lineHeight: '1.1',
                                  }}
                                >
                                  {dose}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Column 3: Extra Formulations & Special Medicines */}
                <div>
                  <div style={{ fontWeight: 'bold', borderBottom: '1px solid #94a3b8', paddingBottom: '3px', marginBottom: '4px' }}>
                    Special Formulations
                  </div>
                  {extraFormulations.map((extra) => {
                    const isChecked = selectedExtras[extra.id];
                    return (
                      <div
                        key={extra.id}
                        onClick={() => toggleExtra(extra.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          marginBottom: '6px',
                          cursor: 'pointer',
                          userSelect: 'none',
                        }}
                      >
                        <div
                          style={{
                            width: '12px',
                            height: '12px',
                            border: '1px solid #000',
                            backgroundColor: isChecked ? '#000' : '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontSize: '9px',
                            lineHeight: 1,
                          }}
                        >
                          {isChecked ? '✓' : ''}
                        </div>
                        <span style={{ fontSize: '11px' }}>
                          {extra.name} - <strong>{extra.price}</strong>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Signature Footer */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-end',
                  marginTop: '28px',
                  paddingTop: '12px',
                  fontSize: '12px',
                }}
              >
                <div>
                  Pharmacist : <span style={{ display: 'inline-block', width: '140px', borderBottom: '1px solid #000' }}></span>
                </div>
                <div>
                  Checked By : <span style={{ display: 'inline-block', width: '140px', borderBottom: '1px solid #000' }}></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
