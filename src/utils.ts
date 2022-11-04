import { number, shortString } from "starknet";

export function stringToFelt(text: string) {
  return number.toFelt(shortString.encodeShortString(text))
} 