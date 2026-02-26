# Agents

## Cursor Cloud specific instructions

### Architecture

Carindex is a multi-service monorepo for automotive market intelligence. See `README_SETUP_EN.md` for full setup docs.

| Service | Directory | Dev command | Port |
|---------|-----------|-------------|------|
| Backend (Express API) | `backend/` | `npm run dev` | 3001 |
| Frontend (Vite SPA) | `frontend/` | `npm run dev` | 3000 |
| Django Parser | `django-parser/` | (optional) | 8003 |
| Monitoring | `monitoring/` | `docker-compose up` (optional) | 9090/3001 |

### Running services

- **Backend** requires a `backend/.env` file. Copy from `backend/.env.example`. At minimum set `PORT=3001`, `FRONTEND_URL=http://localhost:3000`, `JWT_SECRET=<any-string>`, and `ENABLE_CRON_JOBS=false`. Supabase credentials (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) are needed for data-dependent features but the server starts without them.
- **Frontend** Vite dev server on port 3000 proxies `/api` requests to `localhost:3001` (configured in `frontend/vite.config.js`).
- Run both together from root: `npm run dev` (uses `concurrently`).

### Testing

- `cd backend && npm test` runs Node.js built-in test runner (`node --test`). Some tests require Supabase credentials; some test files import `@jest/globals` but Jest is not installed — these fail with `ERR_MODULE_NOT_FOUND` (pre-existing).
- No ESLint or linting configuration exists in this repo.
- Frontend build: `cd frontend && npm run build`.

### Gotchas

- The backend uses ESM (`"type": "module"`) — all imports must use `.js` extensions.
- The Supabase client (`backend/src/config/supabase.js`) uses a lazy Proxy so the server starts even without credentials; errors only surface when a route actually queries Supabase.
- `backend/.env` is gitignored. If it's missing after a fresh clone, create it from `backend/.env.example`.
