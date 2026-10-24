import { useState, useRef, useEffect } from 'react';
import { PoseLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

export function LiveCoach({ onHint }: { onHint?: (msg: string) => void }) {
  const [active, setActive] = useState(false);
  const [lastHint, setLastHint] = useState('');
  const [status, setStatus] = useState('Ready');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const landmarkerRef = useRef<PoseLandmarker | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
        );
        const landmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
            delegate: 'GPU'
          },
          runningMode: 'VIDEO',
          numPoses: 1
        });
        if (!cancelled) {
          landmarkerRef.current = landmarker;
          setStatus('MediaPipe ready');
        }
      } catch (e) {
        setStatus('MediaPipe load failed');
        console.error(e);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const analyze = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const lm = landmarkerRef.current;
    if (!video || !canvas || !lm || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(analyze);
      return;
    }

    const results = lm.detectForVideo(video, performance.now());
    const ctx = canvas.getContext('2d')!;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, 0, 0);

    if (results.landmarks && results.landmarks[0]) {
      const landmarks = results.landmarks[0];
      ctx.strokeStyle = '#00ff88';
      ctx.lineWidth = 2;
      const connections = PoseLandmarker.POSE_CONNECTIONS;
      for (const conn of connections) {
        const pa = landmarks[conn.start];
        const pb = landmarks[conn.end];
        if (pa && pb && (pa.visibility ?? 1) > 0.5 && (pb.visibility ?? 1) > 0.5) {
          ctx.beginPath();
          ctx.moveTo(pa.x * canvas.width, pa.y * canvas.height);
          ctx.lineTo(pb.x * canvas.width, pb.y * canvas.height);
          ctx.stroke();
        }
      }

      const leftShoulder = landmarks[11];
      const rightShoulder = landmarks[12];
      const leftHip = landmarks[23];
      const rightHip = landmarks[24];
      if (leftShoulder && rightShoulder && leftHip && rightHip) {
        const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x);
        const hipWidth = Math.abs(leftHip.x - rightHip.x);
        let hint = '';
        if (shoulderWidth < 0.12) hint = 'Разворот раньше';
        else if (hipWidth < 0.08) hint = 'Открой стойку шире';
        else hint = 'Хорошая позиция';

        if (hint !== lastHint) {
          setLastHint(hint);
          onHint?.(hint);
          if ('speechSynthesis' in window) {
            const u = new SpeechSynthesisUtterance(hint);
            u.lang = 'ru-RU';
            speechSynthesis.cancel();
            speechSynthesis.speak(u);
          }
        }
      }
    }

    rafRef.current = requestAnimationFrame(analyze);
  };

  const start = async () => {
    if (!landmarkerRef.current) {
      setStatus('Waiting for MediaPipe...');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: 640, height: 480 }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setActive(true);
      setStatus('Live');
      rafRef.current = requestAnimationFrame(analyze);
    } catch {
      setStatus('Camera error');
      alert('Камера недоступна');
    }
  };

  const stop = () => {
    cancelAnimationFrame(rafRef.current);
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    }
    setActive(false);
    setLastHint('');
    setStatus('Stopped');
  };

  return (
    <div className="panel">
      <b>Live Coach (MediaPipe Pose)</b><br/>
      <div style={{ fontSize: 12, color: '#aaa' }}>{status}</div>
      <button onClick={active ? stop : start} disabled={!landmarkerRef.current && status !== 'MediaPipe ready'}>
        {active ? 'Stop' : 'Start live'}
      </button>
      <div style={{ position: 'relative', marginTop: 8 }}>
        <video ref={videoRef} playsInline muted style={{ display: 'none' }} />
        <canvas ref={canvasRef} style={{ width: '100%', display: active ? 'block' : 'none' }} />
      </div>
      {lastHint && <div style={{ marginTop: 8, color: '#4ade80', fontWeight: 'bold' }}>{lastHint}</div>}
    </div>
  );
}
