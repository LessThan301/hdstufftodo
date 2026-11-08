"""Exercise real SQLite syntax and counters in an ephemeral in-memory fixture DB."""
import sqlite3
from pathlib import Path
c = sqlite3.connect(':memory:')
c.executescript(Path(__file__).with_name('schema.sql').read_text())
sql = 'INSERT INTO request_limits (key, count, expires) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET count = count + 1 WHERE count < ? RETURNING count'
for i in range(1, 6):
    assert c.execute(sql, ('local-fixture', 9999999999999, 5)).fetchone() == (i,)
assert c.execute(sql, ('local-fixture', 9999999999999, 5)).fetchone() is None
c.execute('INSERT INTO enquiries VALUES (?,?,?,?,?,?,?,?)', ('local-fixture', 1, 2, 'Test', 'Fixture', 'fixture@example.invalid', '', 'Synthetic local only'))
assert c.execute('SELECT COUNT(*) FROM enquiries').fetchone()[0] == 1
c.execute('DELETE FROM enquiries WHERE expires_at < ?', (3,))
assert c.execute('SELECT COUNT(*) FROM enquiries').fetchone()[0] == 0
c.close()
print('PASS: SQLite schema, atomic quotas, expiry cleanup (isolated in-memory DB)')
