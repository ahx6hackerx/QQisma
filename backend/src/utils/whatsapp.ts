// WhatsApp notifications via Meta's official WhatsApp Cloud API.
//
// This has a genuine free tier, but requires the property owner to complete
// a one-time free signup with Meta (a Business + WhatsApp Business account,
// a phone number, and an access token) — that part can't be automated from
// code. Until WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID are set, every call
// below simply no-ops (logs to console) so the rest of the app works
// normally without WhatsApp configured.
//
// Setup docs: https://developers.facebook.com/docs/whatsapp/cloud-api/get-started

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const WHATSAPP_API_VERSION = process.env.WHATSAPP_API_VERSION ?? "v20.0";

export const whatsappConfigured = Boolean(WHATSAPP_TOKEN && WHATSAPP_PHONE_NUMBER_ID);

// Normalizes a locally-formatted Jordanian/Gulf number (e.g. "0790000001")
// toward E.164-ish digits-only, which is what the Cloud API expects. This is
// a best-effort helper, not a full phone-validation library.
function normalizePhone(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits.slice(1);
  if (digits.startsWith("00")) return digits.slice(2);
  if (digits.startsWith("0")) return `962${digits.slice(1)}`; // assume Jordan if a local 0-prefixed number slips through
  return digits;
}

export async function sendWhatsAppMessage(phone: string, message: string): Promise<boolean> {
  if (!whatsappConfigured) {
    console.log(`[whatsapp:not-configured] would send to ${phone}: ${message}`);
    return false;
  }
  try {
    const to = normalizePhone(phone);
    const res = await fetch(`https://graph.facebook.com/${WHATSAPP_API_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: message },
      }),
    });
    if (!res.ok) {
      console.error("[whatsapp] send failed", res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("[whatsapp] send error", err);
    return false;
  }
}

// Zero-setup fallback that always works: a wa.me link that pre-fills the
// message but requires the person to tap send themselves. Useful as a
// "Send via WhatsApp" button even before the Cloud API is configured.
export function buildWhatsAppShareLink(phone: string, message: string): string {
  const to = normalizePhone(phone);
  return `https://wa.me/${to}?text=${encodeURIComponent(message)}`;
}
