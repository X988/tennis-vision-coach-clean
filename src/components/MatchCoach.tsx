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
    <div className="panel">
      <h3>Полный матч</h3>
      <input type="file" accept="video/*" onChange={upload} style={{ margin: '8px 0' }} /><br/>
      {job && (
        <div style={{ margin: '10px 0' }}>
          Статус: {job.status} ({job.progress}%) — {job.message}<br/>
          {job.status === 'processing' && <button onClick={() => proc.cancel(job.id)}>Отменить</button>}
        </div>
      )}
      {analysis && (
        <div>
          Качество: {analysis.quality}<br/>
          Розыгрыши: {analysis.rallies.length}<br/>
          <select value={filter} onChange={e => setFilter(e.target.value)} style={{ margin: '8px 0' }}>
            <option value="all">Все</option>
            <option value="position">Позиция</option>
            <option value="preparation">Подготовка</option>
            <option value="distance_stance">Дистанция/стойка</option>
          </select>
          <div style={{ maxHeight: 200, overflow: 'auto', fontSize: 13 }}>
            {analysis.rallies.map(r => (
              <div key={r.id} style={{ padding: '4px 0', borderBottom: '1px solid #333' }}>
                {r.start.toFixed(0)}–{r.end.toFixed(0)}с ({r.shots.length} ударов)
                <button onClick={() => onReplay({ id: r.id, name: `Розыгрыш ${r.id}`, bounce: { x: 0, z: -9 }, speed: 15, spin: 'flat', height: 0.6, shot: 'forehand', handed: 'right', uncertainty: 0.3 })} style={{ marginLeft: 8 }}>В 3D</button>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 10 }}>
            <b>Паттерны:</b>
            {analysis.errorPatterns.filter(p => filter === 'all' || p.category === filter).map(p => (
              <div key={p.category}>{p.category}: {p.count}×</div>
            ))}
          </div>
          <div style={{ marginTop: 8 }}>
            <b>План тренировок:</b>
            {analysis.trainingPlan.map(t => <div key={t.focus}>{t.priority}. {t.focus}</div>)}
          </div>
        </div>
      )}
    </div>
  );
}
