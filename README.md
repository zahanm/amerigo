
What is does
---

This baby is a convenient rsync wrapper to keep a remote and local directory in sync.

actions - up | down
check remote branch match

Only supports `git` for now.

Config file syntax
---

`journey.json`

    {
      "host": "<ssh remote host>",
      "root": "<repo root dir>",
      "expeditions": [
        {
          "remote": "<remote dir>",
          "local": "<local dir>"
        },
        ..
      ]
    }

Naming
---

Paying 'omage to the uncelebrated explorer.
