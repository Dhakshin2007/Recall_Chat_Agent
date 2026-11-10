# Deployment boundary

## Local evaluation

Use the README quick start. Keep the process single-instance and the data directory private. `npm start` runs without watch mode. `.env` edits need a restart.

## Container example

```bash
docker build -t recall-agent .
docker volume create recall-data
docker run --rm -p 3000:3000 --env-file .env \
  -e HOST=0.0.0.0 -e DATA_DIR=/app/data \
  -v recall-data:/app/data recall-agent
```

The image runs as the non-root `node` user. A named volume persists data across restarts. If using a host bind mount instead, make its ownership writable by the container user. Use one container only: multiple processes sharing this store can overwrite one another. Local Docker keeps PUBLIC_ORIGIN=http://localhost:3000.

## HTTPS evaluation deployment

Place one instance behind a TLS reverse proxy. Set PUBLIC_ORIGIN=https://your-exact-host (no trailing slash), COOKIE_SECURE=true, HOST=0.0.0.0, and a durable DATA_DIR. Inject GEMINI_API_KEY through the host's secret manager. Disable proxy buffering for /api/chat, allow at least 70 seconds upstream timeout, and persist the volume. Root filesystem/ephemeral platforms without persistent volumes lose history.

Do not expose this publicly as a finished multi-user service. Anonymous session identity, in-memory limits, whole-store rewrites, and no automatic expiry cleanup are intentional evaluation trade-offs. Rate limits see the actual socket IP, not blindly trusted X-Forwarded-For: behind a proxy, new-session limits can apply to all clients together. Implement edge quotas rather than casually trusting forwarded headers. These limits do not cap total Gemini spend against attackers creating sessions over time.

Before production: account authentication, tenant-scoped relational storage, per-user/global budgets, retention jobs and global storage limits, encrypted backups, disaster recovery, abuse monitoring, legal/privacy notice, accessibility/browser QA, provider policy review, observability with redaction, and representative load/adversarial tests. No database migration or multi-instance failover is supplied.
