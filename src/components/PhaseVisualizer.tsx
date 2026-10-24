import { useMemo } from 'react';

interface Props {
  simTime: number;
  contactTime: number;
  bounceTime: number;
  playing: boolean;
}

type Phase = 'ready' | 'preparation' | 'backswing' | 'contact' | 'follow' | 'recovery';

const PHASE_INFO: Record<Phase, { label: string; color: string; tip: string }> = {
  ready: { label: 'Готовность', color: '#64748b', tip: 'Расслабленная стойка, взгляд на мяч' },
  preparation: { label: 'Подготовка', color: '#3b82f6', tip: 'Unit turn — разворот плеч и бёдер' },
  backswing: { label: 'Замах', color: '#8b5cf6', tip: 'Отводи ракетку назад, ноги работают' },
  contact: { label: 'Контакт', color: '#ef4444', tip: 'Удар впереди тела, вес на переднюю ногу' },
  follow: { label: 'Завершение', color: '#22c55e', tip: 'Проводи ракетку до конца' },
  recovery: { label: 'Восстановление', color: '#f59e0b', tip: 'Вернись в готовность' },
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
  const progress = Math.min(1, simTime / Math.max(contactTime + 0.5, 0.1));

  return (
    <div style={{
      margin: '6px 10px',
      padding: '10px 12px',
      background: '#1a1d23',
      borderRadius: 12,
      border: `2px solid ${info.color}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <div>
          <div style={{ fontSize: 11, color: '#888' }}>Фаза удара</div>
          <div style={{ fontSize: 16, fontWeight: 'bold', color: info.color }}>{info.label}</div>
        </div>
        <div style={{
          width: 12, height: 12, borderRadius: '50%',
          background: info.color,
          boxShadow: playing ? `0 0 12px ${info.color}` : 'none',
          animation: playing ? 'pulse 0.8s ease-in-out infinite' : 'none',
        }} />
      </div>

      <div style={{ fontSize: 12, color: '#ccc', marginBottom: 8 }}>{info.tip}</div>

      {/* Progress bar */}
      <div style={{ height: 6, background: '#2a2e36', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${progress * 100}%`,
          background: `linear-gradient(90deg, #3b82f6, ${info.color})`,
          transition: 'width 0.1s',
        }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#666', marginTop: 4 }}>
        <span>Подготовка</span>
        <span>Контакт</span>
        <span>Завершение</span>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
