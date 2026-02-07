/**
 * Convai client per ZenkAI.
 * API key: .env.local in root (NEXT_PUBLIC_CONVAI_API_KEY) oppure /api/convai/token.
 */

import { ConvaiClient } from 'convai-web-sdk';
import type { ConvaiClientParams } from 'convai-web-sdk';
import { getConvaiApiKeyFromEnv } from './config';

const TOKEN_URL = '/api/convai/token';

export interface ConvaiTokenResponse {
  apiKey: string;
}

/**
 * Recupera l'API key Convai: prima da lib/convai/config (legge .env.local in root), altrimenti dal backend /api/convai/token.
 */
export async function getConvaiApiKey(): Promise<string> {
  const envKey = getConvaiApiKeyFromEnv();
  if (envKey) return envKey;
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
