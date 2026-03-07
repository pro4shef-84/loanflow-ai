import { Resend } from "resend";

function getResend(): Resend {
  return new Resend(process.env.RESEND_API_KEY!);
}

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}

export async function sendEmail(params: SendEmailParams): Promise<string> {
  const resend = getResend();
  const { data, error } = await resend.emails.send({
    from: params.from ?? "LoanFlow AI <noreply@loanflow.ai>",
    to: params.to,
    subject: params.subject,
    html: params.html,
    replyTo: params.replyTo,
  });

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to send email");
  }

  return data.id;
}
