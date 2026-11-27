import { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  getReports,
  uploadReport,
  deleteReport,
  lookupCustomer,
  getReportViewUrl,
  getReportDownloadUrl,
} from '../services/gallery.service';
import Modal from '../components/ui/Modal';
import {
  Search,
  UploadCloud,
  FileText,
  Image as ImageIcon,
  Download,
  Trash2,
  Eye,
  RefreshCw,
  Phone,
  Hash,
  Calendar,
  User,
  Filter,
  Grid,
  List,
  ZoomIn,
  ZoomOut,
  RotateCw,
  ExternalLink,
  CheckCircle2,
  X,
  FileSpreadsheet,
} from 'lucide-react';

const REPORT_TYPES = [
  { value: 'all', label: 'All Report Types' },
  { value: 'blood_test', label: 'Blood Test' },
  { value: 'semen_analysis', label: 'Semen Analysis' },
  { value: 'urine_test', label: 'Urine Test' },
  { value: 'mri_scan', label: 'MRI / CT Scan' },
  { value: 'x_ray', label: 'X-Ray' },
  { value: 'ultrasound', label: 'Ultrasound (USG)' },
  { value: 'skin_report', label: 'Skin / Allergy Report' },
  { value: 'prescription', label: 'Prescription' },
  { value: 'discharge_summary', label: 'Discharge Summary' },
  { value: 'other', label: 'Other' },
];

const REPORT_TYPE_COLORS = {
  blood_test: 'bg-rose-50 text-rose-700 border-rose-200',
  semen_analysis: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  urine_test: 'bg-amber-50 text-amber-700 border-amber-200',
  mri_scan: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  x_ray: 'bg-sky-50 text-sky-700 border-sky-200',
  ultrasound: 'bg-teal-50 text-teal-700 border-teal-200',
  skin_report: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  prescription: 'bg-purple-50 text-purple-700 border-purple-200',
  discharge_summary: 'bg-blue-50 text-blue-700 border-blue-200',
  other: 'bg-gray-50 text-gray-700 border-gray-200',
};

const DEPARTMENTS = [
  { value: 'all', label: 'All Departments' },
  { value: 'male', label: 'Male Health' },
  { value: 'ortho', label: 'Ortho / Joints' },
  { value: 'skin', label: 'Skin Care' },
  { value: 'general', label: 'General' },
];

