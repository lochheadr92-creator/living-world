// The OpenAI client: Chat Completions through the official SDK. Lives in scripts/, not src/: the simulation and the agent modules
// have no network code. The key comes from the environment (OPENAI_API_KEY); OPENAI_BASE_URL, if set, points the SDK at a compatible
// endpoint. The answer is asked for as a JSON object (response_format), which the strict parser still checks.
import OpenAI from 'openai';
import type { ModelClient } from '../../src/agent/model';

export interface OpenAIOptions {
  model: string;
  /** reasoning effort, only for models that take it; left out, the model's default applies */
  effort?: 'none' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
}

function describe(e: unknown): string {
  if (e instanceof OpenAI.RateLimitError) return `rate limited (${e.status})`;
  if (e instanceof OpenAI.AuthenticationError) return 'authentication failed: check OPENAI_API_KEY';
  if (e instanceof OpenAI.BadRequestError) return `bad request: ${e.message}`;
  if (e instanceof OpenAI.APIConnectionError) return `connection error: ${e.message}`;
  if (e instanceof OpenAI.APIError) return `API error ${e.status}: ${e.message}`;
  return e instanceof Error ? e.message : String(e);
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
        throw new Error(describe(e));
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
