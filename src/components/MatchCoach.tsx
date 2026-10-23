import { useState, useRef } from 'react';
import { MatchProcessor, JobStatus, MatchAnalysis } from '../engines/MatchProcessor';

export function MatchCoach({ onReplay }: { onReplay: (scenario: any) => void }) {
  const [job, setJob] = useState<JobStatus | null>(null);
  const [analysis, setAnalysis] = useState<MatchAnalysis | null>(null);
  const [filter, setFilter] = useState('all');
  const proc = useRef(new MatchProcessor()).current;

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const id = await proc.enqueue(f);
    const poll = setInterval(() => {
      const s = proc.getStatus(id);
      if (!s) return;
      setJob({ ...s });
      if (s.status === 'done') {
        setAnalysis((s as any).result);
        clearInterval(poll);
      }
      if (s.status === 'error' || s.status === 'cancelled') clearInterval(poll);
    }, 500);
  };

  return (
    <div className="controls" style={{ maxWidth: 480 }}>
      <b>AI Video Coach — Full Matches (Stage 5)</b><br/>
      <input type="file" accept="video/*" onChange={upload} /><br/>
      {job && (
        <div className="panel">
          Status: {job.status} ({job.progress}%) — {job.message}<br/>
          {job.status === 'processing' && <button onClick={() => proc.cancel(job.id)}>Cancel</button>}
        </div>
      )}
      {analysis && (
        <div className="panel">
          Quality: {analysis.quality} | Model: {analysis.modelVersion}<br/>
          Rallies: {analysis.rallies.length}<br/>
          <select value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="position">Position errors</option>
            <option value="preparation">Preparation</option>
            <option value="distance_stance">Distance/stance</option>
          </select>
          <div style={{ fontSize: 12, maxHeight: 180, overflow: 'auto' }}>
            {analysis.rallies.map(r => (
              <div key={r.id}>Rally {r.start.toFixed(0)}–{r.end.toFixed(0)}s ({r.shots.length} shots)
                <button onClick={() => onReplay({ id: r.id, name: `Rally ${r.id}`, bounce: { x: 0, z: -9 }, speed: 15, spin: 'flat', height: 0.6, shot: 'forehand', handed: 'right', uncertainty: 0.3 })}>Replay</button>
              </div>
            ))}
          </div>
          <b>Patterns:</b>
          {analysis.errorPatterns.filter(p => filter === 'all' || p.category === filter).map(p => (
            <div key={p.category}>{p.category}: {p.count}× (conf {(p.avgConfidence*100).toFixed(0)}%)</div>
          ))}
          <b>Training plan:</b>
          {analysis.trainingPlan.map(t => <div key={t.focus}>{t.priority}. {t.focus}: {t.drills.join(', ')}</div>)}
          <div style={{ fontSize: 11, color: '#aaa' }}>Limitations: {analysis.limitations.join('; ')}</div>
        </div>
      )}
    </div>
  );
}
