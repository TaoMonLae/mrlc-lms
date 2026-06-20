import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { SchoolProfile, BrandingSettings, SystemSettings } from '../types/settings';

interface SettingsContextType {
  schoolProfile: SchoolProfile;
  brandingSettings: BrandingSettings;
  systemSettings: SystemSettings;
  updateSchoolProfile: (data: Partial<SchoolProfile>) => Promise<void>;
  updateBranding: (data: Partial<BrandingSettings>) => Promise<void>;
  updateSystem: (data: Partial<SystemSettings>) => Promise<void>;
  reloadSettings: () => Promise<void>;
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
  primaryColor: '#7a3dff',
  accentColor: '#3b89ff',
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
  updateBranding: async () => {},
  updateSystem: async () => {},
  reloadSettings: async () => {},
});

export const useSettings = () => useContext(SettingsContext);

// Maps an /api/settings row onto the three typed settings groups.
function applyServerData(
  data: Record<string, any>,
  setSchool: React.Dispatch<React.SetStateAction<SchoolProfile>>,
  setBranding: React.Dispatch<React.SetStateAction<BrandingSettings>>,
  setSystem: React.Dispatch<React.SetStateAction<SystemSettings>>,
) {
  setSchool(prev => ({
    ...prev,
    name: data.name ?? prev.name,
    address: data.address ?? prev.address,
    phone: data.contactPhone ?? prev.phone,
    email: data.contactEmail ?? prev.email,
  }));
  setBranding(prev => ({
    ...prev,
    logoUrl: data.logoUrl ?? prev.logoUrl,
    signatureUrl: data.signatureUrl ?? prev.signatureUrl,
    primaryColor: data.primaryColor ?? prev.primaryColor,
    accentColor: data.accentColor ?? prev.accentColor,
    darkModeDefault: data.darkModeDefault ?? prev.darkModeDefault,
    reportHeaderStyle: data.reportHeaderStyle ?? prev.reportHeaderStyle,
  }));
  setSystem(prev => ({
    ...prev,
    timezone: data.timezone ?? prev.timezone,
    dateFormat: data.dateFormat ?? prev.dateFormat,
    currency: data.currency ?? prev.currency,
    defaultLanguage: data.defaultLanguage ?? prev.defaultLanguage,
    fileUploadLimitMb: data.fileUploadLimitMb ?? prev.fileUploadLimitMb,
    backupEnabled: data.backupEnabled ?? prev.backupEnabled,
  }));
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [schoolProfile, setSchoolProfile] = useState<SchoolProfile>(DEFAULT_SCHOOL);
  const [brandingSettings, setBrandingSettings] = useState<BrandingSettings>(DEFAULT_BRANDING);
  const [systemSettings, setSystemSettings] = useState<SystemSettings>(DEFAULT_SYSTEM);
  const [triggerReload, setTriggerReload] = useState(0);

  // Reload settings function
  const reloadSettings = async () => {
    const token = sessionStorage.getItem('auth_token');
    if (!token) {
      // Reset to defaults when logged out
      setSchoolProfile(DEFAULT_SCHOOL);
      setBrandingSettings(DEFAULT_BRANDING);
      setSystemSettings(DEFAULT_SYSTEM);
      return;
    }

    try {
      const res = await fetch('/api/settings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.name) {
          applyServerData(data, setSchoolProfile, setBrandingSettings, setSystemSettings);
        }
      }
    } catch (error) {
      console.error('Failed to reload settings:', error);
    }
  };

  // Initial load and watch for auth changes
  useEffect(() => {
    const handleAuthChange = () => {
      // Trigger settings reload when auth state changes
      setTriggerReload(prev => prev + 1);
    };

    // Listen for storage changes (for cross-tab login/logout)
    window.addEventListener('storage', handleAuthChange);

    // Custom event listener for same-window login/logout
    window.addEventListener('auth-state-changed', handleAuthChange);

    // Initial load
    reloadSettings();

    return () => {
      window.removeEventListener('storage', handleAuthChange);
      window.removeEventListener('auth-state-changed', handleAuthChange);
    };
  }, []);

  // Reload settings when trigger changes
  useEffect(() => {
    reloadSettings();
  }, [triggerReload]);

  const save = async (payload: Record<string, any>) => {
    const token = sessionStorage.getItem('auth_token');
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to save settings');
    }
    const saved = await res.json();
    applyServerData(saved, setSchoolProfile, setBrandingSettings, setSystemSettings);
  };

  const updateSchoolProfile = (data: Partial<SchoolProfile>) =>
    save({ name: data.name, address: data.address, phone: data.phone, email: data.email });

  const updateBranding = (data: Partial<BrandingSettings>) =>
    save({
      logoUrl: data.logoUrl,
      signatureUrl: data.signatureUrl,
      primaryColor: data.primaryColor,
      accentColor: data.accentColor,
      darkModeDefault: data.darkModeDefault,
      reportHeaderStyle: data.reportHeaderStyle,
    });

  const updateSystem = (data: Partial<SystemSettings>) =>
    save({
      timezone: data.timezone,
      dateFormat: data.dateFormat,
      currency: data.currency,
      defaultLanguage: data.defaultLanguage,
      fileUploadLimitMb: data.fileUploadLimitMb,
      backupEnabled: data.backupEnabled,
    });

  return (
    <SettingsContext.Provider value={{ schoolProfile, brandingSettings, systemSettings, updateSchoolProfile, updateBranding, updateSystem, reloadSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}
