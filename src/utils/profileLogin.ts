export const PROFILE_LOGIN_MIN_LENGTH = 4;
export const PROFILE_LOGIN_MAX_LENGTH = 20;
export const PROFILE_LOGIN_PATTERN =
  "[a-z0-9](?:[a-z0-9-]{2,18}[a-z0-9])";

const PROFILE_LOGIN_REGEX = /^[a-z0-9](?:[a-z0-9-]{2,18}[a-z0-9])$/;

export function isValidProfileLogin(login: string): boolean {
  return PROFILE_LOGIN_REGEX.test(login.trim());
}
