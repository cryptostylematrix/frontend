import { useTranslation } from "react-i18next";
import type { ProgramStructure } from "../../services/programApi";
import type { MarketingV3StructureConfigResponse } from "../../services/contractsApi";
import { UserCommandTag } from "../../contracts/schemes/UserCommand";
import { describeActivity } from "./specificationActivity";

export default function ProgramSpecificationActivity({ structures, contractStructures, structureName }: {
  structures: ProgramStructure[];
  contractStructures: Record<string, MarketingV3StructureConfigResponse>;
  structureName: (number: number) => string;
}) {
  const { t } = useTranslation();
  const s = (key: string, values: Record<string, unknown> = {}) => t(`specification.${key}`, values);
  const a = (key: string, values: Record<string, unknown> = {}) => s(`activitySettings.${key}`, values);
  const rows = [...structures].sort((a, b) => a.structure_number - b.structure_number).map(structure => {
    const contract = contractStructures[String(structure.structure_number)];
    return { structure, settings: describeActivity(structure, structures, contract ? Boolean(contract.commands[String(UserCommandTag.activatePlace)]) : undefined) };
  });
  const configuredRows = rows.filter(({ structure }) => structure.activity != null);
  const permission = (label: string, allowed: boolean) => <li>
    <span>{a(label)}: </span><strong className={`program-specification__permission--${allowed ? "allowed" : "denied"}`}>{a(allowed ? "allowed" : "denied")}</strong>
  </li>;
  return <>
    {configuredRows.length > 0 && <section className="program-specification__section" id="spec-activation" aria-labelledby="spec-activation-title">
      <h3 id="spec-activation-title">{a("title")}</h3>
      <p className="program-specification__section-description">{a("description")}</p>
      <div className="program-specification__table program-specification__table--cards" role="region" aria-labelledby="spec-activation-title" tabIndex={0}>
        <table className="program-specification__activity"><thead><tr>
          <th scope="col">{s("structureColumn")}</th><th scope="col">{a("operation")}</th>
          <th scope="col">{a("statusAfter")}</th><th scope="col">{a("source")}</th>
        </tr></thead><tbody>{configuredRows.map(({ structure, settings }) => <tr key={structure.structure_number}>
          <th scope="row" className="program-specification__structure-name">{structureName(structure.structure_number)}</th>
          <td data-label={a("operation")}>{a(settings.activation)}{settings.activation === "available" && <small>{a("eligibility")}</small>}</td>
          <td data-label={a("statusAfter")}>{settings.activation === "available" ? a(settings.setsActive ? "setsActive" : "keepsStatus") : "—"}</td>
          <td data-label={a("source")}>{settings.unknown ? s("unknown") : <>
            {a(settings.source === "place" ? "ownSource" : settings.source === "invite" ? "inviteSource" : "groupSource")}
            {settings.sourceStructure !== null && <small>{a("firstPlace", { structure: structureName(settings.sourceStructure) })}</small>}
            {settings.source === "group_root" && <small>{a("group", { group: settings.group })}</small>}
            {settings.source !== "place" && <small>{a("missingSource")}</small>}
          </>}</td>
        </tr>)}</tbody></table>
      </div>
      <p className="program-specification__section-description program-specification__activity-note">{a("rewardSource")}</p>
    </section>}
    {configuredRows.length > 0 && <section className="program-specification__section" id="spec-inactive" aria-labelledby="spec-inactive-title">
      <h3 id="spec-inactive-title">{a("inactiveTitle")}</h3>
      <p className="program-specification__section-description">{a("inactiveDescription")}</p>
      <div className="program-specification__table program-specification__table--cards" role="region" aria-labelledby="spec-inactive-title" tabIndex={0}>
        <table className="program-specification__activity"><thead><tr>
          <th scope="col">{s("structureColumn")}</th><th scope="col">{a("placement")}</th>
          <th scope="col">{s("rewards")}</th><th scope="col">{a("compression")}</th>
        </tr></thead><tbody>{configuredRows.map(({ structure, settings }) => <tr key={structure.structure_number}>
          <th scope="row" className="program-specification__structure-name">{structureName(structure.structure_number)}</th>
          {settings.unknown ? <td colSpan={3}>{s("unknown")}</td> : <>
            <td data-label={a("placement")}><ul className="program-specification__actions">
              {structure.structure_number === 0 ? <>
                {permission("inviteWithPlaces", settings.inviteWithPlaces)}
                {permission("inviteWithoutPlaces", settings.inviteWithoutPlaces)}
                {permission("fallbackRoot", settings.fallbackRoot)}
              </> : <>
                {permission("ownChildren", settings.ownChildren)}
                {permission("spillover", settings.spillover)}
                <li>{a(settings.checkManual ? "manualChecked" : "manualNotChecked")}</li>
              </>}
            </ul>{structure.structure_number === 0 && settings.requiresPlaces && <small>{a("requiresPlaces")}</small>}</td>
            <td data-label={s("rewards")}><ul className="program-specification__actions">
              {permission("bonuses", settings.bonuses)}{permission("clones", settings.clones)}
            </ul></td>
            <td data-label={a("compression")}>{a(settings.compression ? "keepCompression" : "removeCompression")}</td>
          </>}
        </tr>)}</tbody></table>
      </div>
    </section>}
  </>;
}
