import { useEffect } from "react";
import { useTonConnectUI } from "@tonconnect/ui-react";
import { saveTonConnection } from "../services/uiTonConnectionApi";

// Subscribe independently of profile selection: every connected account is recorded.
export function useTonConnectionSync() {
  const [tonConnectUI] = useTonConnectUI();

  useEffect(() => {
    const controller = new AbortController();
    let queue = Promise.resolve();
    let lastSaved = "";

    const sync = (wallet: typeof tonConnectUI.wallet) => {
      if (!wallet) {
        queue = queue.then(() => { lastSaved = ""; });
        return;
      }
      const address = wallet.account.address;
      const metadata = {
        wallet_state_init: wallet.account.walletStateInit,
        wallet_name: "name" in wallet && wallet.name ? wallet.name : wallet.device.appName,
        app_version: wallet.device.appVersion,
        platform: wallet.device.platform,
      };
      const fingerprint = JSON.stringify([address, metadata]);
      // Preserve event order, including quick reconnects to the same address.
      queue = queue.then(async () => {
        if (controller.signal.aborted || fingerprint === lastSaved) return;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            await saveTonConnection(address, metadata, controller.signal);
            lastSaved = fingerprint;
            return;
          } catch (error) {
            if (controller.signal.aborted) return;
            if (attempt === 2) {
              console.error("Failed to save TON connection metadata", error);
              return;
            }
            await new Promise<void>((resolve) => {
              const timer = window.setTimeout(done, 1000 * (attempt + 1));
              function done() {
                window.clearTimeout(timer);
                controller.signal.removeEventListener("abort", done);
                resolve();
              }
              controller.signal.addEventListener("abort", done, { once: true });
            });
          }
        }
      });
    };

    const unsubscribe = tonConnectUI.onStatusChange(sync);
    sync(tonConnectUI.wallet);
    return () => {
      unsubscribe();
      controller.abort();
    };
  }, [tonConnectUI]);
}
