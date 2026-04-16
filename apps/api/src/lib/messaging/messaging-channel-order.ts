import type {
  CustomerContactPreference,
  StoreMessagingSettings,
} from "../../generated/prisma/client.js";

/**
 * Mağaza ayarı + müşteri opt-in'e göre denenecek kanallar (en fazla 2).
 * Birincil: `defaultChannel` mümkünse; değilse ilk uygun kanal.
 * İkincil: `allowFallbackChannel` ve diğer kanal uygunsa.
 */
export function orderedMessagingChannels(
  store: StoreMessagingSettings,
  preference: CustomerContactPreference,
): ("sms" | "whatsapp")[] {
  const canSms = store.smsEnabled && preference.smsOptIn;
  const canWa = store.whatsappEnabled && preference.whatsappOptIn;
  const available: ("sms" | "whatsapp")[] = [];
  if (canSms) available.push("sms");
  if (canWa) available.push("whatsapp");
  if (available.length === 0) return [];

  const preferred = store.defaultChannel;
  const primary = available.includes(preferred) ? preferred : available[0]!;
  const secondary = available.find((c) => c !== primary);
  const out: ("sms" | "whatsapp")[] = [primary];
  if (store.allowFallbackChannel && secondary) out.push(secondary);
  return out;
}
