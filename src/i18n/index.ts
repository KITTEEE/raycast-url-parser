import { en } from "./en";
import { zh } from "./zh";

export type Strings = typeof en;

export function getStrings(locale?: string): Strings {
  const l = locale ?? Intl.DateTimeFormat().resolvedOptions().locale;
  return l.startsWith("zh") ? zh : en;
}
