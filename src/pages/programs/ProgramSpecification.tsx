import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Address, fromNano } from "@ton/core";
import { useProgramContext } from "../../context/ProgramContext";
import { getMarketingV3Data, type MarketingV3DataResponse } from "../../services/contractsApi";
import { getProgramStructures, type ProgramStructure, type ProgramPositionConfig, type ProgramPositionOperation } from "../../services/programApi";
import { getSchedules, type PublicSchedule } from "../../services/scheduledTasksApi";
import { getJettonMetadata, formatJettonAmount, type JettonMetadata } from "../../services/jettonMetadataService";
import { CRYPTOCASH_POOL_ADDRESSES, getLegacyPricingProgramKey } from "../../programs";
import { UserCommandTag } from "../../contracts/schemes/UserCommand";
import { loadProgramMetadata, type Program } from "../../services/programsService";
import { groupSpecificationRewards, type RewardRow } from "./specificationRewards";
import ProgramSpecificationRanks from "./ProgramSpecificationRanks";
import ProgramSpecificationMetadata from "./ProgramSpecificationMetadata";
import "./program-specification.css";

const commandKeys: Record<number, string> = Object.fromEntries(Object.entries(UserCommandTag).map(([key, tag]) => [tag, key]));
const systemCommands: Record<number, string> = { [0xca8b8aa2]: "clone", [0x08b738b1]: "reinvest" };
const rewardKeys: Record<number, string> = { [0x210bbdce]: "commands", [0xc4a6ef3e]: "bonus", [0xfb0f2b7c]: "commandOrBonus", [0x33a40e44]: "profilePayment", [0x67d146f6]: "directPayment" };
const bonusKeys: Record<number, string> = { [0xb5ce6bf5]: "referralBonus", [0xe1319040]: "structureBonus", [0x1b5547d5]: "developmentBonus" };
const actionKeys: Record<string, string> = {
  "program.structure.update-activity": "updateActivity",
  "program.structure.compress": "compress",
  "program.structure.calculate-referral-volume": "calculateVolume",
  "program.structure.reset-referral-volume": "resetVolume",
};
function sameAddress(left: string | null | undefined, right: string | null | undefined) {
  if (!left || !right) return false;
  try {
    return Address.parse(left).equals(Address.parse(right));
  } catch {
    return false;
  }
}

type Snapshot = { metadata: Program | null; address: string; contract: MarketingV3DataResponse; program: { structures: ProgramStructure[] } | null; schedules: PublicSchedule[] | null; assets: Record<string, JettonMetadata | null>; loadedAt: Date };

// Row spans remove repeated labels while preserving every rule and its condition.
function consecutiveSpan<T>(rows: T[], index: number, key: (row: T) => string | number) {
  const value = key(rows[index]);
  if (index > 0 && key(rows[index - 1]) === value) return 0;
  let end = index + 1;
  while (end < rows.length && key(rows[end]) === value) end++;
  return end - index;
}

