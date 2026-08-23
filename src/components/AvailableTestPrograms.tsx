import { Address } from "@ton/core";
import { useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { WalletContext } from "../App";
import { appConfig } from "../config";
import { AVAILABLE_TEST_PROGRAM_ADDRESSES } from "../programs";
import { loadProgramMetadata } from "../services/programsService";
import ProgramBlock from "./ProgramBlock";
import "./available-test-programs.css";

const normalizeAddress = (address: string) => {
  try {
    return Address.parse(address).toRawString();
  } catch {
    return "";
  }
};

const allowedWalletAddresses = new Set(
  appConfig.availableTestPrograms.walletAddresses
    .map(normalizeAddress)
    .filter(Boolean),
);

export default function AvailableTestPrograms() {
  const { t } = useTranslation();
  const { wallet } = useContext(WalletContext)!;
  const [programAddresses, setProgramAddresses] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const canViewTestPrograms = allowedWalletAddresses.has(
    normalizeAddress(wallet),
  );

  useEffect(() => {
    let active = true;

    if (!canViewTestPrograms) {
      setProgramAddresses([]);
      setIsLoading(false);
      return () => {
        active = false;
      };
    }

    setIsLoading(true);
    void Promise.all(
      AVAILABLE_TEST_PROGRAM_ADDRESSES.map(async (marketingAddress) =>
        (await loadProgramMetadata(marketingAddress))
          ? marketingAddress
          : null,
      ),
    )
      .then((addresses) => {
        if (active) {
          setProgramAddresses(
            addresses.filter((address) => address !== null),
          );
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [canViewTestPrograms]);

  if (!canViewTestPrograms) return null;

  return (
    <section
      className="test-programs programs-section"
      aria-labelledby="test-programs-title"
    >
      <h2 id="test-programs-title" className="test-programs__title">
        {t("programs.availableTestPrograms", "Available Test Programs")}
      </h2>
      {isLoading && (
        <div className="test-programs__loading">{t("home.loading")}</div>
      )}
      <div className="programs-grid">
        {programAddresses.map((marketingAddress) => (
          <ProgramBlock
            key={marketingAddress}
            marketingAddress={marketingAddress}
          />
        ))}
      </div>
    </section>
  );
}
