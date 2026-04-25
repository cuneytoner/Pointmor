# Enforcement Contract (Platform Garantileri)

## Amaç

Bu doküman, platform kurallarının tüm katmanlarda nasıl enforce edildiğini tanımlar.

Mimari kuralların opsiyonel olmamasını ve atlatılamamasını garanti eder.

---

## 1) Katmanlı enforcement modeli

Platform kuralları birden fazla katmanda enforce edilmelidir:

### API katmanı

* tenant context çözümleme
* membership doğrulama
* role yetki kontrolleri
* module activation kontrolleri

### Service katmanı

* iş mantığı API guard'larını atlamamalı
* tüm tenant kapsamlı işlemler context'i yeniden doğrulamalı

### Database katmanı

* unique constraints
* foreign keys
* tenantId varlığı
* indexing

---

## 2) Zorunlu değişmezler

Aşağıdakiler her zaman sağlanmalıdır:

* her request tam olarak bir tenant'a çözülür
* membership olmadan cross-tenant access olmaz
* membership tek source of truth'tur
* module activation işlevselliği kapılar
* tüm database query'leri tenantId ile scope edilmelidir
* request execution context, tüm yaşam döngüsü boyunca tek bir tenant'a bağlı olmalıdır

---

## 3) Deny-by-default garantisi

Herhangi bir doğrulama adımı başarısız olursa:

→ access reddedilmelidir

Fallback veya örtük erişime izin verilmez.

Reddedilen tüm access denemeleri audit ve security izleme için loglanmalıdır.

---

## 4) Yasak desenler

Aşağıdakiler kesin olarak yasaktır:

* User.tenantId değerini birincil access control olarak kullanmak
* tenantId filtresi olmadan query yapmak
* membership kontrollerini atlamak
* activation olmadan module verisine erişmek

---

## 4.1) External advisor kısıtları

Bir kullanıcıda `isExternal = true` ise:

- varsayılan olarak ADMIN seviyesi yetki verilmemeli
- yalnızca açıkça atanmış tenant verisine erişmeli
- istisnasız tüm membership + role kontrollerinden geçmeli

---

## 5) Geliştirici sorumluluğu

Her yeni feature şunları sağlamalıdır:

* tenant sınırlarına uymalı
* membership tabanlı access kullanmalı
* module isolation kurallarını izlemeli

Bu kurallara uyulmaması kritik bug kabul edilir.

---

## 6) Gelecek enforcement adımları

Bu kurallar ileride şu yollarla daha sıkı enforce edilebilir:

* middleware guard'ları
* lint kuralları
* test otomasyonu
* runtime assertion'ları
