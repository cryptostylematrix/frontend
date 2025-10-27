import React, { useState, useEffect, useRef, useContext } from "react";
import "./tonconnect.css";
import { WalletContext } from "../../App";
import { useTonConnectUI } from "@tonconnect/ui-react";
import { Copy, LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Locales } from "@tonconnect/ui";
import { Address } from "@ton/core";

const TonConnect: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { setWallet } = useContext(WalletContext)!;

  // ✅ Hook returns [TonConnectUI instance, setOptions function]
  const [tonConnectUI, setTonConnectUIOptions] = useTonConnectUI();

  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const rawAddress = tonConnectUI.account?.address;

  const userFriendlyAddress = rawAddress
    ? Address.parse(rawAddress).toString({ bounceable: false })
    : "";

  const shortAddress = userFriendlyAddress
    ? `${userFriendlyAddress.slice(0, 6)}...${userFriendlyAddress.slice(-4)}`
    : "";

  // 🔄 Keep WalletContext synced with TON Connect state
  useEffect(() => {
    if (tonConnectUI.account?.address) {
      setWallet(tonConnectUI.account.address);
    }

    const unsubscribe = tonConnectUI.onStatusChange((walletInfo) => {
      setWallet(walletInfo ? walletInfo.account.address : "");
    });

    return unsubscribe;
  }, [tonConnectUI, setWallet]);

  // 🌍 Correct way to update TonConnect UI language
  useEffect(() => {
    setTonConnectUIOptions({
      language: normalizeTonLocale(i18n.language),
    });
  }, [setTonConnectUIOptions, i18n.language]);


  // -- handlers
  const handleMainClick = async () => {
    if (!rawAddress) {
      tonConnectUI.openModal();
    } else {
      setIsOpen((prev) => !prev);
    }
  };

  const handleCopy = async () => {
    if (!userFriendlyAddress) return;
    await navigator.clipboard.writeText(userFriendlyAddress);
    setIsOpen(false);
  };

  const handleDisconnect = async () => {
    await tonConnectUI.disconnect();
    setIsOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  return (
    <div className="ton-block" ref={ref}>
      <button className="ton-custom-btn" onClick={handleMainClick}>
        {rawAddress ? shortAddress : t("wallet.connect")}
        {rawAddress && <span className="ton-arrow">{isOpen ? "▲" : "▼"}</span>}
      </button>

      {rawAddress && isOpen && (
        <ul className="ton-dropdown">
          <li>
            <button onClick={handleCopy} type="button">
              <Copy size={18} className="ton-icon" />
              <span>{t("wallet.copyAddress")}</span>
            </button>
          </li>
          <li>
            <button onClick={handleDisconnect} type="button">
              <LogOut size={18} className="ton-icon" />
              <span>{t("wallet.disconnect")}</span>
            </button>
          </li>
        </ul>
      )}
    </div>
  );
};

const TONCONNECT_LOCALES: Locales[] = ["en", "ru"];

function normalizeTonLocale(lang: string): Locales {
  const short = lang.split("-")[0] as Locales;
  return TONCONNECT_LOCALES.includes(short) ? short : "en";
}

export default TonConnect;
