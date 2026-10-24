import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { useState, useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import scenarios from './data/scenarios.json';
import { BallEngine } from './engines/BallEngine';
import { ReachabilityEngine } from './engines/ReachabilityEngine';
import { DecisionEngine, Stance } from './engines/DecisionEngine';
import { AnimationEngine } from './engines/AnimationEngine';
import { Court } from './components/Court';
import { Ball } from './components/Ball';
import { Player } from './components/Player';
import { Layers } from './components/Layers';
import { VideoCoach } from './components/VideoCoach';
import { MatchCoach } from './components/MatchCoach';
import { LiveCoach } from './components/LiveCoach';
import { CompareView } from './components/CompareView';
import { saveAttempt, getStats } from './lib/storage';

const STANCE_KEYWORDS: Record<string, Record<Stance, string[]>> = {
  'ru-RU': { open: ['открытая', 'открытый'], 'semi-open': ['полуоткрытая', 'полуоткрытый'], neutral: ['нейтральная'], closed: ['закрытая'] },
  'en-US': { open: ['open'], 'semi-open': ['semi'], neutral: ['neutral'], closed: ['closed'] },
};

const T = {
  title: 'Tennis Vision Coach',
  tabs: { '3d': '3D', video: 'Видео', match: 'Матч', live: 'Живой' },
  play: 'Играть', pause: 'Пауза', step: 'Шаг', reset: 'Сброс',
  hideLayers: 'Скрыть слои', showLayers: 'Слои',
  single: 'Один', compare: 'Сравнить',
  cam: 'Камера', top: 'Сверху', side: 'Сбоку', back: 'Сзади', free: 'Свободно',
  scenario: 'Сценарий', library: 'Библиотека',
  mode: 'Режим', playMode: 'Просмотр', decide: 'Решение',
  chooseStance: 'Выберите стойку',
  recommended: 'Рекомендовано', alt: 'Альтернативы',
  progress: 'Прогресс', correct: 'правильно',
  open: 'Открытая', semiOpen: 'Полуоткрытая', neutral: 'Нейтральная', closed: 'Закрытая',
  back: '←',
};

const stanceLabel: Record<Stance, string> = {
  open: T.open, 'semi-open': T.semiOpen, neutral: T.neutral, closed: T.closed,
};

export default function App() {
  const [screen, setScreen] = useState<'home' | '3d' | 'video' | 'match' | 'live'>('home');
  const [scIdx, setScIdx] = useState(0);
  const [customScenario, setCustomScenario] = useState<any>(null);
  const sc = customScenario || scenarios[scIdx];
  const ball = useRef(new BallEngine({
    bouncePoint: sc.bounce, speed: sc.speed, spin: sc.spin as any, bounceHeight: sc.height
  })).current;
  const reach = useMemo(() => new ReachabilityEngine(), []);
  const decision = useMemo(() => new DecisionEngine(), []);
  const anim = useRef(new AnimationEngine()).current;

  const [simTime, setSimTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [cam, setCam] = useState<'top'|'side'|'back'|'free'>('free');
  const [mode, setMode] = useState<'play'|'decide'|'compare'>('play');
  const [showLayers, setShowLayers] = useState(true);
  const [showCompare, setShowCompare] = useState(false);
  const [userStance, setUserStance] = useState<Stance | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [stats, setStats] = useState({ total: 0, correct: 0 });
  const [lang] = useState('ru-RU');
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const playerStart = new THREE.Vector3(0, 0, -10.8);
  const reachInfo = reach.canReach(sc.bounce, ball.getContactTime(), playerStart);
  const playerPos = reach.suggestPosition(sc.bounce, sc.handed as any, sc.shot as any);
  const dec = decision.decide(sc.bounce.x, sc.bounce.z, sc.speed, sc.spin, sc.height, sc.shot);

  useEffect(() => {
    ball.updateParams({ bouncePoint: sc.bounce, speed: sc.speed, spin: sc.spin as any, bounceHeight: sc.height });
    anim.setContactTime(ball.getContactTime());
    setSimTime(0); anim.reset(); setUserStance(null); setShowHint(false);
  }, [scIdx, customScenario]);

  useEffect(() => {
    let id: number;
    const loop = () => {
      if (playing) { setSimTime(s => s + 0.016 * speed); anim.update(0.016 * speed); }
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [playing, speed]);

  useEffect(() => { getStats().then(setStats); }, []);

  const reset = () => {
    setPlaying(false); setSimTime(0); anim.reset();
    setUserStance(null); setShowHint(false);
    if (listening) { recognitionRef.current?.stop(); setListening(false); }
  };

  const onStancePick = async (s: Stance) => {
    setUserStance(s);
    const correct = s === dec.recommended;
    await saveAttempt(sc.id, s, correct);
    setStats(await getStats());
    setShowHint(true);
  };

  const startListening = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return alert('Голос не поддерживается');
    const rec = new SR();
    rec.lang = lang;
    rec.onresult = (e: any) => {
      const text = e.results[0][0].transcript.toLowerCase();
      const map = STANCE_KEYWORDS[lang];
      for (const [st, words] of Object.entries(map)) {
        if (words.some(w => text.includes(w))) { onStancePick(st as Stance); break; }
      }
    };
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  };

  const onReplay = (scenario: any) => {
    setCustomScenario(scenario);
    setScreen('3d');
  };

  const goHome = () => setScreen('home');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Header with back */}
      {screen !== 'home' && (
        <div className="header">
          <button onClick={goHome}>{T.back}</button>
          <span>{T.tabs[screen as keyof typeof T.tabs] || T.title}</span>
        </div>
      )}

      {/* Content */}
      <div className="canvas-wrap" style={{ display: screen === '3d' ? 'block' : 'none' }}>
        <Canvas shadows>
          <ambientLight intensity={0.55} />
          <directionalLight position={[8, 18, 6]} intensity={1.1} />
          {cam === 'top' && <PerspectiveCamera makeDefault position={[0, 22, 0]} fov={45} />}
          {cam === 'side' && <PerspectiveCamera makeDefault position={[14, 4, -2]} fov={45} />}
          {cam === 'back' && <PerspectiveCamera makeDefault position={[0, 3.5, -16]} fov={50} />}
          {cam === 'free' && <OrbitControls />}
          <Court />
          <Layers engine={ball} simTime={simTime} show={showLayers} />
          <Ball engine={ball} simTime={simTime} />
          <Player pos={playerPos} stance={(userStance || dec.recommended) as Stance} shot={sc.shot as any} handed={sc.handed as any} anim={anim} simTime={simTime} />
        </Canvas>
        {showCompare && <CompareView studentScenario={{ ...sc, stance: userStance || 'neutral' }} recommendedScenario={{ ...sc, stance: dec.recommended }} />}
      </div>

      <div className="screen" style={{ display: screen === 'home' ? 'block' : 'none' }}>
        <div className="panel">
          <h3>{T.title}</h3>
          <p style={{ color: '#aaa', margin: '8px 0 16px' }}>Выберите режим тренировки</p>
          <div className="controls-row">
            <button className="primary" onClick={() => setScreen('3d')}>3D Тренер</button>
            <button onClick={() => setScreen('video')}>AI Видео</button>
            <button onClick={() => setScreen('match')}>Полный матч</button>
            <button onClick={() => setScreen('live')}>Живой тренер</button>
          </div>
          <div style={{ marginTop: 16, fontSize: 13, color: '#888' }}>
            {T.progress}: {stats.correct}/{stats.total} {T.correct}
          </div>
        </div>
      </div>

      {screen === 'video' && <div className="screen"><VideoCoach onReplay={onReplay} /></div>}
      {screen === 'match' && <div className="screen"><MatchCoach onReplay={onReplay} /></div>}
      {screen === 'live' && <div className="screen"><LiveCoach /></div>}

      {/* 3D controls overlay */}
      {screen === '3d' && (
        <div style={{ position: 'absolute', bottom: 70, left: 0, right: 0, maxHeight: '45%', overflowY: 'auto', background: 'rgba(15,17,21,0.92)', padding: '8px 0' }}>
          <div className="controls-row" style={{ padding: '0 10px' }}>
            <button className="primary" onClick={() => setPlaying(p => !p)}>{playing ? T.pause : T.play}</button>
            <button onClick={() => setSimTime(t => t + 0.05)}>{T.step}</button>
            <button onClick={reset}>{T.reset}</button>
            <select value={speed} onChange={e => setSpeed(+e.target.value)}>
              <option value={0.25}>0.25x</option>
              <option value={1}>1x</option>
            </select>
            <button onClick={() => setShowLayers(s => !s)}>{showLayers ? T.hideLayers : T.showLayers}</button>
            <button onClick={() => setShowCompare(s => !s)}>{showCompare ? T.single : T.compare}</button>
          </div>
          <div className="controls-row" style={{ padding: '0 10px' }}>
            <span style={{ fontSize: 13 }}>{T.cam}:</span>
            <button onClick={() => setCam('top')}>{T.top}</button>
            <button onClick={() => setCam('side')}>{T.side}</button>
            <button onClick={() => setCam('back')}>{T.back}</button>
            <button onClick={() => setCam('free')}>{T.free}</button>
          </div>
          <div className="panel" style={{ margin: '6px 10px' }}>
            {T.scenario}: {customScenario ? <b>{customScenario.name}</b> : (
              <select value={scIdx} onChange={e => { setCustomScenario(null); setScIdx(+e.target.value); }}>
                {scenarios.map((s, i) => <option key={s.id} value={i}>{s.name}</option>)}
              </select>
            )}
            {customScenario && <button onClick={() => setCustomScenario(null)}>{T.library}</button>}
          </div>
          <div className="panel" style={{ margin: '6px 10px' }}>
            {T.mode}: <select value={mode} onChange={e => setMode(e.target.value as any)}>
              <option value="play">{T.playMode}</option>
              <option value="decide">{T.decide}</option>
              <option value="compare">{T.compare}</option>
            </select>
            {(mode === 'decide' || mode === 'compare') && (
              <button onClick={listening ? () => { recognitionRef.current?.stop(); setListening(false); } : startListening}>
                {listening ? 'Стоп' : 'Голосом'}
              </button>
            )}
          </div>
          {(mode === 'decide' || mode === 'compare') && (
            <div className="panel" style={{ margin: '6px 10px' }}>
              {T.chooseStance}:
              <div className="controls-row">
                {(['open','semi-open','neutral','closed'] as Stance[]).map(st => (
                  <button key={st} className={userStance === st ? (userStance === dec.recommended ? 'correct' : 'wrong') : ''} onClick={() => onStancePick(st)}>
                    {stanceLabel[st]}
                  </button>
                ))}
              </div>
            </div>
          )}
          {(showHint || mode === 'play' || mode === 'compare') && (
            <div className="panel" style={{ margin: '6px 10px' }}>
              <b>{reachInfo.ok ? '✓' : '✗'} {reachInfo.reason}</b><br/>
              {T.recommended}: <b>{stanceLabel[dec.recommended as Stance]}</b><br/>
              {T.alt}: {dec.alternatives.map(a => stanceLabel[a as Stance] || a).join(', ')}<br/>
              {dec.explanation}
            </div>
          )}
        </div>
      )}

      {/* Bottom nav */}
      <div className="bottom-nav">
        <button className={screen === 'home' ? 'active' : ''} onClick={() => setScreen('home')}>
          <span>⌂</span>Главная
        </button>
        <button className={screen === '3d' ? 'active' : ''} onClick={() => setScreen('3d')}>
          <span>□</span>3D
        </button>
        <button className={screen === 'video' ? 'active' : ''} onClick={() => setScreen('video')}>
          <span>▶</span>Видео
        </button>
        <button className={screen === 'match' ? 'active' : ''} onClick={() => setScreen('match')}>
          <span>⚔</span>Матч
        </button>
        <button className={screen === 'live' ? 'active' : ''} onClick={() => setScreen('live')}>
          <span>●</span>Живой
        </button>
      </div>
    </div>
  );
}
