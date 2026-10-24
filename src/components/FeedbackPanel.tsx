import { Feedback } from '../engines/FeedbackEngine';

export function FeedbackPanel({ fb }: { fb: Feedback }) {
  return (
    <div className="panel" style={{ margin: '6px 10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: fb.overallScore >= 80 ? '#166534' : fb.overallScore >= 65 ? '#854d0e' : '#991b1b',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, fontWeight: 'bold'
        }}>
          {fb.overallScore}
        </div>
        <div>
          <b>Оценка техники</b><br/>
          <span style={{ fontSize: 12, color: '#aaa' }}>Из 100</span>
        </div>
      </div>

      <div style={{ fontSize: 13, marginBottom: 6 }}><b>Фазы удара:</b></div>
      {fb.phases.map((p, i) => (
        <div key={i} style={{ fontSize: 12, marginBottom: 2 }}>
          {p.phase}: <b>{p.score}</b> — {p.note}
        </div>
      ))}

      {fb.topFixes.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <b>Что исправить в первую очередь:</b>
          <ul style={{ margin: '4px 0', paddingLeft: 18, fontSize: 12 }}>
            {fb.topFixes.map((f, i) => <li key={i}>{f}</li>)}
          </ul>
        </div>
      )}

      {fb.drills.length > 0 && (
        <div style={{ marginTop: 6 }}>
          <b>Упражнения:</b>
          {fb.drills.map((d, i) => (
            <div key={i} style={{ fontSize: 12, marginTop: 4 }}>
              • <b>{d.name}</b> ({d.reps})<br/>
              <span style={{ color: '#aaa' }}>{d.description}</span>
            </div>
          ))}
        </div>
      )}

      {fb.strengths.length > 0 && (
        <div style={{ marginTop: 6, fontSize: 12, color: '#4ade80' }}>
          ✓ {fb.strengths.join(' · ')}
        </div>
      )}
    </div>
  );
}
