import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import { Address } from '@ton/core';
import * as React from 'react';
import * as jsx from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';

function load(path, imports, globals = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, URL, URLSearchParams, AbortSignal,
    ...globals, require(name) { if (!(name in imports)) throw new Error(name); return imports[name]; } });
  return module.exports;
}
const raw = '0:' + '1'.repeat(64);
const config = { appConfig: { uiApi: { host: 'https://api.example.test' }, availableTestPrograms: { walletAddresses: [raw] } } };
const access = load('utils/testProgramAccess.ts', { '@ton/core': { Address }, '../config': config });
function api(fetch) { return load('services/uiReportApi.ts', { '../config': config, '../utils/testProgramAccess': access }, { fetch }); }
const response = value => ({ ok: true, json: async () => value });
test('report and test programs accept equivalent addresses and reject other wallets', () => {
  assert.equal(access.canViewTestPrograms(raw), true);
  assert.equal(access.canViewTestPrograms(Address.parse(raw).toString({ bounceable: true })), true);
  assert.equal(access.canViewTestPrograms('0:' + '2'.repeat(64)), false);
  assert.equal(access.canViewTestPrograms('invalid'), false);
  assert.equal(access.canViewTestPrograms(''), false);
});
test('report fetch sends independent grouping flags without authentication', async () => {
  let requested;
  const service = api(async (url, options) => { requested = { url, options }; return response({ profiles: {} }); });
  await service.getUiReport({ profilePage: 2, activityPage: 3,
    period: 'six_months', groupContract: false, groupWalletName: false, groupAppVersion: true, groupPlatform: true }, new AbortController().signal);
  assert.equal(requested.options.headers, undefined);
  assert.equal(requested.options.cache, 'no-store');
  assert.deepEqual(Object.fromEntries(requested.url.searchParams), { profile_page: '2', activity_page: '3',
    period: 'six_months', group_contract: 'false', group_wallet_name: 'false', group_app_version: 'true', group_platform: 'true' });
});
const english = JSON.parse(readFileSync(new URL('../public/locales/en/translation.json', import.meta.url))).uiReport;
const Pie = load('components/reports/ReportPie.tsx', { react: React, 'react/jsx-runtime': jsx,
  'react-i18next': { useTranslation: () => ({ t: key => english[key.replace('uiReport.', '')], i18n: { language: 'en' } }) } }).default;
test('pie renders totals and every absolute value and percentage, including empty and single groups', () => {
  const html = renderToStaticMarkup(React.createElement(Pie, { title: 'TonConnect', total: 4,
    slices: [{ key: 'a', label: 'v4', count: 3, percentage: 75 }, { key: 'b', label: 'v5', count: 1, percentage: 25 }] }));
  assert.match(html, /Total.*<strong>4<\/strong>/);
  assert.match(html, /v4: 3 \(75%\)/); assert.match(html, /v5: 1 \(25%\)/);
  assert.equal((html.match(/<path /g) ?? []).length, 2);
  const single = renderToStaticMarkup(React.createElement(Pie, { title: 'Language', total: 1,
    slices: [{ key: 'ja', label: 'ja', count: 1, percentage: 100 }] }));
  assert.match(single, /<circle /); assert.match(single, /100%/);
  const empty = renderToStaticMarkup(React.createElement(Pie, { title: 'Empty', total: 0, slices: [] }));
  assert.match(empty, /No data/); assert.doesNotMatch(empty, /<svg/);
});
test('all locales contain report text, periods and matching interpolation variables', () => {
  const flatten = (obj, prefix = '') => Object.entries(obj).flatMap(([k, v]) => typeof v === 'object'
    ? flatten(v, `${prefix}${k}.`) : [[`${prefix}${k}`, v]]);
  const reference = new Map(flatten(english));
  for (const locale of readdirSync(new URL('../public/locales/', import.meta.url))) {
    const data = JSON.parse(readFileSync(new URL(`../public/locales/${locale}/translation.json`, import.meta.url))).uiReport;
    const entries = new Map(flatten(data));
    assert.deepEqual([...entries.keys()].sort(), [...reference.keys()].sort(), locale);
    for (const [key, value] of entries) {
      assert.ok(value.trim(), `${locale}.${key}`);
      assert.deepEqual(value.match(/\{\{.*?\}\}/g), reference.get(key).match(/\{\{.*?\}\}/g), `${locale}.${key}`);
    }
  }
});

test('section endpoints receive only relevant filters', async () => {
  const calls = [];
  const service = api(async (url, options) => { calls.push([url, options]); return response({ generated_at: '2026-10-07T12:00:00Z', data: {} }); });
  const signal = new AbortController().signal;
  await service.getProfileReport(2, signal);
  await service.getTonConnectReport({ groupContract: false, groupWalletName: true, groupAppVersion: true, groupPlatform: false }, signal);
  await service.getActivityReport(3, 'month', signal);
  await service.getPreferencesReport(signal);
  assert.deepEqual(calls.map(([url]) => url.pathname), ['/api/ui/reports/profiles', '/api/ui/reports/ton-connect', '/api/ui/reports/activity', '/api/ui/reports/preferences']);
  assert.deepEqual(calls.map(([url]) => Object.fromEntries(url.searchParams)), [
    { page: '2' }, { group_contract: 'false', group_wallet_name: 'true', group_app_version: 'true', group_platform: 'false' },
    { page: '3', period: 'month' }, {},
  ]);
  assert.ok(calls.every(([, options]) => options.cache === 'no-store' && !options.headers));
});

