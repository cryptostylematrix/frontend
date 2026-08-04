import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { appConfig } from "../config";
import { loadPrograms, type Program } from "../services/programsService";
import "./available-test-programs.css";

export default function AvailableTestPrograms() {
  const { t } = useTranslation();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    setIsLoading(true);
    loadPrograms(appConfig.ton.admin.dev)
      .then((loadedPrograms) => {
        if (active) setPrograms(loadedPrograms);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="test-programs" aria-labelledby="test-programs-title">
      <h2 id="test-programs-title" className="test-programs__title">
        {t("programs.availableTestPrograms", "Available Test Programs")}
      </h2>
      {isLoading && (
        <div className="test-programs__loading">{t("home.loading")}</div>
      )}
      <div className="test-programs__list">
        {programs.map((program) => (
          <article className="test-programs__item" key={program.address}>
            <h3 className="test-programs__name">{program.name}</h3>
            <Link
              className="test-programs__link"
              to={`/programs/${encodeURIComponent(program.address)}/marketing`}
            >
              {t("programs.open", "Open")}
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
