# Pointmor Platform Proje Planı

## 1. Ürün Vizyonu

Pointmor modüler çok kiracılı bir platformdur.  
Platform çekirdeği tenant, membership, auth/session, güvenlik ve module activation katmanını sağlar; alan işlevleri module yapılarıyla sunulur.

- Cafe/loyalty alanı platform içinde **mevcut module (`cafe`)** olarak konumlanır.
- AI Act Compliance module, platformdaki **ilk loyalty dışı module** olarak konumlanır.
- Advisor/client modeli, platformun B2B dağıtım ve operasyon ölçekleme katmanı olarak stratejiktir.

---

## 2. Tamamlananlar

- Dokümantasyon konsolidasyonu ve tek giriş yaklaşımı (`00-overview` merkezli) tamamlandı.
- Çekirdek platform doktrini (tenant + membership + module + isolation) netleştirildi.
- Membership üzerinden erişim modeli netleştirildi.
- Module sistemi tasarımı ve tenant module activation yapısı tanımlandı.
- Advisor-client model kuralları netleştirildi.
- Cross-tenant security kuralları sıkılaştırıldı.
- Schema constraints (DB enforcement) dokümantasyonu tamamlandı.
- Enforcement contract (API/service/DB katmanları) tanımlandı.
- RBAC referansları tek dosyada konsolide edildi.
- Seed/demo/reference dokümanları sadeleştirildi ve tekrarlar azaltıldı.

---

## 3. Mevcut Faz — Faz 2: Davet Kabul Akışı

Bu fazın hedefi, davet kabulünü platform doktrinine uygun biçimde tamamlamaktır:

**invite → accept → membership created → access granted**

Bu akış, advisor/client onboarding için kritik temel sağlar; erişim yalnızca `TenantMembership` oluşturulduktan sonra başlar.

### Tamamlanma Kriterleri

- kod uygulandı
- testler geçiyor
- enforcement kuralları doğrulandı
- dokümantasyon güncellendi
- cross-tenant access ihlali yok

### Çıkış Kriterleri

- üretim hazırı uygulama
- uç durumlar için test kapsamı
- cross-tenant access ihlali yok
- manuel uçtan uca doğrulama

---

## 4. Sonraki Fazlar (Faz 3+)

## Faz 3 — Policy Helpers + Module Activation Enforcement

- **Hedef:** Erişim kararını her tenant kapsamlı endpoint üzerinde tek tip policy helper ile zorunlu kılmak.
- **Kod değişiklikleri:** Ortak guard/policy helper genişletmeleri; module activation kontrolünü route/service katmanında standartlaştırmak.
- **Enforcement gereksinimleri:** deny-by-default, tenantId scope, membership + role + module activation.
- **Dokümantasyon güncellemeleri:** API tasarımı, security ve enforcement contract örneklerini policy helper yaklaşımıyla hizalamak.
- **Başarı kriterleri:** Module kapalıyken ilgili API/UI yüzeyi erişilemez; yeni endpoint'ler policy helper olmadan merge edilmez.

### Tamamlanma Kriterleri

- kod uygulandı
- testler geçiyor
- enforcement kuralları doğrulandı
- dokümantasyon güncellendi
- cross-tenant access ihlali yok

### Çıkış Kriterleri

- üretim hazırı uygulama
- uç durumlar için test kapsamı
- cross-tenant access ihlali yok
- manuel uçtan uca doğrulama

### Analiz Ekleri
- Ürün analizi:
- Teknik analiz:
- GTM / satış analizi:
- Risk analizi:
- Açık sorular:

## Faz 4 — AI Act MVP

- **Hedef:** İlk loyalty dışı module için çalışan bir MVP üretmek.
- **Kod değişiklikleri:** AI Act entity schema'sı, assessment API'leri, temel risk sınıflandırma ve rapor üretimi.
- **Enforcement gereksinimleri:** Tenant izolasyonu, membership tabanlı erişim, module activation gate.
- **Dokümantasyon güncellemeleri:** AI Act spec dosyasını endpoint/model ve akış detaylarıyla güncellemek.
- **Başarı kriterleri:** 10 soruluk assessment akışı tamamlanır; risk sınıfı ve temel rapor üretimi çalışır.

### Tamamlanma Kriterleri

