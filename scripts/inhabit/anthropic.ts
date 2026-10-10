// The one real model client: the Anthropic Messages API through the official SDK. Lives in scripts/, not src/: the simulation and
// the agent modules have no network code. The key comes from the environment (ANTHROPIC_API_KEY) or an `ant auth login` profile.
import Anthropic from '@anthropic-ai/sdk';
import type { ModelClient } from '../../src/agent/model';

export interface AnthropicOptions {
  model: string;
  /** how hard the model thinks about each decision; the default on the current models is medium */
  effort: 'low' | 'medium' | 'high';
}

function describe(e: unknown): string {
  if (e instanceof Anthropic.RateLimitError) return `rate limited (${e.status})`;
  if (e instanceof Anthropic.AuthenticationError) return 'authentication failed: check ANTHROPIC_API_KEY';
  if (e instanceof Anthropic.BadRequestError) return `bad request: ${e.message}`;
  if (e instanceof Anthropic.APIConnectionError) return `connection error: ${e.message}`;
  if (e instanceof Anthropic.APIError) return `API error ${e.status}: ${e.message}`;
  return e instanceof Error ? e.message : String(e);
}

export function anthropicModel(opts: AnthropicOptions): ModelClient {
  const client = new Anthropic();
  return {
    id: opts.model,
    kind: 'api',
    config: { api: 'anthropic', effort: opts.effort },
    async complete(req, signal) {
      let res: Anthropic.Message;
      try {
        res = await client.messages.create(
          {
            model: opts.model,
            max_tokens: req.maxOutputTokens,
            system: [{ type: 'text', text: req.system, cache_control: { type: 'ephemeral' } }],
            messages: [{ role: 'user', content: req.user }],
            output_config: { effort: opts.effort },
          },
          { signal },
        );
      } catch (e) {
        throw new Error(describe(e));
      }
      // a decline or a cut-off answer is a failed call: the engine chooses, and the transcript says why
      if (res.stop_reason === 'refusal') {
        const details = (res as unknown as { stop_details?: { category?: string | null } }).stop_details;
        throw new Error(`the model declined to answer${details?.category ? ` (${details.category})` : ''}`);
      }
      if (res.stop_reason === 'max_tokens') throw new Error(`the answer was cut off at ${req.maxOutputTokens} tokens`);
      const text = res.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('');
      return { text, usage: { input: res.usage.input_tokens, output: res.usage.output_tokens }, stop: res.stop_reason ?? undefined };
    },
  };
}
