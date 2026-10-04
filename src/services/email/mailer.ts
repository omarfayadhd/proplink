// Mailer interface — Resend when RESEND_API_KEY exists (H1.7), console fallback
// otherwise (see docs/BLOCKERS.md). Tests always mock this module.

export interface Mail {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface Mailer {
  send(mail: Mail): Promise<void>;
}

const FROM = process.env.EMAIL_FROM ?? "PropLink UK <onboarding@resend.dev>";

class ResendMailer implements Mailer {
  constructor(private apiKey: string) {}

  async send(mail: Mail): Promise<void> {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: [mail.to],
        subject: mail.subject,
        text: mail.text,
        ...(mail.html ? { html: mail.html } : {}),
      }),
    });
    if (!res.ok) {
      throw new Error(`Resend API error ${res.status}: ${await res.text()}`);
    }
  }
}

class ConsoleMailer implements Mailer {
  async send(mail: Mail): Promise<void> {
    console.log(
      `\n📧 [ConsoleMailer] To: ${mail.to}\n   Subject: ${mail.subject}\n   ${mail.text.replace(/\n/g, "\n   ")}\n`,
    );
  }
}

export const mailer: Mailer = process.env.RESEND_API_KEY
  ? new ResendMailer(process.env.RESEND_API_KEY)
  : new ConsoleMailer();

const BASE_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

export async function sendVerificationEmail(to: string, token: string) {
  const url = `${BASE_URL}/verify-email?token=${token}`;
  await mailer.send({
    to,
    subject: "Verify your PropLink UK email",
    text: `Welcome to PropLink UK.\n\nVerify your email address by opening this link (valid 24 hours):\n${url}\n\nIf you did not create this account, ignore this email.`,
  });
}

export async function sendPasswordResetEmail(to: string, token: string) {
  const url = `${BASE_URL}/reset-password?token=${token}`;
  await mailer.send({
    to,
    subject: "Reset your PropLink UK password",
    text: `A password reset was requested for this address.\n\nSet a new password here (link valid 1 hour):\n${url}\n\nIf this wasn't you, ignore this email — your password is unchanged.`,
  });
}

/**
 * ADR-019 — an agent account is created by an admin, so the agent never chose
 * a password. The invite link sets their first one through the same
 * `/reset-password` screen, flagged so its copy reads as a welcome rather than
 * a reset. Valid 7 days: an invite waits in an inbox, unlike a reset a user
 * just asked for.
 */
export function agentInviteUrl(token: string): string {
  return `${BASE_URL}/reset-password?token=${token}&invite=1`;
}

export async function sendAgentInviteEmail(to: string, token: string) {
  await mailer.send({
    to,
    subject: "Your PropLink UK agent account is ready",
    text: `An administrator has created a PropLink UK agent account for this address.\n\nSet your password and sign in here (link valid 7 days):\n${agentInviteUrl(token)}\n\nIf you were not expecting this, ignore this email — the account cannot be used until a password is set.`,
  });
}

// Task 2.3 — admin moderation notifications.

export async function sendListingApprovedEmail(to: string, listingTitle: string) {
  await mailer.send({
    to,
    subject: `Your listing "${listingTitle}" is now live on PropLink UK`,
    text: `Good news — your listing "${listingTitle}" has been approved and is now live on PropLink UK.`,
  });
}

export async function sendListingRejectedEmail(
  to: string,
  listingTitle: string,
  reason: string,
) {
  await mailer.send({
    to,
    subject: `Your listing "${listingTitle}" needs changes before it can go live`,
    text: `Your listing "${listingTitle}" was reviewed and could not be approved as submitted.\n\nReason: ${reason}\n\nPlease make the requested changes and resubmit it for review from your agent portal.`,
  });
}

// Task 2.5 — public property detail page enquiry notification.

export async function sendNewEnquiryEmail(params: {
  to: string;
  listingTitle: string;
  fromName: string;
  fromEmail: string;
  contactPhone: string | null;
  message: string;
}) {
  await mailer.send({
    to: params.to,
    subject: `New enquiry on "${params.listingTitle}"`,
    text: `${params.fromName} (${params.fromEmail}) sent an enquiry about "${params.listingTitle}" on PropLink UK.${
      params.contactPhone ? `\nPreferred phone: ${params.contactPhone}` : ""
    }\n\nMessage:\n${params.message}\n\nReply directly to this email, or view the enquiry in your PropLink UK agent portal.`,
  });
}
