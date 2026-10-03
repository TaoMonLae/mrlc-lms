import type { AppRelease } from '../src/data/releases';

const SCHOOL = 'Mon Refugee Learning Centre';
export const SYSTEM_ADMIN_NAME = 'System Admin | MRLC LMS';
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]!);
const htmlText = (value: string) => escapeHtml(value).replace(/\r?\n/g, '<br />');

/** Keep email actions on the configured school origin, even for malformed paths. */
export function schoolEmailLink(appUrl: string, path = '/') {
  const origin = new URL(appUrl);
  if (!['http:', 'https:'].includes(origin.protocol)) throw new Error('APP_URL must be an HTTP(S) origin');
  const destination = new URL(path.startsWith('/') && !path.startsWith('//') ? path : '/', origin.origin);
  return destination.origin === origin.origin ? destination.href : `${origin.origin}/`;
}

type Section = { title: string; description: string; details?: string[] };
type EmailContent = {
  subject: string; heading: string; recipientName?: string; paragraphs: string[];
  actionLabel: string; actionUrl: string; guidance: string; sections?: Section[]; preferencesUrl?: string;
};

function renderEmail(content: EmailContent) {
  const greeting = `Dear ${content.recipientName?.trim() || 'MRLC community member'},`;
  const signature = `Kind regards,\nSystem Admin\n${SCHOOL}\nMRLC Learning Management System`;
  const automated = 'This is an automated message from the MRLC LMS System Admin. For assistance, contact your school administrator through your usual school communication channel.';
  const sections = content.sections || [];
  const textBody = [greeting, ...content.paragraphs,
    ...sections.map(section => [section.title, section.description, ...(section.details || []).map(detail => `• ${detail}`)].join('\n')),
    `${content.actionLabel}:\n${content.actionUrl}`, content.guidance, signature, automated,
    ...(content.preferencesUrl ? [`Manage your notification preferences:\n${content.preferencesUrl}`] : []),
  ].join('\n\n');
  const paragraph = (text: string) => `<p style="margin:0 0 18px;line-height:1.7">${htmlText(text)}</p>`;
  const htmlBody = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(content.heading)}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;color:#243746;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border:1px solid #dbe3e8">
