# frondtendkit — Frontend CobroKits SaaS

Next.js 16 desacoplado. **No tiene acceso a DB ni a .env del backend.**

- Conexión al backend vía `NEXT_PUBLIC_API_URL` (default `http://localhost:3001`)
- Cliente HTTP en `src/lib/api.js` (usa `fetch` + `credentials: include` para cookies HttpOnly)
- Helpers de formato en `src/lib/format.js`
- Proxy configurado en `next.config.mjs`: `/api/*` → `${NEXT_PUBLIC_API_URL}/api/*`

## Env

Copia `.env.example` a `.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Desarrollo

```bash
npm install
npm run dev # http://localhost:3000
```

Requiere `backendkit` corriendo en 3001.
