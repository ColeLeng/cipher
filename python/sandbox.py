import builtins
import csv
import json
import math
import re
import sys
from collections import Counter, defaultdict
from functools import reduce
from io import StringIO
from itertools import chain, combinations, groupby
from statistics import mean, median


ALLOWED_MODULES = {
    "re": re,
    "collections": __import__("collections"),
    "statistics": __import__("statistics"),
    "math": math,
    "json": json,
    "itertools": __import__("itertools"),
    "functools": __import__("functools"),
}


def safe_import(name, globals=None, locals=None, fromlist=(), level=0):
    root_name = name.split(".", 1)[0]
    if level != 0 or root_name not in ALLOWED_MODULES:
        raise ImportError(f"Import not allowed: {name}")
    return ALLOWED_MODULES[root_name]


SAFE_BUILTINS = {
    "abs": abs,
    "all": all,
    "any": any,
    "bool": bool,
    "dict": dict,
    "enumerate": enumerate,
    "filter": filter,
    "float": float,
    "int": int,
    "isinstance": isinstance,
    "len": len,
    "list": list,
    "map": map,
    "max": max,
    "min": min,
    "range": range,
    "round": round,
    "set": set,
    "sorted": sorted,
    "str": str,
    "sum": sum,
    "tuple": tuple,
    "zip": zip,
    "__import__": safe_import,
}


def parse_raw_data(raw_data):
    sample = raw_data.strip()
    if not sample:
        return []

    try:
        dialect = csv.Sniffer().sniff(sample[:2048])
        reader = csv.DictReader(StringIO(sample), dialect=dialect)
        if reader.fieldnames:
            return [dict(row) for row in reader]
    except csv.Error:
        pass

    return raw_data


def main() -> int:
    try:
        payload = json.load(sys.stdin)
        transformer = payload.get("transformer")
        raw_data = payload.get("raw_data")

        if not isinstance(transformer, str) or not isinstance(raw_data, str):
            print(json.dumps({"error": "Expected transformer and raw_data strings."}))
            return 1

        namespace = {
            "__builtins__": SAFE_BUILTINS,
            "Counter": Counter,
            "defaultdict": defaultdict,
            "mean": mean,
            "median": median,
            "math": math,
            "re": re,
            "json": json,
            "chain": chain,
            "combinations": combinations,
            "groupby": groupby,
            "reduce": reduce,
        }

        exec(transformer, namespace)
        transform = namespace.get("transform")
        if not callable(transform):
            print(json.dumps({"error": "Transformer must define transform(rows)."}))
            return 1

        rows = parse_raw_data(raw_data)
        summary = transform(rows)
        if not isinstance(summary, dict):
            print(json.dumps({"error": "transform(rows) must return a dict."}))
            return 1

        entity_map = namespace.get("ENTITY_MAP", namespace.get("entity_map", {}))
        if not isinstance(entity_map, dict):
            print(json.dumps({"error": "ENTITY_MAP must be a dict if provided."}))
            return 1

        print(json.dumps({"summary": summary, "entity_map": entity_map}))
        return 0
    except Exception as exc:
        print(json.dumps({"error": str(exc)}))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
