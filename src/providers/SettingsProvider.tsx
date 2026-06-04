import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { SchoolProfile, BrandingSettings, SystemSettings } from '../types/settings';

interface SettingsContextType {
  schoolProfile: SchoolProfile;
  brandingSettings: BrandingSettings;
  systemSettings: SystemSettings;
  updateSchoolProfile: (data: Partial<SchoolProfile>) => Promise<void>;
}

const DEFAULT_SCHOOL: SchoolProfile = {
  name: 'Mon Refugee Learning Centre',
  shortName: 'MRLC',
  address: 'Mae Sot, Tak Province, Thailand',
  phone: '',
  email: 'admin@mrlc.edu',
  website: '',
  academicYear: '2025-2026',
  principalName: '',
  description: 'GED School providing quality education for Mon refugees.',
};

const DEFAULT_BRANDING: BrandingSettings = {
  logoUrl: null,
  pdfLogoUrl: null,
  primaryColor: '#ea580c',
  accentColor: '#3b82f6',
  darkModeDefault: false,
  reportHeaderStyle: 'standard',
  signatureUrl: null,
};

const DEFAULT_SYSTEM: SystemSettings = {
  timezone: 'Asia/Bangkok',
  dateFormat: 'DD/MM/YYYY',
  currency: 'MYR',
  defaultLanguage: 'en',
  fileUploadLimitMb: 10,
  backupEnabled: true,
};

const SettingsContext = createContext<SettingsContextType>({
  schoolProfile: DEFAULT_SCHOOL,
  brandingSettings: DEFAULT_BRANDING,
  systemSettings: DEFAULT_SYSTEM,
  updateSchoolProfile: async () => {},
});

export const useSettings = () => useContext(SettingsContext);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [schoolProfile, setSchoolProfile] = useState<SchoolProfile>(DEFAULT_SCHOOL);
  const [brandingSettings] = useState<BrandingSettings>(DEFAULT_BRANDING);
  const [systemSettings] = useState<SystemSettings>(DEFAULT_SYSTEM);

  useEffect(() => {
    const token = sessionStorage.getItem('auth_token');
    if (!token) return;
    fetch('/api/settings', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data && data.name) {
          setSchoolProfile(prev => ({
            ...prev,
            name: data.name ?? prev.name,
            address: data.address ?? prev.address,
            phone: data.contactPhone ?? prev.phone,
            email: data.contactEmail ?? prev.email,
          }));
        }
      })
      .catch(() => {/* keep defaults on error */});
  }, []);

  const updateSchoolProfile = async (data: Partial<SchoolProfile>) => {
    const token = sessionStorage.getItem('auth_token');
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: data.name, address: data.address, phone: data.phone, email: data.email }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to save settings');
    }
    const saved = await res.json();
    setSchoolProfile(prev => ({ ...prev, ...saved }));
  };

  return (
    <SettingsContext.Provider value={{ schoolProfile, brandingSettings, systemSettings, updateSchoolProfile }}>
      {children}
    </SettingsContext.Provider>
  );
}
