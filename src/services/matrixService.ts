import { Address } from "@ton/core";
import { ErrorCode } from "../errors/ErrorCodes";
import type { Profile } from "../utils/profileStorage";

export type MatrixPlace = {
  id: number;
  place_number: number;
  created_at: number;
  fill_count: number;
  clone: number; // 1 means clone
  login: string;
  index: string;
  address: Address;
};

export type PaginatedPlaces = {
  items: MatrixPlace[];
  page: number;
  totalPages: number;
};

export type BuyPlaceResult =
  | { success: true }
  | { success: false; errors: ErrorCode[] };


const loginPool = [
  "alice",
  "bob",
  "carol",
  "dave",
  "eve",
  "frank",
  "gloria",
  "henry",
  "irene",
  "jack",
  "karen",
  "larry",
  "maria",
  "nancy",
  "oliver",
  "paul",
  "quinn",
  "rachel",
  "steve",
  "tina",
  "ursula",
  "victor",
  "wendy",
  "yuri",
  "zoe",
];

const delay = async (min = 300, max = 900) => {
  const duration = min + Math.random() * (max - min);
  return new Promise((resolve) => setTimeout(resolve, duration));
};

const generatePlaces = (matrixId: number): MatrixPlace[] => {
  const hasPlaces = Math.random() >= 0.5;
  if (!hasPlaces) return [];

  const baseCount = 5 + (matrixId % 4);
  const count = baseCount + Math.floor(Math.random() * 10); // 5-14+ depending on matrix

  return Array.from({ length: count }, (_, idx) => {
    const id = idx + 1;
    const login = loginPool[Math.floor(Math.random() * loginPool.length)];
    const now = new Date();
    now.setDate(now.getDate() - Math.floor((id + matrixId) / 6));
    now.setHours(9 + ((id + matrixId) % 8), (id * 7) % 60, (id * 13) % 60, 0);
    return {
      id,
      place_number: id,
      created_at: now.getTime(),
      fill_count: (id + matrixId) % 7,
      clone: (id + matrixId) % 3 === 0 ? 1 : 0,
      login,
      index: `${login}${id}`,
      address: Address.parse(`0:${id.toString(16).padStart(64, "0")}`),
    };
  });
};

const resolveAddress = (profile?: Profile | null): Address | null => {
  if (!profile?.wallet) return null;
  try {
    return Address.parse(profile.wallet);
  } catch (err) {
    console.warn("Invalid profile wallet address", err);
    return null;
  }
};

export async function getRootPlace(m: number, profile: Profile): Promise<MatrixPlace | null> {
  await delay();
  const places = generatePlaces(m);
  return places[0] ?? null;
}

export async function getNextPos(m: number, profile: Profile): Promise<MatrixPlace | null> {
  await delay();
  const places = generatePlaces(m);
  return places[1] ?? null;
}

export async function fetchPlaces(
  m: number,
  profile: Profile,
  page = 1,
  pageSize = 50
): Promise<PaginatedPlaces> {
  await delay();
  const all = generatePlaces(m);
  const start = Math.max(0, (page - 1) * pageSize);
  const end = start + pageSize;
  const items = all.slice(start, end);
  const totalPages = Math.max(1, Math.ceil(all.length / pageSize));
  return { items, page, totalPages };
}

export async function fetchLocks(
  m: number,
  profile: Profile,
  page = 1,
  pageSize = 50
): Promise<PaginatedPlaces> {
  return fetchPlaces(m, profile, page, pageSize);
}

export async function searchPlaces(
  m: number,
  profile: Profile,
  loginQuery: string,
  page = 1,
  pageSize = 50
): Promise<PaginatedPlaces> {
  const query = loginQuery.trim().toLowerCase();
  await delay();
  const all = generatePlaces(m).filter((place) =>
    query ? place.login.toLowerCase().includes(query) : true
  );
  const start = Math.max(0, (page - 1) * pageSize);
  const end = start + pageSize;
  const items = all.slice(start, end);
  const totalPages = Math.max(1, Math.ceil(all.length / pageSize));
  return { items, page, totalPages };
}

export async function buyPlace(
  m: number,
  profile: Profile
): Promise<BuyPlaceResult> {
  const address = resolveAddress(profile);
  if (!address) {
    return { success: false, errors: [ErrorCode.UNAUTHORIZED] };
  }

  await delay(2500, 3500);

  const outcomes: ErrorCode[] = [
    ErrorCode.INVALID_PAYLOAD,
    ErrorCode.UNAUTHORIZED,
    ErrorCode.INSUFFICIENT_FUNDS,
    ErrorCode.FORBIDDEN,
    ErrorCode.NOT_FOUND,
    ErrorCode.INVALID_WORKCHAIN,
  ];

  // 70% success chance
  const roll = Math.random();
  if (roll < 0.7) {
    return { success: true };
  }

  const error = outcomes[Math.floor(Math.random() * outcomes.length)];
  return { success: false, errors: [error] };
}
