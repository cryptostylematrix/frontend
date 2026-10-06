import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const core = require('@ton/core');
const jsx = require('react/jsx-runtime');
const profile = `0:${'2'.repeat(64)}`;
const wallet = `0:${'3'.repeat(64)}`;
const marketing = 'EQAba1dNyAbxm4t_dv5T1ARQXaQAAYcfJ4jcAWcw1PQ7q10b';
const tags = { activatePlace: 0xf63f29c5, buyPlace: 0xb070143f, lockPos: 0x6292cd93, unlockPos: 0xcc64122d };
const translations = JSON.parse(readFileSync(new URL('../public/locales/en/translation.json', import.meta.url))).structure;
const source = readFileSync(new URL('../src/components/programs/tree/Details.tsx', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
} }).outputText;

// Exercise the actual component and its click/confirmation handlers with deterministic
// context/hook values. This verifies behavior, not browser layout or live wallet submission.
function setup(number, { canActivate = true, empty = false, foreign = false, pending = false, preview = false, error = false } = {}) {
  const prices = [10, 50, 200, 500]; // CryptoCashStorage activation prices, Jetton decimals supplied by metadata.
  const command = { price: prices[number - 1] * 1e6, gram_fee: 50_000_000, sender_jetton_wallet: wallet };
  const commands = { [tags.activatePlace]: command, [tags.buyPlace]: { ...command, price: 6e6 } };
  const states = [];
  let cursor = 0;
  const calls = { activates: [], buys: [], notifications: 0, submitted: 0 };
  const context = { commands, contractStructures: { [number]: { name: `CryptoCash ${prices[number - 1]}`, commands } },
    selectedStructure: number, selectedPlace: { profile_addr: profile, place_number: 7 }, refreshKey: 0,
    refreshStructuresPage() {}, notifyPlacePurchaseSubmitted() { calls.notifications++; }, setSelectedPlace() {} };
  const currentProfile = { address: core.Address.parse(profile).toString(), login: 'test', mode: preview ? 'preview' : 'owner', owned: !preview };
  const option = { can_activate: canActivate, command_tag: canActivate ? tags.activatePlace : null,
    structure_number: number, profile_addr: profile, place_number: 7 };
  const module = { exports: {} };
  vm.runInNewContext(compiled, { module, exports: module.exports, console, require: name => {
    if (name === 'react/jsx-runtime') return jsx;
    if (name === 'react') return {
      useContext: () => ({ wallet }), useEffect() {}, useMemo: fn => fn(),
      useState: initial => { const index = cursor++; if (!(index in states)) states[index] = initial;
        return [states[index], value => { states[index] = typeof value === 'function' ? value(states[index]) : value; }]; },
    };
    if (name === '@ton/core') return core;
    if (name === '@tonconnect/ui-react') return { useTonConnectUI: () => [{}] };
    if (name === 'react-i18next') return { useTranslation: () => ({ t: (key, values = {}) => {
      let text = key.startsWith('structure.') ? translations[key.slice(10)] ?? key : key;
      for (const [key, value] of Object.entries(typeof values === 'object' ? values : {})) text = text.replaceAll(`{{${key}}}`, String(value));
      return text;
    } }) };
    if (name.endsWith('/ProfileContext')) return { useProfileContext: () => ({ currentProfile }) };
    if (name.endsWith('/ProgramContext')) return { useProgramContext: () => ({ marketingAddress: marketing }) };
    if (name.endsWith('/StructuresContext')) return { useStructuresContext: () => context };
    if (name.endsWith('/useActivationOption')) return { useActivationOption: (_m, _s, owner) => ({
      option: owner && !error ? option : null, error, pending, retry() {}, submitted() { calls.submitted++; },
    }) };
    if (name.endsWith('/useJettonMetadata')) return { useJettonMetadata: () => ({ metadata: { decimals: 6, symbol: 'USDT' }, isLoading: false }) };
    if (name.endsWith('/jettonMetadataService')) return { formatJettonAmount: amount => String(amount / 1e6) };
    if (name.endsWith('/programStructuresService')) return {
      executeActivatePlace: async (...args) => { calls.activates.push(args); return { success: true }; },
      buyPlaceByJetton: async (...args) => { calls.buys.push(args); return { success: true }; },
    };
    if (name.endsWith('/UserCommand')) return { UserCommandTag: tags };
    if (name.endsWith('/ConfirmDialog')) return { default: 'confirm-dialog' };
    if (name.endsWith('.css') || name.endsWith('.jpg')) return {};
    if (name.endsWith('/App') || name.endsWith('/contractsApi') || name.endsWith('/nftContentHelper') || name.endsWith('/errorUtils')) return {};
    throw new Error(`Unexpected import: ${name}`);
  } });
  const node = { node_type: empty ? 'empty' : 'filled', profile_addr: foreign ? wallet : profile, place_number: 7,
    parent_profile_addr: profile, parent_place_number: 1, pos: 1, created_at: 1, activated_at: null,
    can_activate: canActivate, activate_command_tag: tags.activatePlace, can_buy: empty,
    buy_command_tag: tags.buyPlace, include_position: true, is_active: false, descendants: 0 };
  return { calls, price: prices[number - 1], render() { cursor = 0; return module.exports.default({ selectedNode: node, structure: { height: 0 } }); } };
}
function elements(node) {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!node || typeof node !== 'object') return [];
  return [node, ...elements(node.props?.children)];
}
function text(node) {
  if (Array.isArray(node)) return node.map(text).join('');
  return node && typeof node === 'object' ? text(node.props?.children) : node == null || typeof node === 'boolean' ? '' : String(node);
}
function activateButton(tree) { return elements(tree).find(node => node.type === 'button' && text(node).startsWith('Activate')); }

