# Tenant App — Cashier tek ekran akışı (ürün / UX spec)

**Kapsam:** Tenant App (`/app/*`) içinde tek ekranda müşteri seçimi, tutar (visit), puan özeti ve ödül kullanımı (redemption). **Modal yok**; tam sayfa `PageShell`.  
**İlgili:** [`42-design-admin-ui.md`](./42-design-admin-ui.md) (düğme sınıfları, Plus shell), [`20-rules-010-i18n.md`](./20-rules-010-i18n.md) (kullanıcı metinleri).

---

## 1. Ürün kararı — operasyon sırası

### Kabul edilen varsayılan sıra

1. **Önce visit / satış kaydı** (`POST /visits` — tutar > 0).
2. **Sonra reward redemption** (`POST /redemptions` — müşteri ve ödül seçimi).

### Gerekçe

- **Ledger gerçeği:** Önce harcama kaydı, ardından puanla ödeme; kasiyer ve denetim için “önce ne kazanıldı, sonra ne harcandı” sırası net.
- **Bakiye tutarlılığı:** Visit sonrası bakiye güncellenir; redeem **güncel** bakiye üzerinden yapılır (yanlış “yetersiz puan” riski azalır).
- **Hız / tek ekran:** İki ayrı API çağrısı kalır; **birleşik tek CTA yok** — kasiyer iki kez basar ama sıra sabit ve öğrenilebilir.
- **Alternatif reddedildi:** “Önce redeem sonra visit” — müşteri aynı anda hem ödül kullanıp hem yeni puan kazanacaksa kafa karıştırır; kampanya/analitik açısından da visit önce daha temiz.

**Not:** Bu sıra **öneri ve eğitim** ile desteklenir; UI’da “önce ziyareti tamamlayın” kısa yardım metni (i18n) ile güçlendirilebilir.

---

## 2. Bileşen sınırları (referans)

| Bileşen | Görev |
|---------|-----|
| `CashierPage` | Container: state, API, orchestration |
| `CustomerPanel` | Arama, seçim, quick create |
| `AmountPanel` | Büyük tutar, keypad, odak |
| `SummaryPanel` | Base / bonus / total, kampanya |
| `RewardStrip` | Uygun ödüller, seçim |
| `CashierActionBar` | Complete visit + Use reward |

---

## 3. CTA interaction spec

### Çift CTA

| Düğme | Görünüm | Anlam |
|--------|---------|--------|
| **Complete visit** | Primary (`admin-primary-btn`) | Tutar ile ziyaret kaydı |
| **Use reward** | Secondary / outline (`admin-secondary-btn`) | Seçili ödülü kullan |

### Durum kuralları

| Müşteri | Tutar | Ödül seçili | Complete visit | Use reward |
|---------|-------|-------------|----------------|------------|
| Yok | * | * | Disabled | Disabled |
| Var | > 0 | Hayır | **Aktif** (geçerli tutar) | Disabled |
| Var | = 0 | Evet | Disabled | **Aktif** (bakiye yeterliyse) |
| Var | > 0 | Evet | **Aktif** | **Aktif** (bakiye yeterliyse; visit sonrası bakiye güncellenene kadar redeem ikinci adım) |

**Önerilen sıra (amount > 0 ve reward seçili):** Önce **Complete visit**; ardından **Use reward**. İkinci düğme visit başarısından sonra aynı müşteri bağlamında kullanılır.

### Enter

- **Enter** = **primary** eylem: `amount > 0` iken Complete visit; sadece ödül senaryosunda (`amount = 0`, reward seçili) Use reward.

### Modal

- Yok.

---

## 4. Visit sonrası reward seçimi

- **Müşteri context korunur:** `customerId` ve arama alanı sıfırlanmaz (visit başarılı olduktan sonra).
- **Seçili ödül:** Visit sonrası **varsayılan olarak korunur** (ikinci tıkla redeem için).
- **Kontrollü sıfırlama:** İsteğe bağlı “temiz başlangıç” için müşteri değişince veya açık “Yeni işlem” aksiyonu ile `selectedRewardId` temizlenir (implementasyon ayrıntısı).

---

## 5. UX acceptance criteria

1. **Visit süresi:** Kasiyer tipik senaryoda (müşteri seçili, tutar girili) **5–10 saniye** içinde visit’i tamamlayabilmelidir (ağ gecikmesi hariç tek akış).
2. **Reward ikinci aksiyon:** Redeem, visit’ten **ayrı** bir tıklama ile tamamlanır; ek sayfa veya modal yok; **çok hızlı ikinci adım** (aynı ekran, aynı müşteri).
3. **Context:** Visit başarısından sonra ekran **aynı müşteriyi** göstermeye devam eder; kasiyer başka müşteriye geçmeden redeem yapabilir.
4. **Ödül seçimi:** Visit sonrası seçili ödül **korunur** veya ürün kuralı gereği tek yerde (ör. müşteri değişimi) sıfırlanır; davranış tutarlı ve dokümante edilmiş olmalıdır.
5. **Hatalar:** Doğrulama ve API hataları **inline** (alan yakını veya özet şerit); global modal yok.

---

## 6. Bilerek yapılmayanlar

- Tek CTA içinde visit + redeem birleştirme (atomik “combo” butonu).
- Redemption onay kuyruğu bu ekranın birincil yolu değil; kuyruk ekranı operasyonel izleme için ayrı kalır (`/app/redemptions`).

## 6b. Müşteri claim’leri (uygulama talepleri)

- **API:** `GET /customers/:customerId/pending-claims` (tenant oturumu) — `status: pending` redemption satırları; onay/red mevcut `POST /redemptions/:id/approve|reject` ile aynı lifecycle.
- **Kasa UI:** `ClaimPanel` (grid ile ödül şeridi arasında); bekleyen ödül, **RewardStrip** içinde gizlenir (çift yol çakışması önlenir); **Complete visit** / **Use reward** davranışı değişmez.

---

## Revizyon

| Tarih | Not |
|-------|-----|
| 2026-04-15 | İlk ürün/UX kararı: operasyon sırası visit → redeem; çift CTA; acceptance criteria. |
