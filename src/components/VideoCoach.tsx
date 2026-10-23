import { useState, useRef } from 'react';
import { VideoProcessor, AnalysisResult } from '../engines/VideoProcessor';

export function VideoCoach({ onReplay }: { onReplay: (scenario: any) => void }) {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [mode, setMode] = useState<'video' | 'skeleton' | '3d' | 'compare'>('video');
  const [playerSide, setPlayerSide] = useState<'near' | 'far'>('near');
  const videoRef = useRef<HTMLVideoElement>(null);
  const processor = useRef(new VideoProcessor()).current;

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const analysis = await processor.analyze(file, playerSide);
    setResult(analysis);
    if (videoRef.current) videoRef.current.src = URL.createObjectURL(file);
  };

  return (
    <div className="controls" style={{ maxWidth: 420 }}>
      <b>AI Video Coach (V0–V1 Pilot)</b><br/>
      <input type="file" accept="video/mp4,video/quicktime" onChange={onFile} /><br/>
      Player: <select value={playerSide} onChange={e => setPlayerSide(e.target.value as any)}>
        <option value="near">Near (bottom)</option>
        <option value="far">Far (top)</option>
      </select>
      <div style={{ marginTop: 8 }}>
        Mode: 
        <button onClick={() => setMode('video')}>Video</button>
        <button onClick={() => setMode('skeleton')}>+ Skeleton</button>
        <button onClick={() => setMode('3d')}>My 3D</button>
        <button onClick={() => setMode('compare')}>Compare</button>
      </div>

      {result && (
        <div className="panel">
          Quality: <b>{result.quality}</b> — {result.reason}<br/>
          {result.quality !== 'insufficient' && (
            <>
              Events: {result.events.map(e => `${e.type}@${e.time.toFixed(1)}s (${(e.confidence*100).toFixed(0)}%)`).join(', ')}<br/>
              <button disabled={!result.scenario} onClick={() => result.scenario && onReplay(result.scenario)}>
                Replay moment in 3D
              </button>
              {result.errors.length > 0 && (
                <div>
                  <b>Errors (evidence-based):</b>
                  {result.errors.map((err, i) => (
                    <div key={i} style={{ fontSize: 12, marginTop: 4 }}>
                      <b>{err.category}</b> ({(err.confidence*100).toFixed(0)}%)<br/>
                      Evidence: {err.evidence}<br/>
                      Hypothesis: {err.hypothesis}<br/>
                      Alternative: {err.alternative}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
          {result.quality === 'insufficient' && <i>No confident conclusions generated.</i>}
        </div>
      )}

      <video ref={videoRef} controls style={{ width: '100%', marginTop: 8, display: mode === 'video' || mode === 'skeleton' ? 'block' : 'none' }} />
      {mode === 'skeleton' && result && <div style={{ fontSize: 12 }}>Skeleton overlay (MediaPipe landmarks) — pilot placeholder</div>}
      {mode === '3d' && <div style={{ fontSize: 12 }}>Switch to main 3D view after Replay</div>}
      {mode === 'compare' && result && <div style={{ fontSize: 12 }}>Recommended alternative shown in 3D after Replay</div>}
    </div>
  );
}
