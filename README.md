# Tennis Vision Coach — Stage 3 + AI Video Pilot (V0–V1)

Modular engines + coach editor, roles, cloud sync, versioning + video analysis pilot.

## Architecture
- Engines: Ball / Reachability / Decision / Animation / Feedback (shared simulationTime)
- Video: video → events → scenario → existing 3D engine (`VideoProcessor` + `VideoCoach`)
- Frontend: React Three Fiber + IndexedDB + API client
- Backend: REST/JSON (`backend/server.js`)

## Launch
```bash
npm install
npm run dev
# optional backend: cd backend && npm install && npm start
```

## AI Video Coach Pilot
Tab **AI Video**:
- Import 10–60s MP4/MOV
- Select player side (near/far)
- Quality gate: suitable / partial / insufficient (with reason)
- Events: opponent hit, bounce, estimated contact (with confidence)
- Error categories (only if suitable): position, preparation/turn, distance/stance — each with evidence, hypothesis, alternative
- Modes: Video / +Skeleton / My 3D / Compare
- **Replay moment** → loads scenario into 3D coach (marks uncertainty)

### Limitations (V0–V1)
- Pose landmarks currently simulated; full MediaPipe Pose Landmarker (`@mediapipe/tasks-vision`) integration is the next step (frame-by-frame processing + court calibration via 4 points).
- Event detection is heuristic; not production-grade tracking.
- No automatic court calibration UI yet (manual markers planned).
- Low-confidence / insufficient quality → no error conclusions generated.
- Single-player focus; multi-player occlusion not handled.
- Browser performance depends on device; process short clips only.

## Roles, Editor, API, Sync
See previous sections — unchanged. Editor and API still available for coaches.

## Adding scenarios
Library JSON, Coach Editor, or Video → Replay.
