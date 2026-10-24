import { useState } from 'react';
import { api } from '../lib/api';

export function Editor({ userRole, onCreated }: { userRole: string; onCreated?: () => void }) {
  const [form, setForm] = useState({
    name: '', bounceX: 0, bounceZ: -9, speed: 15, spin: 'flat', height: 0.6,
    shot: 'forehand', handed: 'right', recommendedStance: 'neutral',
    hint: '', status: 'draft'
  });

  if (!['coach','admin'].includes(userRole)) return <div className="panel">Редактор: только для тренера / администратора</div>;

  const save = async () => {
    const data = {
      name: form.name || 'Новый сценарий',
      bounce: { x: +form.bounceX, z: +form.bounceZ },
      speed: +form.speed, spin: form.spin, height: +form.height,
      shot: form.shot, handed: form.handed,
      recommendedStance: form.recommendedStance, hint: form.hint
    };
    await api.createScenario(data);
    onCreated?.();
    alert('Сохранено как черновик');
  };

  return (
    <div className="panel">
      <b>Редактор тренера</b><br/>
      Название: <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /><br/>
      Отскок X/Z: <input type="number" step="0.1" value={form.bounceX} onChange={e => setForm({...form, bounceX: +e.target.value})} />
      <input type="number" step="0.1" value={form.bounceZ} onChange={e => setForm({...form, bounceZ: +e.target.value})} /><br/>
      Скорость: <input type="number" value={form.speed} onChange={e => setForm({...form, speed: +e.target.value})} /><br/>
      Вращение: <select value={form.spin} onChange={e => setForm({...form, spin: e.target.value})}>
        <option value="flat">Плоский</option>
        <option value="topspin">Топспин</option>
        <option value="slice">Слайс</option>
      </select><br/>
      Высота: <input type="number" step="0.1" value={form.height} onChange={e => setForm({...form, height: +e.target.value})} /><br/>
      Удар: <select value={form.shot} onChange={e => setForm({...form, shot: e.target.value})}>
        <option value="forehand">Форхенд</option>
        <option value="backhand">Бэкхенд</option>
      </select>
      Рука: <select value={form.handed} onChange={e => setForm({...form, handed: e.target.value})}>
        <option value="right">Правая</option>
        <option value="left">Левая</option>
      </select><br/>
      Рекоменд. стойка: <select value={form.recommendedStance} onChange={e => setForm({...form, recommendedStance: e.target.value})}>
        <option value="open">Открытая</option>
        <option value="semi-open">Полуоткрытая</option>
        <option value="neutral">Нейтральная</option>
        <option value="closed">Закрытая</option>
      </select><br/>
      Подсказка: <input value={form.hint} onChange={e => setForm({...form, hint: e.target.value})} /><br/>
      <button onClick={save}>Сохранить черновик</button>
    </div>
  );
}
