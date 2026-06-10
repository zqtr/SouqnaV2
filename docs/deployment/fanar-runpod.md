# Fanar RunPod Deployment

This runbook deploys `QCRI/Fanar-1-9B-Instruct` on the current RunPod PyTorch pod
and exposes it as the private OpenAI-compatible endpoint used by Souqna.

## Target

- Model: `QCRI/Fanar-1-9B-Instruct`
- Runtime: vLLM OpenAI-compatible server
- Internal port: `8000`
- Souqna env: `FANAR_API_URL`, `FANAR_API_KEY`, optional `FANAR_MODEL`
- Scope: Souqy Chat and Arabic-first founder support only

Fanar must not be used for code generation, Builder architecture decisions,
storefront generation, TypeScript generation, or design-system reasoning. Those
remain GPT-backed.

## RunPod Setup

In the RunPod pod shell:

```bash
cd /workspace
python -m venv /workspace/fanar-venv
source /workspace/fanar-venv/bin/activate
python -m pip install -U pip uv
uv pip install vllm --torch-backend=auto
uv pip install -U huggingface_hub
```

Authenticate Hugging Face. Use a read token from the Hugging Face account that
has access to the model:

```bash
export HF_TOKEN=REPLACE_ME
hf auth login --token "$HF_TOKEN" --add-to-git-credential
```

Download the model into the persistent volume cache:

```bash
export HF_HOME=/workspace/.cache/huggingface
export MODEL_ID=QCRI/Fanar-1-9B-Instruct
hf download "$MODEL_ID"
```

Create the vLLM API key. This same value becomes `FANAR_API_KEY` in Souqna:

```bash
export FANAR_API_KEY=REPLACE_ME rand -hex 32)"
printf '%s\n' "$FANAR_API_KEY" > /workspace/fanar-api-key.txt
chmod 600 /workspace/fanar-api-key.txt
```

Start vLLM:

```bash
source /workspace/fanar-venv/bin/activate
export HF_HOME=/workspace/.cache/huggingface
export MODEL_ID=QCRI/Fanar-1-9B-Instruct
export FANAR_API_KEY=REPLACE_ME /workspace/fanar-api-key.txt)"

nohup vllm serve "$MODEL_ID" \
  --host 0.0.0.0 \
  --port 8000 \
  --api-key "$FANAR_API_KEY" \
  --dtype auto \
  --max-model-len 4096 \
  --gpu-memory-utilization 0.90 \
  > /workspace/fanar-vllm.log 2>&1 &
```

Watch startup:

```bash
tail -f /workspace/fanar-vllm.log
```

## Expose Port

In the RunPod pod settings, add `8000` to exposed HTTP ports. The public proxy
URL format is:

```text
https://<pod-id>-8000.proxy.runpod.net
```

Set Souqna to the `/v1` base URL:

```text
FANAR_API_URL=https://<pod-id>-8000.proxy.runpod.net/v1
FANAR_API_KEY=REPLACE_ME of /workspace/fanar-api-key.txt>
FANAR_MODEL=QCRI/Fanar-1-9B-Instruct
```

Set these in Vercel for the main Souqna app. If CranL is deployed separately,
set the same values in the CranL runtime environment.

## Verification

Health:

```bash
curl "https://<pod-id>-8000.proxy.runpod.net/health"
```

Chat completion:

```bash
curl "https://<pod-id>-8000.proxy.runpod.net/v1/chat/completions" \
  -H "Authorization: Bearer $FANAR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "QCRI/Fanar-1-9B-Instruct",
    "messages": [
      {
        "role": "user",
        "content": "اكتب وصفا قصيرا لمنتج عطور فاخر باللهجة الخليجية."
      }
    ],
    "temperature": 0.4,
    "max_tokens": 160
  }'
```

Souqna app verification:

1. Restart the Vercel deployment or local server after setting env vars.
2. Ask Souqy Chat an Arabic founder-support question.
3. Confirm the answer is generated and no Builder/storefront/code-generation
   routes have been moved to Fanar.

## Operational Notes

- Bind vLLM to `0.0.0.0`; binding to `127.0.0.1` will fail behind the RunPod
  proxy.
- The RunPod HTTP proxy is public, so keep `--api-key` enabled and store the key
  only in server-side environments.
- The RunPod HTTP proxy has a 100-second upstream timeout. Keep Souqy Chat
  completions short and use lower `max_tokens` for UI paths.
- Keep Hugging Face caches and the virtual environment under `/workspace` so
  they survive pod restarts on the persistent volume.

## References

- vLLM GPU installation: https://docs.vllm.ai/en/latest/getting_started/installation/gpu/
- vLLM OpenAI-compatible server: https://docs.vllm.ai/en/latest/serving/online_serving/openai_compatible_server/
- vLLM on RunPod: https://docs.vllm.ai/en/v0.19.1/deployment/frameworks/runpod/
- RunPod exposed HTTP ports: https://docs.runpod.io/pods/configuration/expose-ports
- Hugging Face CLI authentication: https://huggingface.co/docs/huggingface_hub/en/package_reference/authentication
- Fanar model card: https://huggingface.co/QCRI/Fanar-1-9B-Instruct
