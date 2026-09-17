# Updating the upstream version

This package wraps two published images: Kimai's own `kimai/kimai2` and the official `mysql` image.

## Determining the upstream version

- **Kimai** ([kimai/kimai](https://github.com/kimai/kimai)) — read the tag list rather than the "Latest" release badge, and confirm the image for that tag exists, ships both architectures, and is the Apache build:

  ```sh
  gh api repos/kimai/kimai/tags --jq '.[].name' | head -5
  for t in <version> apache; do
    printf '%-8s ' "$t"
    curl -fsS "https://hub.docker.com/v2/repositories/kimai/kimai2/tags/$t" \
      | jq -r '"\(.digest) \([.images[].architecture] | join(","))"'
  done
  ```

  The `<version>` digest must equal the `apache` digest. A release can exist without a published image; pin the newest tag that has one.

  The current pin lives in `startos/manifest/index.ts` at `images.kimai.source.dockerTag`.

- **MySQL** ([library/mysql](https://hub.docker.com/_/mysql)) — stay on the 8.4 LTS line:

  ```sh
  curl -fsS 'https://hub.docker.com/v2/repositories/library/mysql/tags?name=8.4.&page_size=20' | jq -r '.results[].name'
  ```

  The current pin lives in `startos/manifest/index.ts` at `images.mysql.source.dockerTag`, mirrored by `DB_SERVER_VERSION` in `startos/utils.ts`.

## Applying the bump

- Bump `dockerTag` for `kimai` (and `mysql` when it moves, together with `DB_SERVER_VERSION`).
- Bump `version` in `startos/versions/current.ts` and write `releaseNotes` for every locale.
- For a minor or major Kimai jump, read the [changelog](https://github.com/kimai/kimai/releases) and the [upgrade guide](https://www.kimai.org/documentation/updates.html), then re-check the upstream details this package depends on:
  - `.docker/000-default.conf` still `PassEnv`s `APP_ENV`, `APP_SECRET`, `DATABASE_URL`, `MAILER_URL`, `MAILER_FROM` and `TRUSTED_PROXIES`, and Apache still listens on 8001.
  - `.docker/entrypoint.sh` still parses `DATABASE_URL` with `awk -F '[/:@]'` and honours a user-supplied `APP_SECRET`.
  - `kimai:user:create` still takes `--ignore-existing` and `kimai:user:password` the `<username> <password>` order the `apply-admin-credentials` oneshot uses.

Kimai runs its own schema migrations from `kimai:install` on every start, so an upstream bump needs no package migration. Backups take a logical dump, so a MySQL major bump does not strand existing backups.
