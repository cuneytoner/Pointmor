# Cloudflare Tüneli (Pointmor demo)

**Sırlar repoda tutulmaz.** Tunnel token’ı yalnızca sunucudaki `infra/docker/.env.demo` içinde (`CLOUDFLARE_TUNNEL_TOKEN`) veya GitHub Secrets’ta saklayın.

## Compose kullanımı

```bash
docker compose -f infra/docker/docker-compose.demo.yml \
  --env-file infra/docker/.env.demo \
  --profile cloudflare up -d
```

Token’ı Cloudflare Zero Trust → Tunnels → ilgili tunnel → **Configure** üzerinden alın.

## Ayrıntı

- [`40-guide-004-demo-deployment.md`](./40-guide-004-demo-deployment.md) — Cloudflare ve ingress notları  
- [`40-guide-004-demo-deployment.md`](./40-guide-004-demo-deployment.md) — deploy + tunnel akışı  
