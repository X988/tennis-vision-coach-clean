import { useState, useRef, useEffect } from 'react';

export function LiveCoach({ onHint }: { onHint?: (msg: string) => void }) {
  const [active, setActive] = useState(false);
  const [lastHint, setLastHint] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) videoRef.current.srcObject = stream;
      setActive(true);
      // Pilot: simulated real-time hints (MediaPipe integration point)
      const id = setInterval(() => {
        const hints = ['Разворот раньше', 'Шаг ближе к мячу', 'Нейтральная стойка', 'Контакт впереди'];
        const h = hints[Math.floor(Math.random() * hints.length)];
        setLastHint(h);
        onHint?.(h);
        if ('speechSynthesis' in window) {
          const u = new SpeechSynthesisUtterance(h);
          u.lang = 'ru-RU';
          speechSynthesis.speak(u);
        }
      }, 4000);
      return () => clearInterval(id);
    } catch {
      alert('Камера недоступна');
    }
  };

  const stop = () => {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    }
    setActive(false);
    setLastHint('');
  };

  return (
    <div className="panel">
      <b>Live Coach</b><br/>
      <button onClick={active ? stop : start}>{active ? 'Stop' : 'Start live'}</button>
      <video ref={videoRef} autoPlay muted playsInline style={{ width: '100%', marginTop: 8, display: active ? 'block' : 'none' }} />
      {lastHint && <div style={{ marginTop: 8, color: '#4ade80' }}>{lastHint}</div>}
      <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>
        Пилот: симуляция подсказок. Для реального времени — MediaPipe Pose.
      </div>
    </div>
  );
}
