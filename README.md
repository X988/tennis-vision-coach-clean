# Tennis Vision Coach — Stage 5 (Full Matches)

Modular 3D engines + AI Video (short) + Full Match processing.

## Architecture
- 3D Scenario Engine + Event & Error Engine (shared simulationTime)
- Video → events → scenario → 3D (`VideoProcessor`, `MatchProcessor`)
- Frontend: React Three Fiber + IndexedDB
- Backend optional for sync/roles

## Launch
```bash
npm install
npm run dev
```
Tabs: **3D Coach** | **AI Video** | **Full Match**

## Full Match (Stage 5)
- Async upload with progress, cancel, status recovery
- Auto rally/shot segmentation (manual correction ready)
- Recurring error patterns (position, preparation, distance/stance…)
- Personal training plan from patterns
- Timeline + filters, Replay any rally into 3D
- Model version + confidence + limitations stored with every result

### Accuracy Limitations
- Pilot heuristics (not production tracking)
- Requires stable camera, good lighting, single primary player
- Confidence < ~0.65 marked; insufficient quality suppresses strong claims
- Full MediaPipe + court calibration still the next integration step
- Comparison of two matches only valid under similar filming conditions
- Long matches processed in simulated async steps; real backend queue recommended for production

## Short Video Pilot
Unchanged — see previous notes.

## Coach mode / versioning
Hypotheses can be confirmed/rejected; recommendations versioned via existing backend schema when connected.
