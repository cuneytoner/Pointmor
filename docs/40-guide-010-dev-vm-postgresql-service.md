# Dev Debian VM PostgreSQL service runbook

Bu rehber, dev için ayrılmış Debian VM üzerinde Docker tabanlı PostgreSQL container'ını
`systemd` ile otomatik başlatmak/kapatmak için kanonik akıştır.

Bu akışın amacı:

- VM reboot sonrasi DB'yi otomatik ayaga kaldirmak
- local Pointmor geliştirme ortamına stabil bir uzak dev DB sağlamak
- script/service dosyalarini repoda versiyonlu tutmak

Ilgili dosyalar:

- Service template: `infra/systemd/postredev.service`
- Script template: `infra/scripts/postgres-dev-vm.sh`
- Local runbook: `docs/40-guide-001-run-local.md`
- Demo deployment runbook: `docs/40-guide-004-demo-deployment.md`

---

## 1) Debian VM önkoşulları

- Docker kurulu ve çalışır durumda
- `cc` kullanıcısı docker komutlarını çalıştırabiliyor
- Script hedef klasoru mevcut: `/docker/postgresql`
- Data klasoru mevcut: `/docker/postgresql/data`

Ornek:

```bash
sudo mkdir -p /docker/postgresql/data
sudo chown -R cc:cc /docker/postgresql
```

---

## 2) Script dosyasini yerlestirme

Repodaki template'i hedefe kopyala:

```bash
sudo cp infra/scripts/postgres-dev-vm.sh /docker/postgresql/postgres.sh
sudo chmod +x /docker/postgresql/postgres.sh
```

> Not: service `ExecStart` yolu `/docker/postgresql/postgres.sh` olarak tanimlidir.
> `postgre.sh` yerine `postgres.sh` kullanilir.

---

## 3) systemd service dosyasini yerlestirme

Repodaki service template'i kopyala:

```bash
sudo cp infra/systemd/postredev.service /etc/systemd/system/postredev.service
```

Ardından:

```bash
sudo systemctl daemon-reload
sudo systemctl enable postredev.service
sudo systemctl start postredev.service
```

Durum kontrol:

```bash
sudo systemctl status postredev.service
docker ps | grep devpg
```

---

## 4) Operasyon komutlari

Manuel stop:

```bash
/docker/postgresql/postgres.sh stop
```

Service restart:

```bash
sudo systemctl restart postredev.service
```

Log:

```bash
journalctl -u postredev.service -n 100 --no-pager
```

---

## 5) Pointmor local `.env` bağlantısı

`apps/api/.env` icindeki `DATABASE_URL` VM PostgreSQL'e isaret etmelidir.

Ornek:

```env
DATABASE_URL="postgresql://postgres:<password>@<vm-ip>:5432/devdb"
```

Sonra local API:

```bash
npm run dev:api
```

---

## 6) Güvenlik notları

- Bu kurulum dev amaçlıdır; production kullanımı için uygun değildir.
- Scriptte hardcoded `POSTGRES_PASSWORD` bulunur; mümkünse VM'de dosya izinleri kısıtlanmalı
  ve daha sonra env/secret tabanlı modele geçilmelidir.
- 5432 portu sadece güvenilir ağ kaynaklarına açık olmalidir.

---

## 7) Dokümanı güncel tutma kuralı

Aşağıdaki değişikliklerde aynı PR/task içinde bu dokümanı güncelle:

- `infra/systemd/postredev.service`
- `infra/scripts/postgres-dev-vm.sh`
- hedef path (`/docker/postgresql/*`)
- service user / systemd unit davranisi
- dev DB bağlantı politikaları
