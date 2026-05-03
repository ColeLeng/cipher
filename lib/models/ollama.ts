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
    messages: ModelMessage[],
    options: ModelCompleteOptions = {}
  ): Promise<ModelCompleteResult> {
    const response = await fetch(new URL("/api/chat", this.url), {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: this.model,
        messages: messages.map((message) => ({
          role: message.role === "tool" ? "user" : message.role,
          content:
            message.role === "tool"
              ? `Tool result:\n${message.content}`
              : message.content
        })),
        stream: false,
        options: {
          temperature: options.temperature ?? 0,
          num_predict: options.maxTokens
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Ollama request failed (${response.status}): ${errorText}`
      );
    }

    const raw = (await response.json()) as {
      message?: { content?: unknown };
      error?: unknown;
    };

    if (typeof raw.error === "string") {
      throw new Error(`Ollama error: ${raw.error}`);
    }

    const text = raw.message?.content;
    if (typeof text !== "string") {
      throw new Error("Ollama response did not include message.content.");
    }

    return {
      text,
      raw
    };
  }
}
