/**
 * Configurazione Convai letta da .env.local (root del progetto, stessa cartella di package.json).
 * Next.js espone solo variabili NEXT_PUBLIC_* al client; assicurati che .env.local sia nella root.
 */

export function getConvaiApiKeyFromEnv(): string | undefined {
  if (typeof process === 'undefined') return undefined;
  const key = process.env.NEXT_PUBLIC_CONVAI_API_KEY;
  if (!key || !key.trim() || key.trim() === 'tuo_codice') return undefined;
  return key.trim();
}

export function getConvaiCharacterIdFromEnv(): string | undefined {
  if (typeof process === 'undefined') return undefined;
  const id = process.env.NEXT_PUBLIC_CONVAI_CHARACTER_ID;
  if (!id || !id.trim() || id.trim() === 'id_regus') return undefined;
  return id.trim();
}
