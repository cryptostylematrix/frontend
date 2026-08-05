import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useProgramContext } from "../../context/ProgramContext";
import {
  loadProgramMetadata,
  type Program,
  type ProgramPresentationLinks,
} from "../../services/programsService";
import "./program-marketing.css";

const localizedLink = (
  links: ProgramPresentationLinks,
  language: string,
) => {
  const normalizedLanguage = language.toLowerCase().split("-")[0];
  return links[normalizedLanguage]?.trim() || links.en?.trim() || null;
};

export default function ProgramMarketing() {
  const { t, i18n } = useTranslation();
  const { marketingAddress } = useProgramContext();
  const [program, setProgram] = useState<Program | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setProgram(null);
    setIsLoading(true);

    void loadProgramMetadata(marketingAddress)
      .then((metadata) => {
        if (!cancelled) setProgram(metadata);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [marketingAddress]);

  const language = i18n.resolvedLanguage ?? i18n.language ?? "en";
  const pdfHref = program
    ? localizedLink(program.presentations.pdf, language)
    : null;
  const videoHref = program
    ? localizedLink(program.presentations.video, language)
    : null;

  if (isLoading) {
    return (
      <section className="program-marketing">
        <div className="program-marketing__loading">
          {t("home.loading", "Loading...")}
        </div>
      </section>
    );
  }

  return (
    <section className="program-marketing">
      <div className="program-marketing__grid">
        {pdfHref && (
          <div className="program-marketing__card">
            <div className="program-marketing__header">
              {t("programs.presentation.pdfTitle", "Presentation PDF")}
            </div>
            <p className="program-marketing__text">
              {t(
                "programs.presentation.pdfDescription",
                "Preview the deck in your language.",
              )}
            </p>
            <a
              className="program-marketing__link"
              href={pdfHref}
              target="_blank"
              rel="noreferrer"
            >
              {t("programs.presentation.view", "View PDF")}
            </a>
          </div>
        )}

        {videoHref && (
          <div className="program-marketing__card">
            <div className="program-marketing__header">
              {t("programs.presentation.videoTitle", "Video overview")}
            </div>
            <p className="program-marketing__text">
              {t(
                "programs.presentation.videoDescription",
                "Watch the marketing overview on YouTube.",
              )}
            </p>
            <a
              className="program-marketing__link"
              href={videoHref}
              target="_blank"
              rel="noreferrer"
            >
              {t("programs.presentation.watch", "Watch video")}
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
