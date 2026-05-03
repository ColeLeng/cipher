import json
import sys


def main() -> int:
    payload = json.load(sys.stdin)
    transformer = payload.get("transformer")
    raw_data = payload.get("raw_data")

    if not isinstance(transformer, str) or not isinstance(raw_data, str):
        print(json.dumps({"error": "Expected transformer and raw_data strings."}))
        return 1

    raise NotImplementedError("Python transformer sandbox is not implemented yet.")


if __name__ == "__main__":
    raise SystemExit(main())
