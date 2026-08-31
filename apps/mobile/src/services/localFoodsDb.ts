import * as SQLite from 'expo-sqlite';
import { api } from './api';

export interface LocalFood {
  id: string;
  name: string;
  brand: string | null;
  servingSize: number;
  servingUnit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number | null;
  isCustom: number;
  createdAt: string | null;
}

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;
let initPromise: Promise<void> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync('mindful_plate_foods.db');
  }
  return dbPromise;
}

async function initLocalFoodsDb() {
  if (!initPromise) {
    initPromise = (async () => {
      const db = await getDb();
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS foods (
          id TEXT PRIMARY KEY NOT NULL,
          name TEXT NOT NULL,
          brand TEXT,
          servingSize REAL NOT NULL,
          servingUnit TEXT NOT NULL,
          calories REAL NOT NULL,
          protein REAL NOT NULL,
          carbs REAL NOT NULL,
          fat REAL NOT NULL,
          fiber REAL,
          isCustom INTEGER NOT NULL DEFAULT 0,
          createdAt TEXT
        );
        CREATE TABLE IF NOT EXISTS sync_meta (
          key TEXT PRIMARY KEY NOT NULL,
          value TEXT
        );
      `);
    })();
  }
  return initPromise;
}

async function getLastSyncedAt(): Promise<string | undefined> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM sync_meta WHERE key = ?',
    ['lastSyncedAt']
  );
  return row?.value;
}

async function setLastSyncedAt(value: string) {
  const db = await getDb();
  await db.runAsync('INSERT OR REPLACE INTO sync_meta (key, value) VALUES (?, ?)', [
    'lastSyncedAt',
    value,
  ]);
}

async function upsertFoods(items: any[]) {
  if (items.length === 0) return;
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const food of items) {
      await db.runAsync(
        `INSERT OR REPLACE INTO foods
          (id, name, brand, servingSize, servingUnit, calories, protein, carbs, fat, fiber, isCustom, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          food.id,
          food.name,
          food.brand ?? null,
          food.servingSize,
          food.servingUnit,
          food.calories,
          food.protein,
          food.carbs,
          food.fat,
          food.fiber ?? null,
          food.isCustom ? 1 : 0,
          food.createdAt ?? null,
        ]
      );
    }
  });
}

// Pulls only the foods created since the last successful sync (or the whole
// table on first run) and upserts them into the local cache, so new entries
// added on the server db show up here without re-downloading everything, and
// the food list stays searchable offline.
export async function syncFoodsFromServer(): Promise<number> {
  await initLocalFoodsDb();
  const since = await getLastSyncedAt();
  const res = await api.syncFoods(since);
  await upsertFoods(res.foods);
  await setLastSyncedAt(res.syncedAt);
  return res.foods.length;
}

// Offline fallback only (server unreachable) — a single unpaginated page,
// always name-sorted, but still respects the source filter so switching to
// "My Custom Foods" while offline doesn't silently show everything.
export async function searchLocalFoods(
  query: string,
  source: 'all' | 'common' | 'custom' = 'all'
): Promise<LocalFood[]> {
  await initLocalFoodsDb();
  const db = await getDb();
  const trimmed = query.trim();
  const sourceClause = source === 'custom' ? 'AND isCustom = 1' : source === 'common' ? 'AND isCustom = 0' : '';

  if (!trimmed) {
    return db.getAllAsync<LocalFood>(
      `SELECT * FROM foods WHERE 1=1 ${sourceClause} ORDER BY name LIMIT 20`
    );
  }
  return db.getAllAsync<LocalFood>(
    `SELECT * FROM foods WHERE (name LIKE ? OR brand LIKE ?) ${sourceClause} ORDER BY name LIMIT 25`,
    [`%${trimmed}%`, `%${trimmed}%`]
  );
}
