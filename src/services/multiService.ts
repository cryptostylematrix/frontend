import { ErrorCode } from "../errors/ErrorCodes";

export type ContractResult =
  | { success: true }
  | { success: false; error_code: ErrorCode };

const delay = async (min = 300, max = 900) => {
  const duration = min + Math.random() * (max - min);
  return new Promise((resolve) => setTimeout(resolve, duration));
};

const randomResult = (): ContractResult => {
  const ok = Math.random() < 0.7;
  if (ok) return { success: true };
  const codes: ErrorCode[] = [
    ErrorCode.INVALID_PAYLOAD,
    ErrorCode.UNAUTHORIZED,
    ErrorCode.INSUFFICIENT_FUNDS,
    ErrorCode.FORBIDDEN,
    ErrorCode.NOT_FOUND,
    ErrorCode.INVALID_WORKCHAIN,
  ];
  const error_code = codes[Math.floor(Math.random() * codes.length)];
  return { success: false, error_code };
};

export async function buyPlace(
  query_id: number,
  m: number,
  profile_addr: string,
  pos_addr: string | undefined
): Promise<ContractResult> {
  void query_id;
  void m;
  void profile_addr;
  void pos_addr;
  await delay();
  return randomResult();
}

export async function lockPos(
  query_id: number,
  m: number,
  profile_addr: string,
  pos_addr: string
): Promise<ContractResult> {
  void query_id;
  void m;
  void profile_addr;
  void pos_addr;
  await delay();
  return randomResult();
}

export async function unlockPos(
  query_id: number,
  m: number,
  profile_addr: string,
  pos_addr: string
): Promise<ContractResult> {
  void query_id;
  void m;
  void profile_addr;
  void pos_addr;
  await delay();
  return randomResult();
}
