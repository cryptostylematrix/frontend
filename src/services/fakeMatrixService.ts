import { Address } from "@ton/core";
import {
  type MatrixPlace,
  type PaginatedPlaces,
  type TreeFilledNode,
  type TreeNode,
  type MatrixService,
} from "./matrixService";

const fallbackImage = "https://cryptostylematrix.github.io/frontend/cs-big.png";

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

const generatePlaces = (m: number): MatrixPlace[] => {
  const hasPlaces = Math.random() >= 0.5;
  if (!hasPlaces) return [];

  const baseCount = 5 + (m % 4);
  const count = baseCount + Math.floor(Math.random() * 10); // 5-14+ depending on matrix

  return Array.from({ length: count }, (_, idx) => {
    const id = idx + 1;
    const login = loginPool[Math.floor(Math.random() * loginPool.length)];
    const now = new Date();
    now.setDate(now.getDate() - Math.floor((id + m) / 6));
    now.setHours(9 + ((id + m) % 8), (id * 7) % 60, (id * 13) % 60, 0);
    return {
      address: Address.parse(`0:${id.toString(16).padStart(64, "0")}`).toString(),
      parent_address: id > 1 ? Address.parse(`0:${Math.floor(id / 2).toString(16).padStart(64, "0")}`).toString() : null,
      place_number: id,
      created_at: now.getTime(),
      fill_count: (id + m) % 7,
      clone: (id + m) % 3 === 0 ? 1 : 0,
      login,
      index: `${login}${id}`,

    };
  });
};

export async function getRootPlace(m: number, profile_addr: string): Promise<MatrixPlace | null> {
  await delay();
  if (!profile_addr) return null;

  const places = generatePlaces(m);
  return places[0] ?? null;
}

export async function getPlacesCount(m: number, profile_addr: string): Promise<number> {
  await delay();
  if (!profile_addr) return 0;
  return generatePlaces(m).length;
}

export async function getNextPos(m: number, profile_addr: string): Promise<MatrixPlace | null> {
  await delay();
  if (!profile_addr) return null;

  const places = generatePlaces(m);
  return places[1] ?? null;
}

export async function getPath(root_addr: string, place_addr: string): Promise<MatrixPlace[] | null> {
  await delay();

  if (!root_addr) return null;
  if (!place_addr) return null;

  const randomM = Math.floor(Math.random() * 6) + 1; // 1..6
  const all = generatePlaces(randomM);
  return all.length ? all : null;
}

export async function fetchPlaces(m: number, profile_addr: string, page = 1, pageSize = 50): Promise<PaginatedPlaces> {
  await delay();
  if (!profile_addr) return { items: [], page: 1, totalPages: 1 };

  const all = generatePlaces(m);
  const start = Math.max(0, (page - 1) * pageSize);
  const end = start + pageSize;
  const items = all.slice(start, end);
  const totalPages = Math.max(1, Math.ceil(all.length / pageSize));
  return { items, page, totalPages };
}

export async function getMatrix(place_addr: string, profile_addr: string): Promise<TreeNode> {
  await delay();
  if (!place_addr?.trim() || !profile_addr?.trim()) return { kind: "empty", is_next_pos: true };

  const now = Math.floor(Date.now() / 1000);

  const leftGrandChildA: TreeFilledNode = {
    kind: "filled",
    locked: false,
    address: `${place_addr}-L1`,
    parent_address: `${place_addr}-L`,
    descendants: 0,
    place_number: 4,
    clone: 0,
    created_at: now - 7200,
    login: "gardenia",
    image_url: fallbackImage,
  };

  const rightGrandChildA: TreeFilledNode = {
    kind: "filled",
    locked: true,
    address: `${place_addr}-R1`,
    parent_address: `${place_addr}-R`,
    descendants: 0,
    place_number: 5,
    clone: 1,
    created_at: now - 1800,
    login: "solstice",
    image_url: "https://cryptostylematrix.github.io/frontend/cs.png",
  };

  const leftChild: TreeFilledNode = {
    kind: "filled",
    locked: false,
    address: `${place_addr}-L`,
    parent_address: place_addr,
    descendants: 2,
    place_number: 2,
    clone: 0,
    created_at: now - 5400,
    login: "aurora",
    image_url: fallbackImage,
    children: [leftGrandChildA, { kind: "empty", is_next_pos: true }],
  };

  const rightChild: TreeFilledNode = {
    kind: "filled",
    locked: false,
    address: `${place_addr}-R`,
    parent_address: place_addr,
    descendants: 1,
    place_number: 3,
    clone: 0,
    created_at: now - 3600,
    login: "nebula",
    image_url: fallbackImage,
    children: [rightGrandChildA, { kind: "empty", is_next_pos: false }],
  };

  return {
    kind: "filled",
    locked: false,
    address: place_addr,
    parent_address: "",
    descendants: 5,
    place_number: 1,
    clone: 0,
    created_at: now - 86400,
    login: "root_user",
    image_url: fallbackImage,
    children: [leftChild, rightChild],
  };
}

export async function fetchLocks(m: number, profile_addr: string, page = 1, pageSize = 50): Promise<PaginatedPlaces> {
  return fetchPlaces(m, profile_addr, page, pageSize);
}

export async function searchPlaces(m: number, profile_addr: string, query: string, page = 1, pageSize = 50): Promise<PaginatedPlaces> {
  query = query.trim().toLowerCase();
  await delay();
  if (!profile_addr) return { items: [], page: 1, totalPages: 1 };

  const all = generatePlaces(m).filter((place) =>
    query ? place.login.toLowerCase().includes(query) : true
  );
  const start = Math.max(0, (page - 1) * pageSize);
  const end = start + pageSize;
  const items = all.slice(start, end);
  const totalPages = Math.max(1, Math.ceil(all.length / pageSize));
  return { items, page, totalPages };
}

export const fakeMatrixService: MatrixService = {
  getRootPlace,
  getPlacesCount,
  getNextPos,
  getPath,
  fetchPlaces,
  fetchLocks,
  searchPlaces,
  getMatrix,
};
