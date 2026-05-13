import React, { createContext, useContext, useState, ReactNode } from 'react';
import { SchoolProfile, BrandingSettings, SystemSettings } from '../types/settings';

interface SettingsContextType {
  schoolProfile: SchoolProfile;
  brandingSettings: BrandingSettings;
  systemSettings: SystemSettings;
}

const DEFAULT_SCHOOL: SchoolProfile = {
  name: 'Acme International School',
  shortName: 'AIS',
  address: '123 Education Blvd, Learning City, 10001',
  phone: '+1 (555) 123-4567',
  email: 'contact@acmeschool.edu',
  website: 'https://acmeschool.edu',
  academicYear: '2025-2026',
  principalName: 'Dr. Sarah Smith',
  description: 'Committed to excellence in education and fostering a global perspective.',
};

const DEFAULT_BRANDING: BrandingSettings = {
  logoUrl: null,
  pdfLogoUrl: null,
  primaryColor: '#ea580c', // orange-600
  accentColor: '#3b82f6', // blue-500
  darkModeDefault: false,
  reportHeaderStyle: 'standard',
  signatureUrl: null,
};

const DEFAULT_SYSTEM: SystemSettings = {
  timezone: 'America/New_York',
  dateFormat: 'MM/DD/YYYY',
  currency: 'USD',
  defaultLanguage: 'en',
  fileUploadLimitMb: 10,
  backupEnabled: true,
};

const SettingsContext = createContext<SettingsContextType>({
  schoolProfile: DEFAULT_SCHOOL,
  brandingSettings: DEFAULT_BRANDING,
  systemSettings: DEFAULT_SYSTEM,
});

export const useSettings = () => useContext(SettingsContext);

export function SettingsProvider({ children }: { children: ReactNode }) {
  // In a real app, this would fetch from an API
  const [schoolProfile] = useState<SchoolProfile>(DEFAULT_SCHOOL);
  const [brandingSettings] = useState<BrandingSettings>(DEFAULT_BRANDING);
  const [systemSettings] = useState<SystemSettings>(DEFAULT_SYSTEM);

  return (
    <SettingsContext.Provider value={{ schoolProfile, brandingSettings, systemSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}
