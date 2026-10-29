import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { SchoolProfile, BrandingSettings, SystemSettings } from '../types/settings';
import { isCursorEffect } from '../lib/cursorEffects';

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
  address: 'Malaysia',
  phone: '',
  email: '',
  website: '',
  academicYear: '2025-2026',
  principalName: '',
  description: 'GED School providing quality education for Mon refugees.',
};

const DEFAULT_BRANDING: BrandingSettings = {
  logoUrl: null,
  pdfLogoUrl: null,
  primaryColor: '#19324d',
  accentColor: '#168c83',
  darkModeDefault: false,
  reportHeaderStyle: 'standard',
  signatureUrl: null,
  loginHeroUrl: null,
};

const DEFAULT_SYSTEM: SystemSettings = {
  timezone: 'Asia/Kuala_Lumpur',
  dateFormat: 'DD/MM/YYYY',
  timeFormat: '24',
  clockShowSeconds: true,
  currency: 'MYR',
  defaultLanguage: 'en',
  fileUploadLimitMb: 10,
  backupEnabled: true,
  lockdownBrowserEnabled: true,
  lockdownRequireFullscreen: true,
  lockdownBlockClipboard: true,
  lockdownBlockContextMenu: true,
  lockdownBlockShortcuts: true,
  lockdownAutoSubmitOnViolation: true,
  lockdownMaxWarnings: 3,
  lockdownInstructions: '',
  cursorEffect: 'CLICK_SPARK',
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
    shortName: data.shortName !== undefined ? (data.shortName ?? '') : prev.shortName,
    address: data.address !== undefined ? (data.address ?? '') : prev.address,
    phone: data.contactPhone !== undefined ? (data.contactPhone ?? '') : prev.phone,
    email: data.contactEmail !== undefined ? (data.contactEmail ?? '') : prev.email,
    website: data.website !== undefined ? (data.website ?? '') : prev.website,
    academicYear: data.academicYear !== undefined ? (data.academicYear ?? '') : prev.academicYear,
    principalName: data.principalName !== undefined ? (data.principalName ?? '') : prev.principalName,
    description: data.description !== undefined ? (data.description ?? '') : prev.description,
  }));
  setBranding(prev => ({
    ...prev,
    logoUrl: data.logoUrl !== undefined ? data.logoUrl : prev.logoUrl,
    signatureUrl: data.signatureUrl !== undefined ? data.signatureUrl : prev.signatureUrl,
    loginHeroUrl: data.loginHeroUrl !== undefined ? data.loginHeroUrl : prev.loginHeroUrl,
    primaryColor: data.primaryColor ?? prev.primaryColor,
    accentColor: data.accentColor !== undefined ? data.accentColor : prev.accentColor,
    darkModeDefault: data.darkModeDefault !== undefined ? data.darkModeDefault : prev.darkModeDefault,
    reportHeaderStyle: data.reportHeaderStyle !== undefined ? data.reportHeaderStyle : prev.reportHeaderStyle,
  }));
  setSystem(prev => ({
    ...prev,
    timezone: data.timezone !== undefined ? data.timezone : prev.timezone,
    dateFormat: data.dateFormat !== undefined ? data.dateFormat : prev.dateFormat,
    timeFormat: data.timeFormat !== undefined ? data.timeFormat : prev.timeFormat,
    clockShowSeconds: data.clockShowSeconds !== undefined ? data.clockShowSeconds : prev.clockShowSeconds,
    currency: data.currency !== undefined ? data.currency : prev.currency,
    defaultLanguage: data.defaultLanguage !== undefined ? data.defaultLanguage : prev.defaultLanguage,
    fileUploadLimitMb: data.fileUploadLimitMb !== undefined ? data.fileUploadLimitMb : prev.fileUploadLimitMb,
    backupEnabled: data.backupEnabled !== undefined ? data.backupEnabled : prev.backupEnabled,
    lockdownBrowserEnabled: data.lockdownBrowserEnabled !== undefined ? data.lockdownBrowserEnabled : prev.lockdownBrowserEnabled,
    lockdownRequireFullscreen: data.lockdownRequireFullscreen !== undefined ? data.lockdownRequireFullscreen : prev.lockdownRequireFullscreen,
    lockdownBlockClipboard: data.lockdownBlockClipboard !== undefined ? data.lockdownBlockClipboard : prev.lockdownBlockClipboard,
    lockdownBlockContextMenu: data.lockdownBlockContextMenu !== undefined ? data.lockdownBlockContextMenu : prev.lockdownBlockContextMenu,
    lockdownBlockShortcuts: data.lockdownBlockShortcuts !== undefined ? data.lockdownBlockShortcuts : prev.lockdownBlockShortcuts,
    lockdownAutoSubmitOnViolation: data.lockdownAutoSubmitOnViolation !== undefined ? data.lockdownAutoSubmitOnViolation : prev.lockdownAutoSubmitOnViolation,
    lockdownMaxWarnings: data.lockdownMaxWarnings !== undefined ? data.lockdownMaxWarnings : prev.lockdownMaxWarnings,
    lockdownInstructions: data.lockdownInstructions !== undefined ? data.lockdownInstructions || '' : prev.lockdownInstructions,
    cursorEffect: isCursorEffect(data.cursorEffect) ? data.cursorEffect : prev.cursorEffect,
  }));
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [schoolProfile, setSchoolProfile] = useState<SchoolProfile>(DEFAULT_SCHOOL);
  const [brandingSettings, setBrandingSettings] = useState<BrandingSettings>(DEFAULT_BRANDING);
  const [systemSettings, setSystemSettings] = useState<SystemSettings>(DEFAULT_SYSTEM);
  const activeLoad = useRef<AbortController | null>(null);
  const settingsToken = useRef<string | null | undefined>(undefined);

  const resetSettings = useCallback(() => {
    setSchoolProfile(DEFAULT_SCHOOL);
    setBrandingSettings(DEFAULT_BRANDING);
    setSystemSettings(DEFAULT_SYSTEM);
  }, []);

  const reloadSettings = useCallback(async () => {
    activeLoad.current?.abort();
    const controller = new AbortController();
    activeLoad.current = controller;
    const token = sessionStorage.getItem('auth_token');
    // Clear the previous identity even if the new session's request fails.
    // Visitors hydrate only the explicitly public fields from the server.
    if (!token || settingsToken.current !== token) resetSettings();
    settingsToken.current = token;

    try {
      let res = await fetch(token ? '/api/settings' : '/api/public/branding', {
        ...(token ? { headers: { Authorization: `Bearer ${token}` } } : { cache: 'no-store' as const }),
        signal: controller.signal,
      });
      if (token && (res.status === 401 || res.status === 403)
        && !controller.signal.aborted && activeLoad.current === controller) {
        resetSettings();
        res = await fetch('/api/public/branding', { cache: 'no-store', signal: controller.signal });
      }
      if (res.ok) {
        const data = await res.json();
        // A response started before logout (or a newer reload) must never
        // restore private settings over the visitor's public school profile.
        if (controller.signal.aborted || activeLoad.current !== controller
          || sessionStorage.getItem('auth_token') !== token) return;
        if (data && (!token || data.name)) {
          applyServerData(data, setSchoolProfile, setBrandingSettings, setSystemSettings);
        }
      }
    } catch (error) {
      if (!controller.signal.aborted) console.error('Failed to reload school settings:', error);
    } finally {
      if (activeLoad.current === controller) activeLoad.current = null;
    }
  }, [resetSettings]);

  // Initial load and watch for auth changes
  useEffect(() => {
    const handleAuthChange = () => { void reloadSettings(); };
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === null || event.key === 'auth_token' || event.key === 'auth_user') handleAuthChange();
    };

    // Listen for storage changes (for cross-tab login/logout)
    window.addEventListener('storage', handleStorageChange);

    // Custom event listener for same-window login/logout
    window.addEventListener('auth-state-changed', handleAuthChange);

    // Initial load
    void reloadSettings();

    return () => {
      activeLoad.current?.abort();
      activeLoad.current = null;
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('auth-state-changed', handleAuthChange);
    };
  }, [reloadSettings]);

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
    if (token && sessionStorage.getItem('auth_token') === token) {
      // An older read must not overwrite a successful update. A save that
      // finishes after logout must not reintroduce authenticated fields.
      activeLoad.current?.abort();
      activeLoad.current = null;
      applyServerData(saved, setSchoolProfile, setBrandingSettings, setSystemSettings);
    }
    // Let anything outside this provider's tree (e.g. DynamicFavicon, which
    // has to work for logged-out visitors too and so can't consume this
    // context) know branding just changed, without a full page refresh.
    window.dispatchEvent(new Event('branding-updated'));
  };

  const updateSchoolProfile = (data: Partial<SchoolProfile>) =>
    save({
      name: data.name,
      shortName: data.shortName,
      address: data.address,
      phone: data.phone,
      email: data.email,
      website: data.website,
      academicYear: data.academicYear,
      principalName: data.principalName,
      description: data.description,
    });

  const updateBranding = (data: Partial<BrandingSettings>) =>
    save({
      logoUrl: data.logoUrl,
      signatureUrl: data.signatureUrl,
      loginHeroUrl: data.loginHeroUrl,
      primaryColor: data.primaryColor,
      accentColor: data.accentColor,
      darkModeDefault: data.darkModeDefault,
      reportHeaderStyle: data.reportHeaderStyle,
    });

  const updateSystem = (data: Partial<SystemSettings>) =>
    save({
      timezone: data.timezone,
      dateFormat: data.dateFormat,
      timeFormat: data.timeFormat,
      clockShowSeconds: data.clockShowSeconds,
      currency: data.currency,
      defaultLanguage: data.defaultLanguage,
      fileUploadLimitMb: data.fileUploadLimitMb,
      backupEnabled: data.backupEnabled,
      lockdownBrowserEnabled: data.lockdownBrowserEnabled,
      lockdownRequireFullscreen: data.lockdownRequireFullscreen,
      lockdownBlockClipboard: data.lockdownBlockClipboard,
      lockdownBlockContextMenu: data.lockdownBlockContextMenu,
      lockdownBlockShortcuts: data.lockdownBlockShortcuts,
      lockdownAutoSubmitOnViolation: data.lockdownAutoSubmitOnViolation,
      lockdownMaxWarnings: data.lockdownMaxWarnings,
      lockdownInstructions: data.lockdownInstructions,
      cursorEffect: data.cursorEffect,
    });

  return (
    <SettingsContext.Provider value={{ schoolProfile, brandingSettings, systemSettings, updateSchoolProfile, updateBranding, updateSystem, reloadSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}
