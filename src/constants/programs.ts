export const Programs = {
  multi: 0x1ce8c484,
} as const;

export type ProgramCode = (typeof Programs)[keyof typeof Programs];
