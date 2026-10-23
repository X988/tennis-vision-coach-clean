import { useState } from 'react';
import { api } from '../lib/api';

export function Editor({ userRole, onCreated }: { userRole: string; onCreated?: () => void }) {
  const [form, setForm] = useState({
    name: '', bounceX: 0, bounceZ: -9, speed: 15, spin: 'flat', height: 0.6,
    shot: 'forehand', handed: 'right', recommendedStance: 'neutral',
    hint: '', status: 'draft'
  });

  if (!['coach','admin'].includes(userRole)) return <div className="panel">Editor: coach/admin only</div>;

  const save = async () => {
    const data = {
      name: form.name || 'New scenario',
      bounce: { x: +form.bounceX, z: +form.bounceZ },
      speed: +form.speed, spin: form.spin, height: +form.height,
      shot: form.shot, handed: form.handed,
      recommendedStance: form.recommendedStance, hint: form.hint
    };
    await api.createScenario(data);
    onCreated?.();
    alert('Saved as draft');
  };

  return (
    <div className="panel">
      <b>Coach Editor</b><br/>
      Name: <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /><br/>
      Bounce X/Z: <input type="number" step="0.1" value={form.bounceX} onChange={e => setForm({...form, bounceX: +e.target.value})} />
      <input type="number" step="0.1" value={form.bounceZ} onChange={e => setForm({...form, bounceZ: +e.target.value})} /><br/>
      Speed: <input type="number" value={form.speed} onChange={e => setForm({...form, speed: +e.target.value})} /><br/>
      Spin: <select value={form.spin} onChange={e => setForm({...form, spin: e.target.value})}>
        <option>flat</option><option>topspin</option><option>slice</option>
      </select><br/>
      Height: <input type="number" step="0.1" value={form.height} onChange={e => setForm({...form, height: +e.target.value})} /><br/>
      Shot: <select value={form.shot} onChange={e => setForm({...form, shot: e.target.value})}>
        <option>forehand</option><option>backhand</option>
      </select>
      Handed: <select value={form.handed} onChange={e => setForm({...form, handed: e.target.value})}>
        <option>right</option><option>left</option>
      </select><br/>
      Recommended: <select value={form.recommendedStance} onChange={e => setForm({...form, recommendedStance: e.target.value})}>
        <option>open</option><option>semi-open</option><option>neutral</option><option>closed</option>
      </select><br/>
      Hint: <input value={form.hint} onChange={e => setForm({...form, hint: e.target.value})} /><br/>
      <button onClick={save}>Save draft</button>
    </div>
  );
}
