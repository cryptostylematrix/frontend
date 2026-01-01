export const normalizeImage = (value?: string | null): string => {
  const lower = value?.trim().toLowerCase();
  return lower && lower !== "" ? lower : "https://cryptostylematrix.github.io/frontend/cs-big.png";
};

export const capitalize = (str?: string | null): string | undefined => {
  if (!str?.trim()) return undefined;
  const t = str.trim();
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
};

export const toLower = (str?: string | null): string | undefined => {
  return str?.trim() ? str.trim().toLowerCase() : undefined;
};
