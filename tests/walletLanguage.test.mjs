import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
function load(name, globals = {}, imports = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(readFileSync(new URL(`../src/services/${name}.ts`, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, ...globals,
    require: name => { if (name === "../languages") return languageModule; if (!(name in imports)) throw new Error(name); return imports[name]; },
  });
  return module.exports;
}
const languageModule = load('../languages');
const { createWalletLanguageSync } = load('walletLanguageSync', {}, { '../languages': languageModule });
const flush = () => new Promise(resolve => setImmediate(resolve));
function setup({ legacy = 'ru', records = new Map(), resolve, save, pending = new Map() } = {}) {
  let old = legacy;
  const displayed = [], errors = [], calls = [];
  const sync = createWalletLanguageSync({
    initialLanguage: () => legacy ?? 'en', readLegacyLanguage: () => old,
    clearLegacyLanguage: () => { old = null; }, saveGuestLanguage: language => { old = language; },
    readPendingLanguage: wallet => pending.get(wallet) ?? null,
    savePendingLanguage: (wallet, language) => pending.set(wallet, language),
    clearPendingLanguage: (wallet, language) => { if (pending.get(wallet) === language) pending.delete(wallet); },
    resolveWalletLanguage: resolve ?? (async (wallet, language) => {
      calls.push(['resolve', wallet, language]);
      if (!records.has(wallet)) records.set(wallet, language);
      return records.get(wallet);
    }),
    saveWalletLanguage: save ?? (async (wallet, language) => {
      calls.push(['save', wallet, language]); records.set(wallet, language); return language;
    }),
    changeLanguage: async language => { displayed.push(language); },
    reportError: error => errors.push(error), delay: async () => {},
  });
  return { sync, records, displayed, errors, pending, calls, legacy: () => old };
}
test('migrates once and then loads from the database', async () => {
  const flow = setup();
  await flow.sync.connect('A');
  assert.equal(flow.records.get('A'), 'ru'); assert.equal(flow.legacy(), null);
  flow.records.set('A', 'de'); await flow.sync.connect('A');
  assert.equal(flow.displayed.at(-1), 'de');
});
test('existing database preference wins over stale browser data', async () => {
  const flow = setup({ records: new Map([['A', 'pt']]) });
  await flow.sync.connect('A');
  assert.equal(flow.displayed.at(-1), 'pt'); assert.equal(flow.records.get('A'), 'pt');
});
test('selection is isolated per wallet', async () => {
  const flow = setup({ records: new Map([['A', 'de'], ['B', 'fr']]) });
  await flow.sync.connect('A'); await flow.sync.select('uk'); await flow.sync.connect('B');
  assert.equal(flow.displayed.at(-1), 'fr');
  await flow.sync.connect('A'); assert.equal(flow.displayed.at(-1), 'uk');
  assert.equal(flow.records.get('B'), 'fr');
});
test('ignores a late response for the previous wallet', async () => {
  let release;
  const flow = setup({ resolve: async wallet => wallet === 'A' ? new Promise(resolve => { release = resolve; }) : 'fr' });
  const first = flow.sync.connect('A'); await flush();
  const second = flow.sync.connect('B'); release('de');
  await Promise.all([first, second]); assert.deepEqual(flow.displayed, ['fr']);
});
test('selection during loading wins over the database response', async () => {
  let release;
  const flow = setup({ resolve: async () => new Promise(resolve => { release = resolve; }) });
  const loading = flow.sync.connect('A'); await flush();
  const saving = flow.sync.select('es'); release('de');
  await Promise.all([loading, saving]);
  assert.deepEqual(flow.displayed, ['es']); assert.equal(flow.records.get('A'), 'es');
});
test('migration failure retains browser preference', async () => {
  let attempts = 0;
  const flow = setup({ resolve: async () => { attempts++; throw new Error('offline'); } });
  await flow.sync.connect('A');
  assert.equal(attempts, 3); assert.equal(flow.legacy(), 'ru');
  assert.equal(flow.records.size, 0); assert.equal(flow.errors.length, 1);
});
test('failed selection survives reload and retries against its original wallet', async () => {
  const pending = new Map();
  const first = setup({ pending, save: async () => { throw new Error('offline'); } });
  await first.sync.connect('A'); await first.sync.select('it');
  assert.equal(pending.get('A'), 'it');
  const restored = setup({ pending, records: new Map([['A', 'de']]) });
  await restored.sync.connect('A');
  assert.equal(restored.records.get('A'), 'it'); assert.equal(restored.displayed.at(-1), 'it');
  assert.equal(pending.size, 0);
});
test('guest selection stays local until connection', async () => {
  const flow = setup(); await flow.sync.connect(null); await flow.sync.select('pl');
  assert.equal(flow.legacy(), 'pl'); assert.equal(flow.calls.length, 0);
  await flow.sync.connect('A'); assert.equal(flow.records.get('A'), 'pl');
});
test('reads cookie-only settings and preserves old localStorage precedence', () => {
  const local = new Map();
  const storage = load('walletLanguageStorage', {
    localStorage: { getItem: key => local.get(key) ?? null, removeItem: key => local.delete(key) },
    document: { cookie: 'other=1; i18next=pt-BR' }, navigator: { languages: ['en'], language: 'en' },
    window: { location: { pathname: '/frontend/' } },
  });
  assert.equal(storage.initialLanguage(), 'pt'); local.set('i18nextLng', 'uk');
  assert.equal(storage.initialLanguage(), 'uk'); storage.clearLegacyLanguage(); assert.equal(local.size, 0);
});
test('unsupported stored languages fall back to a supported browser language', () => {
  const storage = load('walletLanguageStorage', {
    localStorage: { getItem: () => 'xx' }, document: { cookie: 'i18next=zz' },
    navigator: { languages: ['xx', 'fr-FR'], language: 'xx' },
  });
  assert.equal(storage.initialLanguage(), 'fr');
});

test('future stored language falls back for display without overwriting the database', async () => {
  const flow = setup({ records: new Map([['A', 'zh-hant']]) });
  await flow.sync.connect('A');
  assert.equal(flow.displayed.at(-1), 'en');
  assert.equal(flow.records.get('A'), 'zh-hant');
  assert.equal(flow.calls.some(([operation]) => operation === 'save'), false);
});
test('language tags retain regional subtags and catalog resolution prefers exact matches', () => {
  assert.equal(languageModule.normalizeLanguageTag(' PT-BR '), 'pt-br');
  assert.equal(languageModule.normalizeLanguageTag('zh-Hant'), 'zh-hant');
  assert.equal(languageModule.normalizeLanguage('pt-BR'), 'pt');
  languageModule.SUPPORTED_LANGUAGES.push('pt-br');
  try { assert.equal(languageModule.normalizeLanguage('pt-BR'), 'pt-br'); }
  finally { languageModule.SUPPORTED_LANGUAGES.pop(); }
  assert.equal(languageModule.normalizeLanguageTag('../ru'), null);
});

test('API accepts a future stored tag even when this frontend has no translation', async () => {
  const api = load('uiWalletLanguageApi', {
    URL, AbortSignal,
    window: { location: { origin: 'http://localhost' } },
    fetch: async () => ({ ok: true, json: async () => ({ success: true, language: 'zh-Hant', errors: [] }) }),
  }, { '../config': { appConfig: { uiApi: { host: 'http://localhost' } } } });
  assert.equal(await api.resolveWalletLanguage('wallet', 'en'), 'zh-hant');
});
