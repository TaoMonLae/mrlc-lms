import addressparser from 'nodemailer/lib/addressparser';
import { SYSTEM_ADMIN_NAME } from './emailTemplates';

/** Set a consistent display name without changing the authorized SMTP address. */
export function systemAdminSender(configuredFrom: string) {
  const addresses = addressparser(configuredFrom, { flatten: true });
  if (addresses.length !== 1 || !addresses[0].address.includes('@') || /[\r\n]/.test(configuredFrom)) {
    throw new Error('SMTP_FROM must contain one valid sender mailbox');
  }
  return { name: SYSTEM_ADMIN_NAME, address: addresses[0].address };
}
