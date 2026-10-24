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
  'en-US': { open: ['open'], 'semi-open': ['semi open', 'semi-open', 'semi'], neutral: ['neutral'], closed: ['closed'] },
  'ru-RU': { open: ['открытая', 'открытый'], 'semi-open': ['полуоткрытая', 'полуоткрытый', 'полу'], neutral: ['нейтральная', 'нейтральный'], closed: ['закрытая', 'закрытый'] },
  'uk-UA': { open: ['відкрита', 'відкритий'], 'semi-open': ['напіввідкрита', 'напіввідкритий'], neutral: ['нейтральна'], closed: ['закрита'] },
};

const LANGS = Object.keys(STANCE_KEYWORDS);

const T = {
  tabs: { '3d': '3D Тренер', video: 'AI Видео', match: 'Полный матч', live: 'Живой' },
  play: 'Играть',
  pause: 'Пауза',
  step: 'Шаг',
  reset: 'Сброс',
  hideLayers: 'Скрыть слои',
  showLayers: 'Показать слои',
  single: 'Один',
  compare: 'Сравнение',
  cam: 'Камера',
  top: 'Сверху',
  side: 'Сбоку',
  back: 'Сзади',
  free: 'Свободно',
  scenario: 'Сценарий',
  library: 'Библиотека',
  mode: 'Режим',
  playMode: 'Просмотр',
  decide: 'Сначала решение',
  lang: 'Язык',
  stopMic: 'Стоп микрофон',
  voiceStance: 'Голосом стойку',
  chooseStance: 'Выберите стойку',
  recommended: 'Рекомендовано',
  alt: 'Альтернативы',
  progress: 'Прогресс',
  correct: 'правильно',
  open: 'Открытая',
  semiOpen: 'Полуоткрытая',
  neutral: 'Нейтральная',
  closed: 'Закрытая',
};

const stanceLabel: Record<Stance, string> = {
  open: T.open,
  'semi-open': T.semiOpen,
  neutral: T.neutral,
  closed: T.closed,
};

