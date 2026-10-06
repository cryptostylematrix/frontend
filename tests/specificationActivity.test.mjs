import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const module = { exports: {} };
const source = readFileSync(new URL('../src/pages/programs/specificationActivity.ts', import.meta.url), 'utf8');
vm.runInNewContext(ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { module, exports: module.exports });
const { describeActivity } = module.exports;
const structure = (number, activity = null, group = null, marketing_addr = 'mini') => ({
  structure_number: number, activity, group, marketing_addr,
});
const describe = (activity, command = true) => describeActivity(structure(1, activity), [], command);

test('missing settings disable activation and preserve legacy inactive restrictions', () => {
  const view = describe(null);
  assert.equal(view.activation, 'noSettings');
  assert.equal(view.source, 'place');
  for (const key of ['ownChildren', 'spillover', 'bonuses', 'clones', 'compression', 'checkManual']) assert.equal(view[key], false);
});

test('legacy CryptoCash activation defaults to setting active and respects explicit false', () => {
  assert.equal(describe({}).activation, 'available');
  assert.equal(describe({}).setsActive, true);
  assert.equal(describe({ set_active_on_activation: false }).setsActive, false);
  assert.equal(describe({ activation_sync: 'group' }).source, 'place');
});

test('activation requires the contract command; unloaded contract is unknown', () => {
  assert.equal(describe({}, false).activation, 'noCommand');
  assert.equal(describeActivity(structure(1, {}), [], undefined).activation, 'unknown');
  assert.equal(describe({ type: 'marketing', preserve_status_on_activation: true }).setsActive, false);
});

test('Mini shares the first structure as activity source but only forbids spillovers', () => {
  const config = { type: 'marketing', activity_source: 'group_root', when_inactive: {
    allow_own_children: true, allow_as_bonus_recipient: true, allow_as_clone_recipient: true, keep_on_compression: true,
  } };
  const rows = [structure(3, config, 'Mini 10'), structure(2, config, 'Mini 10'), structure(1, config, ' Mini 10 '),
    structure(0, null, 'Mini 10', 'other'), structure(0, null, 'mini 10')];
  for (const row of rows.slice(0, 3)) {
    const view = describeActivity(row, rows, true);
    assert.equal(view.sourceStructure, 1);
    assert.equal(view.spillover, false);
    assert.equal(view.checkManual, false);
    for (const key of ['ownChildren', 'bonuses', 'clones', 'compression']) assert.equal(view[key], true);
  }
});

test('invite prerequisite overrides permission to invite without marketing places', () => {
  const view = describeActivity(structure(0, { type: 'invite', require_marketing_place_to_invite: true,
    when_inactive: { allow_inviting_without_places: true, allow_inviting_with_places: true, allow_as_fallback_root: true },
  }), [], true);
  assert.equal(view.requiresPlaces, true);
  assert.equal(view.inviteWithoutPlaces, false);
  assert.equal(view.inviteWithPlaces, true);
  assert.equal(view.fallbackRoot, true);
});

test('legacy spillover setting and explicit activity source are displayed', () => {
  assert.equal(describe({ type: 'marketing', spillover: { allow_inactive_place: true } }).spillover, true);
  const view = describe({ type: 'marketing', activity_source: 'invite', when_inactive: { allow_spillover_children: true } });
  assert.equal(view.sourceStructure, 0);
  assert.equal(view.spillover, true);
});

test('unrecognized or incomplete source configuration is not shown as a valid default', () => {
  for (const config of [{ type: 'invite' }, { activity_source: 'invite' }, { type: 'marketing', activity_source: 'group_root' },
    { type: 'marketing', activity_source: null }, { type: 'marketing', activity_source: 'unknown' }, [], 'invalid']) {
    assert.equal(describe(config).unknown, true);
  }
});
