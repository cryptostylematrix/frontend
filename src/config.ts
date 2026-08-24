const defaultApiHost = "https://cs.apihub160.cc";
//const defaultApiHost = "http://localhost:5004";
const defaultContractsApiHost = defaultApiHost;
const defaultProgramApiHost = defaultApiHost;
const defaultUiApiHost = defaultApiHost;
const defaultTonEndpoint = "https://toncenter.com/api/v2/jsonRPC";
const defaultAvailableTestProgramWalletAddresses = [
  "UQCOD8EI4RWZZtOr3IGvBsVHorV19JEhtQntSWaQhvba0VKA",
  "UQDWII85XpIkfMwcfPJLIREdERsmRjO0SN42rApw8jaNKCwx",
  "UQCKN1sf6RGcvGIzohLwPz49T6X4s8H7RWtYKYbs7ent0gvY"
];
const configuredAvailableTestProgramWalletAddresses = import.meta.env
  .VITE_AVAILABLE_TEST_PROGRAM_WALLETS as string | undefined;
const availableTestProgramWalletAddresses =
  configuredAvailableTestProgramWalletAddresses === undefined
    ? defaultAvailableTestProgramWalletAddresses
    : configuredAvailableTestProgramWalletAddresses
        .split(",")
        .map((address) => address.trim())
        .filter(Boolean);
const seriesItemBaseCodeHex = "b5ee9c724101060100a3000114ff00f4a413f4bcf2c80b01020162020300ded020c700915be001d0d3030171b0915be0fa4030ed44d0fa40d31fd31fd15b02d31f0101d33f011230208210a11cdbe3ba8e1e3002c705f2e191d307d4d1218020b0f2d190821005f5e10072fb0201fb00e0821053c57870ba9e02c705f2e191d4d4d101fb04ed54e05f03840ff2f00201200405000bbe0c838b81040021bf16d76a2687d20698fe98fe8b82a9036c7dd92240";
export const appConfig = {
  contractsApi: {
    host: (import.meta.env.VITE_CONTRACTS_API_HOST as string | undefined) ?? defaultContractsApiHost,
    defaultApiHost: defaultContractsApiHost,
  },
  programApi: {
    host: (import.meta.env.VITE_PROGRAM_API_HOST as string | undefined) ?? defaultProgramApiHost,
    defaultApiHost: defaultProgramApiHost,
  },
  uiApi: {
    host: (import.meta.env.VITE_UI_API_HOST as string | undefined) ?? defaultUiApiHost,
    defaultApiHost: defaultUiApiHost,
  },
  availableTestPrograms: {
    walletAddresses: availableTestProgramWalletAddresses,
  },
  ton: {
    endpoint: (import.meta.env.VITE_TON_ENDPOINT as string | undefined) ?? defaultTonEndpoint,
    apiKey: (import.meta.env.VITE_TON_API_KEY as string | undefined) ?? "",
    admin: {
      dev: (import.meta.env.VITE_TON_ADMIN_DEV as string | undefined) ?? "UQC7cwZGi0aL4yENYrrDLCP1m0W0hiGdUjt2SiSaCtNj6aFo",
      prod: (import.meta.env.VITE_TON_ADMIN_PROD as string | undefined) ?? "",
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
} as const;
