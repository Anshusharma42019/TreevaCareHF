import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useEffect, useState } from 'react';

const SIDEBAR_THEMES = {
  light: { bg: 'linear-gradient(180deg, rgba(14, 46, 25, 0.94) 0%, rgba(8, 30, 15, 0.97) 100%)', accent: '#4ade80' },
  dark: { bg: 'linear-gradient(180deg, rgba(12, 40, 22, 0.96) 0%, rgba(6, 24, 13, 0.98) 100%)', accent: '#4ade80' },
  ocean: { bg: 'linear-gradient(180deg, rgba(4, 18, 38, 0.94) 0%, rgba(6, 26, 50, 0.97) 100%)', accent: '#38bdf8' },
  rose: { bg: 'linear-gradient(180deg, rgba(24, 8, 14, 0.94) 0%, rgba(32, 10, 18, 0.97) 100%)', accent: '#fb7185' },
  violet: { bg: 'linear-gradient(180deg, rgba(14, 10, 26, 0.94) 0%, rgba(18, 12, 34, 0.97) 100%)', accent: '#a78bfa' },
  amber: { bg: 'linear-gradient(180deg, rgba(24, 16, 2, 0.94) 0%, rgba(32, 22, 4, 0.97) 100%)', accent: '#fbbf24' },
  slate: { bg: 'linear-gradient(180deg, rgba(12, 20, 36, 0.94) 0%, rgba(18, 28, 48, 0.97) 100%)', accent: '#94a3b8' },
  teal: { bg: 'linear-gradient(180deg, rgba(2, 26, 24, 0.94) 0%, rgba(4, 36, 32, 0.97) 100%)', accent: '#2dd4bf' },
  crimson: { bg: 'linear-gradient(180deg, rgba(24, 6, 6, 0.94) 0%, rgba(34, 8, 8, 0.97) 100%)', accent: '#f87171' },
  indigo: { bg: 'linear-gradient(180deg, rgba(8, 8, 28, 0.94) 0%, rgba(12, 12, 38, 0.97) 100%)', accent: '#818cf8' },
  mint: { bg: 'linear-gradient(180deg, rgba(4, 52, 32, 0.94) 0%, rgba(8, 70, 42, 0.97) 100%)', accent: '#34d399' },
  midnight: { bg: 'linear-gradient(180deg, rgba(3, 8, 24, 0.94) 0%, rgba(6, 12, 36, 0.97) 100%)', accent: '#6366f1' },
  sunset: { bg: 'linear-gradient(180deg, rgba(26, 10, 2, 0.94) 0%, rgba(36, 14, 4, 0.97) 100%)', accent: '#f97316' },
  aurora: { bg: 'linear-gradient(180deg, rgba(4, 16, 24, 0.94) 0%, rgba(6, 22, 32, 0.97) 100%)', accent: '#06b6d4' },
  sakura: { bg: 'linear-gradient(180deg, rgba(24, 6, 18, 0.94) 0%, rgba(32, 8, 24, 0.97) 100%)', accent: '#f472b6' },
  gold: { bg: 'linear-gradient(180deg, rgba(20, 15, 2, 0.94) 0%, rgba(28, 20, 4, 0.97) 100%)', accent: '#eab308' },
  nordic: { bg: 'linear-gradient(180deg, rgba(12, 18, 26, 0.94) 0%, rgba(18, 24, 34, 0.97) 100%)', accent: '#58a6ff' },
  lava: { bg: 'linear-gradient(180deg, rgba(22, 5, 2, 0.94) 0%, rgba(30, 6, 4, 0.97) 100%)', accent: '#ef4444' },
  lime: { bg: 'linear-gradient(180deg, rgba(10, 20, 2, 0.94) 0%, rgba(16, 28, 4, 0.97) 100%)', accent: '#84cc16' },
  dusk: { bg: 'linear-gradient(180deg, rgba(20, 10, 22, 0.94) 0%, rgba(26, 12, 28, 0.97) 100%)', accent: '#c084fc' },
};

