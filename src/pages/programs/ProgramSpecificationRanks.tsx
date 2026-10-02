import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getProgramStructureRanks } from "../../services/programApi";

import { groupSpecificationRanks, rankKeys, type RankGroup } from "./specificationRanks";

export default function ProgramSpecificationRanks({ address, numbers, structureName }: {
  address: string;
  numbers: number[];
  structureName: (number: number) => string;
}) {
  const { t } = useTranslation();
  const s = (key: string) => t(`specification.${key}`);
  const numberKey = JSON.stringify(numbers);
  const requestKey = `${address}:${numberKey}`;
  const [result, setResult] = useState<{ key: string; groups: RankGroup[] } | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const structureNumbers = JSON.parse(numberKey) as number[];
    // Skip the effect discarded by StrictMode before issuing backend requests.
    void Promise.resolve().then(() => {
      if (controller.signal.aborted) return;
      return Promise.all(structureNumbers.map(async number => {
      try {
        const ranks = await getProgramStructureRanks(address, number, controller.signal);
        return { number, ranks: ranks.sort((a, b) => a.required_active_referral_places - b.required_active_referral_places) };
      } catch {
        return { number, ranks: null };
      }
    })).then(groups => {
      if (!controller.signal.aborted) setResult({ key: requestKey, groups });
    });
    });
    return () => controller.abort();
  }, [address, numberKey, requestKey, attempt]);
  const groups = result?.key === requestKey ? result.groups : null;
  const rankGroups = groupSpecificationRanks(groups ?? []);
  const hasRanks = rankGroups.length > 0;
  const failed = groups?.filter(group => group.ranks === null) ?? [];
  return <section className="program-specification__section" id="spec-ranks" aria-labelledby="spec-ranks-title">
    <h3 id="spec-ranks-title">{s("ranksTitle")}</h3>
    <p className="program-specification__section-description">{s("rankRule")}</p>
    {!groups ? <p role="status">{t("home.loading")}</p> : <>
      {hasRanks && <>
        <div className="program-specification__table" role="region" aria-labelledby="spec-ranks-title" tabIndex={0}>
          <table><thead><tr><th scope="col">{s("rankName")}</th><th scope="col">{s("structureColumn")}</th><th scope="col">{s("rankThreshold")}</th></tr></thead>
            <tbody>{rankGroups.flatMap(rank => rank.volumes.flatMap((group, groupIndex) => group.structures.map((number, index) => {
              const known = rankKeys.includes(rank.key);
              return <tr key={`${rank.key}:${group.volume}:${number}`}>
                {groupIndex === 0 && index === 0 && <th scope="row" rowSpan={rank.rowCount}><span className={`program-specification__rank${known ? ` program-specification__rank--${rank.key}` : ""}`}>{known ? t(`structure.ranks.${rank.key}`) : rank.name}</span></th>}
                <td className="program-specification__structure-name">{structureName(number)}</td>
                {index === 0 && <td rowSpan={group.structures.length} className="program-specification__numeric">{group.volume}</td>}
              </tr>;
            })))}</tbody>
          </table>
        </div>
      </>}
      {!hasRanks && failed.length === 0 && <p className="program-specification__muted">{s("noRanks")}</p>}
      {failed.length > 0 && <div className="program-specification__notice" role="status">
        <p>{s("ranksUnavailable")}: {failed.map(group => structureName(group.number)).join(", ")}</p>
        <button type="button" onClick={() => setAttempt(value => value + 1)}>{s("retry")}</button>
      </div>}
    </>}
  </section>;
}
