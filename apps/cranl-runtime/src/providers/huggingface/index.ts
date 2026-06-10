import axios from 'axios';
import { env } from '../../config';
import type { AiChatJob, ImageGenerationJob } from '../../jobs/types';
import type { CranlProvider, ProviderResult } from '../types';

const DEFAULT_IMAGE_MODEL = 'black-forest-labs/FLUX.1-schnell';
const HUGGINGFACE_ROUTER_CHAT_BASE_URL = 'https://router.huggingface.co/v1';
const FANAR_MODEL_PREFIX = 'QCRI/Fanar-';

const huggingface = axios.create({
  baseURL: 'https://api-inference.huggingface.co',
  timeout: 120_000,
});

function authHeaders() {
  const token = env.HUGGINGFACE_API_KEY ?? env.HF_TOKEN;
  if (!token) {
    throw new Error('HUGGINGFACE_API_KEY or HF_TOKEN is not configured.');
  }

  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

function cleanBaseUrl(value: string): string {
  return value.replace(/\/+$/u, '');
}

function allowedChatModels(): Set<string> {
  return new Set(
    env.HUGGINGFACE_ALLOWED_CHAT_MODELS.split(',')
      .map((model) => model.trim())
      .filter(Boolean),
  );
}

function resolveChatModel(job: AiChatJob): string {
  const model = job.model ?? env.HUGGINGFACE_CHAT_MODEL;
  if (!allowedChatModels().has(model)) {
    throw new Error(
      `Hugging Face chat model "${model}" is not allowed. Add it to HUGGINGFACE_ALLOWED_CHAT_MODELS before use.`,
    );
  }
  return model;
}

function resolveChatBaseUrl(model: string): string {
  if (env.HUGGINGFACE_CHAT_BASE_URL) {
    return cleanBaseUrl(env.HUGGINGFACE_CHAT_BASE_URL);
  }

  if (model.startsWith(FANAR_MODEL_PREFIX)) {
    throw new Error(
      'HUGGINGFACE_CHAT_BASE_URL is required for Fanar chat. Configure a dedicated Hugging Face Inference Endpoint ending in /v1.',
    );
  }

  return HUGGINGFACE_ROUTER_CHAT_BASE_URL;
}

export const huggingfaceProvider: CranlProvider = {
  name: 'huggingface',
  async generateImage(job: ImageGenerationJob): Promise<ProviderResult> {
    const model = job.model ?? DEFAULT_IMAGE_MODEL;
    const response = await huggingface.post(
      `/models/${model}`,
      {
        inputs: job.prompt,
        parameters: {
          size: job.size,
          num_images_per_prompt: job.count,
        },
      },
      { headers: authHeaders(), responseType: 'arraybuffer' },
    );

    return {
      provider: 'huggingface',
      model,
      output: {
        contentType: response.headers['content-type'],
        bytes: Buffer.from(response.data).toString('base64'),
      },
    };
  },
  async chat(job: AiChatJob): Promise<ProviderResult> {
    const model = resolveChatModel(job);
    const chat = axios.create({
      baseURL: resolveChatBaseUrl(model),
      timeout: 120_000,
    });
    const response = await chat.post(
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
      provider: 'huggingface',
      model,
      output: response.data,
    };
  },
};
