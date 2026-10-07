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
