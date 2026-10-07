import { normalizeLanguage } from "../languages";

export type WalletLanguageDependencies = {
  initialLanguage: () => string;
  readLegacyLanguage: () => string | null;
  clearLegacyLanguage: () => void;
  saveGuestLanguage: (language: string) => void;
  readPendingLanguage: (wallet: string) => string | null;
  savePendingLanguage: (wallet: string, language: string) => void;
  clearPendingLanguage: (wallet: string, language: string) => void;
  resolveWalletLanguage: (wallet: string, fallback: string) => Promise<string>;
  saveWalletLanguage: (wallet: string, language: string) => Promise<string>;
  changeLanguage: (language: string) => Promise<unknown>;
  reportError: (error: unknown) => void;
  delay: (milliseconds: number) => Promise<void>;
};

// Browser storage is used only for migration, guests and unacknowledged explicit changes.
export function createWalletLanguageSync(deps: WalletLanguageDependencies) {
  let activeWallet: string | null = null;
  let generation = 0;
  let guestLanguage = deps.initialLanguage();
  let queue = Promise.resolve();
  let displayQueue = Promise.resolve();

  const apply = (language: string, token: number) => {
    displayQueue = displayQueue.then(async () => {
      if (token === generation) await deps.changeLanguage(normalizeLanguage(language) ?? "en");
    }).catch(deps.reportError);
    return displayQueue;
  };
  const enqueue = (job: () => Promise<void>) => {
    queue = queue.then(job).catch(deps.reportError);
    return queue;
  };
  const retry = async (job: () => Promise<string>) => {
    for (let attempt = 0; ; attempt++) {
      try { return await job(); }
      catch (error) {
        if (attempt === 2) throw error;
        await deps.delay(1000 * (attempt + 1));
      }
    }
  };

  return {
    connect(wallet: string | null) {
      activeWallet = wallet;
      const token = ++generation;
      if (!wallet) return apply(guestLanguage, token);
      const pending = deps.readPendingLanguage(wallet);
      if (pending) void apply(pending, token);
      const fallback = deps.readLegacyLanguage() ?? guestLanguage;
      return enqueue(async () => {
        if (token !== generation) return;
        const language = await retry(() => pending
          ? deps.saveWalletLanguage(wallet, pending)
          : deps.resolveWalletLanguage(wallet, fallback));
        if (pending) deps.clearPendingLanguage(wallet, pending);
        if (token !== generation) return;
        deps.clearLegacyLanguage();
        await apply(language, token);
      });
    },
    select(value: string) {
      const language = normalizeLanguage(value);
      if (!language) return Promise.resolve();
      const token = ++generation;
      const wallet = activeWallet;
      void apply(language, token);
      if (!wallet) {
        guestLanguage = language;
        deps.saveGuestLanguage(language);
        return displayQueue;
      }
      deps.savePendingLanguage(wallet, language);
      return enqueue(async () => {
        await retry(() => deps.saveWalletLanguage(wallet, language));
        deps.clearPendingLanguage(wallet, language);
        if (token === generation) deps.clearLegacyLanguage();
      });
    },
    stop() {
      activeWallet = null;
      generation++;
    },
  };
}
