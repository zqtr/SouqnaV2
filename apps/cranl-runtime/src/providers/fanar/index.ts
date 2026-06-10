import axios from 'axios';
import { env } from '../../config';
import type { AiChatJob } from '../../jobs/types';
import type { CranlProvider, ProviderResult } from '../types';

const FANAR_MODEL_PREFIX = 'QCRI/Fanar-';

function resolveModel(job: AiChatJob): string {
  const model = job.model ?? env.FANAR_MODEL;
  if (!model.startsWith(FANAR_MODEL_PREFIX)) {
    throw new Error(`Fanar provider only accepts ${FANAR_MODEL_PREFIX} models.`);
  }
  return model;
}

function resolveBaseUrl(): string {
  if (!env.FANAR_API_URL) {
    throw new Error('FANAR_API_URL is not configured.');
  }

  const clean = env.FANAR_API_URL.replace(/\/+$/u, '');
  if (clean.endsWith('/v1/chat/completions')) {
    return clean.slice(0, -'/chat/completions'.length);
  }
  if (clean.endsWith('/v1')) return clean;
  return `${clean}/v1`;
}

function authHeaders() {
  if (!env.FANAR_API_KEY) {
    throw new Error('FANAR_API_KEY is not configured.');
  }

  return {
    Authorization: `Bearer ${env.FANAR_API_KEY}`,
    'Content-Type': 'application/json',
  };
}

export const fanarProvider: CranlProvider = {
  name: 'fanar',
  async chat(job: AiChatJob): Promise<ProviderResult> {
    const model = resolveModel(job);
    const client = axios.create({
      baseURL: resolveBaseUrl(),
      timeout: 120_000,
    });
    const response = await client.post(
      '/chat/completions',
      {
        model,
        messages: job.messages,
        temperature: job.temperature,
        stream: false,
      },
      { headers: authHeaders() },
    );

    return {
      provider: 'fanar',
      model,
      output: response.data,
    };
  },
};