- kod uygulandı
- testler geçiyor
- enforcement kuralları doğrulandı
- dokümantasyon güncellendi
- cross-tenant access ihlali yok

### Çıkış Kriterleri

- üretim hazırı uygulama
- uç durumlar için test kapsamı
- cross-tenant access ihlali yok
- manuel uçtan uca doğrulama

### Yön Değiştirme / Sonlandırma Kriterleri

Kullanıcılar şu davranışları göstermiyorsa:
- assessment tamamlamıyorsa
- raporu indirmiyorsa
- ürüne geri dönmüyorsa

O zaman:
- soru seti sadeleştirilir
- UX iyileştirilir
- değer önerisi yeniden değerlendirilir

### Analiz Ekleri
- Ürün analizi:
- Teknik analiz:
- GTM / satış analizi:
- Risk analizi:
- Açık sorular:

## Faz 5 — Advisor Gösterge Paneli

- **Hedef:** Advisor kullanıcıların çoklu client tenant operasyonunu tek yüzeyden yönetebilmesi.
- **Kod değişiklikleri:** Advisor odaklı tenant listesi, durum/aksiyon ekranları, membership tabanlı görünürlük.
- **Enforcement gereksinimleri:** Cross-tenant açık membership zorunluluğu; external advisor yetki sınırları.
- **Dokümantasyon güncellemeleri:** Advisor-client modeli ve security dokümanında gösterge paneli davranış kurallarını netleştirmek.
- **Başarı kriterleri:** Advisor, yalnızca üyeliği olan tenant'ları görür ve yönetir; privilege escalation oluşmaz.

### Tamamlanma Kriterleri

- kod uygulandı
- testler geçiyor
- enforcement kuralları doğrulandı
- dokümantasyon güncellendi
- cross-tenant access ihlali yok

### Analiz Ekleri
- Ürün analizi:
- Teknik analiz:
- GTM / satış analizi:
- Risk analizi:
- Açık sorular:

## Faz 6 — Ürünleştirme + Billing

- **Hedef:** Plan/entitlement ve fiyatlandırma akışlarını ürünleşme seviyesine taşımak.
- **Kod değişiklikleri:** Plan feature gating olgunlaştırması, abonelik yaşam döngüsü, billing yüzeyi entegrasyonu.
- **Enforcement gereksinimleri:** Feature erişimi plan + module activation + membership ile zorunlu olmalı.
- **Dokümantasyon güncellemeleri:** Product scope, deployment/ops ve ilgili spec/rule dosyalarını güncellemek.
- **Başarı kriterleri:** Plan bazlı feature/limit kontrolleri tutarlı ve ölçülebilir biçimde çalışır.

### Tamamlanma Kriterleri

- kod uygulandı
- testler geçiyor
- enforcement kuralları doğrulandı
- dokümantasyon güncellendi
- cross-tenant access ihlali yok

### Analiz Ekleri
- Ürün analizi:
- Teknik analiz:
- GTM / satış analizi:
- Risk analizi:
- Açık sorular:

## Faz 7 — Mobil Platform İstemcisi

- **Hedef:** Mobil istemciyi platforma tenant-aware bir istemci olarak konumlandırmak.
- **Kod değişiklikleri:** Mobil auth/session/tenant context, module bazlı ekran açılımı, API sözleşme uyumu.
- **Enforcement gereksinimleri:** Aynı access doctrine (membership + role + module activation) ve tenant isolation uygulanmalı.
- **Dokümantasyon güncellemeleri:** Product shells/branding ve API/security notlarını mobil bağlamla genişletmek.
- **Başarı kriterleri:** Mobil istemci, aynı platform kurallarıyla çok tenantlı biçimde çalışır.

### Tamamlanma Kriterleri

- kod uygulandı
- testler geçiyor
- enforcement kuralları doğrulandı
- dokümantasyon güncellendi
- cross-tenant access ihlali yok

### Analiz Ekleri
- Ürün analizi:
- Teknik analiz:
- GTM / satış analizi:
- Risk analizi:
- Açık sorular:

## Faz 8 — Gelecek Module'ler