function hookRuntime() {
  const slots = []; let index = 0; let effects = [];
  const same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const react = {
    useState(initial) {
      const i = index++;
      if (!slots[i]) slots[i] = { value: initial };
      return [slots[i].value, value => { slots[i].value = typeof value === 'function' ? value(slots[i].value) : value; }];
    },
    useCallback(fn, deps) {
      const i = index++;
      if (!same(slots[i]?.deps, deps)) slots[i] = { value: fn, deps };
      return slots[i].value;
    },
    useEffect(fn, deps) {
      const i = index++;
      if (!same(slots[i]?.deps, deps)) effects.push(() => { slots[i]?.cleanup?.(); slots[i] = { deps, cleanup: fn() }; });
    },
  };
  return { react, render(fn) { index = 0; effects = []; const value = fn(); effects.forEach(effect => effect()); return value; } };
}
const flushReport = () => new Promise(resolve => setImmediate(resolve));
const walk = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(walk) :
  [node, ...walk(node.props?.children)];

test('submenu renders and loads only the selected section, preserving filters', async () => {
  const runtime = hookRuntime();
  const calls = [];
  const sectionData = {
    getProfileReport: { total_wallets: 20, total_profiles: 20, page: 1, page_size: 10, items: [] },
    getTonConnectReport: { total: 0, groups: [] },
    getActivityReport: { total: 20, page: 1, page_size: 10, from: '2026-10-06T12:00:00Z', to: '2026-10-07T12:00:00Z', items: [] },
    getPreferencesReport: { total: 0, groups: [] },
  };
  const service = Object.fromEntries(['getProfileReport', 'getTonConnectReport', 'getActivityReport', 'getPreferencesReport']
    .map(name => [name, async (...args) => { calls.push([name, args]); return { generated_at: '2026-10-07T12:00:00Z', data: sectionData[name] }; }]));
  const hook = load('hooks/useReportSection.ts', { react: runtime.react }, { AbortController });
  const Page = load('pages/UiReport.tsx', { react: runtime.react, 'react/jsx-runtime': jsx,
    'react-i18next': { useTranslation: () => ({ t: key => key, i18n: { language: 'en' } }) },
    'lucide-react': { Copy: 'i', Check: 'i', ExternalLink: 'i', RefreshCw: 'i' },
    '../services/uiReportApi': service, '../hooks/useReportSection': hook,
    '../components/reports/ReportPie': { default: () => null }, '../languages': { LANGUAGES: [] }, './ui-report.css': {},
  }).default;
  let tree = runtime.render(Page);
  await flushReport(); tree = runtime.render(Page);
  const settle = async () => { runtime.render(Page); await flushReport(); tree = runtime.render(Page); };
  const select = async label => {
    walk(tree).find(n => n.type === 'button' && n.props.children === label).props.onClick();
    await settle();
  };
  const only = (name, title) => {
    assert.deepEqual(calls.map(([called]) => called), [name]);
    assert.deepEqual(walk(tree).filter(n => n.props?.className === 'report-panel').map(n => n.props['aria-labelledby']), [title]);
    calls.length = 0;
  };
  only('getProfileReport', 'report-profiles-title');
  walk(tree).find(n => typeof n.type === 'function' && n.type.name === 'Pagination').props.onChange(2);
  await settle();
  assert.equal(calls[0][1][0], 2);
  only('getProfileReport', 'report-profiles-title');
  await select('uiReport.tonTitle');
  only('getTonConnectReport', 'report-ton-title');
  walk(tree).filter(n => n.type === 'input' && !n.props.disabled)[1].props.onChange({ target: { checked: true } });
  await settle();
  only('getTonConnectReport', 'report-ton-title');
  await select('uiReport.activityLink');
  only('getActivityReport', 'report-activity-title');
  walk(tree).find(n => n.type === 'select').props.onChange({ target: { value: 'month' } });
  await settle();
  assert.equal(calls[0][1][0], 1); assert.equal(calls[0][1][1], 'month');
  only('getActivityReport', 'report-activity-title');
  walk(tree).find(n => n.props?.className === 'report-refresh').props.onClick();
  await settle();
  only('getActivityReport', 'report-activity-title');
  await select('uiReport.preferencesTitle');
  only('getPreferencesReport', 'report-preferences-title');
  await select('uiReport.profilesLink');
  assert.equal(calls[0][1][0], 2);
  only('getProfileReport', 'report-profiles-title');
  await select('uiReport.tonTitle');
  assert.equal(calls[0][1][0].groupWalletName, true);
  only('getTonConnectReport', 'report-ton-title');
});

test('section retains its result while loading and ignores superseded responses', async () => {
  const runtime = hookRuntime();
  const { useReportSection } = load('hooks/useReportSection.ts', { react: runtime.react }, { AbortController });
  const initial = async () => ({ generated_at: '2026-10-07T12:00:00Z', data: 'first' });
  runtime.render(() => useReportSection(initial, 0)); await flushReport();
  let releaseOld, releaseNew;
  const old = () => new Promise(resolve => { releaseOld = resolve; });
  const latest = () => new Promise(resolve => { releaseNew = resolve; });
  runtime.render(() => useReportSection(old, 0));
  let state = runtime.render(() => useReportSection(old, 0));
  assert.equal(state.data, 'first'); assert.equal(state.loading, true);
  runtime.render(() => useReportSection(latest, 0));
  releaseNew({ generated_at: '2026-10-07T13:00:00Z', data: 'latest' }); await flushReport();
  releaseOld({ generated_at: '2026-10-07T12:30:00Z', data: 'stale' }); await flushReport();
  state = runtime.render(() => useReportSection(latest, 0));
  assert.equal(state.data, 'latest'); assert.equal(state.loading, false);
  const failed = async () => { throw new Error('offline'); };
  runtime.render(() => useReportSection(failed, 0)); await flushReport();
  state = runtime.render(() => useReportSection(failed, 0));
  assert.equal(state.data, 'latest'); assert.equal(state.error, true);
});
