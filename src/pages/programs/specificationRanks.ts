import type { ProgramStructureRank } from "../../services/programApi";

export const rankKeys = ["bronze", "silver", "gold", "platinum", "sapphire", "emerald", "diamond"];
export type RankGroup = { number: number; ranks: ProgramStructureRank[] | null };

export function groupSpecificationRanks(groups: RankGroup[]) {
  const ranks = new Map<string, { key: string; name: string; volumes: Map<number, number[]> }>();
  for (const group of groups) {
    for (const rank of group.ranks ?? []) {
      const key = rank.name.trim().toLowerCase();
      let entry = ranks.get(key);
      if (!entry) {
        entry = { key, name: rank.name, volumes: new Map() };
        ranks.set(key, entry);
      }
      const structures = entry.volumes.get(rank.required_active_referral_places) ?? [];
      if (!structures.includes(group.number)) structures.push(group.number);
      entry.volumes.set(rank.required_active_referral_places, structures);
    }
  }
  return [...ranks.values()].sort((a, b) => {
    const aIndex = rankKeys.indexOf(a.key);
    const bIndex = rankKeys.indexOf(b.key);
    return (aIndex < 0 ? rankKeys.length : aIndex) - (bIndex < 0 ? rankKeys.length : bIndex) || a.key.localeCompare(b.key);
  }).map(rank => ({
    key: rank.key,
    name: rank.name,
    volumes: [...rank.volumes].map(([volume, structures]) => ({ volume, structures: structures.sort((a, b) => a - b) }))
      .sort((a, b) => a.structures[0] - b.structures[0]),
    rowCount: [...rank.volumes.values()].reduce((total, structures) => total + structures.length, 0),
  }));
}
