import { AnthropicProvider } from "./anthropic";
import { AIError, type AIProvider } from "./types";

export * from "./types";

// Pick the provider from AI_PROVIDER (default: anthropic). To add another
// provider, implement AIProvider and register it here.
export function getAIProvider(): AIProvider {
  const name = process.env.AI_PROVIDER || "anthropic";
  switch (name) {
    case "anthropic":
      return new AnthropicProvider();
    default:
      throw new AIError(`Unknown AI provider "${name}".`);
  }
}
