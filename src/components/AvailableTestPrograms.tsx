import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { appConfig } from "../config";
import { loadAvailableProgramAddresses } from "../services/programsService";
import ProgramBlock from "./ProgramBlock";
import "./available-test-programs.css";

export default function AvailableTestPrograms() {
  const { t } = useTranslation();
  const [programAddresses, setProgramAddresses] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    setIsLoading(true);
    void loadAvailableProgramAddresses(appConfig.ton.admin.dev)
      .then((addresses) => {
        if (active) setProgramAddresses(addresses);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

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
