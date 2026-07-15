require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { Pool } = require('pg');

const app = express();
app.use(express.json());
app.use(cookieParser());

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.warn('WARNING: JWT_SECRET is not set. Using an insecure default — set JWT_SECRET in your environment before going live.');
}
const SECRET = JWT_SECRET || 'dev-only-insecure-secret-change-me';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('railway')
    ? { rejectUnauthorized: false }
    : false
});

function uid(prefix) {
  return prefix + '_' + Math.random().toString(36).slice(2, 9);
}

const CLASSES = ['Seedlings (1-2y)', 'Sprouts (2-3y)', 'Saplings (3-4y)', 'Bloomers (4-5y)'];

async function ensureSchema() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(schema);
}

async function maybeSeedUsers() {
  const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM users');
  if (rows[0].n > 0) return;

  const defaultUsers = [
    { username: 'admin', password: 'admin123', role: 'admin', classId: null },
    { username: 'teacher1', password: 'teacher123', role: 'teacher', classId: CLASSES[1] } // Sprouts (2-3y)
  ];
  for (const u of defaultUsers) {
    const hash = await bcrypt.hash(u.password, 10);
    await pool.query(
      `INSERT INTO users (id, username, password_hash, role, class_id) VALUES ($1,$2,$3,$4,$5)`,
      [uid('u'), u.username, hash, u.role, u.classId]
    );
  }
  console.log('Seeded default accounts: admin/admin123 (Admin), teacher1/teacher123 (Sprouts class). Change these passwords before real use.');
}

async function maybeSeed() {
  const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM children');
  if (rows[0].n > 0) return;

  const parents = [
    { id: 'p1', name: 'Nadeesha Perera', phone: '+94771234567', relation: 'Mother', email: 'nadeesha.p@gmail.com', address: 'Nugegoda, Colombo', notes: 'Prefers WhatsApp over calls.' },
    { id: 'p2', name: 'Kasun Perera', phone: '+94772234567', relation: 'Father', email: 'kasun.perera@gmail.com', address: 'Nugegoda, Colombo', notes: '' },
    { id: 'p3', name: 'Shanika Fernando', phone: '+94773345678', relation: 'Mother', email: 'shanika.f@yahoo.com', address: 'Battaramulla', notes: 'Interested in after-school Montessori add-on.' },
    { id: 'p4', name: 'Ruwan Jayasuriya', phone: '+94774456789', relation: 'Father', email: 'ruwan.j@gmail.com', address: 'Rajagiriya', notes: '' },
    { id: 'p5', name: 'Dilani Wickramasinghe', phone: '+94775567890', relation: 'Mother', email: 'dilani.w@gmail.com', address: 'Kotte', notes: 'Has a younger child, potential future enrollment.' }
  ];
  const children = [
    { id: 'c1', name: 'Senuli Perera', dob: '2022-08-15', parentIds: ['p1', 'p2'], classId: CLASSES[1], enrollDate: '2024-01-10', stage: 'sprout',
      fees: [{ id: uid('f'), term: 'Term 1 2026', amount: 15000, status: 'paid', dueDate: '2026-01-15', paidDate: '2026-01-15', receiptNo: 'R-0001' }, { id: uid('f'), term: 'Term 2 2026', amount: 15000, status: 'pending', dueDate: '2026-07-20' }],
      attendance: [{ id: uid('a'), date: '2026-07-10', present: true, note: 'Enjoyed the sensory play station.' }],
      comms: [{ id: uid('m'), date: '2026-06-01', channel: 'WhatsApp', note: 'Sent Term 2 fee reminder.', staff: 'Admin' }] },
    { id: 'c2', name: 'Ashen Fernando', dob: '2021-11-02', parentIds: ['p3'], classId: CLASSES[2], enrollDate: '2023-06-01', stage: 'sapling',
      fees: [{ id: uid('f'), term: 'Term 2 2026', amount: 16000, status: 'overdue', dueDate: '2026-06-15' }],
      attendance: [{ id: uid('a'), date: '2026-07-11', present: true, note: 'Struggling a bit with counting exercises, needs support.' }],
      comms: [] },
    { id: 'c3', name: 'Ova Jayasuriya', dob: '2020-05-20', parentIds: ['p4'], classId: CLASSES[3], enrollDate: '2022-09-01', stage: 'bloom',
      fees: [{ id: uid('f'), term: 'Term 2 2026', amount: 16000, status: 'paid', dueDate: '2026-06-15', paidDate: '2026-06-10', receiptNo: 'R-0002' }],
      attendance: [],
      comms: [{ id: uid('m'), date: '2026-05-20', channel: 'WhatsApp', note: 'Discussed transition to primary school next year.', staff: 'Admin' }] },
    { id: 'c4', name: 'Ranuli Wickramasinghe', dob: '2023-02-10', parentIds: ['p5'], classId: CLASSES[0], enrollDate: '2024-11-01', stage: 'seedling',
      fees: [{ id: uid('f'), term: 'Term 2 2026', amount: 14000, status: 'pending', dueDate: '2026-07-25' }],
      attendance: [],
      comms: [] }
  ];

  for (const p of parents) {
    await pool.query(
      `INSERT INTO parents (id, name, relation, phone, email, address, notes) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [p.id, p.name, p.relation, p.phone, p.email, p.address, p.notes]
    );
  }
  for (const c of children) {
    await pool.query(
      `INSERT INTO children (id, name, dob, class_id, enroll_date, stage) VALUES ($1,$2,$3,$4,$5,$6)`,
      [c.id, c.name, c.dob, c.classId, c.enrollDate, c.stage]
    );
    for (const pid of c.parentIds) {
      await pool.query(`INSERT INTO child_parents (child_id, parent_id) VALUES ($1,$2)`, [c.id, pid]);
    }
    for (const f of c.fees) {
      await pool.query(
        `INSERT INTO fees (id, child_id, term, amount, status, due_date, paid_date, receipt_no) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [f.id, c.id, f.term, f.amount, f.status, f.dueDate, f.paidDate || null, f.receiptNo || null]
      );
    }
    for (const a of c.attendance) {
      await pool.query(
        `INSERT INTO attendance (id, child_id, date, present, note) VALUES ($1,$2,$3,$4,$5)`,
        [a.id, c.id, a.date, a.present, a.note]
      );
    }
    for (const m of c.comms) {
      await pool.query(
        `INSERT INTO comms (id, child_id, date, channel, note, staff) VALUES ($1,$2,$3,$4,$5,$6)`,
        [m.id, c.id, m.date, m.channel, m.note, m.staff]
      );
    }
  }
}

