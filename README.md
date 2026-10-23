# Tennis Vision Coach MVP

Modular TypeScript + React Three Fiber coach for right/left-handed forehand and two-handed backhand.

## Modules (all driven by shared simulationTime)
- `BallEngine` — trajectory, bounce, spin (flat/topspin/slice), height, contact time
- `ReachabilityEngine` — can player reach, suggested position
- `DecisionEngine` — recommended stance (open / semi-open / neutral / closed) + alternatives + explanation
- `AnimationEngine` — contact-synced swing
- `storage.ts` — IndexedDB progress
- `scenarios.json` — 12 library scenarios

## Launch
```bash
git clone https://github.com/X988/tennis-vision-coach-clean.git
cd tennis-vision-coach-clean
npm install
npm run dev
```

## Modes
- Play: free view + recommended stance
- Decide first: pick stance before seeing suggestion; records correct/incorrect
- Compare: see your choice vs recommended

## Adding a new scenario
1. Open `src/data/scenarios.json`
2. Append object:
```json
{
  "id": "my-scenario",
  "name": "My scenario",
  "bounce": { "x": 1.5, "z": -9 },
  "speed": 15,
  "spin": "topspin",
  "height": 0.7,
  "shot": "forehand",
  "handed": "right",
  "intent": "attacking"
}
```
3. Valid values:
   - spin: "flat" | "topspin" | "slice"
   - shot: "forehand" | "backhand"
   - handed: "right" | "left"
   - intent: free string
4. Reload app — new scenario appears in dropdown. Engines recalculate trajectory, contact, reachability and decision automatically.

Constructor sliders can be added in App by calling `ball.updateParams(...)` and resetting simTime.

Player uses placeholder geometry with stance-specific foot positions. Replace with glTF when ready.
