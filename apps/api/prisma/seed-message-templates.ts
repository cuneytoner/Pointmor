/** Global varsayılan mesaj şablonları — `createMany` + `skipDuplicates`. */
export const MESSAGE_TEMPLATE_SEED: Array<{
  key: string;
  channel: "sms" | "whatsapp";
  defaultContent: string;
  variables: string[];
}> = [
  {
    key: "FIRST_VISIT",
    channel: "sms",
    defaultContent:
      "{{storeName}}: İlk ziyaretiniz için teşekkürler — bir sonraki gelişinizi bekliyoruz.",
    variables: ["storeName"],
  },
  {
    key: "FIRST_VISIT",
    channel: "whatsapp",
    defaultContent:
      "Merhaba! {{storeName}} ailesi olarak ilk ziyaretiniz için teşekkür ederiz. Bir sonraki gelişinizi dört gözle bekliyoruz.",
    variables: ["storeName"],
  },
  {
    key: "DAY_1_REMINDER",
    channel: "sms",
    defaultContent: "{{storeName}}: Hoş geldiniz — sadakat puanlarınız hazır.",
    variables: ["storeName"],
  },
  {
    key: "DAY_1_REMINDER",
    channel: "whatsapp",
    defaultContent:
      "Gün 1 hatırlatma — {{storeName}}: Puanlarınızı takip etmeyi unutmayın!",
    variables: ["storeName"],
  },
  {
    key: "DAY_3_PROGRESS",
    channel: "sms",
    defaultContent: "{{storeName}}: 3. gün — puanlarınızla ilgili kısa bir güncelleme.",
    variables: ["storeName"],
  },
  {
    key: "DAY_3_PROGRESS",
    channel: "whatsapp",
    defaultContent:
      "3. gün ilerleme özeti ({{storeName}}): Sadakat hesabınız aktif.",
    variables: ["storeName"],
  },
  {
    key: "DAY_7_WINBACK",
    channel: "sms",
    defaultContent:
      "{{storeName}}: {{days}} gündür görüşemedik — uğramayı unutmayın, puanlar sizi bekliyor.",
    variables: ["storeName", "days"],
  },
  {
    key: "DAY_7_WINBACK",
    channel: "whatsapp",
    defaultContent:
      "Sizi özledik! {{storeName}} — {{days}} gündür uğramadınız. Tekrar bekleriz.",
    variables: ["storeName", "days"],
  },
  {
    key: "REWARD_UNLOCKED",
    channel: "sms",
    defaultContent:
      "{{storeName}}: \"{{rewardName}}\" ödülüne {{remaining}} puan kaldı.",
    variables: ["storeName", "rewardName", "remaining"],
  },
  {
    key: "REWARD_UNLOCKED",
    channel: "whatsapp",
    defaultContent:
      "{{storeName}} — Ödül yakında: *{{rewardName}}* 🎁  Kalan: {{remaining}} puan.",
    variables: ["storeName", "rewardName", "remaining"],
  },
];
