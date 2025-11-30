const defaultTonEndpoint = "https://toncenter.com/api/v2/jsonRPC";
const defaultTonApiKey = "193210c5feca89e2e483c94b7e7e43797c5c3e33cd61c7e711d4868dd8a4ed04";
const defaultMultiContract = "EQCio9soCgFJxQOPMpkerdlDTWjzD_el3omcOiq9NSURzMnV";
const defaultMatrixApiHost = "https://cs.apihub160.cc";

export const appConfig = {
  ton: {
    endpoint: (import.meta.env.VITE_TON_ENDPOINT as string | undefined) ?? defaultTonEndpoint,
    apiKey: (import.meta.env.VITE_TON_API_KEY as string | undefined) ?? defaultTonApiKey,
  },
  matrixApi: {
    host: (import.meta.env.VITE_MATRIX_API_HOST as string | undefined) ?? defaultMatrixApiHost,
    defaultApiHost: defaultMatrixApiHost,
  },
  multi: {
    contractAddress: (import.meta.env.VITE_MULTI_CONTRACT as string | undefined) ?? defaultMultiContract,
  },
} as const;
