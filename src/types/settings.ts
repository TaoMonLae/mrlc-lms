export interface SchoolProfile {
  name: string;
  shortName: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  academicYear: string;
  principalName: string;
  description: string;
}

export interface BrandingSettings {
  logoUrl: string | null;
  pdfLogoUrl: string | null;
  primaryColor: string;
  accentColor: string;
  darkModeDefault: boolean;
  reportHeaderStyle: 'standard' | 'minimal' | 'elegant';
  signatureUrl: string | null;
  loginHeroUrl: string | null;
}

export interface SystemSettings {
  timezone: string;
  dateFormat: string;
  currency: string;
  defaultLanguage: string;
  fileUploadLimitMb: number;
  backupEnabled: boolean;
  lockdownBrowserEnabled: boolean;
  lockdownRequireFullscreen: boolean;
  lockdownBlockClipboard: boolean;
  lockdownBlockContextMenu: boolean;
  lockdownBlockShortcuts: boolean;
  lockdownAutoSubmitOnViolation: boolean;
  lockdownMaxWarnings: number;
  lockdownInstructions: string;
}
