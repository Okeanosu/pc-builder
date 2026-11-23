"""Turn `aws ecs describe-task-definition` output into input for `register-task-definition`.

Reads JSON on stdin, writes JSON on stdout. Arguments are container=image pairs, e.g. api=<repo>:<sha>.
`--tag-of api` instead prints the image tag the named container currently uses.
"""

import json
import sys

READ_ONLY = (
    "taskDefinitionArn", "revision", "status", "requiresAttributes", "compatibilities",
    "registeredAt", "registeredBy", "deregisteredAt",
)


def main(argv: list[str]) -> int:
    task_def = json.load(sys.stdin)["taskDefinition"]
    containers = {c["name"]: c for c in task_def["containerDefinitions"]}

    if argv[:1] == ["--tag-of"]:
        print(containers[argv[1]]["image"].rsplit(":", 1)[1])
        return 0

    for pair in argv:
        name, image = pair.split("=", 1)
        if name not in containers:
            print(f"task-def.py: no container named {name}", file=sys.stderr)
            return 2
        containers[name]["image"] = image

    for key in READ_ONLY:
        task_def.pop(key, None)
    json.dump(task_def, sys.stdout)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