export default function Gallery() {
  const { user } = useAuth();
  const { showToast } = useToast();

  // Data state
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filter state
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('galleryViewMode') || 'table'); // 'table' (default) | 'grid'

  // Modals state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [activeViewerReport, setActiveViewerReport] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // Upload Form state
  const [uploadForm, setUploadForm] = useState({
    patientName: '',
    phone: '',
    orderId: '',
    reportTitle: '',
    reportType: 'blood_test',
    department: 'general',
    reportDate: new Date().toISOString().slice(0, 10),
    notes: '',
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-complete lookup suggestions
  const [lookupResults, setLookupResults] = useState([]);
  const [isSearchingLookup, setIsSearchingLookup] = useState(false);
  const [showLookupDropdown, setShowLookupDropdown] = useState(false);
  const lookupRef = useRef(null);

  // Lightbox Zoom & Rotate
  const [zoomScale, setZoomScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [pdfViewMode, setPdfViewMode] = useState('google'); // 'google' | 'direct'

  // Fetch reports
  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 24,
      };
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (selectedDept !== 'all') params.department = selectedDept;
      if (selectedType !== 'all') params.reportType = selectedType;

      const res = await getReports(params);
      setReports(res.reports || []);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 1);
    } catch (err) {
      console.error('Failed to load gallery reports', err);
      showToast(err.response?.data?.message || 'Failed to fetch reports', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, selectedDept, selectedType, showToast]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Debounced search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
      setPage(1);
    }, 450);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Handle file select
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      showToast('File size 15MB se zyada nahi ho sakti', 'error');
      return;
    }

    setSelectedFile(file);
    const ext = (file.name || '').toLowerCase();
    const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|bmp|tiff|heic|heif)$/i.test(ext);

    if (isImage) {
      const reader = new FileReader();
      reader.onload = () => setFilePreview(reader.result);
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }

    // Auto fill title if empty
    if (!uploadForm.reportTitle) {
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      setUploadForm((prev) => ({ ...prev, reportTitle: nameWithoutExt }));
    }
  };

  // Customer auto lookup when typing phone or order ID in upload form
  const handleLookupQuery = async (val) => {
    if (!val || val.length < 3) {
      setLookupResults([]);
      setShowLookupDropdown(false);
      return;
    }
    try {
      setIsSearchingLookup(true);
      const results = await lookupCustomer(val);
      setLookupResults(results);
      setShowLookupDropdown(results.length > 0);
    } catch {
      setLookupResults([]);
    } finally {
      setIsSearchingLookup(false);
    }
  };

  const applyLookupCustomer = (item) => {
    setUploadForm((prev) => ({
      ...prev,
      patientName: item.patientName || prev.patientName,
      phone: item.phone || prev.phone,
      orderId: item.orderId || prev.orderId,
      department: ['male', 'ortho', 'skin'].includes(item.department)
        ? item.department
        : prev.department,
    }));
    setShowLookupDropdown(false);
    showToast(`Filled details for ${item.patientName}`, 'success');
  };

  // Submit Upload
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      showToast('Please select a report image or PDF file', 'error');
      return;
    }
    if (!uploadForm.phone.trim()) {
      showToast('Customer Phone Number is required', 'error');
      return;
    }
    if (!uploadForm.patientName.trim()) {
      showToast('Patient Name is required', 'error');
      return;
    }
    if (!uploadForm.reportTitle.trim()) {
      showToast('Report Title is required', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('patientName', uploadForm.patientName.trim());
      formData.append('phone', uploadForm.phone.trim());
      formData.append('orderId', uploadForm.orderId.trim());
      formData.append('reportTitle', uploadForm.reportTitle.trim());
      formData.append('reportType', uploadForm.reportType);
      formData.append('department', uploadForm.department);
      formData.append('reportDate', uploadForm.reportDate);
      formData.append('notes', uploadForm.notes.trim());

      await uploadReport(formData);
      showToast('Report uploaded successfully to gallery!', 'success');
      setShowUploadModal(false);
      // Reset form
      setUploadForm({
        patientName: '',
        phone: '',
        orderId: '',
        reportTitle: '',
        reportType: 'blood_test',
        department: 'general',
        reportDate: new Date().toISOString().slice(0, 10),
        notes: '',
      });
      setSelectedFile(null);
      setFilePreview(null);
      fetchReports();
    } catch (err) {
      console.error('Upload failed', err);
      showToast(err.response?.data?.message || 'Failed to upload report', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete
  const handleDeleteReport = async (id) => {
    if (!window.confirm('Are you sure you want to delete this report from the gallery?')) {
      return;
    }
    try {
      setDeletingId(id);
      await deleteReport(id);
      showToast('Report removed successfully', 'success');
      setReports((prev) => prev.filter((r) => r._id !== id));
      setTotal((prev) => Math.max(0, prev - 1));
      if (activeViewerReport?._id === id) {
        setActiveViewerReport(null);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete report', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const openViewer = (report) => {
    setActiveViewerReport(report);
    setZoomScale(1);
    setRotation(0);
    setPdfViewMode('google');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* ─── Hero Header Banner ────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-white/10 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 backdrop-blur-md rounded-full text-emerald-300 text-xs font-semibold uppercase tracking-wider border border-emerald-500/30">
              <FileText className="w-3.5 h-3.5" />
              Patient Document Records
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              Reports Gallery
              <span className="text-xs bg-white/20 text-white px-2.5 py-0.5 rounded-full font-medium">
                {total} {total === 1 ? 'Report' : 'Reports'}
              </span>
            </h1>
            <p className="text-emerald-100/80 text-sm max-w-xl">
              Search and view patient medical test reports, semen analyses, blood tests, and scans
              instantly by <strong className="text-white">Phone Number</strong> or{' '}
              <strong className="text-white">Order ID</strong>.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => fetchReports()}
              disabled={loading}
              className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl backdrop-blur-md border border-white/10 transition active:scale-95 disabled:opacity-50"
              title="Refresh Reports"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-2xl shadow-lg shadow-emerald-500/25 flex items-center gap-2.5 transition active:scale-95 text-sm"
            >
              <UploadCloud className="w-5 h-5 text-slate-950" />
              Upload Report
            </button>
          </div>
        </div>
      </div>

      {/* ─── Search & Filtering Controls ─────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-100 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Main Search Input */}
          <div className="md:col-span-6 relative">
            <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by Phone Number (e.g. 9876543210), Order ID, or Patient Name..."
              className="w-full pl-11 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Department Filter */}
          <div className="md:col-span-3">
            <select
              value={selectedDept}
              onChange={(e) => {
                setSelectedDept(e.target.value);
                setPage(1);
              }}
              className="w-full py-3 px-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
            >
              {DEPARTMENTS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          {/* Report Type Filter */}
          <div className="md:col-span-2">
            <select
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value);
                setPage(1);
              }}
              className="w-full py-3 px-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
            >
              {REPORT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Grid / Table View Switcher */}
          <div className="md:col-span-1 flex items-center justify-end gap-1">
            <button
              onClick={() => {
                setViewMode('grid');
                localStorage.setItem('galleryViewMode', 'grid');
              }}
              className={`p-2.5 rounded-xl transition ${
                viewMode === 'grid'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
              }`}
              title="Grid View"
            >
              <Grid className="w-4.5 h-4.5" />
            </button>
            <button
              onClick={() => {
                setViewMode('table');
                localStorage.setItem('galleryViewMode', 'table');
              }}
              className={`p-2.5 rounded-xl transition ${
                viewMode === 'table'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
              }`}
              title="Table View"
            >
              <List className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>

        {/* Quick query indicator */}
        {(searchQuery || selectedDept !== 'all' || selectedType !== 'all') && (
          <div className="flex items-center flex-wrap gap-2 pt-2 border-t border-gray-100 text-xs text-gray-500">
            <span>Active filters:</span>
            {searchQuery && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200 font-medium">
                Search: "{searchQuery}"
                <button onClick={() => setSearchInput('')} className="hover:text-emerald-900">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {selectedDept !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg border border-blue-200 font-medium">
                Dept: {selectedDept}
                <button onClick={() => setSelectedDept('all')} className="hover:text-blue-900">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {selectedType !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 text-purple-700 rounded-lg border border-purple-200 font-medium">
                Type: {selectedType.replace('_', ' ')}
                <button onClick={() => setSelectedType('all')} className="hover:text-purple-900">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            <button
              onClick={() => {
                setSearchInput('');
                setSelectedDept('all');
                setSelectedType('all');
              }}
              className="text-xs text-rose-500 hover:underline font-semibold ml-auto"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </div>

      {/* ─── Gallery Content ────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[350px] bg-white rounded-3xl border border-gray-100">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="mt-4 text-sm font-medium text-gray-500">Loading medical reports...</p>
        </div>
      ) : reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[350px] bg-white rounded-3xl border border-dashed border-gray-200 p-8 text-center">
          <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 mb-4">
            <FileText className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-gray-800">No reports found</h3>
          <p className="text-gray-500 text-sm max-w-md mt-1 mb-6">
            {searchQuery
              ? `No medical reports matched "${searchQuery}". Please check the phone number or order ID and try again.`
              : 'There are no reports uploaded in the gallery yet. Click below to upload the first customer report.'}
          </p>
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-md text-sm transition"
          >
            Upload Patient Report
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* ─── Grid View ─────────────────────────────────────────────────── */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {reports.map((report) => {
            const isPdf = report.fileType === 'pdf';
            const typeColorCls =
              REPORT_TYPE_COLORS[report.reportType] || REPORT_TYPE_COLORS.other;

            return (
              <div
                key={report._id}
                className="group bg-white rounded-2xl border border-gray-100 hover:border-emerald-300 hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col"
              >
                {/* Thumbnail / File Header */}
                <div
                  onClick={() => openViewer(report)}
                  className="relative h-44 bg-slate-900 overflow-hidden cursor-pointer flex items-center justify-center group-hover:brightness-95 transition"
                >
                  {isPdf ? (
                    <div className="flex flex-col items-center justify-center text-rose-400 p-4">
                      <FileSpreadsheet className="w-12 h-12 mb-2 animate-pulse" />
                      <span className="text-xs font-bold uppercase tracking-wider text-rose-300">
                        PDF Document
                      </span>
                      <span className="text-[10px] text-gray-400 truncate max-w-[180px] mt-1">
                        {report.fileName || 'View PDF Report'}
                      </span>
                    </div>
                  ) : (
                    <img
                      src={report.fileUrl}
                      alt={report.reportTitle}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  )}

                  {/* Badges on preview */}
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap">
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border shadow-sm backdrop-blur-md ${typeColorCls}`}
                    >
                      {report.reportType?.replace('_', ' ').toUpperCase()}
                    </span>
                    {report.department && report.department !== 'general' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-black/60 text-white rounded-full uppercase tracking-wider backdrop-blur-md">
                        {report.department}
                      </span>
                    )}
                  </div>

                  {/* Hover Overlay Button */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <span className="p-2.5 bg-white text-gray-900 rounded-full shadow-lg hover:scale-110 transition">
                      <Eye className="w-5 h-5" />
                    </span>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h4
                      className="text-sm font-bold text-gray-900 group-hover:text-emerald-700 transition line-clamp-1"
                      title={report.reportTitle}
                    >
                      {report.reportTitle}
                    </h4>

                    {/* Patient & Phone Info */}
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-800">
                        <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="truncate">{report.patientName}</span>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-gray-600 font-mono">
                        <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="font-semibold text-gray-700">{report.phone}</span>
                      </div>

                      {report.orderId && (
                        <div className="flex items-center gap-1.5 text-[11px] text-indigo-700 font-bold bg-indigo-50/80 px-2 py-0.5 rounded-md w-fit border border-indigo-100">
                          <Hash className="w-3 h-3 text-indigo-500" />
                          <span>ORDER: {report.orderId}</span>
                        </div>
                      )}
                    </div>

                    {report.notes && (
                      <p className="mt-2 text-[11px] text-gray-500 line-clamp-2 italic bg-gray-50 p-1.5 rounded-lg border border-gray-100">
                        "{report.notes}"
                      </p>
                    )}
                  </div>

                  {/* Card Footer */}
                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(report.reportDate || report.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>

                    <div className="flex items-center gap-1">
                      <a
                        href={getReportDownloadUrl(report._id)}
                        download={report.fileName || 'report'}
                        className="p-1.5 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                        title="Download Document"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                      {['admin', 'manager', 'doctor'].includes(user?.role) && (
                        <button
                          onClick={() => handleDeleteReport(report._id)}
                          disabled={deletingId === report._id}
                          className="p-1.5 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition disabled:opacity-50"
                          title="Delete Report"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ─── Table View ────────────────────────────────────────────────── */
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Patient & Phone</th>
                  <th className="py-3 px-4">Order ID</th>
                  <th className="py-3 px-4">Report Details</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Dept</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Uploaded By</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {reports.map((report) => (
                  <tr key={report._id} className="hover:bg-gray-50/70 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-gray-900">{report.patientName}</div>
                      <div className="text-gray-500 font-mono text-[11px]">{report.phone}</div>
                    </td>
                    <td className="py-3 px-4">
                      {report.orderId ? (
                        <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                          {report.orderId}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-gray-900">{report.reportTitle}</div>
                      {report.notes && (
                        <div className="text-[11px] text-gray-400 truncate max-w-xs">
                          {report.notes}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${
                          REPORT_TYPE_COLORS[report.reportType] || REPORT_TYPE_COLORS.other
                        }`}
                      >
                        {report.reportType?.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="uppercase text-[10px] font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                        {report.department || 'general'}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {new Date(report.reportDate || report.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-3 px-4 text-gray-500">
                      {report.uploadedBy?.name || 'Staff'}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openViewer(report)}
                          className="p-1.5 text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <a
                          href={getReportDownloadUrl(report._id)}
                          download={report.fileName || 'report'}
                          className="p-1.5 text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                        {['admin', 'manager', 'doctor'].includes(user?.role) && (
                          <button
                            onClick={() => handleDeleteReport(report._id)}
                            className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Pagination Controls ────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-sm">
          <span className="text-gray-500 text-xs">
            Showing Page <strong className="text-gray-800">{page}</strong> of{' '}
            <strong className="text-gray-800">{totalPages}</strong> ({total} Total Records)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3.5 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 transition"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3.5 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 transition"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* ─── Upload Report Modal ─────────────────────────────────────────── */}
      {showUploadModal && (
        <Modal
          title="Upload Patient Medical Report"
          maxWidth="sm:max-w-lg md:max-w-xl"
          onClose={() => {
            if (!isSubmitting) setShowUploadModal(false);
          }}
        >
          <form onSubmit={handleUploadSubmit} className="space-y-3.5 text-xs">
            {/* File Dropzone */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-700">
                Report File (PDF, JPG, PNG, WEBP, etc.) <span className="text-rose-500">*</span>
              </label>
              <div className="relative border-2 border-dashed border-gray-300 hover:border-emerald-500 rounded-2xl p-3.5 text-center bg-gray-50/50 transition">
                <input
                  type="file"
                  accept="image/*,application/pdf,.pdf,.doc,.docx"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                {filePreview ? (
                  <div className="flex flex-col items-center">
                    <img
                      src={filePreview}
                      alt="Preview"
                      className="max-h-32 object-contain rounded-lg border shadow-sm mb-1.5"
                    />
                    <span className="text-[11px] font-semibold text-emerald-700 truncate max-w-full">
                      ✓ {selectedFile?.name} ({(selectedFile?.size / 1024).toFixed(0)} KB)
                    </span>
                    <span className="text-[10px] text-gray-400">Click to change file</span>
                  </div>
                ) : selectedFile ? (
                  <div className="flex flex-col items-center py-2">
                    {selectedFile.name.toLowerCase().endsWith('.pdf') ? (
                      <FileSpreadsheet className="w-9 h-9 text-rose-500 mb-1" />
                    ) : (
                      <FileText className="w-9 h-9 text-indigo-500 mb-1" />
                    )}
                    <span className="text-[11px] font-bold text-gray-800 truncate max-w-full">{selectedFile.name}</span>
                    <span className="text-[10px] text-gray-500">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • {selectedFile.name.toLowerCase().endsWith('.pdf') ? 'PDF Document' : 'Document'}
                    </span>
                    <span className="text-[10px] text-emerald-600 mt-1 font-semibold">
                      Click to change
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-3">
                    <UploadCloud className="w-8 h-8 text-gray-400 mb-1.5" />
                    <span className="text-xs font-semibold text-gray-700">
                      Upload PDF, JPG, PNG, or other report files
                    </span>
                    <span className="text-[10px] text-gray-400 mt-0.5">
                      Supports PDF, JPG, PNG, WEBP, DOC up to 15MB (Max 15MB)
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Customer Search / Phone Lookup Field */}
            <div className="relative" ref={lookupRef}>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Customer Phone Number <span className="text-rose-500">*</span>
                <span className="text-[10px] font-normal text-emerald-600 ml-1.5">
                  (Auto-fetches details)
                </span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={uploadForm.phone}
                  onChange={(e) => {
                    const val = e.target.value;
                    setUploadForm((prev) => ({ ...prev, phone: val }));
                    handleLookupQuery(val);
                  }}
                  placeholder="e.g. 9876543210"
                  className="w-full pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
                {isSearchingLookup && (
                  <RefreshCw className="w-3.5 h-3.5 text-gray-400 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
                )}
              </div>

              {/* Suggestions Popup */}
              {showLookupDropdown && lookupResults.length > 0 && (
                <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden divide-y divide-gray-100 max-h-48 overflow-y-auto">
                  <div className="px-3 py-1.5 bg-emerald-50 text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                    Found in CRM (Click to auto-fill)
                  </div>
                  {lookupResults.map((item, idx) => (
                    <button
                      type="button"
                      key={idx}
                      onClick={() => applyLookupCustomer(item)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center justify-between text-xs transition"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="font-bold text-gray-800 truncate">{item.patientName}</div>
                        <div className="text-[10px] text-gray-500 font-mono truncate">
                          {item.phone} • {item.address || 'Address on file'}
                        </div>
                      </div>
                      {item.orderId && (
                        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 shrink-0">
                          {item.orderId}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Patient Name & Order ID Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="min-w-0">
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Patient Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={uploadForm.patientName}
                    onChange={(e) =>
                      setUploadForm((prev) => ({ ...prev, patientName: e.target.value }))
                    }
                    placeholder="Full name"
                    className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="min-w-0">
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Order ID / AWB (Optional)
                </label>
                <div className="relative">
                  <Hash className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={uploadForm.orderId}
                    onChange={(e) =>
                      setUploadForm((prev) => ({ ...prev, orderId: e.target.value.toUpperCase() }))
                    }
                    placeholder="OD12345 or AWB"
                    className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white uppercase"
                  />
                </div>
              </div>
            </div>

            {/* Report Title & Report Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="min-w-0">
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Report Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={uploadForm.reportTitle}
                  onChange={(e) =>
                    setUploadForm((prev) => ({ ...prev, reportTitle: e.target.value }))
                  }
                  placeholder="e.g. Semen Analysis / Blood LFT"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
              </div>

              <div className="min-w-0">
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Report Category
                </label>
                <select
                  value={uploadForm.reportType}
                  onChange={(e) =>
                    setUploadForm((prev) => ({ ...prev, reportType: e.target.value }))
                  }
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                >
                  {REPORT_TYPES.filter((t) => t.value !== 'all').map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Department & Report Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="min-w-0">
                <label className="block text-xs font-bold text-gray-700 mb-1">Department</label>
                <select
                  value={uploadForm.department}
                  onChange={(e) =>
                    setUploadForm((prev) => ({ ...prev, department: e.target.value }))
                  }
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                >
                  {DEPARTMENTS.filter((d) => d.value !== 'all').map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="min-w-0">
                <label className="block text-xs font-bold text-gray-700 mb-1">Report Date</label>
                <input
                  type="date"
                  value={uploadForm.reportDate}
                  onChange={(e) =>
                    setUploadForm((prev) => ({ ...prev, reportDate: e.target.value }))
                  }
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
              </div>
            </div>

            {/* Notes / Remarks */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Doctor / Staff Remarks
              </label>
              <textarea
                rows={2}
                value={uploadForm.notes}
                onChange={(e) => setUploadForm((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Key observations, abnormal parameters, doctor instructions..."
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              />
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-gray-100 flex flex-col-reverse sm:flex-row items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                disabled={isSubmitting}
                className="w-full sm:w-auto px-4 py-2 border border-gray-200 rounded-xl text-gray-600 font-semibold hover:bg-gray-50 transition text-center"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Upload & Save
                  </>
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ─── Lightbox / Document Full Viewer Modal ──────────────────────── */}
      {activeViewerReport && typeof document !== 'undefined' && ReactDOM.createPortal(
        <div
          onClick={() => setActiveViewerReport(null)}
          className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md overflow-hidden"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 rounded-2xl sm:rounded-3xl border border-white/10 w-full max-w-5xl h-[92vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200"
          >
            {/* Viewer Top Bar */}
            <div className="px-4 sm:px-5 py-3 bg-slate-800/90 border-b border-white/10 flex items-center justify-between text-white shrink-0 gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="p-1.5 sm:p-2 bg-emerald-500/20 text-emerald-400 rounded-xl shrink-0">
                  {activeViewerReport.fileType === 'pdf' ? (
                    <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                  ) : (
                    <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                  )}
                </span>
                <div className="min-w-0">
                  <h3 className="font-bold text-xs sm:text-sm text-white flex items-center gap-1.5 truncate">
                    <span className="truncate">{activeViewerReport.reportTitle}</span>
                    <span className="text-[9px] sm:text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30 shrink-0">
                      {activeViewerReport.reportType?.replace('_', ' ').toUpperCase()}
                    </span>
                  </h3>
                  <p className="text-[11px] text-gray-400 truncate">
                    {activeViewerReport.patientName} • {activeViewerReport.phone}{' '}
                    {activeViewerReport.orderId ? `• #${activeViewerReport.orderId}` : ''}
                  </p>
                </div>
              </div>

              {/* Viewer Controls */}
              <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                {activeViewerReport.fileType !== 'pdf' && (
                  <>
                    <button
                      onClick={() => setZoomScale((s) => Math.min(3, s + 0.25))}
                      className="p-1.5 sm:p-2 hover:bg-white/10 rounded-xl text-gray-300 hover:text-white transition"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setZoomScale((s) => Math.max(0.5, s - 0.25))}
                      className="p-1.5 sm:p-2 hover:bg-white/10 rounded-xl text-gray-300 hover:text-white transition"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setRotation((r) => (r + 90) % 360)}
                      className="p-1.5 sm:p-2 hover:bg-white/10 rounded-xl text-gray-300 hover:text-white transition"
                      title="Rotate"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>
                  </>
                )}
                <a
                  href={getReportDownloadUrl(activeViewerReport._id)}
                  download={activeViewerReport.fileName || 'report.pdf'}
                  className="p-1.5 sm:p-2 hover:bg-white/10 rounded-xl text-emerald-400 hover:text-emerald-300 transition"
                  title="Download File"
                >
                  <Download className="w-4 h-4" />
                </a>
                <a
                  href={getReportViewUrl(activeViewerReport._id)}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 sm:p-2 hover:bg-white/10 rounded-xl text-blue-400 hover:text-blue-300 transition"
                  title="Open in new tab"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  onClick={() => setActiveViewerReport(null)}
                  className="p-1.5 sm:p-2 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition ml-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Viewer Content Box */}
            <div className="flex-1 bg-black/70 overflow-auto flex items-center justify-center p-2 sm:p-3 relative">
              {activeViewerReport.fileType === 'pdf' || activeViewerReport.fileType === 'document' ? (
                <div className="w-full h-full flex flex-col rounded-xl overflow-hidden bg-slate-950 border border-white/10 shadow-2xl">
                  {/* PDF Navigation & Action Toolbar */}
                  <div className="bg-slate-800 px-3 py-2 flex flex-wrap items-center justify-between text-xs text-gray-200 border-b border-white/10 shrink-0 gap-2">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-rose-400" />
                      <span className="font-semibold text-gray-300 truncate max-w-xs">
                        {activeViewerReport.fileName || 'PDF Document'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={getReportViewUrl(activeViewerReport._id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-bold flex items-center gap-1.5 transition text-xs shadow-md"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Open PDF in New Window
                      </a>
                      <a
                        href={getReportDownloadUrl(activeViewerReport._id)}
                        download={activeViewerReport.fileName || 'report.pdf'}
                        className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold flex items-center gap-1.5 transition text-xs"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download
                      </a>
                    </div>
                  </div>

                  {/* PDF Native Viewer Iframe */}
                  <div className="flex-1 bg-white relative w-full h-full min-h-[300px]">
                    <iframe
                      src={getReportViewUrl(activeViewerReport._id)}
                      title={activeViewerReport.reportTitle}
                      className="w-full h-full border-0"
                    />
                  </div>
                </div>
              ) : (
                <div className="overflow-auto max-w-full max-h-full flex items-center justify-center">
                  <img
                    src={activeViewerReport.fileUrl}
                    alt={activeViewerReport.reportTitle}
                    style={{
                      transform: `scale(${zoomScale}) rotate(${rotation}deg)`,
                      transition: 'transform 0.2s ease-out',
                    }}
                    className="max-h-[72vh] max-w-full object-contain rounded-lg shadow-2xl"
                  />
                </div>
              )}
            </div>

            {/* Viewer Bottom Info Bar */}
            <div className="px-4 sm:px-5 py-2.5 bg-slate-800/90 border-t border-white/10 flex flex-wrap items-center justify-between text-[11px] text-gray-300 shrink-0 gap-2">
              <div className="flex items-center gap-3 flex-wrap">
                <span>
                  <strong>Date:</strong>{' '}
                  {new Date(
                    activeViewerReport.reportDate || activeViewerReport.createdAt
                  ).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
                <span>
                  <strong>Dept:</strong>{' '}
                  <span className="uppercase">{activeViewerReport.department}</span>
                </span>
                <span>
                  <strong>Uploaded By:</strong>{' '}
                  {activeViewerReport.uploadedBy?.name || 'Staff'}
                </span>
              </div>
              {activeViewerReport.notes && (
                <div className="text-emerald-300 italic max-w-sm truncate">
                  "{activeViewerReport.notes}"
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
