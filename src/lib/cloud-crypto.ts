"use client";

import type { TaxWorkspace } from "@/lib/workspace-types";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => (binary += String.fromCharCode(byte)));
  return btoa(binary);
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function randomReadableKey(length = 32) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

export function generateCloudOwnerToken() {
  return randomReadableKey(40);
}

function generateRecoveryKey() {
  return randomReadableKey(32);
}

async function deriveKey(recoveryKey: string, salt: Uint8Array) {
  const material = await crypto.subtle.importKey("raw", encoder.encode(recoveryKey), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: 250000, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptWorkspace(workspace: TaxWorkspace, recoveryKey = generateRecoveryKey()) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(recoveryKey, salt);
  const plaintext = encoder.encode(JSON.stringify(workspace));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);
  return {
    recoveryKey,
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
    iv: bytesToBase64(iv),
    salt: bytesToBase64(salt),
  };
}

export async function decryptWorkspace(payload: { ciphertext: string; iv: string; salt: string }, recoveryKey: string) {
  const iv = base64ToBytes(payload.iv);
  const salt = base64ToBytes(payload.salt);
  const key = await deriveKey(recoveryKey, salt);
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, base64ToBytes(payload.ciphertext));
  return JSON.parse(decoder.decode(plaintext)) as TaxWorkspace;
}
