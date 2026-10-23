# Tennis Vision Coach — Stage 3

Modular engines + coach editor, roles, cloud sync, versioning.

## Architecture
- Engines: Ball / Reachability / Decision / Animation / Feedback (shared simulationTime)
- Frontend: React Three Fiber + IndexedDB + API client (`src/lib/api.ts`)
- Backend: REST/JSON (`backend/server.js`), file persistence as PostgreSQL analog
- Schema: `backend/schema.sql` (ready for real PostgreSQL)

## Launch
```bash
# Frontend
npm install
npm run dev

# Backend (separate terminal)
cd backend
npm install
npm start
```
API: http://localhost:3001

## Roles
- student: play, progress, profile
- coach: create/edit drafts, publish after review, view versions
- admin: full access

Set role via `PUT /api/me` or create user with role.

## Coach Editor
Component `src/components/Editor.tsx` — create scenarios without code (bounce, speed, spin, height, shot, handed, recommended stance, hint). Saves as draft. Publish via API.

## API (key endpoints)
- `POST /api/users` — create (returns id; send as `x-user-id` header)
- `GET/PUT /api/me` — profile (handed, backhand, height, level, settings)
- `GET /api/scenarios` — published + own
- `POST /api/scenarios` — create draft (coach+)
- `PUT /api/scenarios/:id` — update + auto-version
- `POST /api/scenarios/:id/publish`
- `GET /api/scenarios/:id/versions`
- `POST/GET /api/progress`
- `PUT/GET /api/state` — save/restore working state (scenario, camera, stage)

## Offline + sync
Local IndexedDB remains source of truth. On network: call `api.saveProgress` / `api.saveState` / `api.scenarios`. Implement queue in `storage.ts` if needed.

## Versioning
Every update increments version and stores snapshot + change_log in `versions`.

## Personalization
Store in user profile: leading hand, backhand type, height/category, level, display settings. Load on start and pass to engines/UI.

## Adding scenarios
1. Use Editor UI (coach) or
2. POST to `/api/scenarios` or
3. Still support local `scenarios.json` as seed.

Replace placeholder player with glTF when ready. For production PostgreSQL: apply `schema.sql` and swap file I/O in `server.js` for `pg` client.
