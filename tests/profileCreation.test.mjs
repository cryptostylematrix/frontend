import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const { Address, beginCell } = require('@ton/core');
const wallet = `0:${'1'.repeat(64)}`;
const address = `0:${'2'.repeat(64)}`;
const collection = `0:${'3'.repeat(64)}`;
const otherWallet = `0:${'4'.repeat(64)}`;

// Exercise the actual service with deterministic transport and clock boundaries.
function setup({ state = 'uninitialized', stateError = false, profiles = [], rejected = false } = {}) {
  let sends = 0;
  let reads = 0;
  const cache = new Map();
  const api = {
    getNftAddrByLogin: async () => ({ addr: address }),
    getCollectionData: async () => ({ addr: collection }),
    contractsApi: {
      buildDeployItemBody: async () => ({ boc_hex: beginCell().endCell().toBoc().toString('hex') }),
      getProfileNftData: async () => profiles[Math.min(reads++, profiles.length - 1)] ?? null,
    },
  };
  function load(path) {
    if (cache.has(path)) return cache.get(path);
    const module = { exports: {} };
    const source = readFileSync(new URL(`../src/${path}.ts`, import.meta.url), 'utf8');
    const code = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    vm.runInNewContext(code, {
      module, exports: module.exports,
      console: { error() {} },
      setTimeout: (callback) => { queueMicrotask(callback); },
      require: (name) => {
        if (name === '@ton/core') return require(name);
        if (name === './contractsApi') return api;
        if (name === './tonClient') return { getTonClient: () => ({ getContractState: async () => {
          if (stateError) throw new Error('RPC unavailable');
          return { state };
        } }) };
        if (name === './tonConnectService') return { sendTransaction: async () => {
          sends++;
          return rejected ? { success: false, errors: ['err_user_rejected_transaction'] } : { success: true };
        } };
        if (name === './nftContentHelper') return load('services/nftContentHelper');
        if (name === '../errors/ErrorCodes') return load('errors/ErrorCodes');
        if (name === '../utils/profileLogin') return load('utils/profileLogin');
        throw new Error(`Unexpected import: ${name}`);
      },
    });
    cache.set(path, module.exports);
    return module.exports;
  }
  const service = load('services/profileService');
  return {
    create: (options, connectedWallet = wallet) => service.createProfile(
      { account: { address: connectedWallet } }, wallet, 'Test-user', '', '', '', '', options,
    ),
    get sends() { return sends; },
    get reads() { return reads; },
    profiles,
  };
}
const deployed = (owner = wallet) => ({
  is_init: -1, owner_addr: owner, collection_addr: collection,
  content: { login: 'test-user', first_name: 'Confirmed' },
});

for (const state of ['active', 'frozen']) {
  test(`existing ${state} profile prevents a wallet transaction`, async () => {
    const flow = setup({ state });
    const result = await flow.create();
    assert.equal(result.success, false);
    assert.equal(result.errors[0], 'err_profile_exists');
    assert.equal(flow.sends, 0);
  });
}

test('RPC failure does not imply that the login is available', async () => {
  const flow = setup({ stateError: true });
  assert.equal((await flow.create()).success, false);
  assert.equal(flow.sends, 0);
});

test('waits for initialization and accepts equivalent TON address formats', async () => {
  const flow = setup({ profiles: [null, { is_init: 0 }, deployed(Address.parse(wallet).toString())] });
  let submitted = false;
  const result = await flow.create({ onSubmitted: () => { submitted = true; } });
  assert.equal(submitted, true);
  assert.equal(result.success, true);
  assert.equal(result.data.firstName, 'Confirmed');
  assert.equal(flow.reads, 3);
  assert.equal(flow.sends, 1);
});

test('a profile owned by another wallet never reports success', async () => {
  const flow = setup({ profiles: [deployed(otherWallet)] });
  const result = await flow.create();
  assert.equal(result.success, false);
  assert.equal(result.errors[0], 'err_contract_doesnot_belong_to_the_wallet');
});

test('timeout keeps confirmation retryable without resubmitting', async () => {
  const flow = setup();
  const result = await flow.create();
  assert.equal(result.success, false);
  assert.equal(result.errors[0], 'err_profile_creation_unconfirmed');
  assert.equal(result.pending.address, address);
  flow.profiles.push(deployed());
  const retried = await flow.create({ pending: result.pending });
  assert.equal(retried.success, true);
  assert.equal(flow.sends, 1);
});

test('wrong collection or login cannot confirm creation', async () => {
  for (const profile of [
    { ...deployed(), collection_addr: address },
    { ...deployed(), content: { login: 'another-login' } },
  ]) {
    const flow = setup({ profiles: [profile] });
    assert.equal((await flow.create()).success, false);
  }
});

test('wallet rejection does not start confirmation polling', async () => {
  const flow = setup({ rejected: true });
  const result = await flow.create();
  assert.equal(result.errors[0], 'err_user_rejected_transaction');
  assert.equal(flow.reads, 0);
});

test('wallet switch before submission prevents sending', async () => {
  const flow = setup();
  assert.equal((await flow.create(undefined, otherWallet)).success, false);
  assert.equal(flow.sends, 0);
});