const NAV_GROUPS = [
  {
    label: 'Overview',
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
    items: [
      {
        to: '/dashboard', label: 'Dashboard', roles: ['admin', 'manager', 'sales', 'support', 'logistics'],
        icon: <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>
      },
      {
        to: '/doctor-dashboard', label: 'Rx Prescriptions', roles: ['admin', 'manager', 'doctor'],
        icon: <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5A3.375 3.375 0 0010.125 2.25H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/></svg>
      },
      {
        to: '/leads', label: 'Leads', roles: ['admin', 'manager', 'sales', 'support'],
        icon: <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>
      },
      {
        to: '/pipeline', label: 'Action Required', roles: ['admin', 'manager', 'sales', 'support'],
        icon: <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>
      },
    ]
  },
  {
    label: 'Sales & CRM',
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5h16.5A2.25 2.25 0 0122.5 6.75v10.5a2.25 2.25 0 01-2.25 2.25H3.75A2.25 2.25 0 011.5 17.25V6.75A2.25 2.25 0 013.75 4.5z" />
      </svg>
    ),
    items: [
      {
        to: '/cnp', label: 'CNP', roles: ['admin', 'manager', 'sales', 'support'],
        icon: <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-2.828-1.41-5.183-3.765-6.593-6.593l1.293-.97c.362-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
      },
      {
        to: '/whatsapp', label: 'WhatsApp', roles: ['admin', 'manager', 'sales', 'support'],
        icon: <svg className="w-4.5 h-4.5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" /><path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.558 4.12 1.532 5.845L.057 23.941l6.26-1.643A11.95 11.95 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 0 1-5.034-1.383l-.36-.214-3.732.979.998-3.642-.235-.374A9.818 9.818 0 1 1 12 21.818z" /></svg>
      },
      {
        to: '/tasks', label: 'Tasks', roles: ['admin', 'manager', 'sales', 'support'],
        icon: <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      },
      {
        to: '/follow-up', label: 'Follow Up', roles: ['admin', 'manager', 'sales', 'support'],
        icon: <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      },
      {
        to: '/verification', label: 'Verification', roles: ['admin', 'manager', 'sales', 'support'],
        icon: <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" /></svg>
      },
    ]
  },
  {
    label: 'Logistics & Ops',
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0C2.678 5.578 2.25 6.058 2.25 6.626v1.442" />
      </svg>
    ),
    items: [
      {
        to: '/ops-dashboard', label: 'Ops Dashboard', roles: ['admin', 'manager', 'sales', 'support', 'logistics', 'staff'],
        icon: <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" /><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" /></svg>
      },
      {
        to: '/ready-to-shipment', label: 'Ready to Ship', roles: ['admin', 'manager', 'sales', 'logistics'],
        icon: <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0C2.678 5.578 2.25 6.058 2.25 6.626v1.442" /></svg>
      },
      {
        to: '/shiprocket', label: 'Shiprocket', roles: ['admin', 'manager', 'logistics'], end: true,
        icon: <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.24a6 6 0 00-5.84 7.381h4.8m2.58-5.84a14.98 14.98 0 015.84-2.58" /></svg>
      },
      {
        to: '/shiprocket/ndr', label: 'NDR', roles: ['admin', 'manager', 'logistics'],
        icon: <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
      },
      {
        to: '/shipmaxx', label: 'ShipMaxx', roles: ['admin', 'manager', 'logistics'], end: true,
        icon: <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0C2.678 5.578 2.25 6.058 2.25 6.626v1.442" /></svg>
      },
      {
        to: '/shipmaxx/ndr', label: 'ShipMaxx NDR', roles: ['admin', 'manager', 'logistics'],
        icon: <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
      },
      {
        to: '/shipmaxx/followup', label: 'ShipMaxx Follow Up', roles: ['admin', 'manager', 'logistics', 'support'], end: true,
        icon: <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-.64-.034-1.277-.08-1.91-.137a2.228 2.228 0 01-1.98-2.193v-4.286c0-.97.616-1.813 1.5-2.097M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>
      },
    ]
  },
  {
    label: 'Accounts',
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    items: [
      {
        to: '/account', label: 'Delivered Data', roles: ['admin', 'manager'],
        icon: <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      },
    ]
  },
  {
    label: 'Team & Clinic',
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a5.97 5.97 0 00-.942 3.197M12 10.5a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" />
      </svg>
    ),
    items: [
      {
        to: '/appointments', label: 'Appointments', roles: ['admin', 'manager', 'sales', 'doctor', 'support'],
        icon: <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>
      },
      {
        to: '/attendance', label: 'Attendance', roles: ['admin', 'manager', 'sales', 'support', 'logistics'],
        icon: <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      },
      {
        to: '/reorder-commission', label: 'Re-Order Commission', roles: ['admin'],
        icon: <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      },
      {
        to: '/users', label: 'Staff', roles: ['admin', 'manager'],
        icon: <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
      },
      {
        to: '/staff-activity', label: 'Staff Activity', roles: ['admin', 'manager'],
        icon: <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>
      },
    ]
  },
];

