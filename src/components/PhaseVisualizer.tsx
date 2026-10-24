import { useMemo } from 'react';

interface Props {
  simTime: number;
  contactTime: number;
  bounceTime: number;
  playing: boolean;
}

type Phase = 'ready' | 'preparation' | 'backswing' | 'contact' | 'follow' | 'recovery';

const PHASES: Phase[] = ['ready', 'preparation', 'backswing', 'contact', 'follow', 'recovery'];

const PHASE_INFO: Record<Phase, { label: string; short: string; color: string; tip: string }> = {
  ready: { label: 'Готовность', short: 'Готов', color: '#64748b', tip: 'Расслабленная стойка, взгляд на мяч' },
  preparation: { label: 'Подготовка', short: 'Подготовка', color: '#3b82f6', tip: 'Unit turn — разворот плеч и бёдер' },
  backswing: { label: 'Замах', short: 'Замах', color: '#8b5cf6', tip: 'Отводи ракетку назад, ноги работают' },
  contact: { label: 'Контакт', short: 'Контакт', color: '#ef4444', tip: 'Удар впереди тела, вес на переднюю ногу' },
  follow: { label: 'Завершение', short: 'Проводка', color: '#22c55e', tip: 'Проводи ракетку до конца' },
  recovery: { label: 'Восстановление', short: 'Восстановление', color: '#f59e0b', tip: 'Вернись в готовность' },
};

export function PhaseVisualizer({ simTime, contactTime, bounceTime, playing }: Props) {
  const phase = useMemo((): Phase => {
    if (!playing || simTime < 0.05) return 'ready';
    const t = simTime;
    const ct = contactTime;
    if (t < ct * 0.35) return 'preparation';
    if (t < ct * 0.85) return 'backswing';
    if (t < ct + 0.08) return 'contact';
    if (t < ct + 0.35) return 'follow';
    return 'recovery';
  }, [simTime, contactTime, playing]);

  const info = PHASE_INFO[phase];
  const currentIdx = PHASES.indexOf(phase);

  return (
    <div style={{
      margin: '6px 10px',
      padding: '10px 12px',
      background: '#1a1d23',
      borderRadius: 12,
      border: `2px solid ${info.color}`,
    }}>
      <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Фаза удара</div>

      {/* Phase steps */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
        {PHASES.map((p, i) => {
          const pi = PHASE_INFO[p];
          const active = p === phase;
          const done = i < currentIdx;
          return (
            <div key={p} style={{
              flex: 1,
              height: 6,
              borderRadius: 3,
              background: active ? pi.color : done ? pi.color + '88' : '#2a2e36',
              boxShadow: active && playing ? `0 0 8px ${pi.color}` : 'none',
              transition: 'all 0.15s',
            }} title={pi.label} />
          );
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 'bold', color: info.color }}>{info.label}</div>
          <div style={{ fontSize: 12, color: '#ccc', marginTop: 2 }}>{info.tip}</div>
        </div>
        <div style={{
          width: 14, height: 14, borderRadius: '50%',
          background: info.color,
          boxShadow: playing ? `0 0 14px ${info.color}` : 'none',
          animation: playing ? 'pulse 0.7s ease-in-out infinite' : 'none',
        }} />
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.15); }
        }
      `}</style>
    </div>
  );
}
