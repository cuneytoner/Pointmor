# Yeni proje: Admin SaaS paneli — başlangıç prompt seti

Bu dosya, **Royalty** üzerinde hedeflenen (ve yeşil sahada birebir kurulması istenen) **operatör admin paneli** için Cursor / yapay kod asistanına verilebilecek **sıralı prompt** taslağıdır. Tema: **Plus Admin** (BootstrapDash) çizgisine yakın; giriş **tam ekran**, oturum sonrası **sidebar + üst bar kabuğu**.

**Görsel referans (kabuk):**  
https://www.bootstrapdash.com/blog/wp-content/uploads/2025/01/plus-admin-768x494.jpg  

**Renk / tipografi özeti:** Üst bar koyu lacivert tonları, sayfa arka planı açık gri `#f4f7f9`, kartlar beyaz, yuvarlatılmış köşeler (~12px), vurgu mavi `#0056b3` / aktif `#3b71f3`, gövde fontu **Inter** (Google Fonts).

---

## 0 — Ürün çerçevesi (tek seferlik, bağlam)

Aşağıyı olduğu gibi veya kısaltarak yapıştırın:

> B2B SaaS operatör paneli geliştiriyoruz: çok kiracılı (multi-tenant) platform yöneticileri ve yetkili tenant operatörleri buradan tenant, kullanıcı, paket/plan kataloğu, abonelik yaşam döngüsü ve platform yönetici rollerini yönetecek.  
> **Kimlik:** E-posta + şifre ile giriş; isteğe bağlı tenant slug (platform admin için boş). Oturum **JWT** (veya httpOnly cookie; tercih tek kaynakta netleştirilsin) ile API’ye `Authorization: Bearer`.  
> **Kritik UX:** Oturum yokken **asla** sidebar / operasyon kabuğu render edilmesin; yalnızca tam ekran giriş (ve gerekirse “oturum doğrulanıyor” tam ekran). Oturum açıkken **yalnızca** kabuk + sayfa içeriği. **Manuel “erişim belirteci yapıştır”** ile giriş paneli **isteme**; pazarlama uygulamasından token aktarımı varsa query param ile alınıp localStorage’a yazılabilir ama UI’da ayrı token kutusu olmasın.  
> **i18n:** TR ve EN; dil tercihi `localStorage`.  
> **Teknik:** Monorepo veya tek frontend paketi + ayrı API; React 18+, TypeScript, Vite, React Router; REST API.

---

## 1 — Repo iskeleti ve çalıştırma

> Monorepo kökünde `apps/admin-web` (Vite + React + TS), `apps/api` (Node + Fastify veya tercih ettiğin framework), ortak `package.json` workspace scriptleri: `dev:admin`, `dev:api`. Admin web **sabit port** (ör. 5173) ve `strictPort: true`; geliştirme sunucusunda `Cache-Control: no-store`. `.env.example` içinde `VITE_API_BASE_URL` ve API CORS origin’leri dokümante edilsin.

---

## 2 — Tema ve global stil (Plus Admin uyumu)

> Admin kabuğu için ayrı bir `plus-shell.css` (veya eşdeğeri): `#root:has(.admin-app)` arka plan `#f4f7f9`; `.admin-app` içinde sidebar beyaz, ince border/gölge; üst başlık alanı koyu gradient (`#0a1628` → mavi); aktif nav pill mavi; kartlar 12px radius. `index.html` veya CSS’te **Inter** yüklensin. Mevcut genel `styles.css` ile çakışmayacak şekilde scope: yalnızca `.admin-app` altında Plus stilleri.

---

## 3 — Oturum modeli ve veri yükleme

> `useAdminData(token, refreshKey, locale)` benzeri bir hook: her tam yükleme başında `auth: null` ve `authInvalid: false` ile başla; `/pricing` herkese açık; token varsa `/auth/me` çağır. 401/403 → `auth` null, `authInvalid: true`. Başarılı platform admin için tenant/user/subscription/admin uçlarını paralel çek.  
> `sessionOk = Boolean(token?.trim()) && !data.authInvalid && Boolean(data.auth?.user?.id)`.  
> Geçersiz token için: kısa süre sonra token’ı temizle ve kullanıcıya “oturum doğrulanamadı” mesajı göster.

---

## 4 — Yönlendirme ve iki ağaç kuralı (kritik)

> React Router ile **iki karşılıklı dışlanan** rota ağacı kullan:  
> - **`sessionOk === false`:** Yalnızca `Routes`: `/login` tam ekran giriş; `/auth/login` → `/login`; `*` → token + yükleme bekleniyorsa tam ekran spinner, aksi halde `Navigate` `/login`. Bu dalda **`div.admin-app` hiç mount edilmesin.**  
> - **`sessionOk === true`:** Yalnızca kabuk + `Outlet`; `/login` ve `/auth/login` → `/dashboard`; `/*` altında dashboard, tenants, users, plans, subscriptions, admin sayfaları.  
> Ek olarak `useNavigate` + `useLocation` ile: oturum yokken `/dashboard` vb. → replace `/login`; oturum varken `/login` → replace `/dashboard`.  
> Konsol (yalnız dev): tek satırlık sabit bir build/versiyon etiketi ve `import.meta.url` ile kaynak doğrulama logu.

