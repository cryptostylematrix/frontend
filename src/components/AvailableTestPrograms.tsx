import { useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { WalletContext } from "../App";
import { canViewTestPrograms as isAllowedWallet } from "../utils/testProgramAccess";
import { TEST_PROGRAM_ADDRESSES } from "../programs";
import { loadProgramMetadata } from "../services/programsService";
import ProgramBlock from "./ProgramBlock";
import "./available-test-programs.css";

export default function AvailableTestPrograms() {
  const { t } = useTranslation();
  const { wallet } = useContext(WalletContext)!;
  const [programAddresses, setProgramAddresses] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const canViewTestPrograms = isAllowedWallet(wallet);

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
      TEST_PROGRAM_ADDRESSES.map(async (marketingAddress) =>
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
      <h2 id="test-programs-title" className="test-programs__title administration-section-title">
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
