/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  /** Pazarlama sitesi kökü (kayıt / ödeme / ücretsiz deneme seçimi). */
  readonly VITE_MARKETING_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
