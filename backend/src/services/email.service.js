import nodemailer from 'nodemailer';

import { env } from '../config/env.js';

function formatDate(dateString) {
  if (!dateString) return 'As soon as possible';

  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) return 'As soon as possible';

  return parsed.toLocaleString('en-CA', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  });
}

export function buildBloodRequestEmail({ donor, hospital, bloodRequest, matchRank, matchPercentage }) {
  const urgency =
    bloodRequest.urgency === 'critical'
      ? 'Critical'
      : bloodRequest.urgency === 'urgent'
        ? 'Urgent'
        : 'Routine';

  const hospitalName = hospital.fullName || bloodRequest.hospitalName || 'Your local hospital';
  const donorName = donor.fullName || 'Donor';
  const subject = `${urgency} ${bloodRequest.bloodType} blood request for ${hospitalName}`;
  const neededByText = formatDate(bloodRequest.neededBy);
  const rewardText =
    bloodRequest.rewardAmount != null
      ? `${bloodRequest.rewardAmount.toLocaleString('en-US')} ${bloodRequest.rewardCurrency ?? 'XAF'}`
      : null;
  const rewardTextLine = rewardText ? `\n- Donor reward: ${rewardText}` : '';
  const rewardHtmlRow = rewardText
    ? `
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; font-weight: 700;">Donor reward</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">${rewardText}</td>
          </tr>`
    : '';

  const text = `Hello ${donorName},\n\n${hospitalName} has a ${urgency.toLowerCase()} ${bloodRequest.bloodType} blood request in ${bloodRequest.city}.\n\nRequest details:\n- Internal reference: ${bloodRequest.internalReference ?? 'Not provided'}\n- Units needed: ${bloodRequest.unitsNeeded ?? 1}\n- Needed by: ${neededByText}${rewardTextLine}\n- Match rank: #${matchRank ?? 'N/A'}\n- Match score: ${matchPercentage ?? 'N/A'}%\n\nThis request may be a strong match for your profile. Please reply to ${hospital.email} or contact the hospital directly if you are available to donate.\n\nThank you for helping save lives,\n${hospitalName}\n${hospital.email}`;

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 620px; margin: 0 auto;">
      <div style="padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background: #ffffff;">
        <div style="font-size: 12px; font-weight: 700; letter-spacing: 1px; color: #8E1722; text-transform: uppercase; margin-bottom: 12px;">
          BloodBridge match notification
        </div>
        <h2 style="margin: 0 0 12px; font-size: 26px; color: #111827;">${urgency} ${bloodRequest.bloodType} blood request</h2>
        <p style="margin: 0 0 20px; font-size: 16px;">
          Hello ${donorName},<br />
          <strong>${hospitalName}</strong> has a ${urgency.toLowerCase()} ${bloodRequest.bloodType} blood request in ${bloodRequest.city}.
        </p>

        <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; font-weight: 700; width: 180px;">Internal reference</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">${bloodRequest.internalReference ?? 'Not provided'}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; font-weight: 700;">Units needed</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">${bloodRequest.unitsNeeded ?? 1}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; font-weight: 700;">Needed by</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">${neededByText}</td>
          </tr>
          ${rewardHtmlRow}
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; font-weight: 700;">Match rank</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">#${matchRank ?? 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; font-weight: 700;">Match score</td>
            <td style="padding: 10px 0;">${matchPercentage ?? 'N/A'}%</td>
          </tr>
        </table>

        <p style="margin: 0 0 16px;">
          This request may be a strong match for your profile. If you are available and eligible, please reply to
          <a href="mailto:${hospital.email}" style="color: #8E1722; text-decoration: none;">${hospital.email}</a>
          or contact the hospital directly.
        </p>

        <div style="padding: 16px; border-radius: 10px; background: #f9fafb; border: 1px solid #f3f4f6;">
          <p style="margin: 0; font-weight: 700; color: #111827;">Thank you for helping save lives.</p>
          <p style="margin: 6px 0 0; color: #374151;">${hospitalName}<br />${hospital.email}</p>
        </div>
      </div>
    </div>
  `;

  return {
    from: `${hospitalName} <${hospital.email}>`,
    to: donor.email,
    subject,
    text,
    html,
  };
}

export async function sendBloodRequestEmail({ donor, hospital, bloodRequest, matchRank, matchPercentage }) {
  if (!env.smtp?.host || !env.smtp?.user || !env.smtp?.pass) {
    throw new Error('SMTP email is not configured');
  }

  const transporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port || 587,
    secure: env.smtp.secure,
    auth: {
      user: env.smtp.user,
      pass: env.smtp.pass,
    },
  });

  const mail = buildBloodRequestEmail({ donor, hospital, bloodRequest, matchRank, matchPercentage });
  return transporter.sendMail(mail);
}
