import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const wallet = (version = '1.0', address = '0:wallet') => ({
  name: 'Tonkeeper',
  account: { address, walletStateInit: 'state-init' },
  device: { appName: 'tonkeeper', appVersion: version, platform: 'android' },
});
const flush = () => new Promise(resolve => setImmediate(resolve));

function setup(initialWallet = null, save = async () => {}) {
  const calls = [];
  let listener;
  let cleanup;
  let unsubscribed = false;
  const module = { exports: {} };
  const code = ts.transpileModule(readFileSync(new URL('../src/hooks/useTonConnectionSync.ts', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, {
    module, exports: module.exports, AbortController,
    console: { error() {} },
    window: { setTimeout: callback => setTimeout(callback, 0), clearTimeout },
    require(name) {
      if (name === 'react') return { useEffect: effect => { cleanup = effect(); } };
      if (name === '@tonconnect/ui-react') return { useTonConnectUI: () => [{
        wallet: initialWallet,
        onStatusChange: callback => {
          listener = callback;
          return () => { unsubscribed = true; };
        },
      }] };
      if (name === '../services/uiTonConnectionApi') return { saveTonConnection: async (...args) => {
        calls.push(args);
        await save(...args);
      } };
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  module.exports.useTonConnectionSync();
  return { calls, emit: value => listener(value), stop: () => cleanup(), get unsubscribed() { return unsubscribed; } };
}

test('saves an already restored wallet and skips duplicate status notifications', async () => {
  const flow = setup(wallet());
  flow.emit(wallet());
  await flush();
  assert.equal(flow.calls.length, 1);
  assert.equal(flow.calls[0][1].wallet_name, 'Tonkeeper');
  assert.equal(flow.calls[0][1].wallet_state_init, 'state-init');
  flow.stop();
});

test('records late restoration, metadata changes and wallet changes in order', async () => {
  const flow = setup();
  flow.emit(wallet());
  flow.emit(wallet('2.0'));
  flow.emit(null);
  flow.emit(wallet('3.0', '0:other'));
  await flush();
  assert.deepEqual(flow.calls.map(([address, metadata]) => [address, metadata.app_version]), [
    ['0:wallet', '1.0'], ['0:wallet', '2.0'], ['0:other', '3.0'],
  ]);
  flow.stop();
});

test('uses appName when wallet registry display name is unavailable', async () => {
  const value = wallet();
  delete value.name;
  const flow = setup(value);
  await flush();
  assert.equal(flow.calls[0][1].wallet_name, 'tonkeeper');
  flow.stop();
});

test('serializes saves so a slow earlier connection cannot overwrite a newer one', async () => {
  let release;
  const pending = new Promise(resolve => { release = resolve; });
  const flow = setup(wallet(), async (_, metadata) => {
    if (metadata.app_version === '1.0') await pending;
  });
  flow.emit(wallet('2.0'));
  await flush();
  assert.equal(flow.calls.length, 1);
  release();
  await flush();
  assert.equal(flow.calls.length, 2);
  assert.equal(flow.calls[1][1].app_version, '2.0');
  flow.stop();
});

test('retries a temporary save failure', async () => {
  let attempts = 0;
  const flow = setup(wallet(), async () => {
    if (++attempts === 1) throw new Error('offline');
  });
  await new Promise(resolve => setTimeout(resolve, 30));
  assert.equal(attempts, 2);
  flow.emit(wallet());
  await flush();
  assert.equal(attempts, 2);
  flow.stop();
});

test('cleanup cancels queued saves and unsubscribes', async () => {
  const flow = setup(wallet());
  flow.stop();
  await flush();
  assert.equal(flow.calls.length, 0);
  assert.equal(flow.unsubscribed, true);
});


test('a new connection resends metadata even for the same wallet and app version', async () => {
  const flow = setup(wallet());
  await flush();
  flow.emit(null);
  flow.emit(wallet());
  await flush();
  assert.equal(flow.calls.length, 2);
  flow.stop();
});
