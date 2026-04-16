/** Tek satır metin / sayı / seçim / datetime — aynı görsel aile */
export const FORM_CONTROL_CLASS = "loyalty-form-control loyalty-form-input";

/** `type="datetime-local"` — iç düzen yüksekliği sınırlı */
export const FORM_DATETIME_CLASS = "loyalty-form-control loyalty-form-control--datetime loyalty-form-input";

/** Çok satırlı — default kısa; `large` için `TEXTAREA_LARGE_CLASS` */
export const TEXTAREA_CLASS = "loyalty-form-control loyalty-form-control--textarea loyalty-form-input";

export const TEXTAREA_LARGE_CLASS =
  "loyalty-form-control loyalty-form-control--textarea loyalty-form-control--textarea-lg loyalty-form-input";

/** Sayısal alan — kompakt sabit genişlik (~w-28), değer sağa (`text-align: right`), alan sola */
export const NUMERIC_COMPACT_CONTROL_CLASS = `${FORM_CONTROL_CLASS} loyalty-form-control--numeric-compact`;

/** Tam genişlik sayı (nadir) */
export const NUMERIC_DEFAULT_CONTROL_CLASS = `${FORM_CONTROL_CLASS} loyalty-form-control--numeric-default`;
