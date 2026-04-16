# Tasarım sistemi — form kontrolleri (admin-web)

**Amaç:** `apps/admin-web` içinde tek satırlı alanlar (metin, sayı, seçim, tarih/saat) ile çok satırlı alanların (textarea) görsel olarak ayrışması; modal ve sayfa formlarında tutarlı ritim.

---

## Tek satır kontroller

- **Sınıf:** `loyalty-form-control loyalty-form-input` (veya `components/form` içindeki `TextField`, `NumberField`, `SelectField`, `DateTimeLocalField`).
- **Yükseklik:** CSS değişkenleri `.admin-app` üzerinde: `--pm-control-min-h` (varsayılan `2.5rem`), `--pm-control-pad-y` / `--pm-control-pad-x`, `--pm-control-font-size` (`0.9375rem`), `--pm-control-line-height` (`1.25`).
- **Kullanılmaması gerekenler:** Form gövdesinde `toolbar__search` / `toolbar__select` — bunlar araç çubuğu için tasarlandı; tek satır alanlarda `toolbar__search--block` ile birlikte kullanıldığında yükseklik ve margin tutarsızlığı üretir.

## `datetime-local`

- Ek modifier: `loyalty-form-control--datetime` (`DateTimeLocalField` bunu uygular).
- İç düzenin şişmesini sınırlamak için `max-height: 2.75rem` ve sıkı `padding-block` kullanılır.

## Textarea

- **Sınıf:** `loyalty-form-control loyalty-form-control--textarea` (+ `loyalty-form-input`).
- **Varsayılan:** kısa/orta içerik; `min-height` ~`5rem`, `resize: vertical`.
- **Uzun içerik:** `loyalty-form-control--textarea-lg` veya `TextAreaField` `sizeVariant="large"`.

## Etiket / yardım / hata

- **`FormField`:** etiket tipografisi (`0.8125rem`, weight `600`), alt boşluk `gap: 0.35rem`, isteğe bağlı `hint` (`loyalty-form-hint` ile uyumlu), `error` (`pm-form-field__error`).
- **Zorunlu alan:** `required` prop ile `*` gösterimi (`pm-form-field__req`).

## Modal form yoğunluğu

- Bölüm başlıkları: `loyalty-form-section__title`.
- Alanlar arası dikey ritim: `loyalty-form-section` içinde `pm-form-field` için `margin-bottom` (CSS’te tanımlı).

---

**Referans kod:** `apps/admin-web/src/components/form/`, `apps/admin-web/src/plus-shell.css` (`.loyalty-form-control`, `.pm-form-field`).
