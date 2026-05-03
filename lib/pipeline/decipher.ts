import type { EntityMap } from "./orchestrator";

export function decipherResponse(response: string, entityMap: EntityMap): string {
  return Object.entries(entityMap)
    .sort(([left], [right]) => right.length - left.length)
    .reduce(
      (text, [placeholder, realValue]) => replacePlaceholderVariants(
        text,
        placeholder,
        realValue
      ),
      response
    );
}

function replacePlaceholderVariants(
  text: string,
  placeholder: string,
  realValue: string
): string {
  const variants = new Set([
    placeholder,
    placeholder.toLowerCase(),
    placeholder.toLowerCase().replaceAll("_", "-"),
    placeholder.toUpperCase().replaceAll("_", "-")
  ]);

  return [...variants].reduce(
    (result, variant) => result.replaceAll(variant, realValue),
    text
  );
}
