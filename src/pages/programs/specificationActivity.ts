import type { ProgramStructure } from "../../services/programApi";

// Describes stored settings only. Action authorization remains on the backend.
export function describeActivity(structure: ProgramStructure, structures: ProgramStructure[], hasCommand: boolean | undefined) {
  const config = structure.activity;
  const typed = config?.type !== undefined;
  const expectedType = structure.structure_number === 0 ? "invite" : "marketing";
  const invalid = config != null && (typeof config !== "object" || Array.isArray(config)
    || (typed && config.type !== expectedType)
    || (!typed && ["activity_source", "when_inactive", "preserve_status_on_activation", "require_marketing_place_to_invite", "spillover"].some(key => key in config)));
  const source = typed ? config?.activity_source === undefined ? "place" : config.activity_source : "place";
  const group = structure.group?.trim() || null;
  const groupMembers = group ? structures.filter(row => row.marketing_addr === structure.marketing_addr && row.group?.trim() === group) : [];
  const sourceStructure = source === "invite" ? 0 : source === "group_root" && groupMembers.length
    ? Math.min(...groupMembers.map(row => row.structure_number)) : null;
  const unknown = invalid || !["place", "invite", "group_root"].includes(source)
    || (source === "group_root" && sourceStructure === null);
  const rules = typed && !unknown ? config?.when_inactive : undefined;
  const requiresPlaces = typed && config?.require_marketing_place_to_invite === true;
  return {
    unknown, group, source, sourceStructure,
    activation: unknown ? "unknown" : !config ? "noSettings" : hasCommand === undefined ? "unknown" : hasCommand ? "available" : "noCommand",
    setsActive: typed ? config?.preserve_status_on_activation !== true : config?.set_active_on_activation !== false,
    requiresPlaces,
    ownChildren: rules?.allow_own_children === true,
    spillover: config?.activity_source !== undefined ? rules?.allow_spillover_children === true : typed && config?.spillover?.allow_inactive_place === true,
    checkManual: rules?.check_manual_placement === true,
    inviteWithoutPlaces: !requiresPlaces && rules?.allow_inviting_without_places === true,
    inviteWithPlaces: rules?.allow_inviting_with_places === true,
    fallbackRoot: rules?.allow_as_fallback_root === true,
    bonuses: rules?.allow_as_bonus_recipient === true,
    clones: rules?.allow_as_clone_recipient === true,
    compression: rules?.keep_on_compression === true,
  };
}
