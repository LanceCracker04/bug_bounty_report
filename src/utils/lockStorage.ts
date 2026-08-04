import type { LockSettings } from "../types/phase6";
import {
  DEFAULT_LOCK_SETTINGS,
  loadLockSettings,
  saveLockSettings,
} from "./phase6Storage";

const encoder = new TextEncoder();
function toBase64(bytes: Uint8Array): string {
  let result = "";
  bytes.forEach((value) => {
    result += String.fromCharCode(value);
  });
  return btoa(result);
}
function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let index = 0; index < binary.length; index += 1)
    bytes[index] = binary.charCodeAt(index);
  return bytes;
}
function buffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}
async function verifier(
  passphrase: string,
  salt: Uint8Array,
  iterations: number,
): Promise<string> {
  const material = await crypto.subtle.importKey(
    "raw",
    encoder.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: buffer(salt), iterations },
    material,
    256,
  );
  return toBase64(new Uint8Array(bits));
}
export { loadLockSettings, saveLockSettings, DEFAULT_LOCK_SETTINGS };
export async function configureWorkspaceLock(
  passphrase: string,
  settings: Omit<
    LockSettings,
    "salt" | "verifier" | "iterations" | "updatedAt"
  >,
): Promise<LockSettings> {
  if (passphrase.length < 8)
    throw new Error("Use a workspace passphrase with at least 8 characters.");
  const salt = crypto.getRandomValues(new Uint8Array(new ArrayBuffer(16)));
  const iterations = 310_000;
  const next: LockSettings = {
    ...settings,
    enabled: true,
    salt: toBase64(salt),
    verifier: await verifier(passphrase, salt, iterations),
    iterations,
    updatedAt: new Date().toISOString(),
  };
  saveLockSettings(next);
  return next;
}
export async function verifyWorkspacePassphrase(
  passphrase: string,
  settings = loadLockSettings(),
): Promise<boolean> {
  if (
    !settings.enabled ||
    !settings.salt ||
    !settings.verifier ||
    !settings.iterations
  )
    return false;
  try {
    return (
      (await verifier(
        passphrase,
        fromBase64(settings.salt),
        settings.iterations,
      )) === settings.verifier
    );
  } catch {
    return false;
  }
}
export function disableWorkspaceLock(): void {
  saveLockSettings({
    ...DEFAULT_LOCK_SETTINGS,
    updatedAt: new Date().toISOString(),
  });
}
