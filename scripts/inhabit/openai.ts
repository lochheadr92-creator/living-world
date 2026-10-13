// The OpenAI client: Chat Completions through the official SDK. Lives in scripts/, not src/: the simulation and the agent modules
// have no network code. The key comes from the environment (OPENAI_API_KEY); OPENAI_BASE_URL, if set, points the SDK at a compatible
// endpoint. The answer is asked for as a JSON object (response_format), which the strict parser still checks.
import OpenAI from 'openai';
import { RetryableModelError } from '../../src/agent/model';
import type { ModelClient } from '../../src/agent/model';
import { retryAfterMs } from './transient';

export interface OpenAIOptions {
  model: string;
  /** reasoning effort, only for models that take it; left out, the model's default applies */
  effort?: 'none' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
}

/** the SDK's error as the gate should see it: the provider's refusals for the moment are retryable, the rest are failed calls */
function describe(e: unknown): Error {
  if (e instanceof OpenAI.RateLimitError) return new RetryableModelError(`rate limited (429): ${e.message}`, retryAfterMs(e));
  if (e instanceof OpenAI.AuthenticationError) return new Error('authentication failed: check OPENAI_API_KEY');
  if (e instanceof OpenAI.BadRequestError) return new Error(`bad request: ${e.message}`);
  if (e instanceof OpenAI.APIConnectionError) return new RetryableModelError(`connection error: ${e.message}`);
  if (e instanceof OpenAI.InternalServerError) return new RetryableModelError(`API error ${e.status}: ${e.message}`, retryAfterMs(e));
  if (e instanceof OpenAI.APIError) return new Error(`API error ${e.status}: ${e.message}`);
  return e instanceof Error ? e : new Error(String(e));
}

export function openaiModel(opts: OpenAIOptions): ModelClient {
  const client = new OpenAI();
  return {
    id: opts.model,
    kind: 'api',
    config: { api: 'openai', ...(opts.effort ? { effort: opts.effort } : {}) },
    async complete(req, signal) {
      let res: OpenAI.ChatCompletion;
      try {
        res = await client.chat.completions.create(
          {
            model: opts.model,
            messages: [
              { role: 'system', content: req.system },
              { role: 'user', content: req.user },
            ],
            max_completion_tokens: req.maxOutputTokens,
            response_format: { type: 'json_object' },
            ...(opts.effort ? { reasoning_effort: opts.effort } : {}),
          },
          { signal },
        );
      } catch (e) {
        throw describe(e);
      }
      const choice = res.choices[0];
      if (!choice) throw new Error('the model returned no choices');
      // a filtered or cut-off answer is a failed call: the engine chooses, and the transcript says why
      if (choice.finish_reason === 'content_filter') throw new Error('the model declined to answer (content filter)');
      if (choice.finish_reason === 'length') throw new Error(`the answer was cut off at ${req.maxOutputTokens} tokens`);
      const text = choice.message.content ?? '';
      return {
        text,
        usage: res.usage ? { input: res.usage.prompt_tokens, output: res.usage.completion_tokens } : undefined,
        stop: choice.finish_reason ?? undefined,
      };
    },
  };
}