// ---------- Build the aggregate state the frontend expects ----------
async function getState() {
  const parentsRes = await pool.query('SELECT * FROM parents ORDER BY name');
  const childrenRes = await pool.query('SELECT * FROM children ORDER BY name');
  const cpRes = await pool.query('SELECT * FROM child_parents');
  const feesRes = await pool.query('SELECT * FROM fees ORDER BY due_date');
  const attRes = await pool.query('SELECT * FROM attendance ORDER BY date');
  const commsRes = await pool.query('SELECT * FROM comms ORDER BY date');
  const incidentsRes = await pool.query('SELECT * FROM incidents ORDER BY date DESC, created_at DESC');

  const parents = parentsRes.rows.map(p => ({
    id: p.id, name: p.name, relation: p.relation, phone: p.phone,
    email: p.email, address: p.address, notes: p.notes
  }));

  const children = childrenRes.rows.map(c => {
    const parentIds = cpRes.rows.filter(cp => cp.child_id === c.id).map(cp => cp.parent_id);
    const fees = feesRes.rows.filter(f => f.child_id === c.id).map(f => ({
      id: f.id, term: f.term, amount: Number(f.amount), status: f.status,
      dueDate: f.due_date ? f.due_date.toISOString().slice(0, 10) : null,
      paidDate: f.paid_date ? f.paid_date.toISOString().slice(0, 10) : null,
      receiptNo: f.receipt_no
    }));
    const attendance = attRes.rows.filter(a => a.child_id === c.id).map(a => ({
      id: a.id, date: a.date.toISOString().slice(0, 10), present: a.present, note: a.note
    }));
    const comms = commsRes.rows.filter(m => m.child_id === c.id).map(m => ({
      id: m.id, date: m.date.toISOString().slice(0, 10), channel: m.channel, note: m.note, staff: m.staff
    }));
    const incidents = incidentsRes.rows.filter(i => i.child_id === c.id).map(i => ({
      id: i.id, type: i.type, severity: i.severity, description: i.description,
      date: i.date.toISOString().slice(0, 10), staff: i.staff,
      sentToParent: i.sent_to_parent, sentAt: i.sent_at ? i.sent_at.toISOString() : null
    }));
    return {
      id: c.id, name: c.name,
      dob: c.dob ? c.dob.toISOString().slice(0, 10) : null,
      classId: c.class_id,
      enrollDate: c.enroll_date ? c.enroll_date.toISOString().slice(0, 10) : null,
      stage: c.stage,
      parentIds, fees, attendance, comms, incidents
    };
  });

  return { parents, children };
}

