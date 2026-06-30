import type { ClientOnboarding } from "@/lib/validations/onboarding";

/**
 * Future: send completed onboarding form to advocate email via Resend/Brevo.
 * Call this from the submit server action after a successful DB insert.
 */
export async function sendAdvocateEmail(record: ClientOnboarding): Promise<void> {
  void record;
  // Deferred — implement when RESEND_API_KEY and domain are configured.
  // Example:
  // await resend.emails.send({ to: record.advocate_email, subject: `New client: ${record.client_name}`, ... });
}
