import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, Edit3, Eye, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import API from '../api';

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
      { id: 'wm01', code: 'WM 01', name: 'Avena Sativa Q' },
      { id: 'wm02', code: 'WM 02', name: 'Ashwagandha Q' },
      { id: 'wm03', code: 'WM 03', name: 'Damiana Q' },
      { id: 'wm04', code: 'WM 04', name: 'Tribulus Terr Q' },
      { id: 'wm05', code: 'WM 05', name: 'Yohimbinum Q' },
      { id: 'wm06', code: 'WM 06', name: 'Agnus Castus Q' },
      { id: 'wm07', code: 'WM 07', name: 'Nuphar Luteum Q' },
      { id: 'wm08', code: 'WM 08', name: 'Caladium Q' },
      { id: 'wm09', code: 'WM 09', name: 'Ginkgo Biloba Q' },
      { id: 'wm10', code: 'WM 10', name: 'Side Cordifolia Q' },
      { id: 'wm11', code: 'WM 11', name: 'Ginseng Q' },
      { id: 'wm12', code: 'WM 12', name: 'Salix Nigra Q' },
    ],
    potencyGrid: [
      { id: 'wm20', code: 'WM 20', name: 'Lycopodium', dosages: ['3X', '3', '2', '1'] },
      { id: 'wm21', code: 'WM 21', name: 'Selenium', dosages: ['3X', '3', '2', '1'] },
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
  const medicineInputRef = useRef(null);

  // Compute accessible department keys for current user/doctor
  const allowedDeptKeys = useMemo(() => {
    if (['admin', 'manager'].includes(user?.role)) {
      return ['male', 'skin', 'ortho'];
    }
    const userDepts = (
      Array.isArray(user?.departments) && user.departments.length > 0
        ? user.departments
        : user?.department
        ? [user.department]
        : []
    ).map((d) => String(d).toLowerCase());

    const valid = ['male', 'skin', 'ortho'].filter((d) => userDepts.includes(d));
    return valid;
  }, [user]);

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

  // Save state
  const [savingDetails, setSavingDetails] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [selectedMotherTinctures, setSelectedMotherTinctures] = useState({});
  const [selectedPotencies, setSelectedPotencies] = useState({}); // { [id]: { selected: boolean, selectedDosages: { [dose]: boolean } } }
  const [selectedExtras, setSelectedExtras] = useState({});

  // Custom Prescribed Medicines State
  const [showQuickAdder, setShowQuickAdder] = useState(false);
  const [prescribedMedicines, setPrescribedMedicines] = useState([]);
  const [editingMedId, setEditingMedId] = useState(null);
  const [newMed, setNewMed] = useState({
    name: '',
    dosage: '15 Drops',
    frequency: 'BD',
    timing: 'After Food',
    duration: '1 Month',
  });

  const startEditMedicine = (med) => {
    setEditingMedId(med.id);
    setNewMed({
      name: med.name || '',
      dosage: med.dosage || '15 Drops',
      frequency: med.frequency || 'BD',
      timing: med.timing || 'After Food',
      duration: med.duration || '1 Month',
    });
    if (medicineInputRef.current) {
      medicineInputRef.current.focus();
    }
  };

  const cancelEditMedicine = () => {
    setEditingMedId(null);
    setNewMed({
      name: '',
      dosage: '15 Drops',
      frequency: 'BD',
      timing: 'After Food',
      duration: '1 Month',
    });
  };

  const addPrescribedMedicine = () => {
    if (!newMed.name.trim()) return;

    if (editingMedId) {
      setPrescribedMedicines((prev) =>
        prev.map((m) =>
          m.id === editingMedId
            ? {
                ...m,
                name: newMed.name.trim(),
                dosage: newMed.dosage || '15 Drops',
                frequency: newMed.frequency || 'BD',
                timing: newMed.timing || 'After Food',
                duration: newMed.duration || '1 Month',
              }
            : m
        )
      );
      setEditingMedId(null);
    } else {
      setPrescribedMedicines((prev) => [
        ...prev,
        {
          id: Date.now(),
          name: newMed.name.trim(),
          dosage: newMed.dosage || '15 Drops',
          frequency: newMed.frequency || 'BD',
          timing: newMed.timing || 'After Food',
          duration: newMed.duration || '1 Month',
        },
      ]);
    }

    setNewMed({
      name: '',
      dosage: '15 Drops',
      frequency: 'BD',
      timing: 'After Food',
      duration: '1 Month',
    });
  };

  const quickAddMedicine = (medName, customDose = '15 Drops', customFreq = 'BD', customTiming = 'After Food', customDur = '1 Month') => {
    setPrescribedMedicines((prev) => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        name: medName,
        dosage: customDose,
        frequency: customFreq,
        timing: customTiming,
        duration: customDur,
      },
    ]);
  };

  const removePrescribedMedicine = (id) => {
    setPrescribedMedicines((prev) => prev.filter((m) => m.id !== id));
  };

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

    const getAssignedDoctorName = (data) => {
      if (!data) return null;
      if (typeof data.doctorName === 'string' && data.doctorName.trim() && !data.doctorName.toLowerCase().includes('admin')) {
        return data.doctorName.trim();
      }
      if (typeof data.doctor_name === 'string' && data.doctor_name.trim() && !data.doctor_name.toLowerCase().includes('admin')) {
        return data.doctor_name.trim();
      }
      if (data.assignedDoctor) {
        const d = typeof data.assignedDoctor === 'object' ? data.assignedDoctor.name : data.assignedDoctor;
        if (d && typeof d === 'string' && !d.toLowerCase().includes('admin')) return d;
      }
      if (data.doctor) {
        const d = typeof data.doctor === 'object' ? data.doctor.name : data.doctor;
        if (d && typeof d === 'string' && !d.toLowerCase().includes('admin')) return d;
      }
      if (data.lead && typeof data.lead === 'object') {
        const fromLead = getAssignedDoctorName(data.lead);
        if (fromLead) return fromLead;
      }
      if (data.task && typeof data.task === 'object') {
        const fromTask = getAssignedDoctorName(data.task);
        if (fromTask) return fromTask;
      }
      if (data.raw && typeof data.raw === 'object') {
        const fromRaw = getAssignedDoctorName(data.raw);
        if (fromRaw) return fromRaw;
      }
      if (data.createdBy && typeof data.createdBy === 'object') {
        if (data.createdBy.role === 'doctor' || data.createdBy.specialization) {
          return data.createdBy.name;
        }
      }
      return null;
    };

    const formatDocTitle = (name) => {
      if (!name || typeof name !== 'string') return DEFAULT_CLINIC.doctorName;
      const trimmed = name.trim();
      if (trimmed.toLowerCase().startsWith('dr.') || trimmed.toLowerCase().startsWith('dr ')) {
        return trimmed;
      }
      return `Dr. ${trimmed}`;
    };

    let foundDoc = getAssignedDoctorName(patientData);
    if (!foundDoc) {
      if (user?.role === 'doctor' && user?.name) {
        foundDoc = user.name;
      } else {
        foundDoc = DEFAULT_CLINIC.doctorName;
      }
    }

    let docName = formatDocTitle(foundDoc);
    let docDegree = patientData?.doctorDegree || (user?.role === 'doctor' ? user?.specialization : null) || DEFAULT_CLINIC.doctorDegree;

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

      // Detect Department from patientData first, then fallback to Doctor/User assigned department
      const userDept = (user?.department || user?.departments?.[0] || '').toLowerCase();
      const patientExplicitDept = (
        patientData.department ||
        patientData.dept ||
        patientData.lead?.department ||
        patientData.task?.department ||
        patientData.raw?.department ||
        patientData.lead_id?.department ||
        ''
      ).toLowerCase();

      const rawProblemText = (
        patientData.problem ||
        patientData.treatingFor ||
        patientData.disease ||
        patientData.description ||
        patientData.lead?.problem ||
        patientData.task?.problem ||
        ''
      ).toLowerCase();

      let targetDept = 'male';

      // 1. For doctor role with a single assigned department, strictly default to that assigned department
      if (user?.role === 'doctor' && allowedDeptKeys.length === 1) {
        targetDept = allowedDeptKeys[0];
      }
      // 2. Check patient explicit department field if doctor has multiple/admin access
      else if (['male', 'skin', 'ortho'].includes(patientExplicitDept)) {
        targetDept = patientExplicitDept;
      }
      // 3. Check problem keywords for Ortho, Skin, or Male
      else if (
        rawProblemText.includes('ortho') ||
        rawProblemText.includes('joint') ||
        rawProblemText.includes('spine') ||
        rawProblemText.includes('knee') ||
        rawProblemText.includes('bone') ||
        rawProblemText.includes('back pain') ||
        rawProblemText.includes('arthritis')
      ) {
        targetDept = 'ortho';
      } else if (
        rawProblemText.includes('skin') ||
        rawProblemText.includes('derma') ||
        rawProblemText.includes('acne') ||
        rawProblemText.includes('eczema') ||
        rawProblemText.includes('psoriasis') ||
        rawProblemText.includes('fungal') ||
        rawProblemText.includes('itching') ||
        rawProblemText.includes('ringworm')
      ) {
        targetDept = 'skin';
      } else if (
        rawProblemText.includes('male') ||
        rawProblemText.includes('sperm') ||
        rawProblemText.includes('erect') ||
        rawProblemText.includes('timing') ||
        rawProblemText.includes('semen') ||
        rawProblemText.includes('libido') ||
        rawProblemText.includes('testosterone')
      ) {
        targetDept = 'male';
      }
      // 4. Fallback to Doctor/User assigned department
      else if (['male', 'skin', 'ortho'].includes(userDept)) {
        targetDept = userDept;
      }

      // Restrict targetDept to doctor's permitted department permissions unless admin/manager
      if (!allowedDeptKeys.includes(targetDept) && !['admin', 'manager'].includes(user?.role)) {
        targetDept = allowedDeptKeys[0] || 'male';
      }

      applyDepartmentPreset(targetDept, !!patientData.problem);

    const isMongoId = (val) => typeof val === 'string' && /^[0-9a-fA-F]{24}$/.test(val.trim());

    const extractRawUserId = (obj) => {
      if (!obj) return null;
      let raw = obj.verifiedBy || obj.verified_by || obj.assignedTo || obj.createdBy;
      if (typeof raw === 'string' && isMongoId(raw)) return raw.trim();
      if (typeof raw === 'object' && raw?._id && isMongoId(raw._id)) return String(raw._id);
      if (obj.verification && typeof obj.verification === 'object') {
        let r = extractRawUserId(obj.verification);
        if (r) return r;
      }
      if (obj.lead && typeof obj.lead === 'object') {
        let r = extractRawUserId(obj.lead);
        if (r) return r;
      }
      if (obj.task && typeof obj.task === 'object') {
        let r = extractRawUserId(obj.task);
        if (r) return r;
      }
      return null;
    };

    const getVerifierName = (obj) => {
      if (!obj) return null;

      const clean = (v, strict = true) => {
        if (!v) return null;
        let name = null;
        let role = null;
        if (typeof v === 'object') {
          name = v.name;
          role = v.role;
        } else if (typeof v === 'string' && !isMongoId(v)) {
          name = v.trim();
        }
        if (!name || typeof name !== 'string' || isMongoId(name)) return null;
        if (strict) {
          const lower = name.toLowerCase();
          if (lower.includes('admin') || role === 'doctor' || lower.startsWith('dr.') || lower.startsWith('dr ')) {
            return null;
          }
        }
        return name.trim();
      };

      const searchObj = (o, strict) => {
        if (!o || typeof o !== 'object') return null;

        // 1. Explicit verifiedBy / verifierName
        let n = clean(o.verifiedBy, strict) || clean(o.verified_by, strict) || clean(o.verifiedByName, strict) || clean(o.verifierName, strict);
        if (n) return n;

        // 2. Verification sub-record
        if (o.verification && typeof o.verification === 'object') {
          n = searchObj(o.verification, strict);
          if (n) return n;
        }

        // 3. Lead sub-record assignedTo / createdBy (the closer who submitted verification)
        if (o.lead && typeof o.lead === 'object') {
          n = clean(o.lead.assignedTo, strict) || clean(o.lead.createdBy, strict);
          if (n) return n;
        }

        // 4. Task sub-record assignedTo / createdBy
        if (o.task && typeof o.task === 'object') {
          n = clean(o.task.assignedTo, strict) || clean(o.task.createdBy, strict);
          if (n) return n;
        }

        // 5. Direct assignedTo / createdBy / staffName
        n = clean(o.assignedTo, strict) || clean(o.createdBy, strict) || clean(o.staffName, strict);
        if (n) return n;

        return null;
      };

      // Pass 1: Strict search for sales/support/verification staff (excluding doctor & admin)
      let name = searchObj(obj, true);
      if (name) return name;

      // Pass 2: Fallback search if no non-doctor staff name found
      return searchObj(obj, false);
    };

    const verifierVal = getVerifierName(patientData) || '';

    setPatientInfo((prev) => ({
      ...prev,
      name: patientData.patientName || patientData.billing_customer_name || patientData.customer_name || patientData.name || 'Patient',
      mobile: patientData.mobile || patientData.billing_phone || patientData.phone_number || patientData.phone || '',
      pid: cleanPid,
      prescriptionId: patientData.prescriptionId || `${randomPrescId} (${(patientData.state || 'INDIA').toUpperCase()})`,
      amount: patientData.amount ? `₹${patientData.amount} (${patientData.payment_type || patientData.paymentMethod || 'cod'})` : patientData.sub_total ? `₹${patientData.sub_total} (cod)` : '',
      verifierName: verifierVal,
    }));

    const cleanMobile = (patientData.mobile || patientData.billing_phone || patientData.phone_number || patientData.phone || '').replace(/\D/g, '').slice(-10);

    const fetchUserByIdIfRaw = (rawId) => {
      if (!rawId || !isMongoId(rawId)) return;
      API.get(`/users/${rawId}`)
        .then((res) => {
          const u = res.data?.data || res.data;
          if (u?.name && !isMongoId(u.name)) {
            setPatientInfo((prev) => ({ ...prev, verifierName: u.name }));
          }
        })
        .catch(() => {});
    };

    const applyVitals = (obj) => {
      if (!obj) return;
      const a = obj.age ?? obj.lead?.age ?? obj.lead_id?.age;
      const w = obj.weight ?? obj.lead?.weight ?? obj.lead_id?.weight;
      const g = obj.gender ?? obj.lead?.gender ?? obj.lead_id?.gender ?? obj.sex;
      const m = obj.maritalStatus ?? obj.marriedStatus ?? obj.marital_status ?? obj.marital ?? obj.lead?.maritalStatus ?? obj.lead_id?.maritalStatus ?? obj.lead?.marriedStatus;
      const p = obj.occupation ?? obj.profession ?? obj.lead?.occupation ?? obj.lead_id?.occupation;
      const s = obj.problemDuration ?? obj.since ?? obj.duration ?? obj.lead?.problemDuration ?? obj.lead_id?.problemDuration;
      const t = obj.problem ?? obj.disease ?? obj.treatingFor ?? obj.lead?.problem ?? obj.lead_id?.problem;
      const verifier = getVerifierName(obj);

      setPatientInfo((prev) => ({
        ...prev,
        age: (a !== undefined && a !== null && a !== '' && a !== '-') ? String(a) : prev.age,
        weight: (w !== undefined && w !== null && w !== '' && w !== '-') ? String(w) : prev.weight,
        gender: (g !== undefined && g !== null && g !== '' && g !== '-') ? String(g) : prev.gender,
        marriedStatus: (m !== undefined && m !== null && m !== '' && m !== '-') ? String(m) : prev.marriedStatus,
        profession: (p !== undefined && p !== null && p !== '' && p !== '-') ? String(p) : prev.profession,
        since: (s !== undefined && s !== null && s !== '' && s !== '-') ? String(s) : prev.since,
        treatingFor: (t !== undefined && t !== null && t !== '' && t !== '-') ? String(t) : prev.treatingFor,
        verifierName: verifier || prev.verifierName,
      }));

      if (!verifier) {
        const rawId = extractRawUserId(obj);
        if (rawId) fetchUserByIdIfRaw(rawId);
      }
    };

      // 1. Initial apply from patientData & populated lead/raw objects
      applyVitals(patientData.lead || patientData.lead_id || patientData.raw?.lead);
      applyVitals(patientData.raw);
      applyVitals(patientData);

      // Load prescribedMedicines if saved on patientData or populated objects
      const extractMeds = (obj) => {
        if (!obj) return null;
        if (Array.isArray(obj.prescribedMedicines) && obj.prescribedMedicines.length > 0) return obj.prescribedMedicines;
        if (Array.isArray(obj.prescribed_medicines) && obj.prescribed_medicines.length > 0) return obj.prescribed_medicines;
        if (Array.isArray(obj.medicines) && obj.medicines.length > 0) return obj.medicines;
        if (obj.doctor_prescription && Array.isArray(obj.doctor_prescription.prescribedMedicines) && obj.doctor_prescription.prescribedMedicines.length > 0) return obj.doctor_prescription.prescribedMedicines;
        return null;
      };

      const mList =
        extractMeds(patientData) ||
        extractMeds(patientData.lead) ||
        extractMeds(patientData.lead_id) ||
        extractMeds(patientData.task) ||
        extractMeds(patientData.verification) ||
        extractMeds(patientData.appointment) ||
        [];

      setPrescribedMedicines(mList);

      // 2. Dedicated fetch from MongoDB Prescription collection
      const targetId = patientData._id || patientData.id || patientData.pid;
      const leadId = patientData.lead?._id || patientData.lead || patientData.lead_id?._id || patientData.lead_id;
      const taskId = patientData.task?._id || patientData.task;

      if (targetId || leadId || taskId || cleanMobile) {
        API.get('/prescriptions/get-by-target', {
          params: {
            targetId: targetId ? String(targetId) : undefined,
            leadId: leadId ? String(leadId) : undefined,
            taskId: taskId ? String(taskId) : undefined,
            phone: cleanMobile || undefined,
          },
        })
          .then((res) => {
            const pData = res.data?.data;
            if (pData) {
              if (Array.isArray(pData.prescribedMedicines) && pData.prescribedMedicines.length > 0) {
                setPrescribedMedicines(pData.prescribedMedicines);
              }
              const savedDoc = getAssignedDoctorName(pData) || (pData.doctorName && !pData.doctorName.toLowerCase().includes('admin') ? pData.doctorName : null);
              if (savedDoc) {
                setClinic((prev) => ({
                  ...prev,
                  doctorName: formatDocTitle(savedDoc),
                  doctorDegree: pData.doctorDegree || prev.doctorDegree,
                }));
              }
              applyVitals(pData);
            }
          })
          .catch(() => {});
      }

      // 3. Async fetch verification details if targetId exists
      if (targetId) {
        API.get(`/verification/${targetId}`)
          .then((res) => {
            const v = res.data?.data || res.data;
            const verifDoc = getAssignedDoctorName(v);
            if (verifDoc) {
              setClinic((prev) => ({
                ...prev,
                doctorName: formatDocTitle(verifDoc),
              }));
            }
            applyVitals(v);
          })
          .catch(() => {});
      }

      // 4. Async fetch lead details directly if leadId exists
      if (leadId) {
        API.get(`/leads/${leadId}`)
          .then((res) => {
            const l = res.data?.data || res.data;
            const leadDoc = getAssignedDoctorName(l);
            if (leadDoc) {
              setClinic((prev) => ({
                ...prev,
                doctorName: formatDocTitle(leadDoc),
              }));
            }
            applyVitals(l);
          })
          .catch(() => {});
      }

      // 5. Async search lead by phone number to get exact Sales Team entry
      if (cleanMobile && cleanMobile.length >= 10) {
        API.get('/leads/search-phone', { params: { phone: cleanMobile } })
          .then((res) => {
            const list = res.data?.data || res.data;
            if (Array.isArray(list) && list.length > 0) {
              const foundLead = list.find((item) => item.age || item.weight || item.occupation || item.problemDuration) || list[0];
              const phoneLeadDoc = getAssignedDoctorName(foundLead);
              if (phoneLeadDoc) {
                setClinic((prev) => ({
                  ...prev,
                  doctorName: formatDocTitle(phoneLeadDoc),
                }));
              }
              applyVitals(foundLead);
            }
          })
          .catch(() => {});
      }
    } else {
      applyDepartmentPreset('male');
      setPrescribedMedicines([]);
    }
  }, [patientData, isOpen, user]);

  const allowedRoles = ['admin', 'manager', 'doctor'];
  if (!isOpen || !allowedRoles.includes(user?.role)) return null;

  if (!['admin', 'manager'].includes(user?.role) && allowedDeptKeys.length === 0) {
    return createPortal(
      <div className="prescription-portal-container" style={{ position: 'fixed', inset: 0, zIndex: 99999 }}>
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.75)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: '#fff', padding: '32px', borderRadius: '16px', maxWidth: '440px', width: '100%', textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔒</div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>No Department Access</h3>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>
              Your account has no department permissions assigned. Please ask an Admin to grant you access in Staff Directory.
            </p>
            <button type="button" onClick={onClose} style={{ backgroundColor: '#0f172a', color: '#fff', padding: '10px 24px', borderRadius: '8px', border: 'none', fontWeight: 700, cursor: 'pointer' }}>
              Close
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

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

  const handleSaveDetails = async () => {
    if (!patientData) return;
    setSavingDetails(true);
    setSaveMsg('');
    try {
      const updateData = {
        age: patientInfo.age,
        weight: patientInfo.weight,
        gender: patientInfo.gender,
        maritalStatus: patientInfo.marriedStatus,
        occupation: patientInfo.profession,
        problemDuration: patientInfo.since,
        problem: patientInfo.treatingFor,
        prescribedMedicines: prescribedMedicines,
      };

      const targetId = patientData._id || patientData.id || patientData.pid;
      const leadId = patientData.lead?._id || patientData.lead || patientData.lead_id?._id || patientData.lead_id;
      const taskId = patientData.task?._id || patientData.task;

      // 1. Save to dedicated MongoDB Prescription collection
      await API.post('/prescriptions/save', {
        targetId: targetId ? String(targetId) : undefined,
        leadId: leadId ? String(leadId) : undefined,
        taskId: taskId ? String(taskId) : undefined,
        patientName: patientInfo.name,
        phone: patientInfo.mobile,
        age: patientInfo.age,
        weight: patientInfo.weight,
        gender: patientInfo.gender,
        maritalStatus: patientInfo.marriedStatus,
        occupation: patientInfo.profession,
        problemDuration: patientInfo.since,
        problem: patientInfo.treatingFor,
        doctorName: clinic.doctorName,
        doctorDegree: clinic.doctorDegree,
        department: selectedDeptKey,
        prescribedMedicines: prescribedMedicines,
        complaints: complaints,
      }).catch((err) => console.error('Prescription save error:', err));

      // 2. Sync to related entity models for backward compatibility
      if (leadId) await API.patch(`/leads/${leadId}`, updateData).catch(() => {});
      if (taskId) await API.patch(`/tasks/${taskId}`, updateData).catch(() => {});
      if (targetId) {
        await API.patch(`/verification/${targetId}`, updateData).catch(() => {});
        await API.patch(`/readytoshipment/${targetId}`, updateData).catch(() => {});
        await API.patch(`/appointments/${targetId}`, updateData).catch(() => {});
      }

      // Sync to local patientData reference so UI remains in sync
      patientData.prescribedMedicines = prescribedMedicines;
      if (patientData.lead && typeof patientData.lead === 'object') {
        patientData.lead.prescribedMedicines = prescribedMedicines;
      }

      setSaveMsg('✓ Details saved & synced to database!');
      setTimeout(() => setSaveMsg(''), 3000);
    } catch (err) {
      setSaveMsg('⚠ Saved locally for this session.');
      setTimeout(() => setSaveMsg(''), 3000);
    } finally {
      setSavingDetails(false);
    }
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
              {/* Department Switcher Dropdown */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>Dept:</span>
                <select
                  value={selectedDeptKey}
                  onChange={(e) => applyDepartmentPreset(e.target.value)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#0f172a',
                    cursor: 'pointer',
                    outline: 'none',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  }}
                >
                  {allowedDeptKeys.includes('male') && <option value="male">♂️ Male Health</option>}
                  {allowedDeptKeys.includes('skin') && <option value="skin">🌿 Skin Care</option>}
                  {allowedDeptKeys.includes('ortho') && <option value="ortho">🦴 Ortho & Joint Care</option>}
                </select>
              </div>

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
                {/* 👤 Patient Info & Vitals Section */}
                <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>👤 Patient Info & Vitals (Age, Gender, Marital Status, Weight, Profession, Duration)</span>
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr 1fr 1.5fr 1.5fr 2fr', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: 3 }}>
                        Age
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 25 Yrs"
                        value={patientInfo.age}
                        onChange={(e) => setPatientInfo({ ...patientInfo, age: e.target.value })}
                        style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: 600 }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: 3 }}>
                        Gender
                      </label>
                      <select
                        value={patientInfo.gender}
                        onChange={(e) => setPatientInfo({ ...patientInfo, gender: e.target.value })}
                        style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: 600, backgroundColor: '#fff' }}
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: 3 }}>
                        Marital Status
                      </label>
                      <select
                        value={patientInfo.marriedStatus}
                        onChange={(e) => setPatientInfo({ ...patientInfo, marriedStatus: e.target.value })}
                        style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: 600, backgroundColor: '#fff' }}
                      >
                        <option value="Single">Single</option>
                        <option value="Married">Married</option>
                        <option value="Divorced">Divorced</option>
                        <option value="Widowed">Widowed</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: 3 }}>
                        Weight
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 63 Kg"
                        value={patientInfo.weight}
                        onChange={(e) => setPatientInfo({ ...patientInfo, weight: e.target.value })}
                        style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: 600 }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: 3 }}>
                        Profession / Occupation
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Service / Business"
                        value={patientInfo.profession}
                        onChange={(e) => setPatientInfo({ ...patientInfo, profession: e.target.value })}
                        style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: 600 }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: 3 }}>
                        Since (Problem Duration)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 2 Years"
                        value={patientInfo.since}
                        onChange={(e) => setPatientInfo({ ...patientInfo, since: e.target.value })}
                        style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: 600 }}
                      />
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: 3 }}>
                        Treating For / Problem (Point-Wise)
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Problem Description"
                        value={patientInfo.treatingFor}
                        onChange={(e) => setPatientInfo({ ...patientInfo, treatingFor: e.target.value })}
                        style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: 600, fontFamily: 'inherit', resize: 'vertical' }}
                      />
                    </div>
                  </div>
                </div>

                {/* 💊 Prescribed Custom Medicines Section */}
                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>💊 Prescribed Medicines (Doctor Custom Rx)</span>
                    <button
                      type="button"
                      onClick={() => setActiveTab('preview')}
                      style={{
                        backgroundColor: '#0284c7',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '5px 12px',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        boxShadow: '0 2px 4px rgba(2, 132, 199, 0.25)',
                      }}
                    >
                      <Eye size={13} /> View Printable Prescription Grid →
                    </button>
                  </h4>



                  {/* Add New Medicine Form */}
                  <div style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 1.2fr 1.3fr 1.3fr 1fr auto', gap: '10px', alignItems: 'flex-start' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: 3 }}>
                          Medicine Name
                        </label>
                        <input
                          ref={medicineInputRef}
                          type="text"
                          placeholder="e.g. Clematis Erecta Q / Acid Phos 30"
                          value={newMed.name}
                          onChange={(e) => setNewMed({ ...newMed, name: e.target.value })}
                          onKeyDown={(e) => e.key === 'Enter' && addPrescribedMedicine()}
                          style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: 600 }}
                        />
                      </div>

                      {/* Dose / Quantity Dropdown */}
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: 3 }}>
                          Dose / Quantity
                        </label>
                        <select
                          value={['15 Drops', '10 Drops', '5 Drops', '20 Drops', '1 Tab', '2 Tab', '3 Tab', '1 Cap', '2 Cap', '1 Spoon (5ml)', '2 Spoon (10ml)', 'Half Spoon (2.5ml)', '1 Puff / Spray', '2 Puff / Spray', 'Local Application (लेप/तेल)'].includes(newMed.dosage) ? newMed.dosage : 'custom'}
                          onChange={(e) => {
                            if (e.target.value !== 'custom') {
                              setNewMed({ ...newMed, dosage: e.target.value });
                            }
                          }}
                          style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: 600, backgroundColor: '#ffffff', color: '#0f172a' }}
                        >
                          <option value="15 Drops">15 Drops (15 बूँद)</option>
                          <option value="10 Drops">10 Drops (10 बूँद)</option>
                          <option value="5 Drops">5 Drops (5 बूँद)</option>
                          <option value="20 Drops">20 Drops (20 बूँद)</option>
                          <option value="1 Tab">1 Tab (1 गोली)</option>
                          <option value="2 Tab">2 Tab (2 गोली)</option>
                          <option value="3 Tab">3 Tab (3 गोली)</option>
                          <option value="1 Cap">1 Cap (1 कैप्सूल)</option>
                          <option value="2 Cap">2 Cap (2 कैप्सूल)</option>
                          <option value="1 Spoon (5ml)">1 Spoon (5ml / 1 चम्मच)</option>
                          <option value="2 Spoon (10ml)">2 Spoon (10ml / 2 चम्मच)</option>
                          <option value="Half Spoon (2.5ml)">Half Spoon (2.5ml / आधा चम्मच)</option>
                          <option value="1 Puff / Spray">1 Puff / Spray</option>
                          <option value="2 Puff / Spray">2 Puff / Spray</option>
                          <option value="Local Application (लेप/तेल)">Local Application (स्थानिक लेप/तेल)</option>
                          <option value="custom">✏️ Custom / Type Value...</option>
                        </select>
                        {(!['15 Drops', '10 Drops', '5 Drops', '20 Drops', '1 Tab', '2 Tab', '3 Tab', '1 Cap', '2 Cap', '1 Spoon (5ml)', '2 Spoon (10ml)', 'Half Spoon (2.5ml)', '1 Puff / Spray', '2 Puff / Spray', 'Local Application (लेप/तेल)'].includes(newMed.dosage)) && (
                          <input
                            type="text"
                            placeholder="Type custom dose..."
                            value={newMed.dosage}
                            onChange={(e) => setNewMed({ ...newMed, dosage: e.target.value })}
                            style={{ width: '100%', marginTop: '4px', padding: '5px 8px', borderRadius: '4px', border: '1px solid #0284c7', fontSize: '11px', fontWeight: 600 }}
                          />
                        )}
                      </div>

                      {/* Frequency Dropdown */}
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: 3 }}>
                          Frequency
                        </label>
                        <select
                          value={
                            [
                              'BD', 'BD (Twice Daily / दिन में 2 बार)',
                              'OD', 'OD (Once Daily / दिन में 1 बार)',
                              'TDS', 'TDS (Thrice Daily / दिन में 3 बार)',
                              'QID', 'QID (4 Times Daily)',
                              'HS', 'HS (At Bedtime / रात को सोते समय)',
                              'SOS', 'SOS (As Needed / आवश्यकतानुसार)',
                              'Weekly Once', 'Weekly Once (सप्ताह में 1 बार)',
                              'Weekly Twice', 'Weekly Twice (सप्ताह में 2 बार)',
                              'Weekly Thrice', 'Weekly Thrice (सप्ताह में 3 बार)',
                              'Alternate Days', 'Alternate Days (एक दिन छोड़कर)',
                              'Monthly Once', 'Monthly Once (महीने में 1 बार)',
                              'Every 15 Days', 'Every 15 Days (15 दिन में 1 बार)'
                            ].includes(newMed.frequency)
                              ? newMed.frequency
                              : 'custom'
                          }
                          onChange={(e) => {
                            if (e.target.value !== 'custom') {
                              setNewMed({ ...newMed, frequency: e.target.value });
                            }
                          }}
                          style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: 600, backgroundColor: '#ffffff', color: '#0f172a' }}
                        >
                          <option value="BD (Twice Daily / दिन में 2 बार)">BD (Twice Daily / दिन में 2 बार)</option>
                          <option value="OD (Once Daily / दिन में 1 बार)">OD (Once Daily / दिन में 1 बार)</option>
                          <option value="TDS (Thrice Daily / दिन में 3 बार)">TDS (Thrice Daily / दिन में 3 बार)</option>
                          <option value="QID (4 Times Daily)">QID (4 Times Daily)</option>
                          <option value="HS (At Bedtime / रात को सोते समय)">HS (At Bedtime / रात को सोते समय)</option>
                          <option value="SOS (As Needed / आवश्यकतानुसार)">SOS (As Needed / आवश्यकतानुसार)</option>
                          <option value="Weekly Once (सप्ताह में 1 बार)">Weekly Once (सप्ताह में 1 बार)</option>
                          <option value="Weekly Twice (सप्ताह में 2 बार)">Weekly Twice (सप्ताह में 2 बार)</option>
                          <option value="Weekly Thrice (सप्ताह में 3 बार)">Weekly Thrice (सप्ताह में 3 बार)</option>
                          <option value="Alternate Days (एक दिन छोड़कर)">Alternate Days (एक दिन छोड़कर)</option>
                          <option value="Monthly Once (महीने में 1 बार)">Monthly Once (महीने में 1 बार)</option>
                          <option value="Every 15 Days (15 दिन में 1 बार)">Every 15 Days (15 दिन में 1 बार)</option>
                          <option value="BD">BD (Short)</option>
                          <option value="OD">OD (Short)</option>
                          <option value="TDS">TDS (Short)</option>
                          <option value="QID">QID (Short)</option>
                          <option value="HS">HS (Short)</option>
                          <option value="SOS">SOS (Short)</option>
                          <option value="Weekly Once">Weekly Once (Short)</option>
                          <option value="Weekly Twice">Weekly Twice (Short)</option>
                          <option value="Weekly Thrice">Weekly Thrice (Short)</option>
                          <option value="Alternate Days">Alternate Days (Short)</option>
                          <option value="custom">✏️ Custom / Type Frequency...</option>
                        </select>
                        {!['BD', 'BD (Twice Daily / दिन में 2 बार)', 'OD', 'OD (Once Daily / दिन में 1 बार)', 'TDS', 'TDS (Thrice Daily / दिन में 3 बार)', 'QID', 'QID (4 Times Daily)', 'HS', 'HS (At Bedtime / रात को सोते समय)', 'SOS', 'SOS (As Needed / आवश्यकतानुसार)', 'Weekly Once', 'Weekly Once (सप्ताह में 1 बार)', 'Weekly Twice', 'Weekly Twice (सप्ताह में 2 बार)', 'Weekly Thrice', 'Weekly Thrice (सप्ताह में 3 बार)', 'Alternate Days', 'Alternate Days (एक दिन छोड़कर)', 'Monthly Once', 'Monthly Once (महीने में 1 बार)', 'Every 15 Days', 'Every 15 Days (15 दिन में 1 बार)'].includes(newMed.frequency) && (
                          <input
                            type="text"
                            placeholder="Type custom frequency..."
                            value={newMed.frequency}
                            onChange={(e) => setNewMed({ ...newMed, frequency: e.target.value })}
                            style={{ width: '100%', marginTop: '4px', padding: '5px 8px', borderRadius: '4px', border: '1px solid #16a34a', fontSize: '11px', fontWeight: 600 }}
                          />
                        )}
                      </div>

                      {/* Timing / Instructions Dropdown */}
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: 3 }}>
                          Timing / Instructions
                        </label>
                        <select
                          value={['After Food', 'Before Food', 'Empty Stomach', 'With Warm Water', 'With Milk', 'At Bedtime'].includes(newMed.timing) ? newMed.timing : 'custom'}
                          onChange={(e) => {
                            if (e.target.value !== 'custom') {
                              setNewMed({ ...newMed, timing: e.target.value });
                            }
                          }}
                          style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: 600, backgroundColor: '#ffffff', color: '#0f172a' }}
                        >
                          <option value="After Food">After Food (खाना खाने के बाद)</option>
                          <option value="Before Food">Before Food (खाना खाने से पहले)</option>
                          <option value="Empty Stomach">Empty Stomach (खाली पेट)</option>
                          <option value="With Warm Water">With Warm Water (गुनगुने पानी के साथ)</option>
                          <option value="With Milk">With Milk (दूध के साथ)</option>
                          <option value="At Bedtime">At Bedtime (रात को सोते समय)</option>
                          <option value="custom">✏️ Custom / Type Timing...</option>
                        </select>
                        {(!['After Food', 'Before Food', 'Empty Stomach', 'With Warm Water', 'With Milk', 'At Bedtime'].includes(newMed.timing)) && (
                          <input
                            type="text"
                            placeholder="Type custom timing..."
                            value={newMed.timing}
                            onChange={(e) => setNewMed({ ...newMed, timing: e.target.value })}
                            style={{ width: '100%', marginTop: '4px', padding: '5px 8px', borderRadius: '4px', border: '1px solid #6366f1', fontSize: '11px', fontWeight: 600 }}
                          />
                        )}
                      </div>

                      {/* Duration Dropdown */}
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: 3 }}>
                          Duration
                        </label>
                        <select
                          value={['1 Month', '15 Days', '7 Days', '2 Months', '3 Months', '10 Days', 'Continue as advised'].includes(newMed.duration) ? newMed.duration : 'custom'}
                          onChange={(e) => {
                            if (e.target.value !== 'custom') {
                              setNewMed({ ...newMed, duration: e.target.value });
                            }
                          }}
                          style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: 600, backgroundColor: '#ffffff', color: '#0f172a' }}
                        >
                          <option value="1 Month">1 Month</option>
                          <option value="15 Days">15 Days</option>
                          <option value="7 Days">7 Days</option>
                          <option value="10 Days">10 Days</option>
                          <option value="2 Months">2 Months</option>
                          <option value="3 Months">3 Months</option>
                          <option value="Continue as advised">Continue as advised</option>
                          <option value="custom">✏️ Custom / Type Duration...</option>
                        </select>
                        {(!['1 Month', '15 Days', '7 Days', '2 Months', '3 Months', '10 Days', 'Continue as advised'].includes(newMed.duration)) && (
                          <input
                            type="text"
                            placeholder="Type custom duration..."
                            value={newMed.duration}
                            onChange={(e) => setNewMed({ ...newMed, duration: e.target.value })}
                            style={{ width: '100%', marginTop: '4px', padding: '5px 8px', borderRadius: '4px', border: '1px solid #0284c7', fontSize: '11px', fontWeight: 600 }}
                          />
                        )}
                      </div>

                      {/* Add / Update Medicine Button */}
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'transparent', marginBottom: 3 }}>
                          Action
                        </label>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={addPrescribedMedicine}
                            style={{
                              backgroundColor: editingMedId ? '#f59e0b' : '#0284c7',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '7px 16px',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              whiteSpace: 'nowrap',
                              boxShadow: editingMedId ? '0 2px 4px rgba(245, 158, 11, 0.3)' : '0 2px 4px rgba(2, 132, 199, 0.25)',
                              height: '33px',
                            }}
                          >
                            {editingMedId ? <Edit3 size={15} /> : <Plus size={15} />}
                            {editingMedId ? 'Update Medicine' : 'Add Medicine'}
                          </button>

                          {editingMedId && (
                            <button
                              type="button"
                              onClick={cancelEditMedicine}
                              style={{
                                backgroundColor: '#f1f5f9',
                                color: '#475569',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                padding: '7px 12px',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                height: '33px',
                              }}
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* List of Added Medicines */}
                  {prescribedMedicines.length > 0 ? (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                            <th style={{ padding: '6px 8px', width: '30px' }}>#</th>
                            <th style={{ padding: '6px 8px' }}>Medicine Name</th>
                            <th style={{ padding: '6px 8px' }}>Dose/Drops</th>
                            <th style={{ padding: '6px 8px' }}>Frequency</th>
                            <th style={{ padding: '6px 8px' }}>Timing</th>
                            <th style={{ padding: '6px 8px' }}>Duration</th>
                            <th style={{ padding: '6px 8px', textAlign: 'right' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {prescribedMedicines.map((m, idx) => (
                            <tr
                              key={m.id || idx}
                              style={{
                                borderBottom: '1px solid #e2e8f0',
                                backgroundColor: editingMedId === m.id ? '#fef3c7' : 'transparent',
                                transition: 'background-color 0.2s',
                              }}
                            >
                              <td style={{ padding: '6px 8px', fontWeight: 600, color: '#64748b' }}>{idx + 1}</td>
                              <td style={{ padding: '6px 8px', fontWeight: 700, color: '#0f172a' }}>
                                {m.name}
                                {editingMedId === m.id && (
                                  <span style={{ marginLeft: '6px', fontSize: '9px', fontWeight: 800, backgroundColor: '#f59e0b', color: '#fff', padding: '1px 5px', borderRadius: '4px' }}>
                                    Editing...
                                  </span>
                                )}
                              </td>
                              <td style={{ padding: '6px 8px', fontWeight: 700, color: '#0284c7' }}>{m.dosage}</td>
                              <td style={{ padding: '6px 8px', fontWeight: 700, color: '#16a34a' }}>{m.frequency}</td>
                              <td style={{ padding: '6px 8px', color: '#475569' }}>{m.timing}</td>
                              <td style={{ padding: '6px 8px', color: '#475569' }}>{m.duration}</td>
                              <td style={{ padding: '6px 8px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                {/* Edit Button (Doctor & Admin) */}
                                {['admin', 'manager', 'doctor'].includes(user?.role) && (
                                  <button
                                    type="button"
                                    onClick={() => startEditMedicine(m)}
                                    title="Edit Medicine"
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      color: editingMedId === m.id ? '#f59e0b' : '#0284c7',
                                      cursor: 'pointer',
                                      padding: '4px 6px',
                                      borderRadius: '4px',
                                      marginRight: '4px',
                                    }}
                                  >
                                    <Edit3 size={15} />
                                  </button>
                                )}

                                {/* Delete Button */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (editingMedId === m.id) cancelEditMedicine();
                                    removePrescribedMedicine(m.id);
                                  }}
                                  title="Remove Medicine"
                                  style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px 6px' }}
                                >
                                  <Trash2 size={15} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div style={{ padding: '24px', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', color: '#64748b', fontSize: '13px', fontWeight: 500 }}>
                      📋 No custom medicines added yet. Type a medicine name above and click <strong>"+ Add Medicine"</strong> to add.
                    </div>
                  )}
                </div>

                <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {saveMsg ? (
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#16a34a' }}>{saveMsg}</span>
                  ) : <span />}
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      type="button"
                      onClick={handleSaveDetails}
                      disabled={savingDetails}
                      style={{
                        backgroundColor: '#16a34a',
                        color: '#ffffff',
                        padding: '10px 22px',
                        borderRadius: '8px',
                        border: 'none',
                        fontWeight: 700,
                        fontSize: '13px',
                        cursor: 'pointer',
                        opacity: savingDetails ? 0.6 : 1,
                        boxShadow: '0 2px 4px rgba(22, 163, 74, 0.25)',
                      }}
                    >
                      {savingDetails ? 'Saving...' : '💾 Save Details to Database'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('preview')}
                      style={{
                        backgroundColor: '#0284c7',
                        color: '#ffffff',
                        padding: '10px 24px',
                        borderRadius: '8px',
                        border: 'none',
                        fontWeight: 800,
                        fontSize: '13px',
                        cursor: 'pointer',
                        boxShadow: '0 4px 8px rgba(2, 132, 199, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <Eye size={16} /> View Printable Prescription Grid →
                    </button>
                  </div>
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
                    ID : <strong>{patientInfo.prescriptionId}</strong>{patientInfo.verifierName ? ` | ${patientInfo.verifierName}` : ''}
                  </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', fontSize: '11px', borderTop: '1px dashed #ccc', paddingTop: '4px', color: '#0f172a' }}>
                  <span>Age: <strong>{patientInfo.age || '-'}</strong></span>
                  <span style={{ color: '#cbd5e1' }}>|</span>
                  <span>Gender: <strong>{patientInfo.gender || 'Male'}</strong></span>
                  <span style={{ color: '#cbd5e1' }}>|</span>
                  <span>Marital Status: <strong>{patientInfo.marriedStatus || '-'}</strong></span>
                  <span style={{ color: '#cbd5e1' }}>|</span>
                  <span>Weight: <strong>{patientInfo.weight ? `${patientInfo.weight}` : '-'}</strong></span>
                  <span style={{ color: '#cbd5e1' }}>|</span>
                  <span>Since: <strong>{patientInfo.since || '-'}</strong></span>
                  <span style={{ color: '#cbd5e1' }}>|</span>
                  <span>Profession: <strong>{patientInfo.profession || '-'}</strong></span>
                  {patientInfo.previousMedicines && patientInfo.previousMedicines !== 'No' && (
                    <>
                      <span style={{ color: '#cbd5e1' }}>|</span>
                      <span>Previous Medicines: <strong>{patientInfo.previousMedicines}</strong></span>
                    </>
                  )}
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', gap: '10px', fontSize: '11px', marginTop: '4px', paddingTop: '4px', borderTop: '1px solid #f1f5f9' }}>
                  <div style={{ flex: 1, minWidth: '240px', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                    Treating For: <span style={{ textDecoration: 'underline', fontWeight: 600 }}>{patientInfo.treatingFor}</span>
                  </div>
                  <div style={{ fontSize: '10px', color: '#475569', whiteSpace: 'nowrap' }}>
                    Print Time: {patientInfo.printTime}
                  </div>
                  {patientInfo.extraDetails ? <div style={{ fontSize: '10px', color: '#475569' }}>Extra Details: {patientInfo.extraDetails}</div> : null}
                </div>
              </div>

              {/* Chief Complaints List */}
              {((complaints && complaints.length > 0) || (patientInfo.assasaryComplain && patientInfo.assasaryComplain !== 'No')) && (
                <div style={{ marginBottom: '10px', fontSize: '12px' }}>
                  {complaints.map((c, idx) => (
                    <div key={idx} style={{ lineHeight: 1.35, marginBottom: '2px' }}>
                      {idx + 1}. {c}
                    </div>
                  ))}
                  {patientInfo.assasaryComplain && patientInfo.assasaryComplain !== 'No' && (
                    <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
                      Associated Complaint - {patientInfo.assasaryComplain}
                    </div>
                  )}
                </div>
              )}

              {/* Prescribed Medicines Rx Table */}
              <div style={{ marginTop: '12px', marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid #000', paddingBottom: '3px', marginBottom: '6px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#000000' }}>
                    Rx - PRESCRIBED MEDICINES & DOSAGE
                  </div>
                  <button
                    type="button"
                    className="prescription-no-print"
                    onClick={() => {
                      setActiveTab('edit');
                      setTimeout(() => {
                        medicineInputRef.current?.scrollIntoView({ behavior: 'smooth' });
                        medicineInputRef.current?.focus();
                      }, 100);
                    }}
                    style={{
                      backgroundColor: '#0284c7',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '4px 12px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      boxShadow: '0 2px 4px rgba(2, 132, 199, 0.25)',
                    }}
                  >
                    <Plus size={13} /> + Add Medicine
                  </button>
                </div>

                {prescribedMedicines.length > 0 && (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1.5px solid #000' }}>
                        <th style={{ padding: '5px 6px', width: '35px', border: '1px solid #000' }}>S.No</th>
                        <th style={{ padding: '5px 8px', border: '1px solid #000' }}>Medicine Name</th>
                        <th style={{ padding: '5px 8px', width: '110px', border: '1px solid #000' }}>Dose / Drops</th>
                        <th style={{ padding: '5px 8px', width: '90px', border: '1px solid #000' }}>Frequency</th>
                        <th style={{ padding: '5px 8px', width: '120px', border: '1px solid #000' }}>Timing / Instruction</th>
                        <th style={{ padding: '5px 8px', width: '90px', border: '1px solid #000' }}>Duration</th>
                        <th className="prescription-no-print" style={{ padding: '5px 8px', width: '40px', border: '1px solid #000', textAlign: 'center' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {prescribedMedicines.map((med, index) => (
                        <tr key={med.id || index} style={{ borderBottom: '1px solid #000' }}>
                          <td style={{ padding: '5px 6px', fontWeight: 'bold', textAlign: 'center', border: '1px solid #000' }}>{index + 1}</td>
                          <td style={{ padding: '5px 8px', fontWeight: 'bold', color: '#000', border: '1px solid #000' }}>{med.name}</td>
                          <td style={{ padding: '5px 8px', fontWeight: 'bold', color: '#000', border: '1px solid #000' }}>{med.dosage}</td>
                          <td style={{ padding: '5px 8px', fontWeight: 'bold', color: '#000', border: '1px solid #000' }}>{med.frequency}</td>
                          <td style={{ padding: '5px 8px', color: '#000', border: '1px solid #000' }}>{med.timing}</td>
                          <td style={{ padding: '5px 8px', color: '#000', border: '1px solid #000' }}>{med.duration}</td>
                          <td className="prescription-no-print" style={{ padding: '5px 8px', border: '1px solid #000', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => removePrescribedMedicine(med.id)}
                              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px' }}
                              title="Delete medicine"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>


            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
