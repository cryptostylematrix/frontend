import { Address } from "@ton/core";

export const CRYPTOCASH_MARKETING_PROGRAM_ADDRESS =
  "EQAba1dNyAbxm4t_dv5T1ARQXaQAAYcfJ4jcAWcw1PQ7q10b";
export const MULTI_MARKETING_PROGRAM_ADDRESS =
  "EQBti82_Lya2Wz-iAwuFDH-vdoT0N1RfiBjkrnbhFbkc2Wfu";
export const NEO_MARKETING_PROGRAM_ADDRESS =
  "EQCQUF6o3Z_SzFD5m9aR6uGbIgaujaUcHTPX9oghh8O4lMYh";

const PROGRAM_KEYS_BY_ADDRESS = new Map<string, "multi" | "neo">([
  [Address.parse(MULTI_MARKETING_PROGRAM_ADDRESS).toRawString(), "multi"],
  [Address.parse(NEO_MARKETING_PROGRAM_ADDRESS).toRawString(), "neo"],
]);

export function getLegacyPricingProgramKey(
  marketingAddress: string,
): "multi" | "neo" | null {
  try {
    return (
      PROGRAM_KEYS_BY_ADDRESS.get(
        Address.parse(marketingAddress).toRawString(),
      ) ?? null
    );
  } catch {
    return null;
  }
}
