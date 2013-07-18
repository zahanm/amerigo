
What is does
---

Don't want to develop remotely?
This gem is a convenient rsync wrapper to keep remote and local directories in sync.

- actions - `up` | `down` | `sync`
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
      "user": "<ssh remote username>",
      "expeditions": [
        {
          "remote": "<remote dir>",
          "local": "<local dir>"
        },
        ..
      ]
      "ignores": [
        "<folder-or-filename>",
        ..
      ]
    }

- `host` is the hostname of the server that you are accessing.
- `user` is your username on the `host` server
- `root` is directory that all `remote` filepaths will be accessed relative to.
    So if you have a folder `project` in your home directory, that should be
    `~/project`, and `remote: "foo"` will resolve to `~/project/foo` on the
    server.
- `local` is the path to the local directory. Similarly.

Naming
---

Paying 'omage to the uncelebrated explorer.