for (const number of [1, 2, 3, 4]) {
  test(`CryptoCash ${number}: same place, correct price, confirmation and refresh`, async () => {
    const ui = setup(number);
    const button = activateButton(ui.render());
    assert.ok(button);
    assert.equal(button.props.disabled, false);
    assert.ok(text(button).includes(`${ui.price} USDT`));
    button.props.onClick();
    const dialog = elements(ui.render()).find(node => node.type === 'confirm-dialog');
    assert.equal(dialog.props.open, true);
    assert.ok(text(dialog.props.message).includes('place #7'));
    dialog.props.onConfirm();
    await new Promise(resolve => setImmediate(resolve));
    const args = ui.calls.activates[0];
    assert.equal(args[1], marketing);
    assert.equal(args[2], number);
    assert.equal(args[3], profile);
    assert.equal(args[5], 7);
    assert.equal(args[6], tags.activatePlace);
    assert.equal(ui.calls.notifications, 1);
    assert.equal(ui.calls.submitted, 1);
  });
}
for (const options of [{ canActivate: false }, { foreign: true }, { error: true }]) {
  test(`CryptoCash hides unavailable activation ${JSON.stringify(options)}`, () => {
    assert.equal(activateButton(setup(1, options).render()), undefined);
  });
}
test('CryptoCash pending activation cannot be sent again', () => {
  const tree = setup(1, { pending: true }).render();
  assert.equal(activateButton(tree), undefined);
  assert.ok(elements(tree).some(node => node.type === 'button' && node.props.disabled));
});
test('CryptoCash preserves preview-profile warning in confirmation', () => {
  const ui = setup(1, { preview: true });
  activateButton(ui.render()).props.onClick();
  const dialog = elements(ui.render()).find(node => node.type === 'confirm-dialog');
  assert.ok(elements(dialog.props.message).some(node => node.props?.className === 'confirm-modal__warning'));
});
test('CryptoCash buying an empty position keeps structure, position and refresh', async () => {
  const ui = setup(3, { empty: true });
  const button = elements(ui.render()).find(node => node.type === 'button' && text(node).startsWith('Buy'));
  assert.ok(button);
  button.props.onClick();
  elements(ui.render()).find(node => node.type === 'confirm-dialog').props.onConfirm();
  await new Promise(resolve => setImmediate(resolve));
  const args = ui.calls.buys[0];
  assert.equal(args[1], marketing);
  assert.equal(args[2], 3);
  assert.equal(args[3], core.Address.parse(profile).toString());
  assert.equal(args[5].parent.struct, 3);
  assert.equal(args[5].parent.place_number, 1);
  assert.equal(args[5].pos, 1);
  assert.equal(ui.calls.notifications, 1);
  assert.equal(ui.calls.activates.length, 0);
});
