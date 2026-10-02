import type { MarketingV3RewardResponse, MarketingV3StructureConfigResponse } from "../../services/contractsApi";

export type RewardRow = {
  number: number;
  ruleKey: string;
  tags: number[];
  code: string;
  item: MarketingV3RewardResponse;
};

export function groupSpecificationRewards(numbers: number[], structures: Record<string, MarketingV3StructureConfigResponse>): RewardRow[] {
  return numbers.flatMap(number => {
    const conditions = new Map<string, Map<string, RewardRow>>();
    for (const [tag, config] of Object.entries(structures[String(number)]?.rewards ?? {})) {
      for (const [code, items] of Object.entries(config.sets)) {
        let rewards = conditions.get(code);
        if (!rewards) {
          rewards = new Map();
          conditions.set(code, rewards);
        }
        const occurrences = new Map<string, number>();
        for (const item of items) {
          // Compare the entire reward, including recipient, amount and payload.
          const identity = JSON.stringify(Object.entries(item).sort(([a], [b]) => a.localeCompare(b)));
          const occurrence = occurrences.get(identity) ?? 0;
          occurrences.set(identity, occurrence + 1);
          // Repeated rewards within one operation must remain repeated payouts.
          const key = `${identity}:${occurrence}`;
          const row = rewards.get(key);
          if (row) row.tags.push(Number(tag));
          else rewards.set(key, { number, ruleKey: `${number}:${code}`, tags: [Number(tag)], code, item });
        }
      }
    }
    return [...conditions.entries()].sort(([a], [b]) => Number(a) - Number(b)).flatMap(([, rewards]) => [...rewards.values()]);
  });
}
