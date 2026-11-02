// Safe JSON "database": async fs, one queue per file (no overlapping writes),
// atomic writes (temp file + rename) so a crash never leaves half-written JSON.
const fs = require('fs/promises');
const path = require('path');
const { v4: uuid } = require('uuid');

const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(__dirname, '..', 'data'));
const FILES = ['users', 'students', 'classes', 'attendance-sessions', 'attendance-records'];
const queues = {};

const filePath = (name) => path.join(DATA_DIR, `${name}.json`);

async function init() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  for (const name of FILES) {
    try { await fs.access(filePath(name)); }
    catch { await fs.writeFile(filePath(name), '[]', 'utf8'); }
  }
}

async function readRaw(name) {
  let text;
  try { text = await fs.readFile(filePath(name), 'utf8'); }
  catch (e) { if (e.code === 'ENOENT') return []; throw e; }
  try {
    const data = JSON.parse(text || '[]');
    if (!Array.isArray(data)) throw new Error('not an array');
    return data;
  } catch {
    throw new Error(`Data file ${name}.json contains invalid JSON. Fix or restore it from a backup.`);
  }
}

async function writeRaw(name, data) {
  const tmp = `${filePath(name)}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf8');
  await fs.rename(tmp, filePath(name));
}

// Run fn(records) exclusively for this file. fn may mutate the array and
// return { save: true, result } to persist the changes.
function transaction(name, fn) {
  const prev = queues[name] || Promise.resolve();
  const run = prev.then(async () => {
    const data = await readRaw(name);
    const out = (await fn(data)) || {};
    if (out.save) await writeRaw(name, data);
    return out.result;
  });
  queues[name] = run.catch(() => {});
  return run;
}

const getAll = (name) => transaction(name, (d) => ({ result: d.slice() }));
const findById = async (name, id) => (await getAll(name)).find((r) => r.id === id) || null;
const findWhere = async (name, pred) => (await getAll(name)).filter(pred);
const findOne = async (name, pred) => (await getAll(name)).find(pred) || null;

const add = (name, record) =>
  transaction(name, (d) => {
    const rec = { id: uuid(), createdAt: new Date().toISOString(), ...record };
    d.push(rec);
    return { save: true, result: rec };
  });

const update = (name, id, changes) =>
  transaction(name, (d) => {
    const i = d.findIndex((r) => r.id === id);
    if (i === -1) return { result: null };
    d[i] = { ...d[i], ...changes, updatedAt: new Date().toISOString() };
    return { save: true, result: d[i] };
  });

const remove = (name, id) =>
  transaction(name, (d) => {
    const i = d.findIndex((r) => r.id === id);
    if (i === -1) return { result: false };
    d.splice(i, 1);
    return { save: true, result: true };
  });

module.exports = { init, transaction, getAll, findById, findWhere, findOne, add, update, remove, DATA_DIR };
