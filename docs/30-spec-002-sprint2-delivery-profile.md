# Sprint 2 — Hosted delivery + profil + e-posta

**Amaç:** Kullanıcı doküman oluşturur, paylaşır, **profilde sergiler**, **e-posta ile PDF + link** gönderir. Sprint 1’deki `/p/[slug]` modeli, kullanıcı ve görünürlük katmanıyla birleşir.

**Kapsam:** Kişisel profil (`/u/[username]`), doküman sayfası (`/u/[username]/docs/[slug]`), **public / unlisted / şifre**, **profilde listeleme** bayrağı, **transactional e-posta** ile PDF ve link.

---

## 1. User ve Document DB şeması (Prisma benzeri)

### `User`

| Alan | Tip | Açıklama |
|------|-----|----------|
| `id` | cuid | PK |
| `email` | string @unique | Giriş |
| `passwordHash` | string? | Basit e-posta/şifre ise |
| `name` | string | Görünen ad |
| `username` | string @unique | URL için; küçük harf, `[a-z0-9-]` |
| `bio` | string? | Profil metni |
| `avatarUrl` | string? | Opsiyonel |
| `profileVisibility` | enum | `public` \| `unlisted` (profil sayfası erişimi) |
| `createdAt` / `updatedAt` | DateTime | |

### `Document`

| Alan | Tip | Açıklama |
|------|-----|----------|
| `id` | cuid | PK |
| `ownerId` | FK → User | Sahip |
| `slug` | string | **Kullanıcı içinde** benzersiz: `@@unique([ownerId, slug])` |
| `title` | string | |
| `revisionJson` | Json | Sprint 1 normalize `BlockNode[]` + meta |
| `htmlCache` | string? | İsteğe bağlı önbellek (performans) |
| `theme` | string | `minimal` \| `corporate` \| `dark` |
| `logoAssetId` | string? | FK veya URL |
| **Visibility** | | |
| `visibility` | enum | `public` \| `unlisted` \| `password` |
| `shareToken` | string? @unique | Unlisted için secret segment (UUID) |
| `passwordHash` | string? | `visibility === password` ise bcrypt |
| **Profil** | | |
| `showOnProfile` | boolean @default(true) | `false` ise `/u/[username]` listesinde yok; doğrudan link ile erişim kuralına tabi |
| `createdAt` / `updatedAt` | DateTime | |

### İndeks / kısıt önerileri

- `@@unique([ownerId, slug])` — doküman URL’si kullanıcı bazında tek.
- `shareToken` üzerinde unique index (unlisted lookup).
- `username` unique — profil URL.

### İlişkili (opsiyonel Sprint 2)

- `EmailSendLog` — `{ id, documentId, toEmail, status, providerId, createdAt }` (destek / kötüye kullanım).

---

## 2. Auth yaklaşımı (basit)

| Seçenek | Ne zaman |
|---------|----------|
| **E-posta + şifre** | MVP uyumlu; `bcrypt` hash, session veya JWT |
| **JWT (access, kısa ömür)** | API + SSR için pratik; refresh Sprint 3’e kalabilir |
| **HttpOnly cookie + session store** | Sunucu render’da kolay; Fastify/Next session |

**Sprint 2 minimum:**

- `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`
- Oturum: **JWT** (`Authorization: Bearer`) veya **secure httpOnly cookie** (tercihen cookie + CSRF token form POST’larda)
- **Public sayfalar** (`/u/...`, `/u/.../docs/...`): auth zorunlu değil; **erişim doküman `visibility` + şifre ile**

Profil sahibi düzenleme: sadece `ownerId === session.user.id`.

### Sprint 2 kapsamı dışı — social login (planlı)

**Google / GitHub / Microsoft / Apple / magic link** bu sprintte **uygulanmaz** (auth yüzeyini şişirmemek için). **E-posta + şifre** tamamlandıktan sonra ilk OAuth olarak **Google** önerilir; sıra, veri modeli ve güvenlik notları: [`10-plan-002-auth-identity-roadmap.md`](./10-plan-002-auth-identity-roadmap.md).

**Şema notu (ileride):** `User` için `emailVerifiedAt` (opsiyonel); OAuth bağlantıları için ayrı **`OAuthAccount`** (veya `Account`) tablosu — uygulama Sprint 3 veya ayrı Auth+ işi.

---

## 3. Access control middleware

Katmanlar (sırayla):

1. **Route tanımı** — hangi path’ler public, hangisi owner-only API.
2. **`resolveDocument(username, slug)`** — User + Document join; yoksa 404.
3. **`assertDocumentAccess(doc, context)`**

| visibility | Koşul |
|------------|--------|
| `public` | Herkes okuyabilir (profil listesinde `showOnProfile` ise görünür). |
| `unlisted` | Doğru `shareToken` query veya path segment; token yoksa 404 (enumeration zorlaştırma). |
| `password` | Session’da `doc_access:{documentId}` cookie veya POST `/api/documents/[id]/unlock` body şifre → kısa ömürlü cookie imzası. |

4. **Profil sayfası** — `User.profileVisibility`: `unlisted` ise profil sadece token ile (Sprint 1 dokümanındaki unlisted benzeri) veya sadece giriş yapmış kullanıcıya — **öneri:** `public` profil herkese; `unlisted` profil için `profileShareToken` User üzerinde.