---

## 5 — Giriş ekranı (tam ekran, tema uyumlu)

> `/login`: koyu veya marka uyumlu tam ekran kök (`login-standalone-root`), merkezde kart: logo/avatar, **form** içinde e-posta, şifre (`autocomplete` doğru), tenant slug (opsiyonel metin), gönder düğmesi; altında “şifremi unuttum” marketing linki, kayıt yönlendirmesi, dil anahtarı. **İkinci sütun / token paste alanı yok.**  
> Placeholder’lar sabit veya i18n; şifre placeholder’ı `••••••••` gibi; “erişim belirteci” placeholder’ı kullanma.

---

## 6 — Kabuk (oturum açık)

> `admin-app`: sol sidebar (marka, nav: dashboard, tenants, users, plans, subscriptions, platform admin), üst workspace header (durum, dil, çıkış). `workspace__body` içinde kısa durum bandı, kullanıcı özet kartı (auth’tan), `Outlet`. Çıkış: token sil + state sıfırla.

---

## 7 — Sayfa modülleri (SaaS süreçleri)

> Her sayfa `PageShell` (eyebrow, başlık, açıklama) + içerik:  
> - **Dashboard:** operasyon özeti, hero/metrik kartları, tablo önizlemesi (tenant akışı).  
> - **Tenants:** filtreler, liste, detay, davet oluşturma/iptal/yeniden gönder, durum güncelleme.  
> - **Users:** rol filtreleri, erişim güncelleme.  
> - **Plans:** katalog, oluşturma/güncelleme (özellik satırları).  
> - **Subscriptions:** liste, yapılandırma, durum aksiyonları.  
> - **Platform admin:** rota koruması `platform_admin`, kullanıcı listesi, audit log.  
> Boş veri durumlarında i18n uyumlu empty state; token yokken tablolar yerine açıklayıcı bekleme metinleri.

---

## 8 — API sözleşmesi (özet)

> `POST /auth/login` → `{ token, tenant?, membership? }`. `GET /auth/me` (auth zorunlu) → user, tenant, membership. CRUD uçları rol ile korunmuş. CORS’ta admin web origin’leri açık. Rate limit auth yazma uçlarında.

---

## 9 — Doğrulama ve sık hata önleme (prompt olarak)

> Şunları kontrol et:  
> - Oturum kapalıyken adres çubuğunda `/dashboard` açılınca otomatik `/login`.  
> - Oturum açıkken `/login` açılınca `/dashboard`.  
> - Konsoldaki sabit etiket ile `main.tsx` kaynak URL’si, çalıştığın Vite sunucusu ile aynı host/port mu.  
> - `localhost` vs `127.0.0.1` farklı localStorage; testleri tek origin’de yap.  
> - Port 5173’te başka süreç yok; `strictPort` ile çakışmada dev sunucusu hata versin.

---

## 10 — Sonraki adımlar (ürün)

> (İhtiyaca göre sırayla verilecek prompt örnekleri)  
> - **Hesap oluşturma:** Admin girişinden pazarlama sitesine yönlendirme; **ödeme (checkout)** veya **haftalık sınırlı ücretsiz** erişim seçenekleri (detay: `docs/10-plan-004-acquisition-and-pricing.md`).  
> - E-posta doğrulama, şifre sıfırlama akışı ve marketing sitesi ile hizalama.  
> - Faturalama sağlayıcı webhook’ları ve abonelik durum senkronu.  
> - Davet e-postası teslim logları ve yeniden deneme.  
> - E2E test (Playwright) ve minimal CI.

---

# Yeni bir repoda benimle nasıl başlarsınız? (adım adım)

1. **Boş repo açın** (GitHub/GitLab), README’ye tek cümle ürün tanımı yazın.  
2. **Cursor’da klasörü açın**, bu dosyayı `docs/10-plan-003-greenfield-admin-prompts.md` olarak kopyalayın veya içeriği yapıştırın.  
3. **İlk mesajınızda** şunu söyleyin: “`docs/10-plan-003-greenfield-admin-prompts.md` içindeki sırayı takip ederek başlayalım; önce bölüm 1 ve 2’yi uygula.”  
4. **Tek seferde bir faz** isteyin; her faz sonunda `npm run lint` / `dev` ile doğrulayın.  
5. **API ve admin-web’i ayrı terminallerde** çalıştırın; tarayıcıda **tek origin** (ör. hep `http://127.0.0.1:5173`) kullanın.  
6. **Oturum testi:** Çıkış → hard refresh → URL’nin `/login` olduğunu ve sidebar’ın görünmediğini doğrulayın.  
7. Faz 4’ten sonra takılırsanız, konsoldaki **sabit etiket satırını** ve **Network’te `src/main.tsx` yanıtını** ekran görüntüsü ile paylaşın.  
8. Ürün özelliklerini genişletirken **bölüm 10**’dan maddeleri tek tek “şimdi şunu ekle” diye iletin; bağlam için her zaman “mevcut monorepo yapısını koru” deyin.

Bu akış, tema + giriş/kabuk ayrımı + SaaS sayfalarının tutarlı bir çekirdeğe oturmasını ve sonraki özelliklerin aynı mimari üzerinde ilerlemesini hedefler.
