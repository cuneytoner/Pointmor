# Kimlik ve giriş — ürün ve teknik yol haritası (social login dahil)

**Kapsam:** İleride yazılacak **document SaaS** ile **operatör admin** (`apps/api`) için ortak ilkeler (planlama). Provider entegrasyonları kod değil, **sprint ve şema kararları** için kaynak.

**İlgili kurallar:** [`10-meta-001-rules-index.md`](./10-meta-001-rules-index.md) → [20-rules-005-security.md](./20-rules-005-security.md), [20-rules-004-api-design.md](./20-rules-004-api-design.md), [20-rules-010-i18n.md](./20-rules-010-i18n.md), [20-rules-001-product-scope.md](./20-rules-001-product-scope.md).

---

## 1. Kısa değerlendirme

**Social login zorunlu mu?** Hayır. **E-posta + şifre** (ve güvenli oturum) tek başına ürünü taşır; birçok B2B hafif SaaS böyle başlar.

**Değerli mi?** Evet — özellikle **Google** ile kayıt sürtünmesini düşürmek, global kullanıcıda “şifre uydurma” yükünü azaltmak için. Bu, freelancer / ajans / danışman / küçük ekip segmentinde **onboarding friction**’ı doğrudan azaltır.

**Risk:** Her provider eklemek destek, güvenlik yüzeyi, test ve env yönetimi demektir; [20-rules-001-product-scope.md](./20-rules-001-product-scope.md) ile uyumlu olarak **aşamalı** eklenmeli.

---

## 2. Karar çerçevesi — sorular ve yanıtlar

| Soru | Yanıt |
|------|--------|
| **Hangi yöntemler gerçekten değerli?** | **Google** (geniş kitle), **e-posta+şifre** (evrensel, zorunlu taban). **GitHub** geliştirici odaklı içerik paylaşımı varsa anlamlı. **Microsoft** kurumsal / M365 ağırlıklı segmentte. **Apple** web-only için erken zorunlu değil. **Magic link** e-posta altyapısı oturduktan sonra ek seçenek. |
| **Google zorunlu mu?** | **Zorunlu değil**; **ilk social olarak önerilir** (kurulum bilinirliği, kullanıcı alışkanlığı). |
| **GitHub anlamlı mı?** | **Niş ama mantıklı:** teknik doküman, geliştirici kitlesi, “repo benzeri” algı varsa. Genel ajans/danışman için **ikinci dalga**. |
| **Microsoft hangi segment?** | **Kurumsal benzeri / M365** ile çalışan ekipler; SSO beklentisi artan müşteriler. **Üçüncü dalga** veya enterprise paketle birlikte. |
| **Apple gerekli mi?** | **Web-only MVP’de hayır.** Native iOS uygulaması veya App Store zorunluluğu (Sign in with Apple) gündeme gelirse planlanır; **sonraya**. |
| **Magic link?** | **Şifre yerine değil, ek seçenek:** “şifresiz giriş” deneyimi; **transactional e-posta** ve rate limit olmadan anlamlı değil. Şifreli hesap ile **aynı e-posta birleştirme** kuralları net olmalı. |

---

## 3. Önerilen auth roadmap (NOW / NEXT / LATER)

| Aşama | İçerik | Not |
|--------|--------|-----|
| **NOW** | Ürün kimliği için **e-posta + şifre**, güçlü oturum, **IDOR kapatma**, minimum `User` (document uygulaması yeniden yazılınca) | Planlama ile uyumlu. |
| **NEXT** | **Google OAuth** (tek provider ile başla), callback + env; **Account** veya `OAuthAccount` kaydı; **account linking** kuralları (aynı e-posta) | Monetization ile **paralel veya hemen sonrası** uygun: ödeme öncesi kullanıcı kimliği net olsun. |
| **LATER** | **GitHub**, **Microsoft (Entra / MSAL)** sırayla; **Apple** ihtiyaç halinde; **magic link** e-posta altyapısı stabil olduktan sonra | Her biri ayrı QA ve güvenlik gözden geçirmesi. |

**E-posta+şifre ile social birlikte:** Aynı ürün içinde **birincil kimlik** `User`; OAuth sağlayıcıları **bağlı hesap** (`OAuthAccount` / `Account`) ile tutulur. Oturum modeli (cookie/JWT) provider’dan bağımsız tek `session.userId` üretir.

**Invite / workspace:** OAuth, workspace’e üye daveti akışını **bozmaz**; davet token’ı e-postaya bağlanır, kullanıcı ister Google ister şifre ile ilk girişte hesabı birleştirir — **çakışma yönetimi** (aynı e-posta) ürün kuralı olarak netleştirilmeli.

---

## 4. Sprint planına yerleştirme

