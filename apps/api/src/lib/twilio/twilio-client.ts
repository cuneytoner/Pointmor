import twilio from "twilio";

/** TWILIO_AUTH_TOKEN asla loglanmaz. */
export function getTwilioClient(): ReturnType<typeof twilio> | null {
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  if (!sid || !token) return null;
  return twilio(sid, token);
}

export function twilioConfigured(): boolean {
  return getTwilioClient() !== null;
}
