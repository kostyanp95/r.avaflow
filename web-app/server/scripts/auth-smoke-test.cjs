/*
 * Smoke test for the Telegram-bot authorization feature.
 * Run AFTER `npm run build` from web-app/server:
 *   node scripts/auth-smoke-test.cjs
 *
 * Spawns dist/main.js with auth enabled against a temp projects dir and
 * checks: public endpoints, token exchange, per-user project isolation,
 * admin visibility, ownership enforcement, logout, and the bot update
 * handler (with a fake Telegram API).
 */
process.env.TG_AUTH_SECRET = process.env.TG_AUTH_SECRET || 'smoke-test-secret';
process.env.TG_ADMIN_IDS = '999';
process.env.TG_BOT_USERNAME = 'web_r_avaflow_bot';

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const { mintLoginToken, verifyLoginToken } = require('../dist/auth/tokens.js');
const { handleBotUpdate } = require('../dist/auth/telegram-bot.js');

const SECRET = process.env.TG_AUTH_SECRET;
const PORT = 3901;
const BASE = `http://127.0.0.1:${PORT}`;
const ADMIN_ID = 999;
const USER_ID = 111;

let failures = 0;
function check(name, cond, extra) {
  if (cond) {
    console.log(`  PASS  ${name}`);
  } else {
    failures++;
    console.log(`  FAIL  ${name}${extra ? ' — ' + extra : ''}`);
  }
}

function makeFixtureProjects(root) {
  for (const name of ['alpha', 'beta', 'legacy']) {
    fs.mkdirSync(path.join(root, name), { recursive: true });
    fs.writeFileSync(
      path.join(root, name, `${name}.json`),
      JSON.stringify({ name, experiments: [] }),
    );
  }
  fs.writeFileSync(
    path.join(root, '.ravaflow-auth.json'),
    JSON.stringify({
      users: {
        '111': { id: 111, username: 'alice', firstName: 'Alice', createdAt: 1, lastSeenAt: 1 },
        '999': { id: 999, username: 'admin', firstName: 'Bob', createdAt: 1, lastSeenAt: 1 },
      },
      owners: { alpha: 111, beta: 999 },
    }),
  );
}

