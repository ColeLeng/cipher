import Anthropic from "@anthropic-ai/sdk";
import type {
  ModelClient,
  ModelCompleteOptions,
  ModelCompleteResult,
  ModelMessage,
  ModelRole
} from "./types";

export type AnthropicClientOptions = {
  role: ModelRole;
  model: string;
  apiKey?: string;
};

export class AnthropicClient implements ModelClient {
  readonly role: ModelRole;
  readonly model: string;
  private readonly client: Anthropic;

  constructor(options: AnthropicClientOptions) {
    this.role = options.role;
    this.model = options.model;
    this.client = new Anthropic({
      apiKey: options.apiKey ?? process.env.ANTHROPIC_API_KEY
    });
  }

  async complete(
    _messages: ModelMessage[],
    _options: ModelCompleteOptions = {}
  ): Promise<ModelCompleteResult> {
    throw new Error("AnthropicClient.complete is not implemented yet.");
  }
}
