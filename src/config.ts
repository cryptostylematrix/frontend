const defaultMatrixApiHost = "https://cs.apihub160.cc";
//const defaultMatrixApiHost = "http://localhost:5004";
const defaultContractsApiHost = defaultMatrixApiHost;

export const appConfig = {
  matrixApi: {
    host: (import.meta.env.VITE_MATRIX_API_HOST as string | undefined) ?? defaultMatrixApiHost,
    defaultApiHost: defaultMatrixApiHost,
  },
  contractsApi: {
    host: (import.meta.env.VITE_CONTRACTS_API_HOST as string | undefined) ?? defaultContractsApiHost,
    defaultApiHost: defaultContractsApiHost,
  },
} as const;
