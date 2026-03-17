import axios from 'axios';
import { EMAIL_FROM, RESEND_API_KEY } from '../config/index.js';

type SubmissionData = {
  name?: string;
  email?: string;
  phone?: string;
  message?: string;
};

type SubmissionNotification = {
  projectId: string;
  projectName: string;
  formTitle?: string;
  destinationEmail?: string;
  submission: {
    submittedAt: Date | string;
    data: SubmissionData;
  };
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export class EmailNotificationService {
  private readonly apiKey = RESEND_API_KEY;
  private readonly from = EMAIL_FROM;

  public async notifyContactFormSubmission(input: SubmissionNotification) {
    const destinationEmail = input.destinationEmail?.trim();
    if (!destinationEmail || !isValidEmail(destinationEmail)) {
      return { sent: false, reason: 'missing_destination' as const };
    }

    if (!this.apiKey || !this.from) {
      return { sent: false, reason: 'not_configured' as const };
    }

    const submittedAt = new Date(input.submission.submittedAt);
    const lines = [
      `Project: ${input.projectName}`,
      `Project ID: ${input.projectId}`,
      `Form: ${input.formTitle || 'Contact Form'}`,
      `Submitted: ${submittedAt.toLocaleString('en-US')}`,
      '',
      `Name: ${input.submission.data.name || '-'}`,
      `Email: ${input.submission.data.email || '-'}`,
      `Phone: ${input.submission.data.phone || '-'}`,
      '',
      'Message:',
      input.submission.data.message || '-',
    ];

    try {
      await axios.post(
        'https://api.resend.com/emails',
        {
          from: this.from,
          to: [destinationEmail],
          subject: `New contact form submission for ${input.projectName}`,
          text: lines.join('\n'),
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );
      return { sent: true as const };
    } catch (error: any) {
      console.error('Email notification failed:', error?.response?.data || error?.message || error);
      return { sent: false, reason: 'send_failed' as const };
    }
  }
}