5. **Owner API** — `requireAuth` + `document.ownerId === user.id`.

**Middleware pseudo:**

```text
GET /u/:username/docs/:slug
  → load user by username
  → load document by ownerId + slug
  → if !document → 404
  → assertDocumentAccess(document, { query, cookies })
  → render
```

```text
GET /u/:username
  → load user
  → if user.profileVisibility === unlisted → require profileToken
  → list documents where ownerId AND showOnProfile AND visibility in (public) OR (unlisted with token) — liste mantığı ürün kararına göre sadeleştirilebilir
```

**Pratik sadeleştirme:** Profil listesinde yalnızca `showOnProfile === true` ve `visibility === public` dokümanlar gösterilir; unlisted dokümanlar profilde görünmez, sadece link ile açılır. `password` dokümanlar profilde listelenmez (veya kilit ikonu + tıklanınca şifre sayfası).

---

## 4. Email sending flow

**Akış:**

1. Kullanıcı (sahip) UI’da **alıcı e-posta** girer, “PDF gönder”e basar.
2. `POST /api/documents/[id]/send-email` — body: `{ to: string }`
3. Sunucu:
   - Yetki: sadece `ownerId`
   - PDF: mevcut pipeline (HTML → Puppeteer) veya son üretilmiş PDF’i storage’dan al
   - E-posta: transactional provider (Sendgrid / Postmark / Resend)
   - İçerik: konu (ör. doküman başlığı), metin gövdesi, **ek: PDF**, gövdede **hosted link** (`https://.../u/{username}/docs/{slug}` + unlisted ise `?t=...`)

**Kuyruk:** İlk sürümde senkron gönderim; yüksek hacimde `EmailJob` tablosu + worker (Sprint 3).

**Rate limit:** kullanıcı başına günde N gönderim; alan başına format doğrulama.

**Şablon:**

- Metin + HTML (multipart e-posta)
- Linkler `https` zorunlu

---

## 5. Routing yapısı

| Route | Kim | Açıklama |
|-------|-----|----------|
| `/` | Herkes | Landing / giriş / doküman oluşturma (Sprint 1) |
| `/login`, `/register` | Guest | Auth |
| `/dashboard` veya `/me` | Auth | Kendi dokümanları |
| `/u/[username]` | Koşullu | Profil + doküman listesi (`showOnProfile`, visibility kuralları) |
| `/u/[username]/docs/[slug]` | Koşullu | Tam doküman; erişim middleware |
| `/p/[slug]` | (İsteğe bağlı) | Sprint 1 geriye dönük; **redirect** → `/u/[username]/docs/[slug]` veya kaldır |

**Öneri:** Yeni canonical URL **`/u/[username]/docs/[slug]`**; eski `/p/[slug]` 301 ile birleştirilir (slug çakışması yoksa).

**API (özet):**

- `PATCH /api/documents/[id]` — `visibility`, `shareToken` yenileme, `password`, `showOnProfile`
- `POST /api/documents/[id]/send-email` — `{ to }`
- `POST /api/documents/[id]/unlock` — `{ password }` → Set-Cookie erişim jetonu

---

## 6. Profile page component yapısı

```
app/u/[username]/page.tsx
├── ProfileLayout
│   ├── ProfileHeader
│   │   ├── Avatar
│   │   ├── DisplayName
│   │   ├── @username
│   │   └── Bio
│   ├── DocumentGrid | DocumentList
│   │   └── DocumentCard[]  // title, excerpt, link → /u/[username]/docs/[slug]
│   └── (optional) ProfileVisibilityBanner  // unlisted profil uyarısı
```

```
app/u/[username]/docs/[slug]/page.tsx
├── DocumentLayout (theme + logo wrapper)
│   ├── AccessGate  // password ise form; değilse children
│   └── DocumentBody  // Sprint 1 HTML render
```

**Client bileşenleri:**

- `PasswordGate` — şifre gönder, başarılı olunca cookie ile yenile
- `ShareToolbar` — public / unlisted / şifre seçimi, `showOnProfile` switch (sahip)
- `SendEmailDialog` — alıcı e-posta, gönder

**Veri çekme:**

- Server Component: `getUserByUsername`, `listDocumentsForProfile(userId)` (filtreli)
- Document sayfası: `getDocumentForDisplay` + erişim kontrolü sunucuda

---

## 7. Sprint 1 ile hizalama

| Sprint 1 | Sprint 2 |
|----------|----------|
| `/p/[slug]` | Canonical `/u/[username]/docs/[slug]` (+ redirect) |
| public / unlisted token | Aynı + `password` + `showOnProfile` |
| Tek kullanıcı implicit | Açık `User` + `ownerId` |

---

## 8. Bu belgenin yeri

- Sprint 1: [`30-spec-001-sprint1-mvp.md`](./30-spec-001-sprint1-mvp.md)  
- Üst roadmap: [`10-plan-001-document-saas.md`](./10-plan-001-document-saas.md)  

“Bitti” ile birleştirme: tüm sprint dokümanları tek **master plan** içinde özetlenebilir.
