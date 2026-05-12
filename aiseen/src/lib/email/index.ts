import { Resend } from "resend";

let _resend: Resend | null = null;

function getResend(): Resend {
  if (!_resend) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

export interface AuditReportEmailData {
  to: string;
  brandName: string;
  auditId: string;
  visibilityScore: number;
  appUrl: string;
}

export async function sendAuditReportEmail(data: AuditReportEmailData) {
  const { to, brandName, auditId, visibilityScore, appUrl } = data;

  return getResend().emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "AISeen <onboarding@resend.dev>",
    to,
    subject: `Your AI Visibility Report for ${brandName} is ready`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
  <h1 style="font-size: 24px; font-weight: bold; color: #111;">Your AI Visibility Report</h1>
  <p style="color: #555;">Here's how ${brandName} performs across ChatGPT, Gemini, and Claude.</p>

  <div style="background: #f5f5f5; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
    <div style="font-size: 64px; font-weight: bold; color: ${visibilityScore > 60 ? '#22c55e' : visibilityScore > 30 ? '#f59e0b' : '#ef4444'};">
      ${visibilityScore}
    </div>
    <div style="font-size: 18px; color: #555; margin-top: 8px;">AI Visibility Score</div>
    <div style="font-size: 14px; color: #888; margin-top: 4px;">
      ${visibilityScore <= 30 ? 'Invisible' : visibilityScore <= 60 ? 'Emerging' : visibilityScore <= 80 ? 'Strong' : 'Dominant'}
    </div>
  </div>

  <p style="color: #555;">Your full report includes all 25 queries, competitor analysis, and the top 5 fixes to increase your AI visibility.</p>

  <a href="${appUrl}/free-audit/${auditId}"
     style="display: inline-block; background: #111; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 16px 0;">
    View Full Report →
  </a>

  <p style="color: #888; font-size: 12px; margin-top: 32px;">
    AISeen — AI Search Visibility for E-commerce
  </p>
</body>
</html>`,
  });
}

export async function sendWelcomeEmail(to: string, name: string) {
  return getResend().emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "AISeen <onboarding@resend.dev>",
    to,
    subject: "Welcome to AISeen — let's get your store visible to AI",
    html: `
<!DOCTYPE html>
<html>
<body style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
  <h1 style="font-size: 24px; font-weight: bold;">Welcome, ${name || "there"}!</h1>
  <p>You're now tracking your store's AI visibility. Here's what happens next:</p>
  <ol>
    <li>We're generating buying queries from your catalog</li>
    <li>We'll run them across ChatGPT, Perplexity, Gemini, Claude, and Google AI Overviews</li>
    <li>Your first visibility score will be ready within minutes</li>
  </ol>
  <p>Questions? Reply to this email — we read everything.</p>
</body>
</html>`,
  });
}
