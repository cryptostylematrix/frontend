// src/errors/errorUtils.ts
import { ErrorCode } from "./ErrorCodes";
import type { TFunction } from "i18next"; // ✅ type-only import

export function translateError(t: TFunction, code: string): string {
  const knownCodes = Object.values(ErrorCode);
  if (knownCodes.includes(code as ErrorCode)) {
    return t(`errors.${code}`);
  }
  return t(`errors.${ErrorCode.UNEXPECTED}`);
}