| Sprint | Auth içeriği (öneri) |
|--------|----------------------|
| **Sprint 2** | **Kod:** e-posta+şifre register/login, oturum, doc sahipliği. **Plan:** bu dokümanda social için şema notları; OAuth **implementasyonu yok** (overengineering önlenir). |
| **Sprint 3** | **Paddle / plan** önceliği korunur. **Google OAuth** istenirse **Sprint 3 ortası–sonu** ayrı milestone veya **“Sprint 3.5 / Auth+”** olarak eklenir — monetization **öncesi zorunlu değil**, ama **ödeme öncesi kullanıcı kaydı** yoğunsa Google’ı 3’ün erken haftasına çekmek mantıklı. |
| **Sprint 4+** | Ek provider’lar, magic link (e-posta güvenilirliği sonrası), kurumsal SSO (Microsoft) derinleştirme. |

**Net öneri:** Social login **tam kod** için **Sprint 3 veya ayrı kısa auth sprinti**; Sprint 2’ye yalnızca **veri modeli hazırlığı + bu roadmap** yeterli.

---

## 5. Teknik değerlendirme (plan seviyesi)

1. **Provider abstraction:** Evet, **ince bir katman** (ör. `signInWithProvider`, `handleOAuthCallback`) — her provider için ayrı dosya; ortak tip güvenli callback işleme. Ağır “plugin sistemi” gerekmez.

2. **User / ilişkili model (önerilen alanlar):**
   - `User`: `email`, `passwordHash?`, `emailVerifiedAt?`, `name`, `avatarUrl?`, `username` …
   - **`OAuthAccount` (veya `Account`):** `userId`, `provider` (`google` \| `github` \| `microsoft` \| `apple`), `providerAccountId`, `accessToken?` (kısa süreli, şifrelenmiş/rotation), `refreshToken?` (gerekirse), `createdAt`
   - İsteğe bağlı: `rawProfile` JSON (debug kapalı prod’da)

3. **Account linking:** Aynı e-posta ile **önce şifreli hesap**, sonra Google — **doğrulanmış e-posta** eşleşmesi veya “hesabı birleştir” akışı; çakışmada **güvenli varsayılan: yeni OAuth hesabı oluşturma yerine mevcut kullanıcıya bağlama** yalnızca doğrulama sonrası.

4. **E-posta çakışması:** Policy dokümante: örn. “Google ile gelen e-posta, doğrulanmış şifreli hesapla aynıysa birleştirme sihri yok — kullanıcıya açık adım”.

5. **Callback / env:** Her provider için `CLIENT_ID`, `CLIENT_SECRET`, `REDIRECT_URI` (ortam başına); [20-rules-006-deployment-and-ops.md](./20-rules-006-deployment-and-ops.md) ile secret yönetimi.

6. **Session:** Mevcut JWT/cookie modeli korunur; OAuth sonrası **aynı session issuer** — provider sadece ilk kimlik doğrulama.

7. **Security:** OAuth `state` + PKCE (OAuth 2.1 uyumu); token’ları loglama yok; rate limit login endpoint’lerinde — [20-rules-005-security.md](./20-rules-005-security.md).

8. **Deployment:** Staging’de ayrı OAuth uygulamaları; prod redirect URL listesi.

9. **QA / smoke:** Her provider için “ilk giriş”, “tekrar giriş”, “hesap birleştirme” senaryoları; [40-guide-003-smoke-tests-recent.md](./40-guide-003-smoke-tests-recent.md) genişletme notu.

---

## 6. i18n

Login / register / “Google ile devam et” metinleri [20-rules-010-i18n.md](./20-rules-010-i18n.md) uyumunda anahtarlar; provider adları marka olduğu için çeviri genelde gerekmez; **hata mesajları** (kullanıcıya dönük) çevrilir.

---

## 7. Net ürün kararı (özet)

- **MVP / yakın dönemde planlanmalı (aktif):** **E-posta + şifre** + güvenli oturum; roadmap’te **Google ilk social** olarak işaretlendi.
- **Backlog’da kalmalı (sırayla):** GitHub → Microsoft → Apple (ihtiyaç) → magic link (e-posta hazır olduktan sonra).

**Tek cümle — şu an sonraki auth işi:** **Admin + API** hattında e-posta+şifre ve güvenli oturum (Bölüm 8–9); document ürünü ayrı başlatılırsa aynı ilkeler [`10-meta-003-project-tracker.md`](./10-meta-003-project-tracker.md) ile uyumlanır. **Google OAuth** şema + implementasyon ayrı sprint — [`10-plan-002-auth-identity-roadmap.md`](./10-plan-002-auth-identity-roadmap.md) tablosu.
