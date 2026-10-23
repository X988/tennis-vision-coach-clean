import express from 'express';
import cors from 'cors';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { v4 as uuid } from 'uuid';

const app = express();
app.use(cors());
app.use(express.json());

const DB_FILE = './data.json';
let db = existsSync(DB_FILE) ? JSON.parse(readFileSync(DB_FILE, 'utf8')) : {
  users: [], scenarios: [], versions: [], progress: [], states: []
};
const save = () => writeFileSync(DB_FILE, JSON.stringify(db, null, 2));

// Auth stub (token = userId)
const getUser = (req) => db.users.find(u => u.id === req.headers['x-user-id']);

app.post('/api/users', (req, res) => {
  const user = { id: uuid(), role: 'student', ...req.body, created_at: new Date().toISOString() };
  db.users.push(user);
  save();
  res.json(user);
});

app.get('/api/me', (req, res) => {
  const u = getUser(req);
  if (!u) return res.status(401).json({ error: 'Unauthorized' });
  res.json(u);
});

app.put('/api/me', (req, res) => {
  const u = getUser(req);
  if (!u) return res.status(401).json({ error: 'Unauthorized' });
  Object.assign(u, req.body);
  save();
  res.json(u);
});

app.get('/api/scenarios', (req, res) => {
  const published = db.scenarios.filter(s => s.status === 'published');
  const mine = getUser(req) ? db.scenarios.filter(s => s.owner_id === getUser(req).id) : [];
  res.json([...new Set([...published, ...mine])]);
});

app.post('/api/scenarios', (req, res) => {
  const user = getUser(req);
  if (!user || !['coach','admin'].includes(user.role)) return res.status(403).json({ error: 'Forbidden' });
  const sc = {
    id: uuid(), owner_id: user.id, status: 'draft', version: 1,
    data: req.body, name: req.body.name || 'Untitled', created_at: new Date().toISOString(), updated_at: new Date().toISOString()
  };
  db.scenarios.push(sc);
  db.versions.push({ id: uuid(), scenario_id: sc.id, version: 1, data: sc.data, changed_by: user.id, change_log: 'Created', created_at: new Date().toISOString() });
  save();
  res.json(sc);
});

app.put('/api/scenarios/:id', (req, res) => {
  const user = getUser(req);
  const sc = db.scenarios.find(s => s.id === req.params.id);
  if (!sc || !user || (sc.owner_id !== user.id && user.role !== 'admin')) return res.status(403).json({ error: 'Forbidden' });
  sc.data = req.body;
  sc.name = req.body.name || sc.name;
  sc.version += 1;
  sc.updated_at = new Date().toISOString();
  db.versions.push({ id: uuid(), scenario_id: sc.id, version: sc.version, data: sc.data, changed_by: user.id, change_log: req.body.change_log || 'Updated', created_at: new Date().toISOString() });
  save();
  res.json(sc);
});

app.post('/api/scenarios/:id/publish', (req, res) => {
  const user = getUser(req);
  const sc = db.scenarios.find(s => s.id === req.params.id);
  if (!sc || !user || !['coach','admin'].includes(user.role)) return res.status(403).json({ error: 'Forbidden' });
  sc.status = 'published';
  sc.updated_at = new Date().toISOString();
  save();
  res.json(sc);
});

app.get('/api/scenarios/:id/versions', (req, res) => {
  res.json(db.versions.filter(v => v.scenario_id === req.params.id));
});

app.post('/api/progress', (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const p = { id: uuid(), user_id: user.id, ...req.body, ts: new Date().toISOString() };
  db.progress.push(p);
  save();
  res.json(p);
});

app.get('/api/progress', (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  res.json(db.progress.filter(p => p.user_id === user.id));
});

app.put('/api/state', (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  let st = db.states.find(s => s.user_id === user.id);
  if (!st) { st = { user_id: user.id }; db.states.push(st); }
  st.state = req.body;
  st.updated_at = new Date().toISOString();
  save();
  res.json(st);
});

app.get('/api/state', (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  res.json(db.states.find(s => s.user_id === user.id) || { state: {} });
});

app.listen(3001, () => console.log('API on :3001'));
