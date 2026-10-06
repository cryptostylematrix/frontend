import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const core = require('@ton/core');
const tag = 0xf63f29c5;
const marketing = `0:${'1'.repeat(64)}`;
const profile = `0:${'2'.repeat(64)}`;
const wallet = `0:${'3'.repeat(64)}`;
const jetton = `0:${'4'.repeat(64)}`;
const boc = core.beginCell().endCell().toBoc().toString('hex');

function setup(target, usesJetton) {
  const requests = { sends: [], exec: [], transfers: [] };
  const api = {
    getMarketingV3Data: async () => ({ structures: {
      [target]: { commands: { [tag]: { price: 10_000_000, gram_fee: 50_000_000, sender_jetton_wallet: usesJetton ? jetton : null } } },
    } }),
    buildMarketingV3ExecMessageBody: async request => { requests.exec.push(request); return { boc_hex: boc }; },
    getJettonWalletData: async () => ({ minter_addr: marketing, balance: '1000000000' }),
    getJettonWalletAddress: async () => ({ wallet_addr: jetton }),
    buildJettonTransferMsgBody: async request => { requests.transfers.push(request); return { boc_hex: boc }; },
  };
  const module = { exports: {} };
  const source = readFileSync(new URL('../src/services/programStructuresService.ts', import.meta.url), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    module, exports: module.exports, console, crypto: globalThis.crypto,
    require: name => {
      if (name === '@ton/core') return core;
      if (name === '../contracts/schemes/UserCommand') return { UserCommandTag: { activatePlace: tag } };
      if (name === '../errors/ErrorCodes') return { ErrorCode: { INVALID_PAYLOAD: 'invalid', TRANSACTION_FAILED: 'failed' } };
      if (name === './programApi') return {};
      if (name === './contractsApi') return api;
      if (name === './tonConnectService') return { sendTransaction: async (...args) => { requests.sends.push(args); return { success: true }; } };
      throw new Error(`Unexpected import ${name}`);
    },
  });
  return { requests, activate: module.exports.executeActivatePlace };
}

for (const [target, place] of [[3, 7], [1, 1], [0, 1]]) {
  for (const jettonPayment of [false, true]) {
    test(`activation structure ${target}, place ${place}, ${jettonPayment ? 'Jetton' : 'TON'} uses target payload and price`, async () => {
      const { activate, requests } = setup(target, jettonPayment);
      const result = await activate({}, marketing, target, profile, wallet, place, tag);
      assert.equal(result.success, true);
      assert.equal(requests.exec[0].structure, target);
      assert.equal(requests.exec[0].profileAddr, profile);
      assert.equal(requests.exec[0].commandTag, tag);
      assert.equal(core.Cell.fromHex(requests.exec[0].payloadBocHex).beginParse().loadUint(32), place);
      assert.equal(requests.sends.length, 1);
      assert.equal(requests.sends[0][2], jettonPayment ? 100_000_000n : 60_000_000n);
      if (jettonPayment) {
        assert.equal(requests.transfers[0].amount, 10_000_000);
        assert.equal(requests.transfers[0].forwardTonAmount, 50_000_000);
      }
    });
  }
}

test('a missing target command cannot send a transaction', async () => {
  const { activate, requests } = setup(1, false);
  assert.equal((await activate({}, marketing, 2, profile, wallet, 1, tag)).success, false);
  assert.equal(requests.sends.length, 0);
});
