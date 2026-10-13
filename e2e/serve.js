// Prépare une base SQLite jetable (migrations + seed) puis lance
// php artisan serve sur 127.0.0.1:8000. Utilisé par playwright.config.js.
const { spawn, spawnSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const backend = path.join(__dirname, '..', 'backend');
const dataDir = path.join(__dirname, '.data');
const dbFile = path.join(dataDir, 'e2e.sqlite');
const port = process.env.E2E_PORT || '8000';

fs.mkdirSync(dataDir, { recursive: true });
fs.rmSync(dbFile, { force: true });

const env = {
  ...process.env,
  APP_ENV: 'local',
  APP_DEBUG: 'false',
  APP_URL: `http://127.0.0.1:${port}`,
  APP_KEY: `base64:${crypto.randomBytes(32).toString('base64')}`,
  DB_CONNECTION: 'sqlite',
  DB_DATABASE: dbFile,
  SESSION_DRIVER: 'database',
  // Store "null" : pas de rate-limit ni de lockout pendant les tests E2E.
  // (Le throttle numerique Laravel partage un compteur par IP sur toutes les
  // routes, ce qui ferait echouer l'inscription apres 3 requetes.)
  CACHE_STORE: 'null',
  QUEUE_CONNECTION: 'sync',
  MAIL_MAILER: 'log',
  FRONTEND_URL: 'http://localhost:5173',
  SESSION_DOMAIN: 'localhost',
  SANCTUM_STATEFUL_DOMAINS: 'localhost',
};

function run(args) {
  const result = spawnSync('php', args, { cwd: backend, env, stdio: 'inherit' });

  if (result.status !== 0) {
    console.error(`[e2e] échec: php ${args.join(' ')}`);
    process.exit(result.status || 1);
  }
}

console.log('[e2e] migration de la base SQLite...');
run(['artisan', 'migrate:fresh', '--force', '--no-interaction']);

console.log('[e2e] seed...');
run(['artisan', 'db:seed', '--force', '--no-interaction']);

console.log(`[e2e] démarrage du serveur sur 127.0.0.1:${port}`);
const server = spawn('php', ['artisan', 'serve', '--host=127.0.0.1', `--port=${port}`], {
  cwd: backend,
  env,
  stdio: 'inherit',
});

function shutdown(signal) {
  if (!server.killed) server.kill(signal);
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
server.on('exit', (code) => process.exit(code ?? 0));
