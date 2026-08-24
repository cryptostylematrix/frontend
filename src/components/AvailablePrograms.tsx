import "./available-programs.css";
import { useTranslation } from "react-i18next";
import ProgramBlock from "./ProgramBlock";
import {
  ACTUAL_CRYPTOCASH_MARKETING_PROGRAM_ADDRESS,
  ACTUAL_MULTI_MARKETING_PROGRAM_ADDRESS,
  ACTUAL_NEO_MARKETING_PROGRAM_ADDRESS,
} from "../programs";
const SHOW_MULTI_AND_NEO = true;

export default function AvailablePrograms() {
  const { t } = useTranslation();

  return (
    <section className="programs-section" aria-labelledby="programs-title">
      <div className="programs-header">
        <h2 id="programs-title" className="programs-title">
          {t("home.programs.title")}
        </h2>
      </div>

      <div className="programs-grid">
        {SHOW_MULTI_AND_NEO && (
          <>
            <ProgramBlock
              marketingAddress={ACTUAL_MULTI_MARKETING_PROGRAM_ADDRESS}
            />
            <ProgramBlock
              marketingAddress={ACTUAL_NEO_MARKETING_PROGRAM_ADDRESS}
            />
          </>
        )}
        <ProgramBlock
          marketingAddress={ACTUAL_CRYPTOCASH_MARKETING_PROGRAM_ADDRESS}
        />
      </div>
    </section>
  );
}
