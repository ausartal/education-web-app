require('dotenv').config({ path: '.env.local' });
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const url = require('url');

const host = process.env.VPS_HOST || 'root@157.66.35.84';
const key = process.env.VPS_SSH_KEY || path.join(require('os').homedir(), '.ssh', 'id_ed25519');
const remoteDump = process.env.VPS_DUMP_CMD || 'sudo -u postgres pg_dump -d akurat -t documents --data-only --column-inserts';
const psqlBin = process.env.PSQL_BIN || 'C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe';
const localUrl = process.env.DATABASE_URL;

if (!localUrl) {
  console.error('DATABASE_URL tidak ada di .env.local');
  process.exit(1);
}

const out = path.join(__dirname, 'akurat_vps_dump.sql');
console.log('Mengambil dump dari VPS...');
const ssh = spawnSync(
  'ssh',
  ['-o', 'BatchMode=yes', '-o', 'ConnectTimeout=15', '-i', key, host, remoteDump],
  { encoding: 'utf8', maxBuffer: 1024 * 1024 * 512 }
);
if (ssh.status !== 0 || !ssh.stdout) {
  console.error('Gagal mengambil dump dari VPS:\n' + (ssh.stderr || 'output kosong'));
  process.exit(1);
}
fs.writeFileSync(out, ssh.stdout);
console.log(`Dump tersimpan: ${out}`);

(async () => {
  const c = new Client({ connectionString: localUrl });
  await c.connect();
  const before = (await c.query('select count(*)::int n from documents')).rows[0].n;
  const backup = path.join(__dirname, `local_backup_${Date.now()}.json`);
  fs.writeFileSync(backup, JSON.stringify((await c.query('select * from documents')).rows));
  console.log(`Backup lokal: ${path.basename(backup)} (${before} dokumen)`);
  await c.query('truncate documents');
  await c.end();

  const parsed = new url.URL(localUrl);
  const env = {
    ...process.env,
    PGPASSWORD: parsed.password,
  };
  console.log('Restore ke database lokal...');
  const psql = spawnSync(
    psqlBin,
    [
      '-h', parsed.hostname,
      '-p', parsed.port || '5432',
      '-U', parsed.username,
      '-d', parsed.pathname.slice(1),
      '-f', out,
      '--set=ON_ERROR_STOP=1',
    ],
    { encoding: 'utf8', env }
  );
  if (psql.status !== 0) {
    console.error('Restore gagal:\n' + (psql.stderr || psql.stdout));
    process.exit(1);
  }

  const c2 = new Client({ connectionString: localUrl });
  await c2.connect();
  const after = (await c2.query('select count(*)::int n from documents')).rows[0].n;
  console.log(`Sync selesai: ${before} -> ${after} dokumen`);
  await c2.end();
})();