async function main() {
  const projectsRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ravaflow-auth-'));
  makeFixtureProjects(projectsRoot);

  const child = spawn(process.execPath, [path.join(__dirname, '..', 'dist', 'main.js')], {
    env: {
      ...process.env,
      PORT: String(PORT),
      AVAFLOW_PROJECTS_PATH: projectsRoot,
      NODE_ENV: 'production',
      TG_BOT_TOKEN: '', // no real bot in the smoke test
      TG_BOT_POLLING: 'false',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', (d) => process.env.VERBOSE && process.stdout.write(`[srv] ${d}`));
  child.stderr.on('data', (d) => process.stderr.write(`[srv:err] ${d}`));

  // Wait for boot
  let up = false;
  for (let i = 0; i < 60 && !up; i++) {
    try {
      const r = await fetch(`${BASE}/health`);
      up = r.ok;
    } catch {
      await new Promise((r) => setTimeout(r, 250));
    }
  }
  if (!up) {
    console.error('Server did not start');
    child.kill();
    process.exit(1);
  }

  const jarOf = (token) =>
    token ? { cookie: `ravaflow_session=${token}` } : {};

  async function req(method, url, { body, token } = {}) {
    const res = await fetch(BASE + url, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...jarOf(token),
      },
      body: body ? JSON.stringify(body) : undefined,
      redirect: 'manual',
    });
    let json = null;
    try {
      json = await res.json();
    } catch {
      /* non-JSON */
    }
    const setCookie = res.headers.get('set-cookie');
    return { status: res.status, json, setCookie };
  }

  console.log('\n== public endpoints ==');
  {
    const r = await req('GET', '/health');
    check('GET /health is public', r.status === 200);
    const cfg = await req('GET', '/api/auth/config');
    check(
      'GET /api/auth/config reports enabled + bot username',
      cfg.status === 200 && cfg.json.enabled === true && cfg.json.botUsername === 'web_r_avaflow_bot',
      JSON.stringify(cfg.json),
    );
  }

  console.log('\n== unauthenticated access ==');
  {
    const r = await req('GET', '/api/projects');
    check('GET /api/projects without session -> 401', r.status === 401);
    const hello = await req('GET', '/api');
    check('GET /api without session -> 401', hello.status === 401);
  }

  console.log('\n== token exchange ==');
  let userToken, adminToken;
  {
    const bad = await req('POST', '/api/auth/tg/exchange', { body: { token: 'garbage' } });
    check('exchange of garbage -> 401', bad.status === 401);

    const tampered = mintLoginToken({ id: USER_ID, username: 'mallory' }, SECRET)
      .split('.')
      .map((p, i) => (i === 1 ? Buffer.from('e30', 'utf8').toString() : p))
      .join('.');
    const t = await req('POST', '/api/auth/tg/exchange', { body: { token: tampered } });
    check('exchange of tampered token -> 401', t.status === 401);

    const loginToken = mintLoginToken(
      { id: USER_ID, username: 'alice', firstName: 'Alice' },
      SECRET,
    );
    const r = await req('POST', '/api/auth/tg/exchange', { body: { token: loginToken } });
    check('exchange of valid token -> 200', r.status === 200, JSON.stringify(r.json));
    check('user is not admin', r.json?.user?.admin === false && r.json?.user?.id === USER_ID);
    check('session cookie is httpOnly', /ravaflow_session=/.test(r.setCookie || '') && /HttpOnly/i.test(r.setCookie || ''), r.setCookie);
    userToken = /ravaflow_session=([^;]+)/.exec(r.setCookie || '')?.[1];

    const adminLogin = mintLoginToken({ id: ADMIN_ID, username: 'admin', firstName: 'Bob' }, SECRET);
    const ar = await req('POST', '/api/auth/tg/exchange', { body: { token: adminLogin } });
    check('admin exchange -> 200 + admin flag', ar.status === 200 && ar.json?.user?.admin === true);
    adminToken = /ravaflow_session=([^;]+)/.exec(ar.setCookie || '')?.[1];
  }

  console.log('\n== /auth/me ==');
  {
    const me = await req('GET', '/api/auth/me', { token: userToken });
    check('me returns the user', me.json?.user?.id === USER_ID && me.json?.user?.displayName?.includes('Alice'));
  }

  console.log('\n== per-user project isolation ==');
  {
    const user = await req('GET', '/api/projects', { token: userToken });
    const names = (user.json || []).map((p) => p.name).sort();
    check('regular user sees only own project', JSON.stringify(names) === '["alpha"]', JSON.stringify(names));
    check('owner info attached', user.json?.[0]?.owner?.id === USER_ID);

    const admin = await req('GET', '/api/projects', { token: adminToken });
    const adminNames = (admin.json || []).map((p) => p.name).sort();
    check(
      'admin sees all projects incl. unassigned legacy',
      JSON.stringify(adminNames) === '["alpha","beta","legacy"]',
      JSON.stringify(adminNames),
    );
    const legacy = admin.json.find((p) => p.name === 'legacy');
    check('legacy project has owner=null', legacy?.owner === null);
  }

  console.log('\n== ownership enforcement ==');
  {
    const forbidden = await req('GET', '/api/project?projectName=beta', { token: userToken });
    check('foreign project json -> 403', forbidden.status === 403);

    const legacyUser = await req('GET', '/api/project?projectName=legacy', { token: userToken });
    check('legacy (unowned) project for regular user -> 403', legacyUser.status === 403);

    const ok = await req('GET', '/api/project?projectName=beta', { token: adminToken });
    check('admin can open foreign project', ok.status === 200 && ok.json?.name === 'beta');

    const files = await req('GET', '/api/project/beta/files', { token: userToken });
    check('foreign project files -> 403', files.status === 403);

    const results = await req('GET', '/api/project/beta/results', { token: userToken });
    check('foreign project results -> 403', results.status === 403);

    const run = await req('POST', '/api/run', { body: { projectName: 'beta' }, token: userToken });
    check('running foreign project -> 403', run.status === 403);

    const cpus = await req('PUT', '/api/run/cpus', { body: { cpus: 4 }, token: userToken });
    check('PUT /api/run/cpus as regular user -> 403', cpus.status === 403);
  }

  console.log('\n== logout ==');
  {
    const out = await req('POST', '/api/auth/logout', { token: userToken });
    check('logout clears cookie', out.status === 200 && /ravaflow_session=;/.test(out.setCookie || ''), out.setCookie);
  }

  console.log('\n== bot update handler (fake API) ==');
  {
    const sent = [];
    const fakeApi = {
      call: async (method, payload) => {
        sent.push({ method, payload });
        return { statusCode: 200, body: { ok: true, result: { message_id: sent.length } } };
      },
    };
    const origin = 'https://r-avaflow.kostyanp95.crazedns.ru';
    const enc = Buffer.from(origin, 'utf8').toString('base64url');
    await handleBotUpdate(
      { api: fakeApi, secret: SECRET },
      {
        update_id: 1,
        message: {
          text: `/start l_${enc}`,
          chat: { id: 4242 },
          from: { id: 4242, first_name: 'Carol', is_bot: false },
        },
      },
    );
    const withKb = sent.find((s) => s.payload.reply_markup);
    const url = withKb?.payload?.reply_markup?.inline_keyboard?.[0]?.[0]?.url;
    check('bot replies with inline login button', Boolean(url), JSON.stringify(sent.map((s) => s.method)));
    check('button URL targets the original origin', (url || '').startsWith(`${origin}/tg-callback?token=`), url);
    const tokenInUrl = /token=([^&]+)/.exec(url || '')?.[1];
    const verified = verifyLoginToken(decodeURIComponent(tokenInUrl || ''), SECRET);
    check('token from button URL verifies', verified?.id === 4242);
    const codeMsg = sent.filter((s) => /<code>/.test(s.payload.text || '')).pop();
    const codeToken = /<code>([^<]+)<\/code>/.exec(codeMsg?.payload?.text || '')?.[1];
    const verifiedCode = verifyLoginToken(codeToken || '', SECRET);
    check('copyable code message verifies', verifiedCode?.id === 4242);

    sent.length = 0;
    await handleBotUpdate(
      { api: fakeApi, secret: SECRET },
      { update_id: 2, message: { text: '/login', chat: { id: 77 }, from: { id: 77, is_bot: false } } },
    );
    check('plain /login sends code-only messages', sent.length === 2 && !sent[0].payload.reply_markup);

    sent.length = 0;
    await handleBotUpdate(
      { api: fakeApi, secret: SECRET },
      {
        update_id: 3,
        message: {
          text: `/start l_${Buffer.from('http://evil^x', 'utf8').toString('base64url')}`,
          chat: { id: 88 },
          from: { id: 88, is_bot: false },
        },
      },
    );
    const evilKb = sent.find((s) => s.payload.reply_markup);
    check('malformed origin payload is rejected (no button)', !evilKb);
  }

  child.kill();
  console.log(
    failures === 0
      ? '\nALL CHECKS PASSED'
      : `\n${failures} CHECK(S) FAILED`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
