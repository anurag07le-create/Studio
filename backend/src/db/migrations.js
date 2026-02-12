const fs = require('fs');
const path = require('path');
const db = require('./connection');

const migrationsDir = path.join(__dirname, 'migrations');

/**
 * Runs all pending SQL migrations in order.
 * Migrations are numbered .sql files in the migrations/ directory.
 * Applied migrations are tracked in the _migrations table.
 */
function runMigrations() {
  // Create migrations tracking table
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      appliedAt TEXT NOT NULL
    );
  `);

  // Ensure migrations directory exists
  if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir, { recursive: true });
    console.log('[migrations] No migrations directory found, created empty one.');
    return;
  }

  // Get all .sql files sorted by name
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('[migrations] No migration files found.');
    return;
  }

  // Get already-applied migrations
  const applied = new Set(
    db.prepare('SELECT name FROM _migrations').all().map(r => r.name)
  );

  const pending = files.filter(f => !applied.has(f));

  if (pending.length === 0) {
    console.log(`[migrations] All ${files.length} migrations already applied.`);
    return;
  }

  console.log(`[migrations] Applying ${pending.length} pending migration(s)...`);

  const insertMigration = db.prepare(
    'INSERT INTO _migrations (name, appliedAt) VALUES (?, ?)'
  );

  for (const file of pending) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    try {
      db.exec(sql);
      insertMigration.run(file, new Date().toISOString());
      console.log(`[migrations] ✓ Applied: ${file}`);
    } catch (err) {
      console.error(`[migrations] ✗ Failed: ${file}`, err.message);
      throw err; // Stop on first failure
    }
  }

  console.log(`[migrations] Done. ${pending.length} migration(s) applied.`);
}

module.exports = { runMigrations };
