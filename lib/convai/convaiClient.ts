/**
 * Convai client per ZenkAI.
 * L'API key viene recuperata in modo sicuro da /api/convai/token (server-side).
 */

import { ConvaiClient } from 'convai-web-sdk';
import type { ConvaiClientParams } from 'convai-web-sdk';

const TOKEN_URL = '/api/convai/token';

export interface ConvaiTokenResponse {
  apiKey: string;
}

/**
 * Recupera l'API key Convai: prima da .env (NEXT_PUBLIC_CONVAI_API_KEY), altrimenti dal backend /api/convai/token.
 */
export async function getConvaiApiKey(): Promise<string> {
  const envKey =
    typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_CONVAI_API_KEY : undefined;
  if (envKey && envKey.trim() && envKey !== 'tuo_codice') {
    return envKey.trim();
  }
  const res = await fetch(TOKEN_URL);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || 'Token Convai non disponibile');
  }
  const data = (await res.json()) as ConvaiTokenResponse;
  if (!data.apiKey) throw new Error('API key Convai mancante');
  return data.apiKey;
}

export interface CreateConvaiClientOptions {
  characterId: string;
  languageCode?: string;
  enableAudio?: boolean;
  sessionId?: string;
}

/**
 * Crea e restituisce un ConvaiClient inizializzato con token dal server.
 * Usare characterId dall'avatar (CONVAI_CHARACTER_ID salvato in creazione avatar).
 */
export async function createConvaiClient(options: CreateConvaiClientOptions): Promise<ConvaiClient> {
  const apiKey = await getConvaiApiKey();
  const params: ConvaiClientParams = {
    apiKey,
    characterId: options.characterId,
    enableAudio: options.enableAudio ?? true,
    languageCode: options.languageCode ?? 'it-IT',
    sessionId: options.sessionId ?? `zenkai-${Date.now()}`,
  };
  return new ConvaiClient(params);
}
