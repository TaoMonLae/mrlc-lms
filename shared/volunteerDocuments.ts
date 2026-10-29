export const VOLUNTEER_DOCUMENT_TYPE_LABELS = {
  VOLUNTEER_APPRECIATION_LETTER: 'Letter of Appreciation',
  VOLUNTEER_APPRECIATION_CERTIFICATE: 'Certificate of Appreciation',
  PART_TIME_VOLUNTEER_CONFIRMATION: 'Proof of Part-Time Volunteering',
} as const;

export type VolunteerDocumentType = keyof typeof VOLUNTEER_DOCUMENT_TYPE_LABELS;

export const VOLUNTEER_ORGANIZATION_NAME = 'Mon Refugee Organization';
export const VOLUNTEER_SCHOOL_NAME = 'Mon Refugee Learning Centre';
export const VOLUNTEER_PROGRAM_NAME = 'GED Program';

export const VOLUNTEER_SIGNER_ROLES = ['ADMIN', 'TEACHER', 'STAFF', 'ACCOUNTANT', 'LIBRARIAN', 'CASE_WORKER'] as const;
export function isVolunteerStaffRole(role: unknown): boolean {
  return typeof role === 'string' && (VOLUNTEER_SIGNER_ROLES as readonly string[]).includes(role);
}
export type VolunteerSignatureSlot = 'SCHOOL' | 'ORGANIZATION';
export type VolunteerSigningStatus = 'NOT_REQUESTED' | 'PENDING' | 'SIGNED';

export interface VolunteerSignatureSummary {
  slot: VolunteerSignatureSlot;
  signerName: string;
  signerTitle: string;
  signedAt: string;
}

export interface VolunteerDocumentSignature extends VolunteerSignatureSummary {
  id: string;
  signerUserId: string;
  imageDataUrl: string;
  contentHash: string;
}

export interface VolunteerSigningOptions {
  signatories: { id: string; name: string; role: string }[];
  schoolChopDataUrl: string | null;
}

export function volunteerContributionLimit(type: VolunteerDocumentType): number {
  return type === 'VOLUNTEER_APPRECIATION_CERTIFICATE' ? 500 : 1200;
}

export interface VolunteerDocumentInput {
  type: VolunteerDocumentType;
  recipientName: string;
  role: string;
  fromMonth: string;
  toMonth: string;
  contributions?: string;
  hoursPerWeek?: number | null;
  totalHours?: number | null;
  signatoryName: string;
  signatoryTitle: string;
  signatoryUserId?: string;
  organizationSignatoryName?: string;
  organizationSignatoryTitle?: string;
  organizationSignatoryUserId?: string;
}

export interface VolunteerDocumentPayload {
  version: 1 | 2;
  organization: { name: string };
  school: {
    name: string;
    program: string;
    logoUrl: string | null;
    address: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
    chopDataUrl?: string | null;
  };
  volunteer: {
    name: string;
    role: string;
    fromMonth: string;
    toMonth: string;
    contributions: string;
    hoursPerWeek: number | null;
    totalHours: number | null;
  };
  signatory: { name: string; title: string };
  organizationSignatory: { name: string; title: string } | null;
}

export interface VolunteerDocumentRecord {
  id: string;
  documentNumber: string;
  verifyToken: string;
  verifyUrl: string;
  type: VolunteerDocumentType;
  status: 'ACTIVE' | 'CANCELLED' | 'REISSUED';
  recipientName: string;
  role: string;
  fromMonth: string;
  toMonth: string;
  payload: VolunteerDocumentPayload;
  issueDate: string;
  createdAt: string;
  updatedAt: string;
  cancelledReason: string | null;
  downloadCount: number;
  signatoryUserId?: string | null;
  organizationSignatoryUserId?: string | null;
  signatures?: VolunteerDocumentSignature[];
  signingStatus?: VolunteerSigningStatus;
  contentHash?: string;
}

export interface VolunteerDocumentVerification {
  valid: boolean;
  status: VolunteerDocumentRecord['status'];
  documentNumber: string;
  documentType: string;
  recipientName: string;
  role: string;
  fromMonth: string;
  toMonth: string;
  issueDate: string;
  organization: { name: string };
  school: Omit<VolunteerDocumentPayload['school'], 'chopDataUrl'>;
  hoursPerWeek: number | null;
  totalHours: number | null;
  signingStatus?: VolunteerSigningStatus;
  signatures?: VolunteerSignatureSummary[];
}

export function isVolunteerDocumentType(value: unknown): value is VolunteerDocumentType {
  return typeof value === 'string' && Object.hasOwn(VOLUNTEER_DOCUMENT_TYPE_LABELS, value);
}

