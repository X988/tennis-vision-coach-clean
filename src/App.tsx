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
import { saveAttempt, getStats } from './lib/storage';

const STANCE_KEYWORDS: Record<string, Record<Stance, string[]>> = {
  'en-US': { open: ['open'], 'semi-open': ['semi open', 'semi-open', 'semi'], neutral: ['neutral'], closed: ['closed'] },
  'ru-RU': { open: ['открытая', 'открытый'], 'semi-open': ['полуоткрытая', 'полуоткрытый', 'полу'], neutral: ['нейтральная', 'нейтральный'], closed: ['закрытая', 'закрытый'] },
  'uk-UA': { open: ['відкрита', 'відкритий'], 'semi-open': ['напіввідкрита', 'напіввідкритий'], neutral: ['нейтральна'], closed: ['закрита'] },
  'es-ES': { open: ['abierta'], 'semi-open': ['semi abierta', 'semiabierta'], neutral: ['neutral'], closed: ['cerrada'] },
  'fr-FR': { open: ['ouverte'], 'semi-open': ['semi ouverte', 'semi-ouverte'], neutral: ['neutre'], closed: ['fermée'] },
  'de-DE': { open: ['offen'], 'semi-open': ['halb offen', 'halboffen'], neutral: ['neutral'], closed: ['geschlossen'] },
  'zh-CN': { open: ['开放', '开式'], 'semi-open': ['半开放', '半开'], neutral: ['中性', '中立'], closed: ['关闭', '闭式'] },
  'ja-JP': { open: ['オープン'], 'semi-open': ['セミオープン'], neutral: ['ニュートラル'], closed: ['クローズド'] },
};

const LANGS = Object.keys(STANCE_KEYWORDS);

export default function App() {
  const [scIdx, setScIdx] = useState(0);
  const sc = scenarios[scIdx];
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
  const [userStance, setUserStance] = useState<Stance | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [stats, setStats] = useState({ total: 0, correct: 0 });
  const [lang, setLang] = useState('en-US');
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
  }, [scIdx]);

  useEffect(() => {
    let id: number;
    const loop = (t: number) => {
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
    if (!SpeechRecognition) { alert('Speech recognition not supported'); return; }
    const rec = new SpeechRecognition();
    rec.lang = lang;
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (e: any) => {
      const text = e.results[0][0].transcript.toLowerCase();
      const map = STANCE_KEYWORDS[lang] || STANCE_KEYWORDS['en-US'];
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

  return (
    <>
      <Canvas shadows>
        <ambientLight intensity={0.55} />
        <directionalLight position={[8, 18, 6]} intensity={1.1} />
        {cam === 'top' && <PerspectiveCamera makeDefault position={[0, 22, 0]} fov={45} />}
        {cam === 'side' && <PerspectiveCamera makeDefault position={[14, 4, -2]} fov={45} />}
        {cam === 'back' && <PerspectiveCamera makeDefault position={[0, 3.5, -16]} fov={50} />}
        {cam === 'free' && <OrbitControls />}
        <Court />
        <Ball engine={ball} simTime={simTime} />
        <Player pos={playerPos} stance={(userStance || dec.recommended) as Stance} shot={sc.shot as any} handed={sc.handed as any} anim={anim} simTime={simTime} />
      </Canvas>
      <div className="controls">
        <div>
          <button onClick={() => setPlaying(p => !p)}>{playing ? 'Pause' : 'Play'}</button>
          <button onClick={() => setSimTime(t => t + 0.05)}>Step</button>
          <button onClick={reset}>Reset</button>
          <select value={speed} onChange={e => setSpeed(+e.target.value)}>
            <option value={0.25}>0.25x</option>
            <option value={1}>1x</option>
          </select>
        </div>
        <div>
          Cam: <button onClick={() => setCam('top')}>Top</button>
          <button onClick={() => setCam('side')}>Side</button>
          <button onClick={() => setCam('back')}>Back</button>
          <button onClick={() => setCam('free')}>Free</button>
        </div>
        <div className="panel">
          Scenario: <select value={scIdx} onChange={e => setScIdx(+e.target.value)}>
            {scenarios.map((s, i) => <option key={s.id} value={i}>{s.name}</option>)}
          </select>
        </div>
        <div className="panel">
          Mode: <select value={mode} onChange={e => setMode(e.target.value as any)}>
            <option value="play">Play</option>
            <option value="decide">Decide first</option>
            <option value="compare">Compare</option>
          </select>
        </div>
        <div className="panel">
          Lang: <select value={lang} onChange={e => setLang(e.target.value)}>
            {LANGS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          {(mode === 'decide' || mode === 'compare') && (
            <button onClick={listening ? stopListening : startListening}>
              {listening ? 'Stop mic' : 'Voice stance'}
            </button>
          )}
        </div>
        {(mode === 'decide' || mode === 'compare') && (
          <div className="panel">
            Choose stance:
            {(['open','semi-open','neutral','closed'] as Stance[]).map(st => (
              <button key={st} className={`stance-btn ${userStance === st ? (userStance === dec.recommended ? 'correct' : 'wrong') : ''}`} onClick={() => onStancePick(st)}>{st}</button>
            ))}
          </div>
        )}
        {(showHint || mode === 'play' || mode === 'compare') && (
          <div className="panel">
            <b>{reachInfo.ok ? '✓' : '✗'} {reachInfo.reason}</b><br/>
            Recommended: <b>{dec.recommended}</b><br/>
            Alt: {dec.alternatives.join(', ')}<br/>
            {dec.explanation}
          </div>
        )}
        <div className="panel">Progress: {stats.correct}/{stats.total} correct</div>
      </div>
    </>
  );
}
