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
    <div className="panel">
      <h3>AI Видео тренер</h3>
      <input type="file" accept="video/mp4,video/quicktime" onChange={onFile} style={{ margin: '8px 0' }} /><br/>
      Игрок: <select value={playerSide} onChange={e => setPlayerSide(e.target.value as any)}>
        <option value="near">Ближний (снизу)</option>
        <option value="far">Дальний (сверху)</option>
      </select>
      <div className="controls-row" style={{ marginTop: 8 }}>
        <button onClick={() => setMode('video')} className={mode==='video'?'primary':''}>Видео</button>
        <button onClick={() => setMode('skeleton')} className={mode==='skeleton'?'primary':''}>+Скелет</button>
        <button onClick={() => setMode('3d')} className={mode==='3d'?'primary':''}>Мой 3D</button>
        <button onClick={() => setMode('compare')} className={mode==='compare'?'primary':''}>Сравнить</button>
      </div>

      {result && (
        <div style={{ marginTop: 12 }}>
          Качество: <b>{result.quality}</b> — {result.reason}<br/>
          {result.quality !== 'insufficient' && (
            <>
              <button disabled={!result.scenario} onClick={() => result.scenario && onReplay(result.scenario)} style={{ marginTop: 8 }}>
                Переиграть в 3D
              </button>
              {result.errors.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <b>Ошибки:</b>
                  {result.errors.map((err, i) => (
                    <div key={i} style={{ fontSize: 13, marginTop: 6, padding: 8, background: '#222', borderRadius: 6 }}>
                      <b>{err.category}</b> ({(err.confidence*100).toFixed(0)}%)<br/>
                      {err.evidence}<br/>
                      <i>{err.hypothesis}</i><br/>
                      Альтернатива: {err.alternative}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
          {result.quality === 'insufficient' && <i>Недостаточно данных для уверенных выводов.</i>}
        </div>
      )}

      <video ref={videoRef} controls style={{ width: '100%', marginTop: 12, borderRadius: 8, display: mode === 'video' || mode === 'skeleton' ? 'block' : 'none' }} />
    </div>
  );
}
