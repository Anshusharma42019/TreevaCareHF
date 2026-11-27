import API from '../api';

const isLocalDev = typeof window !== 'undefined' && window.location.hostname === 'localhost';
const BASE_URL = isLocalDev ? '/api/v1' : (import.meta.env.VITE_API_BASE_URL || '/api/v1');

export const getReportViewUrl = (id) => `${BASE_URL}/gallery/view/${id}`;
export const getReportDownloadUrl = (id) => `${BASE_URL}/gallery/download/${id}`;

export const getReports = (params) =>
  API.get('/gallery', { params }).then((r) => r.data.data);

export const getReport = (id) =>
  API.get(`/gallery/${id}`).then((r) => r.data.data);

export const uploadReport = (formData) =>
  API.post('/gallery', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data.data);

export const updateReport = (id, data) =>
  API.patch(`/gallery/${id}`, data).then((r) => r.data.data);

export const deleteReport = (id) =>
  API.delete(`/gallery/${id}`).then((r) => r.data.data);

export const lookupCustomer = (query) =>
  API.get('/gallery/lookup', { params: { query } }).then((r) => r.data.data);

export default {
  getReports,
  getReport,
  uploadReport,
  updateReport,
  deleteReport,
  lookupCustomer,
};
