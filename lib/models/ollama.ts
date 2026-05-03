import type {
  ModelClient,
  ModelCompleteOptions,
  ModelCompleteResult,
  ModelMessage,
  ModelRole
} from "./types";

export type OllamaClientOptions = {
  role: ModelRole;
  url: string;
  model: string;
};

export class OllamaClient implements ModelClient {
  readonly role: ModelRole;
  readonly model: string;
  readonly url: string;

  constructor(options: OllamaClientOptions) {
    this.role = options.role;
    this.model = options.model;
    this.url = options.url;
  }

  async complete(
    _messages: ModelMessage[],
    _options: ModelCompleteOptions = {}
  ): Promise<ModelCompleteResult> {
    throw new Error("OllamaClient is a Phase 2 stub.");
  }
}
