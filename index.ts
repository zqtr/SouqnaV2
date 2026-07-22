import { config } from 'dotenv';
import { streamText } from 'ai';

config({ path: '.env.local', quiet: true });

async function main(): Promise<void> {
  if (!process.env.AI_GATEWAY_API_KEY && !process.env.VERCEL_OIDC_TOKEN) {
    throw new Error(
      'Set AI_GATEWAY_API_KEY in .env.local or refresh VERCEL_OIDC_TOKEN before running this smoke test.',
    );
  }

  let streamError: unknown;
  const result = streamText({
    model: 'openai/gpt-5.4',
    prompt: 'Reply with exactly: AI Gateway streaming verified.',
    maxOutputTokens: 40,
    onError({ error }) {
      streamError = error;
    },
  });

  for await (const textPart of result.textStream) {
    process.stdout.write(textPart);
  }
  process.stdout.write('\n');

  if (streamError) {
    throw streamError;
  }

  const usage = await result.usage;
  process.stdout.write(
    `${JSON.stringify(
      {
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        totalTokens: usage.totalTokens,
      },
      null,
      2,
    )}\n`,
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`AI Gateway smoke test failed: ${message}\n`);
  process.exitCode = 1;
});
