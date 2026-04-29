# Tasarım sistemi — form kontrolleri (admin-web)

**Amaç:** `apps/admin-web` içinde tek satırlı alanlar (metin, sayı, seçim, tarih/saat) ile çok satırlı alanların (textarea) görsel olarak ayrışması; modal ve sayfa formlarında tutarlı ritim.

---

## Sayısal alan (`NumberField`)

- **Varsayılan:** `size="compact"` — sabit genişlik (**~7rem**, Tailwind `w-28` ile uyumlu), **değer sağa** (`text-align: right`, `tabular-nums`), alan **stack içinde sola** hizalı (`align-self: flex-start`).
- **Tam genişlik:** `size="default"` — nadir kullanım.
- **Form düzeni:** `FormField` her zaman **stack** — etiket üstte, kontrol altta; sayı alanları da aynı ritimde (inline etiket+kontrol kullanılmaz).

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
- **Structured data:** Kullanıcıya ham JSON textarea gösterilmez. Backend alanı JSON/object olarak kalsa bile UI, adres gibi yapılandırılmış verileri alanlara böler; dönüşüm client/service katmanında yapılır.

## Etiket / yardım / hata

- **`FormField`:** etiket tipografisi (`0.8125rem`, weight `600`), alt boşluk `gap: 0.35rem`, isteğe bağlı `hint` (`loyalty-form-hint` ile uyumlu), `error` (`pm-form-field__error`).
- **Zorunlu alan:** `required` prop ile `*` gösterimi (`pm-form-field__req`).

## Bölüm içi grid (`FormFieldGrid`)

- **Bileşen:** `FormFieldGrid` — `grid-cols-1` mobilde, `md:grid-cols-2` masaüstünde; `gap-x-6` / `gap-y-4`.
- **Tam genişlik satır:** `FormField` üzerinde `className={FORM_FIELD_GRID_FULL_CLASS}` (`md:col-span-2`) — ad, açıklama, bölüm ipucu.
- **Stil:** `.pm-form-field-grid` içinde `pm-form-field` alt margin sıfır (boşluk grid `gap` ile).

## Modal form yoğunluğu

- Bölüm başlıkları: `loyalty-form-section__title` veya `FormSection` bileşeni (aynı sınıflar).
- Alanlar arası dikey ritim: `loyalty-form-section` içinde `pm-form-field` için `margin-bottom` (grid dışı); `loyalty-form-stack--relaxed` bölümler arası ayırıcı ve padding artırılmıştır.
- Ödül / kampanya modalları: genişlik `max-width: min(42rem, 100vw - 2rem)`.
- **Uzun modal (plan seçimi vb.):** kök `modal-card modal-card--form`; başlık `modal-card__head`, kaydırılan içerik `modal-card__body`, eylemler `modal-card__footer` — kaydırma yalnız gövdede; footer üst kenarı ince ayırıcı ile sabit kalır.

## Uzun sayfa formları (`FormSection` + `FormFieldGrid`)

- **Bölüm:** `FormSection` — tek tip bölüm başlığı ve üst/alt boşluk; gereksiz divider kullanma.
- **İki kolon:** ilişkili kısa alanlar `FormFieldGrid` içinde; ad, açıklama, şablon gövdesi gibi tam genişlik alanlar `FORM_FIELD_GRID_FULL_CLASS`.
- **Tekrarlayan etiketten kaçın:** bölüm başlığı zaten bağlamı veriyorsa, alt alanda yalnızca kontrol + `aria-label` yeterli olabilir.

---

**Referans kod:** `apps/admin-web/src/components/form/`, `apps/admin-web/src/plus-shell.css` (`.loyalty-form-control`, `.pm-form-field`, `.modal-card--form`).