- **Hedef:** Yeni alan module'lerini çekirdeğe zarar vermeden genişletebilmek.
- **Kod değişiklikleri:** Module bazlı schema/service/UI paketleri (örn. e-invoice, job manager, expense capture).
- **Enforcement gereksinimleri:** Module isolation, tenant scope, çekirdek tabloları değiştirme yasağı.
- **Dokümantasyon güncellemeleri:** Platform module'leri ve ilgili spec dosyalarını güncellemek.
- **Başarı kriterleri:** Yeni module'ler bağımsız ve güvenli biçimde aktive/deaktive edilir.

### Tamamlanma Kriterleri

- kod uygulandı
- testler geçiyor
- enforcement kuralları doğrulandı
- dokümantasyon güncellendi
- cross-tenant access ihlali yok

### Analiz Ekleri
- Ürün analizi:
- Teknik analiz:
- GTM / satış analizi:
- Risk analizi:
- Açık sorular:

## Faz Bağımlılıkları

- Faz 2, Faz 3'ten önce tamamlanmalıdır.
- Faz 3, Faz 4'ten önce tamamlanmalıdır.
- Faz 4 (AI Act MVP) aşağıdakiler tamamlanmadan başlamamalıdır:
  - invitation flow kararlı olmalıdır
  - module activation guard enforce edilmiş olmalıdır
- Faz 5, Faz 4 veri modeli ve erişim stabilitesine bağlıdır.

---

## 5. MVP Tanımı

MVP kapsamı:

- invitation acceptance
- tenant switching
- AI Act 10-question assessment
- risk classification
- basic compliance report/export

### Olmazsa Olmazlar

- Invitation acceptance (token + email match + membership create)
- Tenant switching (session context için güvenli geçiş)
- AI Act 10-question assessment akışı
- Temel risk sınıflandırma
- Temel compliance report/export

### Olması Faydalı Olanlar

- Advisor dashboard ilk sürüm görünürlüğü
- Module activation gate'lerinin tüm yeni endpoint'lerde standartlaştırılması
- Audit log görünürlüğünün operasyonel raporlarda netleştirilmesi

### MVP Kapsamı Dışı (Açık Non-Goal'lar)

- automation workflow'leri yok
- integration'lar yok
- karmaşık dashboard'lar yok
- MVP sırasında çoklu module genişlemesi yok

### Şimdilik Yok

- Geniş kapsamlı billing/PSP otomasyonları
- İleri düzey AI/otomasyon özellikleri
- Çok sayıda yeni module'ün paralel geliştirilmesi

---

## 6. Ürün Sıralaması

Önerilen sıra:

1. Platform onboarding
2. AI Act module
3. Advisor/client katmanı
4. Compliance export/reporting
5. Billing/pricing
6. Mobile tenant-aware istemci
7. Gelecek module'ler: e-invoice, Handwerker/job manager, expense capture

---

## 7. Teknik Kilometre Taşları

- schema hardening
- invitation acceptance
- policy helper standardizasyonu
- module activation guard enforcement
- AI Act data model
- AI Act assessment API
- AI Act UI
- report/export
- advisor dashboard

---

## 8. Karar Günlüğü

- Pointmor platform kimliği korunur.
- Cafe/loyalty alanı çekirdek değil, module olarak kalır.
- Repo kısa vadede bölünmez; tek platform reposu ile ilerlenir.
- `TenantMembership`, erişim için source of truth'tur.
- `User.tenantId`, legacy fallback olarak kalır (erişim kararı için kullanılmaz).
- Access doctrine: **membership + role + module activation**.
- Mobil istemci, yalnızca expense odaklı bir uygulama değil; platform istemcisidir.

---

## 9. Riskler ve Koruyucu Kurallar

- Cross-tenant data leak riski (tenant scope ihlali).
- Advisor privilege escalation riski (external kullanıcı yetki aşımı).
- Module boundary leakage riski (alan sorumluluklarının karışması).
- Seed verisinin legacy varsayımları gizleme riski.
- AI Act MVP doğrulanmadan aşırı kapsam büyütme (overbuilding) riski.

Koruyucu kurallar:

- deny-by-default
- membership-first access
- transaction-safe kritik akışlar
- tenantId için zorunlu query scope
- doküman + test + enforcement birlikte ilerleme

---

## 10. Sonraki Adımlar

1. invitation acceptance flow'u uygulamak
2. route/service testlerini doğrulamak
3. advisor dokümantasyonunu güncellemek
4. module activation guard'ını genişletmek
5. AI Act MVP schema'sını hazırlamak
