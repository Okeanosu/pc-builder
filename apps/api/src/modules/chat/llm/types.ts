export interface LlmMessage {
  role: 'user' | 'model';
  parts: LlmPart[];
}

/**
 * `thoughtSignature` must be echoed back with a function call on Gemini 3 models or the next request is rejected;
 * a call `id`, when the model sends one, is repeated on the matching functionResponse.
 */
export type LlmPart =
  | { text: string }
  | { functionCall: { id?: string; name: string; args: Record<string, unknown> }; thoughtSignature?: string }
  | { functionResponse: { id?: string; name: string; response: Record<string, unknown> } };

export interface LlmToolDecl {
  name: string;
  description: string;
  parametersJsonSchema: object;
}

export type LlmChunk =
  | { type: 'text'; text: string }
  | {
      type: 'functionCall';
      id?: string;
      name: string;
      args: Record<string, unknown>;
      thoughtSignature?: string;
    };

export interface LlmClient {
  stream(input: {
    system: string;
    history: LlmMessage[];
    tools: LlmToolDecl[];
    signal?: AbortSignal;
  }): AsyncIterable<LlmChunk>;
}

export type LlmUnavailableReason = 'NO_KEY' | 'RATE_LIMIT' | 'TIMEOUT' | 'UPSTREAM';

export class LlmUnavailableError extends Error {
  constructor(
    public reason: LlmUnavailableReason,
    message?: string,
  ) {
    super(message ?? reason);
  }
}
