import { useContext, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { WalletContext } from "../App";
import * as storage from "../services/walletLanguageStorage";
import * as api from "../services/uiWalletLanguageApi";
import { createWalletLanguageSync } from "../services/walletLanguageSync";

export function useWalletLanguage() {
  const { wallet } = useContext(WalletContext)!;
  const { i18n } = useTranslation();
  const sync = useMemo(() => createWalletLanguageSync({
    ...storage,
    ...api,
    changeLanguage: language => i18n.changeLanguage(language),
    reportError: error => console.error("Failed to sync wallet language", error),
    delay: milliseconds => new Promise(resolve => window.setTimeout(resolve, milliseconds)),
  }), [i18n]);

  useEffect(() => {
    void sync.connect(wallet || null);
    const retry = () => { void sync.connect(wallet || null); };
    window.addEventListener("online", retry);
    return () => {
      window.removeEventListener("online", retry);
      sync.stop();
    };
  }, [sync, wallet]);

  return sync.select;
}