async function getStateForUser(user) {
  const state = await getState();
  if (user.role === 'teacher') {
    state.children = state.children.filter(c => c.classId === user.classId);
    const visibleParentIds = new Set(state.children.flatMap(c => c.parentIds));
    state.parents = state.parents.filter(p => visibleParentIds.has(p.id));
  }
  return state;
}

// ---------- Auth ----------
function signToken(user) {
  return jwt.sign({ id: user.id, username: user.username, role: user.role, classId: user.class_id }, SECRET, { expiresIn: '7d' });
}
function authRequired(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: 'Not logged in' });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Session expired, please log in again' });
  }
}
function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  next();
}
const isProd = process.env.NODE_ENV === 'production';
const cookieOpts = { httpOnly: true, sameSite: 'lax', secure: isProd, maxAge: 7 * 24 * 60 * 60 * 1000 };

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const { rows } = await pool.query('SELECT * FROM users WHERE username=$1', [username]);
    if (!rows.length) return res.status(401).json({ error: 'Invalid username or password' });
    const user = rows[0];
    const ok = await bcrypt.compare(password || '', user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid username or password' });
    const token = signToken(user);
    res.cookie('token', token, cookieOpts);
    res.json({ username: user.username, role: user.role, classId: user.class_id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/api/logout', (req, res) => {
  res.clearCookie('token', cookieOpts);
  res.json({ ok: true });
});

app.get('/api/me', authRequired, (req, res) => {
  res.json({ username: req.user.username, role: req.user.role, classId: req.user.classId });
});

// ---------- Routes ----------
app.get('/api/state', authRequired, async (req, res) => {
  try {
    res.json(await getStateForUser(req.user));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to load state' });
  }
});

app.post('/api/children/:childId/incidents', authRequired, async (req, res) => {
  try {
    const { childId } = req.params;
    const { type, severity, description, staff } = req.body;
    if (!type || !description) return res.status(400).json({ error: 'Type and description are required' });

    if (req.user.role === 'teacher') {
      const { rows } = await pool.query('SELECT class_id FROM children WHERE id=$1', [childId]);
      if (!rows.length || rows[0].class_id !== req.user.classId) {
        return res.status(403).json({ error: 'You can only report incidents for your own class' });
      }
    }
    const id = uid('i');
    await pool.query(
      `INSERT INTO incidents (id, child_id, type, severity, description, date, staff) VALUES ($1,$2,$3,$4,$5,CURRENT_DATE,$6)`,
      [id, childId, type, severity || 'note', description, staff || req.user.username]
    );
    const state = await getStateForUser(req.user);
    res.json({ ...state, newIncidentId: id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to log incident' });
  }
});

app.post('/api/incidents/:incidentId/sent', authRequired, async (req, res) => {
  try {
    await pool.query(`UPDATE incidents SET sent_to_parent=true, sent_at=now() WHERE id=$1`, [req.params.incidentId]);
    res.json(await getStateForUser(req.user));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to update incident' });
  }
});

app.post('/api/children', authRequired, adminOnly, async (req, res) => {
  try {
    const { childName, dob, classId, enrollDate, parentName, relation, phone, email, address, notes } = req.body;
    if (!childName || !parentName || !phone) return res.status(400).json({ error: 'Missing required fields' });

    const parentId = uid('p');
    await pool.query(
      `INSERT INTO parents (id, name, relation, phone, email, address, notes) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [parentId, parentName, relation, phone, email || '', address || '', notes || '']
    );
    const childId = uid('c');
    await pool.query(
      `INSERT INTO children (id, name, dob, class_id, enroll_date, stage) VALUES ($1,$2,$3,$4,$5,'seedling')`,
      [childId, childName, dob, classId, enrollDate]
    );
    await pool.query(`INSERT INTO child_parents (child_id, parent_id) VALUES ($1,$2)`, [childId, parentId]);

    res.json(await getStateForUser(req.user));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to add child' });
  }
});

app.post('/api/fees/:feeId/pay', authRequired, adminOnly, async (req, res) => {
  try {
    const { feeId } = req.params;
    const { rows } = await pool.query(`SELECT COALESCE(MAX(NULLIF(regexp_replace(receipt_no,'\\D','','g'),'')::int),0) AS max FROM fees WHERE receipt_no IS NOT NULL`);
    const nextNo = 'R-' + String((rows[0].max || 0) + 1).padStart(4, '0');
    await pool.query(
      `UPDATE fees SET status='paid', paid_date=CURRENT_DATE, receipt_no=$1 WHERE id=$2`,
      [nextNo, feeId]
    );
    res.json(await getStateForUser(req.user));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to mark fee paid' });
  }
});

app.post('/api/children/:childId/stage', authRequired, adminOnly, async (req, res) => {
  try {
    const STAGE_ORDER = ['seedling', 'sprout', 'sapling', 'bloom'];
    const { rows } = await pool.query('SELECT stage FROM children WHERE id=$1', [req.params.childId]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    const idx = STAGE_ORDER.indexOf(rows[0].stage);
    const next = STAGE_ORDER[(idx + 1) % STAGE_ORDER.length];
    await pool.query('UPDATE children SET stage=$1 WHERE id=$2', [next, req.params.childId]);
    res.json(await getStateForUser(req.user));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to advance stage' });
  }
});

app.post('/api/children/:childId/attendance', authRequired, async (req, res) => {
  try {
    const { note } = req.body;
    const { childId } = req.params;

    if (req.user.role === 'teacher') {
      const { rows } = await pool.query('SELECT class_id FROM children WHERE id=$1', [childId]);
      if (!rows.length || rows[0].class_id !== req.user.classId) {
        return res.status(403).json({ error: 'You can only log attendance for your own class' });
      }
    }
    const existing = await pool.query(
      `SELECT id FROM attendance WHERE child_id=$1 AND date=CURRENT_DATE`, [childId]
    );
    if (existing.rows.length && !note) {
      return res.status(200).json(await getStateForUser(req.user));
    }
    await pool.query(
      `INSERT INTO attendance (id, child_id, date, present, note) VALUES ($1,$2,CURRENT_DATE,true,$3)`,
      [uid('a'), childId, note || '']
    );
    res.json(await getStateForUser(req.user));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to log attendance' });
  }
});

app.post('/api/children/:childId/comms', authRequired, adminOnly, async (req, res) => {
  try {
    const { channel, note, staff } = req.body;
    if (!note) return res.status(400).json({ error: 'Note required' });
    await pool.query(
      `INSERT INTO comms (id, child_id, date, channel, note, staff) VALUES ($1,$2,CURRENT_DATE,$3,$4,$5)`,
      [uid('m'), req.params.childId, channel || 'WhatsApp', note, staff || 'Admin']
    );
    res.json(await getStateForUser(req.user));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to log communication' });
  }
});

app.post('/api/reset', authRequired, adminOnly, async (req, res) => {
  try {
    await pool.query('TRUNCATE comms, attendance, fees, incidents, child_parents, children, parents');
    await maybeSeed();
    res.json(await getStateForUser(req.user));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to reset' });
  }
});

// ---------- Prospects (public enrollment lead form — no auth required to submit) ----------
app.post('/api/prospects', async (req, res) => {
  try {
    const { parentName, phone, email, childName, childAgeNote, source, message } = req.body;
    if (!parentName || !phone) return res.status(400).json({ error: 'Name and phone are required' });
    const id = uid('pr');
    await pool.query(
      `INSERT INTO prospects (id, parent_name, phone, email, child_name, child_age_note, source, message)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [id, parentName, phone, email || '', childName || '', childAgeNote || '', source || '', message || '']
    );
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to submit. Please try again.' });
  }
});

app.get('/api/prospects', authRequired, adminOnly, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM prospects ORDER BY created_at DESC');
    res.json(rows.map(p => ({
      id: p.id, parentName: p.parent_name, phone: p.phone, email: p.email,
      childName: p.child_name, childAgeNote: p.child_age_note, source: p.source,
      message: p.message, status: p.status, createdAt: p.created_at
    })));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to load prospects' });
  }
});

app.post('/api/prospects/:id/status', authRequired, adminOnly, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['new', 'contacted', 'enrolled', 'lost'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    await pool.query('UPDATE prospects SET status=$1 WHERE id=$2', [status, req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to update prospect' });
  }
});

app.get('/enroll', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'enroll.html'));
});

app.use(express.static(path.join(__dirname, 'public')));
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;

ensureSchema()
  .then(maybeSeedUsers)
  .then(maybeSeed)
  .then(() => {
    app.listen(PORT, () => console.log(`Little Sprouts CRM running on port ${PORT}`));
  })
  .catch(err => {
    console.error('Startup failed:', err);
    process.exit(1);
  });
