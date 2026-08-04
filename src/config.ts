//const defaultMatrixApiHost = "https://cs.apihub160.cc";
const defaultMatrixApiHost = "http://localhost:5004";
const defaultContractsApiHost = defaultMatrixApiHost;
const defaultMarketingApiHost = defaultMatrixApiHost;
const defaultProgramApiHost = defaultMatrixApiHost;
const defaultNeoMarketingAddr = "EQAc4cKpE4yQpsadUsem6r30HHjjrmmtT13pPsRpvtLSEUHi";
const defaultTonEndpoint = "https://toncenter.com/api/v2/jsonRPC";
const seriesItemBaseCodeHex = "b5ee9c724101060100a3000114ff00f4a413f4bcf2c80b01020162020300ded020c700915be001d0d3030171b0915be0fa4030ed44d0fa40d31fd31fd15b02d31f0101d33f011230208210a11cdbe3ba8e1e3002c705f2e191d307d4d1218020b0f2d190821005f5e10072fb0201fb00e0821053c57870ba9e02c705f2e191d4d4d101fb04ed54e05f03840ff2f00201200405000bbe0c838b81040021bf16d76a2687d20698fe98fe8b82a9036c7dd92240";
const availableTestProgramsLogins: readonly string[] = [
  "andrey", "admin", "cryptocash"
];

const defaultForcedProfileLogin = "";
//const defaultForcedProfileLogin = "cryptocash";

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
  programApi: {
    host: (import.meta.env.VITE_PROGRAM_API_HOST as string | undefined) ?? defaultProgramApiHost,
    defaultApiHost: defaultProgramApiHost,
  },
  profile: {
    forcedLogin: (import.meta.env.VITE_FORCED_PROFILE_LOGIN as string | undefined) ?? defaultForcedProfileLogin,
  },
  ton: {
    endpoint: (import.meta.env.VITE_TON_ENDPOINT as string | undefined) ?? defaultTonEndpoint,
    apiKey: (import.meta.env.VITE_TON_API_KEY as string | undefined) ?? "",
    admin: {
      dev: (import.meta.env.VITE_TON_ADMIN_DEV as string | undefined) ?? "UQC7cwZGi0aL4yENYrrDLCP1m0W0hiGdUjt2SiSaCtNj6aFo",
      prod: (import.meta.env.VITE_TON_ADMIN_PROD as string | undefined) ?? "",
    },
    neo: {
      marketingAddr: (import.meta.env.VITE_NEO_MARKETING_ADDR as string | undefined) ?? defaultNeoMarketingAddr,
    },
    seriesItemBaseCodeHex,
    series: {
      marketing: {
        depth: 3,
      },
      systemPlacesPool: {
        depth: 1,
      },
      jettonPool: {
        depth: 1,
      },
    },
  },
  availableTestPrograms: {
    logins: availableTestProgramsLogins,
  },
} as const;
