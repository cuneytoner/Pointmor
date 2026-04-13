# Import örnek CSV’leri (Phase 2.5 GF3)

Bu klasör **statik referans** içindir; admin web build’ine veya CDN’e **publish edilmez**. Yerel geliştirme ve manuel test için `POST /import/preview` ve `POST /import/apply` ile uyumlu örnek dosyalar burada tutulur.

| Dosya | `kind` | Zorunlu sütunlar | İsteğe bağlı |
|--------|--------|------------------|--------------|
| `users-sample.csv` | `user` | `email`, `name` | `role` (`viewer` \| `tenant_operator`) |
| `teams-sample.csv` | `team` | `name`, `code` | `description` |
| `classifications-sample.csv` | `classification` | `key`, `label` | `color`, `sort_order`, `is_active` |

**Notlar**

- Kiracı kapsamlı import: yalnızca oturum açmış kiracı kullanıcısı kullanabilir (`tenant_only`).
- Yeni kullanıcı satırları rastgele parola ile oluşturulur; demo hesaplar için `docs/41-ref-001-dev-seed-users.md` ile birlikte düşünün.
- Sınıflandırma `key` değerleri `[a-z][a-z0-9_]*` kuralına uymalı (tire yok); takım `code` tire içerebilir.
