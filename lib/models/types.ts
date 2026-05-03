export type ModelRole = "local" | "cloud";

export type ChatRole = "system" | "user" | "assistant" | "tool";

export type ModelMessage = {
  role: ChatRole;
  content: string;
};

export type ToolDefinition = {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
};

export type ModelCompleteOptions = {
  tools?: ToolDefinition[];
  maxTokens?: number;
  temperature?: number;
};

export type ModelCompleteResult = {
  text: string;
  raw?: unknown;
};

export interface ModelClient {
  readonly role: ModelRole;
  readonly model: string;
  complete(
    messages: ModelMessage[],
    options?: ModelCompleteOptions
  ): Promise<ModelCompleteResult>;
}
