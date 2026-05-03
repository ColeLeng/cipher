import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam, Tool } from "@anthropic-ai/sdk/resources/messages";
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
    messages: ModelMessage[],
    options: ModelCompleteOptions = {}
  ): Promise<ModelCompleteResult> {
    const system = messages
      .filter((message) => message.role === "system")
      .map((message) => message.content)
      .join("\n\n");

    const anthropicMessages: MessageParam[] = messages
      .filter((message) => message.role !== "system")
      .map((message) => ({
        role: message.role === "assistant" ? "assistant" : "user",
        content:
          message.role === "tool"
            ? `Tool result:\n${message.content}`
            : message.content
      }));

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: options.maxTokens ?? 1024,
      temperature: options.temperature ?? 0,
      system: system || undefined,
      messages: anthropicMessages,
      tools: options.tools as Tool[] | undefined
    });

    const text = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("");

    return {
      text,
      raw: response
    };
  }
}
