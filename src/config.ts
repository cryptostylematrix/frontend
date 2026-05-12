const defaultMatrixApiHost = "https://cs.apihub160.cc";
//const defaultMatrixApiHost = "http://localhost:5004";
const defaultContractsApiHost = defaultMatrixApiHost;
const defaultMarketingApiHost = defaultMatrixApiHost;
const defaultNeoMarketingAddr = "EQAc4cKpE4yQpsadUsem6r30HHjjrmmtT13pPsRpvtLSEUHi";
const defaultForcedProfileLogin = "";
//const defaultForcedProfileLogin = "neoclub";

export const appConfig = {
  matrixApi: {
    host: (import.meta.env.VITE_MATRIX_API_HOST as string | undefined) ?? defaultMatrixApiHost,
    defaultApiHost: defaultMatrixApiHost,
  },
  contractsApi: {
    host: (import.meta.env.VITE_CONTRACTS_API_HOST as string | undefined) ?? defaultContractsApiHost,
    defaultApiHost: defaultContractsApiHost,
  },
  marketingApi: {
    host: (import.meta.env.VITE_MARKETING_API_HOST as string | undefined) ?? defaultMarketingApiHost,
    defaultApiHost: defaultMarketingApiHost,
  },
  neo: {
    marketingAddr: (import.meta.env.VITE_NEO_MARKETING_ADDR as string | undefined) ?? defaultNeoMarketingAddr,
  },
  profile: {
    forcedLogin: (import.meta.env.VITE_FORCED_PROFILE_LOGIN as string | undefined) ?? defaultForcedProfileLogin,
  },
} as const;