export default function App() {
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
  const [tab, setTab] = useState<'3d'|'video'|'match'|'live'>('3d');
  const [showLayers, setShowLayers] = useState(true);
  const [showCompare, setShowCompare] = useState(false);
  const [userStance, setUserStance] = useState<Stance | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [stats, setStats] = useState({ total: 0, correct: 0 });
  const [lang, setLang] = useState('ru-RU');
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const playerStart = new THREE.Vector3(0, 0, -10.8);
  const reachInfo = reach.canReach(sc.bounce, ball.getContactTime(), playerStart);
  const playerPos = reach.suggestPosition(sc.bounce, sc.handed as any, sc.shot as any);
  const dec = decision.decide(sc.bounce.x, sc.bounce.z, sc.speed, sc.spin, sc.height, sc.shot);

  useEffect(() => {
    ball.updateParams({ bouncePoint: sc.bounce, speed: sc.speed, spin: sc.spin as any, bounceHeight: sc.height });
    anim.setContactTime(ball.getContactTime());
    setSimTime(0);
    anim.reset();
    setUserStance(null);
    setShowHint(false);
  }, [scIdx, customScenario]);

  useEffect(() => {
    let id: number;
    const loop = () => {
      if (playing) {
        setSimTime(s => s + 0.016 * speed);
        anim.update(0.016 * speed);
      }
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [playing, speed]);

  useEffect(() => { getStats().then(setStats); }, []);

  const reset = () => {
    setPlaying(false);
    setSimTime(0);
    anim.reset();
    setUserStance(null);
    setShowHint(false);
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
    }
  };

  const onStancePick = async (s: Stance) => {
    setUserStance(s);
    const correct = s === dec.recommended;
    await saveAttempt(sc.id, s, correct);
    setStats(await getStats());
    setShowHint(true);
  };

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { alert('Распознавание речи не поддерживается'); return; }
    const rec = new SpeechRecognition();
    rec.lang = lang;
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (e: any) => {
      const text = e.results[0][0].transcript.toLowerCase();
      const map = STANCE_KEYWORDS[lang] || STANCE_KEYWORDS['ru-RU'];
      for (const [stance, words] of Object.entries(map)) {
        if (words.some(w => text.includes(w))) {
          onStancePick(stance as Stance);
          break;
        }
      }
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  const onReplay = (scenario: any) => {
    setCustomScenario(scenario);
    setTab('3d');
  };

  return (
    <>
      <Canvas shadows style={{ display: showCompare ? 'none' : 'block' }}>
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
      {showCompare && (
        <CompareView
          studentScenario={{ ...sc, stance: userStance || 'neutral' }}
          recommendedScenario={{ ...sc, stance: dec.recommended }}
        />
      )}
      <div className="controls">
        <div>
          <button onClick={() => setTab('3d')}>{T.tabs['3d']}</button>
          <button onClick={() => setTab('video')}>{T.tabs.video}</button>
          <button onClick={() => setTab('match')}>{T.tabs.match}</button>
          <button onClick={() => setTab('live')}>{T.tabs.live}</button>
        </div>
        {tab === 'live' && <LiveCoach />}
        {tab === 'video' && <VideoCoach onReplay={onReplay} />}
        {tab === 'match' && <MatchCoach onReplay={onReplay} />}
        {tab === '3d' && (
          <>
            <div>
              <button onClick={() => setPlaying(p => !p)}>{playing ? T.pause : T.play}</button>
              <button onClick={() => setSimTime(t => t + 0.05)}>{T.step}</button>
              <button onClick={reset}>{T.reset}</button>
              <select value={speed} onChange={e => setSpeed(+e.target.value)}>
                <option value={0.25}>0.25x</option>
                <option value={1}>1x</option>
              </select>
              <button onClick={() => setShowLayers(s => !s)}>{showLayers ? T.hideLayers : T.showLayers}</button>
              <button onClick={() => setShowCompare(s => !s)}>{showCompare ? T.single : T.compare}</button>
            </div>
            <div>
              {T.cam}: <button onClick={() => setCam('top')}>{T.top}</button>
              <button onClick={() => setCam('side')}>{T.side}</button>
              <button onClick={() => setCam('back')}>{T.back}</button>
              <button onClick={() => setCam('free')}>{T.free}</button>
            </div>
            <div className="panel">
              {T.scenario}: {customScenario ? <b>{customScenario.name}</b> : (
                <select value={scIdx} onChange={e => { setCustomScenario(null); setScIdx(+e.target.value); }}>
                  {scenarios.map((s, i) => <option key={s.id} value={i}>{s.name}</option>)}
                </select>
              )}
              {customScenario && <button onClick={() => setCustomScenario(null)}>{T.library}</button>}
            </div>
            <div className="panel">
              {T.mode}: <select value={mode} onChange={e => setMode(e.target.value as any)}>
                <option value="play">{T.playMode}</option>
                <option value="decide">{T.decide}</option>
                <option value="compare">{T.compare}</option>
              </select>
            </div>
            <div className="panel">
              {T.lang}: <select value={lang} onChange={e => setLang(e.target.value)}>
                {LANGS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
              {(mode === 'decide' || mode === 'compare') && (
                <button onClick={listening ? stopListening : startListening}>
                  {listening ? T.stopMic : T.voiceStance}
                </button>
              )}
            </div>
            {(mode === 'decide' || mode === 'compare') && (
              <div className="panel">
                {T.chooseStance}:
                {(['open','semi-open','neutral','closed'] as Stance[]).map(st => (
                  <button key={st} className={`stance-btn ${userStance === st ? (userStance === dec.recommended ? 'correct' : 'wrong') : ''}`} onClick={() => onStancePick(st)}>{stanceLabel[st]}</button>
                ))}
              </div>
            )}
            {(showHint || mode === 'play' || mode === 'compare') && (
              <div className="panel">
                <b>{reachInfo.ok ? '✓' : '✗'} {reachInfo.reason}</b><br/>
                {T.recommended}: <b>{stanceLabel[dec.recommended as Stance] || dec.recommended}</b><br/>
                {T.alt}: {dec.alternatives.map(a => stanceLabel[a as Stance] || a).join(', ')}<br/>
                {dec.explanation}
                {customScenario?.uncertainty && <div>Неопределённость: {(customScenario.uncertainty*100).toFixed(0)}%</div>}
              </div>
            )}
            <div className="panel">{T.progress}: {stats.correct}/{stats.total} {T.correct}</div>
          </>
        )}
      </div>
    </>
  );
}
