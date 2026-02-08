/**
 * Convai client per ZenkAI.
 * API key: .env.local in root (NEXT_PUBLIC_CONVAI_API_KEY) oppure /api/convai/token.
 */

import { ConvaiClient } from 'convai-web-sdk';
import type { ConvaiClientParams } from 'convai-web-sdk';

const TOKEN_URL = '/api/convai/token';

export interface ConvaiTokenResponse {
  apiKey: string;
}

function trimKey(value: string | undefined): string | undefined {
  if (value == null || value === '') return undefined;
  const t = String(value).trim();
  if (!t || t === 'tuo_codice') return undefined;
  return t;
}

/**
 * Recupera l'API key Convai nell'ordine: NEXT_PUBLIC_CONVAI_API_KEY, poi CONVAI_API_KEY, infine /api/convai/token.
 * Nessun valore hardcoded: solo env o token endpoint.
 */
export async function getConvaiApiKey(): Promise<string> {
  const withPrefix = trimKey(process.env.NEXT_PUBLIC_CONVAI_API_KEY);
  const withoutPrefix = typeof process !== 'undefined' ? trimKey(process.env.CONVAI_API_KEY) : undefined;

  const envKey = withPrefix ?? withoutPrefix;
  if (envKey) {
    console.log('[Convai] API key da variabile d\'ambiente (lunghezza', envKey.length, ')');
    return envKey;
  }

  console.warn('[Convai] Nessuna chiave in env; tentativo /api/convai/token');
  const res = await fetch(TOKEN_URL);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || 'Token Convai non disponibile');
  }
  const data = (await res.json()) as ConvaiTokenResponse;
  if (!data.apiKey) throw new Error('API key Convai mancante');
  console.log('[Convai] API key da endpoint token (lunghezza', data.apiKey.length, ')');
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
    speaker: 'User',
    enableAudio: options.enableAudio ?? true,
    languageCode: options.languageCode ?? 'it-IT',
    sessionId: options.sessionId ?? `zenkai-${Date.now()}`,
  };
  console.log('[Convai] Creazione client per characterId:', options.characterId, 'sessionId:', params.sessionId);
  return new ConvaiClient(params);
}
