
What is does
---

Don't want to develop remotely?
This gem is a convenient rsync wrapper to keep remote and local directories in sync.

- actions - `up` | `down`
- check local and remote branch name match

Only supports `git` for now.

Installation
---

Needs [Node](http://nodejs.org) and npm

    ~> npm install -g amerigo
    ~> amerigo -h

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