export function volunteerDocumentLabel(type: string): string {
  return isVolunteerDocumentType(type) ? VOLUNTEER_DOCUMENT_TYPE_LABELS[type] : type.replaceAll('_', ' ');
}

export function formatVolunteerMonth(value: string): string {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return value;
  const [year, month] = value.split('-').map(Number);
  return `${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][month - 1]} ${year}`;
}

/** Service months use the school's local calendar, independent of the browser timezone. */
export function currentVolunteerMonth(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Kuala_Lumpur', year: 'numeric', month: '2-digit' }).formatToParts(now);
  return `${parts.find(part => part.type === 'year')!.value}-${parts.find(part => part.type === 'month')!.value}`;
}

export function validateVolunteerDocumentInput(value: unknown, now = new Date()):
  | { success: true; data: VolunteerDocumentInput }
  | { success: false; error: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { success: false, error: 'Document details are required.' };
  const body = value as Record<string, unknown>;
  if (!isVolunteerDocumentType(body.type)) return { success: false, error: 'Choose a valid volunteer document type.' };
  const limits = { recipientName: 160, role: 120, signatoryName: 120, signatoryTitle: 120 };
  const text: Record<string, string> = {};
  const hasUnsupportedControls = (value: string) => /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(value);
  for (const [key, max] of Object.entries(limits)) {
    if (typeof body[key] !== 'string' || !body[key].trim() || body[key].trim().length > max || hasUnsupportedControls(body[key])) {
      return { success: false, error: `${key} is required and must be ${max} characters or fewer.` };
    }
    text[key] = body[key].trim().replace(/\s+/g, ' ');
  }
  for (const [key, max] of Object.entries({ contributions: volunteerContributionLimit(body.type), organizationSignatoryName: 120, organizationSignatoryTitle: 120 })) {
    if (body[key] != null && (typeof body[key] !== 'string' || (body[key] as string).trim().length > max || hasUnsupportedControls(body[key] as string))) {
      return { success: false, error: `${key} must be ${max} characters or fewer.` };
    }
    const trimmed = typeof body[key] === 'string' ? body[key].trim() : '';
    text[key] = key === 'contributions' ? trimmed : trimmed.replace(/\s+/g, ' ');
  }
  if (Boolean(text.organizationSignatoryName) !== Boolean(text.organizationSignatoryTitle)) {
    return { success: false, error: 'Enter both the organization signatory name and title, or leave both blank.' };
  }
  for (const key of ['signatoryUserId', 'organizationSignatoryUserId']) {
    if (body[key] != null && (typeof body[key] !== 'string' || (body[key] as string).length > 100 || /[\s\u0000-\u001F\u007F]/.test(body[key] as string))) {
      return { success: false, error: 'Choose a valid authorized signatory account.' };
    }
  }
  const validMonth = (month: unknown): month is string => typeof month === 'string' && /^(19|20|21)\d{2}-(0[1-9]|1[0-2])$/.test(month);
  if (!validMonth(body.fromMonth) || !validMonth(body.toMonth)) return { success: false, error: 'From and To must be valid months in YYYY-MM format.' };
  if (body.fromMonth > body.toMonth) return { success: false, error: 'The To month must be on or after the From month.' };
  if (body.toMonth > currentVolunteerMonth(now)) return { success: false, error: 'Volunteer service cannot be certified for a future month.' };
  const hours: Record<string, number | null> = {};
  for (const [key, max] of Object.entries({ hoursPerWeek: 168, totalHours: 1_000_000 })) {
    const raw = body[key];
    if (raw == null || raw === '') { hours[key] = null; continue; }
    if (typeof raw !== 'number' || !Number.isFinite(raw) || raw <= 0 || raw > max) return { success: false, error: `${key} must be a number greater than 0 and no more than ${max}.` };
    hours[key] = raw;
  }
  return {
    success: true,
    data: {
      type: body.type, recipientName: text.recipientName, role: text.role,
      fromMonth: body.fromMonth, toMonth: body.toMonth, contributions: text.contributions,
      hoursPerWeek: hours.hoursPerWeek, totalHours: hours.totalHours,
      signatoryName: text.signatoryName, signatoryTitle: text.signatoryTitle,
      signatoryUserId: (body.signatoryUserId as string | undefined) || undefined,
      organizationSignatoryName: text.organizationSignatoryName, organizationSignatoryTitle: text.organizationSignatoryTitle,
      organizationSignatoryUserId: (body.organizationSignatoryUserId as string | undefined) || undefined,
    },
  };
}