export default function ProgramSpecification() {
  const { marketingAddress } = useProgramContext();
  const { t, i18n } = useTranslation();
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setFailed(false);
    setSnapshot(null);
    // StrictMode immediately cleans up its first effect; do not start requests for it.
    void Promise.resolve().then(() => {
      if (controller.signal.aborted) return;
      const structuresRequest = getProgramStructures(marketingAddress, controller.signal);
      const schedulesRequest = structuresRequest.then(structures =>
        getSchedules({ module: "program", scope: structures?.[0]?.marketing_addr ?? marketingAddress, resourceType: "structure" }, controller.signal)
      ).catch((error: unknown) => {
        if (!controller.signal.aborted) console.error("Failed to load structure schedules", error);
        return null;
      });
      return Promise.all([getMarketingV3Data(marketingAddress), structuresRequest, loadProgramMetadata(marketingAddress), schedulesRequest])
      .then(async ([contract, structures, metadata, schedules]) => {
        const program = structures ? { structures } : null;
        if (!contract) throw new Error("Contract unavailable");
        const wallets = new Set<string>();
        for (const structure of Object.values(contract.structures)) {
          for (const command of Object.values(structure.commands)) if (command.sender_jetton_wallet) wallets.add(command.sender_jetton_wallet);
          for (const reward of Object.values(structure.rewards).flatMap(config => Object.values(config.sets).flat())) if (reward.sender_jetton_wallet) wallets.add(reward.sender_jetton_wallet);
        }
        const assets = Object.fromEntries(await Promise.all([...wallets].map(async wallet => [wallet, await getJettonMetadata(wallet)])));
        if (!controller.signal.aborted) setSnapshot({ metadata, schedules, address: marketingAddress, contract, program, assets, loadedAt: new Date() });
      }).catch((error: unknown) => {
        if (!controller.signal.aborted) {
          console.error("Failed to load program specification", error);
          setFailed(true);
        }
      });
    });
    return () => controller.abort();
  }, [marketingAddress, attempt]);

  const s = (key: string, values: Record<string, unknown> = {}) => t(`specification.${key}`, values);
  const commandName = (tag: number) => commandKeys[tag] ? t(`programQueue.${commandKeys[tag]}`) : s(systemCommands[tag] ?? "unknown");
  const amount = (value: number, wallet: string | null) => {
    if (!Number.isSafeInteger(value) || value < 0) return s("unavailable");
    if (!wallet) return `${fromNano(BigInt(value))} TON`;
    const asset = snapshot?.assets[wallet];
    return asset ? `${formatJettonAmount(value, asset.decimals)} ${asset.symbol}` : s("unavailable");
  };
  const dateFormatter = new Intl.DateTimeFormat(i18n.resolvedLanguage ?? i18n.language, {
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  });
  const date = (value: string | Date) => dateFormatter.format(new Date(value));
  const localTimeZone = dateFormatter.resolvedOptions().timeZone;
  const positioning = (config: ProgramPositionConfig) => config.groups.map((group) =>
    s(["classic", "chess", "radar", "empty_parent", "trimmed_classic", "profile_frontier", "system_gap"].includes(group.algo) ? group.algo : "unknownPosition")).join(" / ");
  const scheduleText = (schedule: PublicSchedule) => {
    if (schedule.schedule_type === null) return s("once");
    // A UTC recurrence has no single fixed local day/time (month boundaries and DST).
    // Show its frequency here and the authoritative execution timestamp below in local time.
    if (schedule.schedule_type === "calendar" && schedule.unit === "months") return s("calendar", { interval: schedule.interval });
    if (schedule.schedule_type === "interval" && ["seconds", "minutes", "hours", "days", "weeks"].includes(schedule.unit ?? "")) return s("interval", { number: schedule.interval, unit: s(schedule.unit!) });
    return s("unknown");
  };
  const current = snapshot?.address === marketingAddress ? snapshot : null;
  const numbers = current ? [...new Set([...Object.keys(current.contract.structures).map(Number), ...(current.program?.structures ?? []).map(row => row.structure_number)])].sort((a, b) => a - b) : [];
  const structureName = (number: number) => number === 0
    ? s("referrals")
    : current?.contract.structures[String(number)]?.name || s("structure", { number });
  const priceRows = numbers.flatMap(number =>
    Object.entries(current?.contract.structures[String(number)]?.commands ?? {})
      .map(([tag, command]) => ({ number, tag: Number(tag), command })));
  const scheduleRows = [...new Set((current?.schedules ?? []).flatMap(schedule => schedule.actions.map(action => Number(action.target.resource_id))))].sort((a, b) => a - b)
    .flatMap(number => (current?.schedules ?? []).flatMap(schedule => {
      const actions = schedule.actions.filter(action => Number(action.target.resource_id) === number);
      return actions.length ? [{ number, schedule, actions }] : [];
    }));
  const rewardRows = groupSpecificationRewards(numbers, current?.contract.structures ?? {});
  const condition = (row: RewardRow) => {
    if (Number(row.code) === 0) return s("fallbackShort");
    const structure = current?.program?.structures.find(value => value.structure_number === row.number);
    if (!structure || structure.height <= 0) return s("unknown");
    if (structure.width > 0) {
      return Number(row.code) <= structure.width ** structure.height
        ? `${row.code} / ${structure.width ** structure.height}` : s("unknown");
    }
    return s(structure.height === 1 ? "lineFillingRule" : "fillingRule", { number: row.code });
  };
  const hasFirstPrice = priceRows.some(row => row.tag === UserCommandTag.buyFirstPlace);
  // Neo deployment stores its owner profile's account ID as the royalty key.
  // Other programs may use royalties differently; do not infer ownership for them.
  const ownerProfileKeys = getLegacyPricingProgramKey(marketingAddress) === "neo"
    ? new Set(Object.values(current?.contract.structures ?? {}).flatMap(structure => Object.keys(structure.royalties)))
    : new Set<string>();
  const isProgramOwner = (address: string | null) => {
    if (!address || ownerProfileKeys.size !== 1) return false;
    try {
      return ownerProfileKeys.has(Address.parse(address).hash.toString("hex"));
    } catch {
      return false;
    }
  };
  const hasRoyalties = Object.values(current?.contract.structures ?? {}).some(value => Object.keys(value.royalties).length > 0);
  const incomplete = current?.program && numbers.some(number =>
    !current.contract.structures[String(number)] || !current.program?.structures.some(row => row.structure_number === number));

  return <section className="program-specification">
    <Link className="program-specification__back" to=".." relative="path">
      <ArrowLeft size={15} aria-hidden="true" />{t("programs.marketing")}
    </Link>
    <div className="program-specification__heading">
      <h2 className="program-specification__title">{s("title")}</h2>
      {current && <p className="program-specification__muted">{s("snapshot", { time: date(current.loadedAt), zone: localTimeZone })}</p>}
    </div>
    {failed ? <div className="program-specification__notice" role="alert">
      <p>{s("error")}</p><button type="button" onClick={() => setAttempt(value => value + 1)}>{s("retry")}</button>
    </div> : !current ? <p role="status">{t("home.loading")}</p> : <>
      <nav className="program-specification__contents" aria-label={t("programs.navigation")}>
        <a href="#spec-metadata">{s("metadataTitle")}</a>
        {current.program && <a href="#spec-conditions">{s("structureSettings")}</a>}
        <a href="#spec-ranks">{s("ranksTitle")}</a>
        <a href="#spec-prices">{s("prices")}</a>
        {rewardRows.length > 0 && <a href="#spec-rewards">{s("rewards")}</a>}
        <a href="#spec-schedule">{s("schedule")}</a>
      </nav>
      <details className="program-specification__guide">
        <summary>{s("guide")}</summary>
        {rewardRows.length > 0 && <p>{s("rewardExplanation")}</p>}
        {rewardRows.length > 0 && <p><strong className="program-specification__default-condition">{s("fallbackShort")}: </strong>{s("defaultRule")}</p>}
        {hasFirstPrice && <p>{s("firstPurchase")}</p>}
        {hasRoyalties && <p>{s("royalties")}</p>}
      </details>
      {!current.program && <div className="program-specification__notice" role="status">
        <p>{s("databaseMissing")}</p>
        <button type="button" onClick={() => setAttempt(value => value + 1)}>{s("retry")}</button>
      </div>}
      {incomplete && <p className="program-specification__notice" role="status">{s("incomplete")}</p>}

      <ProgramSpecificationMetadata program={current.metadata} />

      {current.program && <section className="program-specification__section" id="spec-conditions" aria-labelledby="spec-conditions-title">
        <h3 id="spec-conditions-title">{s("structureSettings")}</h3>
        <p className="program-specification__section-description">{s("structuresDescription")}</p>
        <div className="program-specification__table" role="region" aria-labelledby="spec-conditions-title" tabIndex={0}>
          <table className="program-specification__conditions"><thead><tr>
            <th scope="col">{s("structureColumn")}</th>
            <th scope="col">{s("settings")}</th><th scope="col">{s("positioning")}</th>
            <th scope="col">{t("programs.metadata.features.activation")}</th>
          </tr></thead><tbody>{current.program.structures.map(structure => {
            const defaultConfig = structure.pos_algo.v === 2 ? structure.pos_algo.default : structure.pos_algo;
            const positioningGroups = new Map<string, { config: ProgramPositionConfig; operations: ProgramPositionOperation[] }>();
            const operations: ProgramPositionOperation[] = ["buy_place", "buy_first_place", "buy_system_place", "create_clone", "create_reinvest"];
            for (const operation of operations) {
              const config = structure.pos_algo.v === 2 ? structure.pos_algo.operations?.[operation] ?? defaultConfig : defaultConfig;
              const key = JSON.stringify({ root: config.root, relation: config.relation, groups: config.groups });
              const group = positioningGroups.get(key);
              if (group) group.operations.push(operation);
              else positioningGroups.set(key, { config, operations: [operation] });
            }
            return <tr key={structure.structure_number}>
              <th scope="row" className="program-specification__structure-name">{structureName(structure.structure_number)}</th>
              <td className="program-specification__configuration">
                <div><span>{s("size")}: </span><strong>{structure.width === 0 || structure.height === 0 ? "—" : `${structure.height} × ${structure.width}`}</strong></div>
                <div><span>{s("places")}: </span><strong>{structure.max_places_per_profile === 0 ? s("unlimited") : structure.max_places_per_profile}</strong></div>
                {structure.prev_required && <div title="prev_required"><strong>{s("previous")}</strong></div>}
                <div title="display_height"><span>{s("displayDepth")}: </span><strong>{structure.display_height}</strong></div>
              </td>
              <td>
                {[...positioningGroups.entries()].map(([key, group]) => <div className="program-specification__positioning-group" key={key}>
                  <div className="program-specification__positioning-value">{positioning(group.config)}</div>
                  <ul className="program-specification__actions">{group.operations.map(operation => <li key={operation}>{s(`operations.${operation}`)}</li>)}</ul>
                </div>)}
              </td>
              <td>{structure.activity && <div title="activity.set_active_on_activation">{s(structure.activity.set_active_on_activation === false ? "activationUnchanged" : "activationActive")}</div>}</td>
            </tr>;
          })}</tbody></table>
        </div>
      </section>}

      <ProgramSpecificationRanks address={marketingAddress} numbers={numbers} structureName={structureName} />

      <section className="program-specification__section" id="spec-prices" aria-labelledby="spec-prices-title">
        <h3 id="spec-prices-title">{s("prices")}</h3>
        <p className="program-specification__section-description">{s("operationsDescription")}</p>
        <div className="program-specification__table" role="region" aria-labelledby="spec-prices-title" tabIndex={0}>
          <table><thead><tr>
            <th scope="col">{s("structureColumn")}</th><th scope="col">{s("action")}</th>
            <th scope="col">{s("price")}</th><th scope="col">{s("fee")}</th>
          </tr></thead><tbody>{priceRows.map((row, index) => {
            const span = consecutiveSpan(priceRows, index, value => value.number);
            return <tr key={`${row.number}:${row.tag}`} className={span ? "program-specification__group-start" : undefined}>
              {span > 0 && <th scope="row" rowSpan={span} className="program-specification__structure-name">{structureName(row.number)}</th>}
              <th scope="row">{commandName(row.tag)}</th>
              <td className="program-specification__amount">{row.command.price === 0 ? "—" : amount(row.command.price, row.command.sender_jetton_wallet)}</td>
              <td className="program-specification__numeric">{amount(row.command.gram_fee, null)}</td>
            </tr>;
          })}</tbody></table>
        </div>
      </section>

      {rewardRows.length > 0 && <section className="program-specification__section" id="spec-rewards" aria-labelledby="spec-rewards-title">
        <h3 id="spec-rewards-title">{s("rewards")}</h3>
        <p className="program-specification__section-description">{s("bonusesDescription")}</p>
        <div className="program-specification__table" role="region" aria-labelledby="spec-rewards-title" tabIndex={0}>
          <table className="program-specification__payouts"><thead><tr>
            <th scope="col">{s("structureColumn")}</th><th scope="col">{s("condition")}</th>
            <th scope="col">{s("rewardColumn")}</th><th scope="col">{s("prices")}</th><th scope="col">{s("destinationColumn")}</th><th scope="col">{s("amountDetailsColumn")}</th>
          </tr></thead><tbody>{rewardRows.map((row, index) => {
            const structureSpan = consecutiveSpan(rewardRows, index, value => value.number);
            const ruleSpan = consecutiveSpan(rewardRows, index, value => value.ruleKey);
            const item = row.item;
            const cloneOrStructureBonus = item?.tag === 0xfb0f2b7c && item.command_tag === 0xca8b8aa2 && item.bonus_type_tag === 0xe1319040;
            const reinvestReward = item?.tag === 0x210bbdce && item.command_tag === 0x08b738b1;
            const cloneReward = item?.tag === 0x210bbdce && item.command_tag === 0xca8b8aa2;
            const recipientAddress = item?.tag === 0x67d146f6 ? item.recipient : item?.tag === 0x33a40e44 ? item.profile_addr : null;
            const recipientIsAdmin = item?.tag === 0x67d146f6 && sameAddress(recipientAddress, current.contract.admin_addr);
            const recipientPool = item?.tag === 0x67d146f6
              ? Object.entries(CRYPTOCASH_POOL_ADDRESSES).find(([, address]) => sameAddress(recipientAddress, address))?.[0]
              : undefined;
            const recipientLabel = item?.tag === 0x33a40e44 && isProgramOwner(recipientAddress) ? s("programOwner")
              : recipientIsAdmin ? s("administrator")
              : recipientPool === "coin" ? s("coinPool")
              : recipientPool ? s("systemPlacesPool", { number: recipientPool })
              : recipientAddress ? `${recipientAddress.slice(0, 3)}...${recipientAddress.slice(-3)}` : "—";
            const targetStructure = item?.command_struct ?? item?.struct;
            const commandCount = item?.count ?? (item?.tag === 0xfb0f2b7c ? 1 : null);
            const paymentTitle = item?.amount != null ? item.title?.trim() : undefined;
            const namedBonus = item?.tag === 0xc4a6ef3e && item.bonus_type_tag !== null ? bonusKeys[item.bonus_type_tag] : undefined;
            return <tr key={`${row.ruleKey}:${index}`} className={structureSpan ? "program-specification__group-start" : undefined}>
              {structureSpan > 0 && <th scope="row" rowSpan={structureSpan} className="program-specification__structure-name">{structureName(row.number)}</th>}
              {ruleSpan > 0 && <td rowSpan={ruleSpan} className={Number(row.code) === 0 ? "program-specification__default-condition" : undefined}>{condition(row)}</td>}
              <td>
                <div className={reinvestReward ? "program-specification__reinvest" : cloneOrStructureBonus ? "program-specification__clone-or-bonus" : cloneReward ? "program-specification__clone" : item.tag === 0x67d146f6 ? "program-specification__direct-payment" : item.tag === 0x33a40e44 ? "program-specification__profile-bonus" : namedBonus === "referralBonus" ? "program-specification__bonus program-specification__bonus--referral" : namedBonus ? "program-specification__bonus" : undefined}>{reinvestReward ? "reinvest" : cloneReward ? "clone" : cloneOrStructureBonus && paymentTitle ? `clone | ${paymentTitle}` : paymentTitle || s(cloneOrStructureBonus ? "cloneOrStructureBonus" : namedBonus ?? rewardKeys[item.tag] ?? "unknown")}</div>
                {!paymentTitle && !cloneOrStructureBonus && !namedBonus && item.bonus_type_tag !== null && <small>{s(bonusKeys[item.bonus_type_tag] ?? "unknown")}</small>}
                {!reinvestReward && !cloneReward && !cloneOrStructureBonus && item.command_tag !== null && <div>{commandName(item.command_tag)}</div>}
              </td>
              <td><ul className="program-specification__actions">{row.tags.map(tag => <li key={tag}>{commandName(tag)}</li>)}</ul></td>
              <td className="program-specification__numeric">{recipientAddress
                ? <span className="program-specification__recipient">
                    <span title={recipientAddress} aria-label={recipientAddress}>{recipientLabel}</span>
                    <a className="program-specification__explorer" href={`https://tonviewer.com/${encodeURIComponent(recipientAddress)}`} target="_blank" rel="noreferrer" aria-label={t("programs.contractExplorer")} title={t("programs.contractExplorer")}>
                      <ExternalLink size={14} aria-hidden="true" />
                    </a>
                  </span>
                : item?.from_level != null && item.to_level != null
                  ? item.bonus_type_tag === 0xb5ce6bf5
                    ? item.from_level === 0 && item.to_level === 0 ? s("referralRecipient") : s("referralRecipientsAtLevels", { levels: item.from_level === item.to_level ? item.from_level : `${item.from_level}–${item.to_level}` })
                    : item.from_level === item.to_level ? (item.from_level === 0 ? s("matrixTop") : item.from_level) : `${item.from_level}–${item.to_level}` : "—"}</td>
              <td className="program-specification__reward-details">
                {item?.amount != null && <div className="program-specification__amount">{amount(item.amount, item.sender_jetton_wallet)}</div>}
                {item?.amount != null && targetStructure != null && <hr className="program-specification__detail-divider" />}
                {targetStructure != null && <div className="program-specification__structure-name">{structureName(targetStructure)}</div>}
                {commandCount != null && <small>{s("quantity", { number: commandCount })}</small>}
                {item?.amount == null && targetStructure == null && commandCount == null && "—"}
              </td>
            </tr>;
          })}</tbody></table>
        </div>
      </section>}

      <section className="program-specification__section" id="spec-schedule" aria-labelledby="spec-schedule-title">
        <h3 id="spec-schedule-title">{s("schedule")}</h3>
        <p className="program-specification__section-description">{s("scheduleDescription")}</p>
        {!current.schedules ? <div className="program-specification__notice" role="status"><p>{s("scheduleUnavailable")}</p><button type="button" onClick={() => setAttempt(value => value + 1)}>{s("retry")}</button></div> : current.schedules.length === 0 ? <p className="program-specification__muted">{s("noSchedule")}</p> :
          <div className="program-specification__table" role="region" aria-labelledby="spec-schedule-title" tabIndex={0}>
            <table><thead><tr><th scope="col">{s("structureColumn")}</th><th scope="col">{s("period")}</th><th scope="col">{s("actionsColumn")}</th><th scope="col">{s("statusColumn")}</th></tr></thead>
              <tbody>{scheduleRows.map(({ number, schedule, actions }, index) => {
                const structureSpan = consecutiveSpan(scheduleRows, index, row => row.number);
                return <tr key={`${number}:${schedule.id}`} className={structureSpan ? "program-specification__group-start" : undefined}>
                {structureSpan > 0 && <th scope="row" rowSpan={structureSpan} className="program-specification__structure-name">{structureName(number)}</th>}
                <td>{scheduleText(schedule)}{schedule.execute_at_utc && <small>{s("scheduled", { time: date(schedule.execute_at_utc) })}</small>}</td>
                <td><ol className="program-specification__scheduled-actions">{actions.map((action, actionIndex) =>
                  <li key={actionIndex}>{s(actionKeys[action.type] ?? "unknown")}</li>)}</ol></td>
                <td><span className={`program-specification__status program-specification__status--${schedule.status === "active" && schedule.execute_at_utc ? "active" : schedule.status === "error" ? "error" : "inactive"}`}>
                  {s(schedule.status === "active" && schedule.execute_at_utc ? "active" : schedule.status === "error" ? "scheduleError" : schedule.status === "completed" ? "completed" : "paused")}
                </span></td>
              </tr>;
              })}</tbody>
            </table>
          </div>}
      </section>
    </>}
  </section>;
}