export default function Sidebar({ open, onClose, unreadCount = 0, whatsappUnreadCount = 0 }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [collapsedGroups, setCollapsedGroups] = useState({});

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setTheme(localStorage.getItem('theme') || 'light');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const { bg } = SIDEBAR_THEMES[theme] || SIDEBAR_THEMES.light;

  const toggleGroupCollapse = (label) => {
    setCollapsedGroups(prev => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {open && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-md z-40 md:hidden transition-opacity duration-300" 
          onClick={onClose} 
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full w-64 z-50 flex flex-col transition-all duration-300 ease-in-out border-r border-white/10 shadow-2xl shadow-emerald-950/40
          ${open ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
        style={{
          background: bg,
          backdropFilter: 'blur(35px)',
          WebkitBackdropFilter: 'blur(35px)',
        }}
      >

        {/* Brand Header */}
        <div className="px-5 pt-5 pb-4 border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            {/* Glowing Leaf Badge */}
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-2xl blur-sm opacity-60 group-hover:opacity-100 transition duration-300" />
              <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-900 border border-emerald-300/40 flex items-center justify-center shadow-lg shrink-0">
                <svg className="w-6 h-6 text-emerald-300 drop-shadow" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1.41-3.53C8.73 18.16 10.86 18 13 18c3 0 5.5-2.5 5.5-5.5a5.5 5.5 0 0 0-1.5-3.8" />
                  <path d="M14.5 2c-3.2 0-5.8 2.2-6.4 5.2" />
                </svg>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-white font-black text-xl tracking-wider leading-none drop-shadow-sm">TREEVA</span>
                <span className="bg-emerald-500/20 text-emerald-300 text-[8px] font-extrabold px-1.5 py-0.5 rounded-full border border-emerald-400/30 uppercase tracking-widest">
                  CRM
                </span>
              </div>
              <p className="text-emerald-300/90 text-[9px] font-extrabold tracking-[0.22em] mt-1 uppercase">
                HOMEOPATHY CLINIC
              </p>
            </div>
          </div>

          {/* Close button for Mobile */}
          <button 
            onClick={onClose} 
            className="md:hidden text-white/70 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Nav Links Container */}
        <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-3 custom-scrollbar">
          {NAV_GROUPS.map(group => {
            const visibleItems = group.items.filter(item => item.roles.includes(user?.role));
            if (!visibleItems.length) return null;
            const isCollapsed = collapsedGroups[group.label];

            return (
              <div key={group.label} className="space-y-1">
                {/* Group Header */}
                <div 
                  onClick={() => toggleGroupCollapse(group.label)}
                  className="flex items-center justify-between px-3 py-1.5 cursor-pointer group/hdr select-none rounded-lg hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-2 text-emerald-300/80 group-hover/hdr:text-emerald-300">
                    {group.icon}
                    <span className="text-[10px] font-extrabold uppercase tracking-[0.2em]">
                      {t(group.label)}
                    </span>
                  </div>

                  <svg 
                    className={`w-3 h-3 text-emerald-300/50 group-hover/hdr:text-emerald-300 transition-transform duration-200 ${isCollapsed ? '-rotate-90' : 'rotate-0'}`} 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor" 
                    strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </div>

                {/* Items */}
                {!isCollapsed && (
                  <div className="space-y-1 pl-1">
                    {visibleItems.map(({ to, icon, label, end }) => (
                      <NavLink
                        key={to}
                        to={to}
                        end={!!end}
                        onClick={onClose}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 group relative border ${
                            isActive
                              ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-bold shadow-lg shadow-emerald-950/60 border-emerald-400/40 transform scale-[1.02]'
                              : 'text-white/80 hover:text-white border-transparent hover:bg-white/12 hover:border-white/10 hover:translate-x-1'
                          }`
                        }
                      >
                        {({ isActive }) => (
                          <>
                            {/* Left Active Glow Bar */}
                            {isActive && (
                              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-5 bg-emerald-300 rounded-r-full shadow-md shadow-emerald-400/80" />
                            )}

                            <span className={`transition-all duration-200 ${isActive ? 'text-white scale-110 drop-shadow' : 'text-emerald-300/80 group-hover:text-white group-hover:scale-110'}`}>
                              {icon}
                            </span>

                            <span className={`flex-1 truncate tracking-wide ${isActive ? 'font-black text-white' : 'font-semibold'}`}>
                              {t(label)}
                            </span>

                            {/* WhatsApp Badge */}
                            {label === 'WhatsApp' && whatsappUnreadCount > 0 && (
                              <span className="relative flex items-center shrink-0">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00a884] opacity-75" />
                                <span className="relative bg-[#00a884] text-white text-[9px] px-1.5 py-0.5 rounded-full min-w-[18px] text-center font-black leading-none shadow-md">
                                  {whatsappUnreadCount}
                                </span>
                              </span>
                            )}

                            {/* Notifications Badge */}
                            {label === 'Notifications' && unreadCount > 0 && (
                              <span className="bg-gradient-to-r from-red-500 to-rose-600 text-white text-[9px] px-1.5 py-0.5 rounded-full min-w-[18px] text-center font-black shrink-0 shadow-md">
                                {unreadCount > 99 ? '99+' : unreadCount}
                              </span>
                            )}

                            {/* Right Chevron Arrow > */}
                            <svg className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${
                              isActive ? 'text-white translate-x-0.5' : 'text-emerald-300/40 group-hover:text-white group-hover:translate-x-0.5'
                            }`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                            </svg>
                          </>
                        )}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Clinic Footer Info Card */}
        <div className="p-3.5 border-t border-white/10 bg-black/20 backdrop-blur-lg shrink-0 space-y-2">
          <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/20">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner">
              <svg className="w-4.5 h-4.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1.41-3.53C8.73 18.16 10.86 18 13 18c3 0 5.5-2.5 5.5-5.5a5.5 5.5 0 0 0-1.5-3.8" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-emerald-200 font-bold text-xs truncate">Healing Naturally</div>
              <div className="text-emerald-300/70 text-[9px] font-medium truncate">Building Healthier Tomorrow</div>
            </div>
          </div>

          <div className="px-2 py-0.5 flex items-center justify-between text-[9px] text-emerald-300/70 font-medium border-t border-white/5 pt-1.5">
            <span>Developed By</span>
            <span className="font-extrabold text-emerald-200 tracking-wide">Er. Anshu Sharma</span>
          </div>
        </div>

      </aside>
    </>
  );
}

