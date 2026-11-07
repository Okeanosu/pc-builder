export interface LlmMessage {
  role: 'user' | 'model';
  parts: LlmPart[];
}

export type LlmPart =
  | { text: string }
  | { functionCall: { name: string; args: Record<string, unknown> } }
  | { functionResponse: { name: string; response: Record<string, unknown> } };

export interface LlmToolDecl {
  name: string;
  description: string;
  parametersJsonSchema: object;
}

export type LlmChunk =
  | { type: 'text'; text: string }
  | { type: 'functionCall'; name: string; args: Record<string, unknown> };

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
