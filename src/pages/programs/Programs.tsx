import { useEffect, useState } from "react";
import { NavLink, Outlet, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Check, Copy, ExternalLink } from "lucide-react";
import {
  ProgramProvider,
  useProgramContext,
} from "../../context/ProgramContext";
import {
  loadProgramMetadata,
  type Program,
} from "../../services/programsService";
import { copyText } from "../../utils/clipboard";
import "./programs.css";

const pages = [
  { path: "inviter", labelKey: "inviter" },
  { path: "referrals", labelKey: "referrals" },
  { path: "structures", labelKey: "structures" },
  { path: "marketing", labelKey: "marketing" },
  { path: "stat", labelKey: "statistics" },
] as const;

export default function Programs() {
  const { marketingAddress = "" } = useParams();

  return (
    <ProgramProvider marketingAddress={marketingAddress}>
      <ProgramsContent />
    </ProgramProvider>
  );
}

function ProgramsContent() {
  const { t } = useTranslation();
  const { marketingAddress } = useProgramContext();
  const [program, setProgram] = useState<Program | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setProgram(null);

    void loadProgramMetadata(marketingAddress).then((metadata) => {
      if (!cancelled) setProgram(metadata);
    });

    return () => {
      cancelled = true;
    };
  }, [marketingAddress]);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1_800);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const handleCopyAddress = async () => {
    const address = marketingAddress.trim();
    if (!address) return;

    try {
      await copyText(address);
      setCopied(true);
    } catch (error) {
      console.error("Failed to copy program marketing address", error);
    }
  };

  return (
    <section className="programs-layout">
      <div className="programs-contract-header">
        <h1 className="programs-contract-title">
          {program?.name ?? t("home.loading", "Loading...")}
        </h1>
        <button
          type="button"
          className={`programs-contract-copy ${copied ? "is-copied" : ""}`}
          onClick={() => void handleCopyAddress()}
          aria-label={
            copied
              ? t("wallet.addressCopied", "Address copied")
              : t("wallet.copyAddress", "Copy address")
          }
          title={
            copied
              ? t("wallet.addressCopied", "Address copied")
              : t("wallet.copyAddress", "Copy address")
          }
        >
          {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
        </button>
        <a
          className="programs-contract-explorer"
          href={`https://tonviewer.com/${encodeURIComponent(marketingAddress)}`}
          target="_blank"
          rel="noreferrer"
          aria-label={t(
            "programs.contractExplorer",
            "Open contract in explorer",
          )}
          title={t(
            "programs.contractExplorer",
            "Open contract in explorer",
          )}
        >
          <ExternalLink aria-hidden="true" />
        </a>
      </div>

      <nav
        className="programs-submenu"
        aria-label={t("programs.navigation", "Program navigation")}
      >
        <ul>
          {pages.map((page) => (
            <li key={page.path}>
              <NavLink
                to={page.path}
                className={({ isActive }) => (isActive ? "active" : "")}
              >
                {t(`programs.${page.labelKey}`)}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="programs-page">
        <Outlet />
      </div>
    </section>
  );
}