<tr><td style="padding:24px 28px;background:#0c2538;border-bottom:4px solid #f2b84b;color:#ffffff"><p style="margin:0 0 6px;font-size:18px;font-weight:bold">MRLC LMS</p><p style="margin:0;font-size:13px;line-height:1.6">${SCHOOL} · System Administration</p></td></tr>
<tr><td style="padding:28px;font-size:15px"><h1 style="margin:0 0 24px;font-size:24px;line-height:1.35;color:#0c2538">${escapeHtml(content.heading)}</h1>
${paragraph(greeting)}${content.paragraphs.map(paragraph).join('')}
${sections.map(section => `<h2 style="margin:26px 0 10px;font-size:18px;line-height:1.4;color:#0c2538">${escapeHtml(section.title)}</h2>${paragraph(section.description)}${section.details?.length ? `<ul style="margin:0 0 20px;padding-left:22px">${section.details.map(detail => `<li style="margin:8px 0;line-height:1.6">${htmlText(detail)}</li>`).join('')}</ul>` : ''}`).join('')}
<p style="margin:26px 0"><a href="${escapeHtml(content.actionUrl)}" style="display:inline-block;background:#0c2538;color:#ffffff;padding:13px 20px;text-decoration:none;font-weight:bold;border-radius:4px">${escapeHtml(content.actionLabel)}</a></p>
${paragraph(content.guidance)}<p style="margin:0 0 24px;font-size:13px;line-height:1.6;overflow-wrap:anywhere;word-break:break-word">If the button does not open, copy this address into your browser:<br /><a href="${escapeHtml(content.actionUrl)}" style="color:#116d66">${escapeHtml(content.actionUrl)}</a></p>
${paragraph(signature)}</td></tr>
<tr><td style="padding:20px 28px;background:#f8fafc;border-top:1px solid #dbe3e8;font-size:12px;line-height:1.6;color:#526471">${escapeHtml(automated)}${content.preferencesUrl ? `<p style="margin:12px 0 0">You received this email because this notification category and email delivery are enabled for your account. <a href="${escapeHtml(content.preferencesUrl)}" style="color:#116d66">Manage notification preferences</a>.</p>` : ''}</td></tr>
</table></td></tr></table></body></html>`;
  return { subject: content.subject.replace(/[\r\n]+/g, ' ').trim(), textBody, htmlBody };
}

const notificationCopy: Record<string, { introduction: string; action: string; guidance: string }> = {
  PAYROLL_APPROVED: {
    introduction: 'Your payslip has been approved and is available for your review in MRLC LMS.',
    action: 'View my payslip',
    guidance: 'Please sign in to review the pay period and payslip details. Approval does not confirm that a payment has reached your account. If you notice a discrepancy, contact the school payroll administrator. For your privacy, pay amounts are not included in this email.',
  },
  PAYROLL_PAID: {
    introduction: 'The school payroll team has marked your payroll payment as paid in MRLC LMS.',
    action: 'Review payroll status',
    guidance: 'Please review the payment record and your payslip after signing in. If the recorded status does not match the payment you have received, contact the school payroll administrator. For your privacy, pay amounts are not included in this email.',
  },
  CLASS_ASSIGNMENT: {
    introduction: 'Your class assignment has changed in MRLC LMS. Please review the update below.',
    action: 'Review my classes',
    guidance: 'Check your current class responsibilities and teaching timetable before your next session. If you need clarification about this assignment, contact the school academic administrator.',
  },
  CLASS_UPDATED: {
    introduction: 'Details for a class associated with your account have been updated in MRLC LMS.',
    action: 'Review class details',
    guidance: 'Please review the current class information and take any required action before your next lesson. Contact the school academic administrator if you have questions about the change.',
  },
  CLASS_SCHEDULE: {
    introduction: 'A teaching schedule associated with your account has changed. The update may affect your upcoming teaching responsibilities.',
    action: 'Review teaching timetable',
    guidance: 'Please check the latest timetable for the current date, time, room and session status. Where an assignment has changed, the update may be sent to both the previous and current teacher. Contact the school academic administrator if clarification is needed.',
  },
  CLASS_ANNOUNCEMENT: {
    introduction: 'A school announcement relevant to your account is available in MRLC LMS. Please read the notice below.',
    action: 'Read school announcement',
    guidance: 'Open the announcement to review the current notice and follow any instructions or deadlines provided. Direct questions about the notice to its author or the school administrator.',
  },
  HOMEWORK_DUE: {
    introduction: 'This is a reminder that homework assigned to you is approaching its due date.',
    action: 'Review homework',
    guidance: 'Please review the assignment instructions and submit your work by the deadline shown in MRLC LMS. If you need help or expect difficulty meeting the deadline, contact your teacher.',
  },
  HOMEWORK_REDO: {
    introduction: 'Your teacher has returned a homework submission for another attempt.',
    action: 'Review homework feedback',
    guidance: 'Please read your teacher’s feedback, make the requested revisions and check the assignment for any resubmission instructions or deadline. Contact your teacher if any part of the feedback is unclear.',
  },
  HOMEWORK_MARKED: {
    introduction: 'Feedback on your homework is now available in MRLC LMS.',
    action: 'View homework feedback',
    guidance: 'Please sign in to review your marks and teacher feedback. Use the comments to identify what you have done well and what to improve. Your teacher can help with questions about the assessment.',
  },
  EXAM_RESULT: {
    introduction: 'An examination result has been released for you to view in MRLC LMS.',
    action: 'View exam result',
    guidance: 'Please sign in to review the released result and any available feedback. If you have questions about the result or the next steps in your learning, contact the responsible teacher.',
  },
  INTERVENTION_ASSIGNED: {
    introduction: 'A student-support action has been assigned to you in MRLC LMS.',
    action: 'Review support action',
    guidance: 'Please review the action, its due date and your responsibilities in the Student Success workspace. Keep student information confidential and coordinate any follow-up with the relevant school support staff.',
  },
  INTERVENTION_DUE: {
    introduction: 'A student-support action assigned to you requires follow-up.',
    action: 'Review support follow-up',
    guidance: 'Please check the action’s current status and due date, record completed work, and coordinate outstanding steps with the relevant school support staff. Handle all student information confidentially.',
  },
  VIDEO_LESSON: {
    introduction: 'Your teacher has sent a reminder about a video lesson or one of its linked learning activities.',
    action: 'Open video lesson',
    guidance: 'Please review the lesson and complete the activity identified above. Watching a video does not automatically complete its quiz or homework; check each activity in the lesson workspace. Contact your teacher if you need assistance.',
  },
  APP_UPDATE: {
    introduction: 'We are writing to inform you of an update to the MRLC Learning Management System. The release introduces the following changes to your school workspace.',
    action: 'Read What’s New',
    guidance: 'Please sign in and review What’s New to familiarise yourself with the changes. You can choose which school updates you receive from Notification settings. If you need assistance with a feature, contact your school administrator.',
  },
};

export function buildNotificationEmail(input: {
  type: string; title: string; message: string; href?: string | null;
  recipientName?: string; appUrl: string; release?: AppRelease;
}) {
  const copy = notificationCopy[input.type] || {
    introduction: 'There is an update relating to your MRLC LMS account. Please review the details below.',
    action: 'Review update in MRLC LMS',
    guidance: 'Sign in to review the current information and any action required. If you need clarification, contact your school administrator through your usual school communication channel.',
  };
  const release = input.type === 'APP_UPDATE' ? input.release : undefined;
  return renderEmail({
    subject: `MRLC LMS | ${input.title}`, heading: input.title, recipientName: input.recipientName,
    paragraphs: [copy.introduction, ...(release ? [`Release: ${release.version}`] : []), input.message],
    sections: release?.highlights.map(({ title, description, details }) => ({ title, description, details })),
    actionLabel: copy.action, actionUrl: schoolEmailLink(input.appUrl, input.href || '/'),
    guidance: copy.guidance, preferencesUrl: schoolEmailLink(input.appUrl, '/notifications/settings'),
  });
}

export function buildPasswordResetEmail(input: { recipientName?: string; appUrl: string; token: string }) {
  return renderEmail({
    subject: 'MRLC LMS | Password reset request', heading: 'Reset your MRLC LMS password', recipientName: input.recipientName,
    paragraphs: [
      'We received a request to reset the password for your MRLC LMS account.',
      'If you made this request, use the secure link below to choose a new password. The link expires 30 minutes after the request and can be used only once. If it has expired, return to the sign-in page and request a new link.',
      'If you did not request a password reset, you do not need to take any action. Your password will remain unchanged unless a valid reset is completed.',
    ],
    actionLabel: 'Reset my password', actionUrl: schoolEmailLink(input.appUrl, `/reset-password?token=${encodeURIComponent(input.token)}`),
    guidance: 'Keep this link private and do not forward this email. School staff will never need your password or recovery code to assist you. Contact your school administrator if you are concerned about access to your account.',
  });
}
