<p align="center">
  <img src="icon.png" alt="Kimai Logo" width="21%">
</p>

# Kimai on StartOS

> Everything not listed in this document should behave the same as upstream
> Kimai. If a feature, setting, or behavior is not mentioned here, the
> upstream documentation is accurate and fully applicable — see the
> Documentation section of `instructions.md` for links.

[Kimai](https://github.com/kimai/kimai) is a self-hosted time-tracking application for freelancers, agencies, and companies. This package runs the official Apache image alongside a MySQL sidecar, provisions the `admin` super-admin from a StartOS action, and wires Kimai's mailer into StartOS's SMTP settings.

---

## Table of Contents

- [Image and Container Runtime](#image-and-container-runtime)
- [Volume and Data Layout](#volume-and-data-layout)
- [File Models](#file-models)
- [Dependencies](#dependencies)
- [Network Access and Interfaces](#network-access-and-interfaces)
- [Installation and First-Run Flow](#installation-and-first-run-flow)
- [Actions](#actions)
- [Tasks](#tasks)
- [Health Checks](#health-checks)
- [Backups and Restore](#backups-and-restore)
- [Limitations and Differences](#limitations-and-differences)
- [Quick Reference for AI Consumers](#quick-reference-for-ai-consumers)

---

## Image and Container Runtime

Two upstream images, both unmodified, sharing one network namespace so Kimai reaches MySQL over `127.0.0.1`.

| Subcontainer | Image           | Purpose                                                        |
| ------------ | --------------- | -------------------------------------------------------------- |
| `kimai-sub`  | `kimai/kimai2`  | Kimai's entrypoint: waits for the database, runs `kimai:install` (schema creation and migrations), then Apache in the foreground |
| `mysql-sub`  | `mysql`         | MySQL, bound to loopback only                                  |

Both run for `x86_64` and `aarch64` with their default entrypoints. The Kimai image is pinned to its **Apache** build (the bare version tag); the `latest`/`fpm` tags are PHP-FPM only and would need a web-server sidecar.

## Volume and Data Layout

Three volumes, one of which is never mounted into a container.

| Volume    | Mount point      | Contents                                                                     |
| --------- | ---------------- | ---------------------------------------------------------------------------- |
| `main`    | `/opt/kimai/var` | Invoices, exports, invoice/export templates, plugins, sessions, logs         |
| `mysql`   | `/var/lib/mysql` | MySQL data directory                                                         |
| `startos` | —                | `store.json`, read by the package on the host side                           |

The upstream Docker Compose example mounts only `var/data` and `var/plugins`; this package mounts all of `/opt/kimai/var` — the directory the image declares as its `VOLUME` — because rendered invoices, exports and custom templates live in its other subdirectories and would otherwise vanish on restart.

## File Models

One, on the `startos` volume.

| Model       | File         | Contents                                                                                |
| ----------- | ------------ | --------------------------------------------------------------------------------------- |
| `storeJson` | `store.json` | `dbPassword`, `appSecret` (generated at install), `adminPassword` (set by an action), `smtp` (set by an action) |

Kimai itself is configured entirely through environment variables that the package derives from `store.json` on every start: `DATABASE_URL`, `APP_SECRET`, `APP_ENV`, `TRUSTED_PROXIES`, `MAILER_URL` and `MAILER_FROM`. Nothing is written into Kimai's own config tree, and everything inside Kimai's admin UI — users, teams, customers, projects, rates, templates, plugins — belongs to the user and is never touched by the package.

`TRUSTED_PROXIES` is set to the private address ranges so Symfony honours the `X-Forwarded-Proto: https` header the StartOS reverse proxy adds; without it Kimai emits absolute `http://` URLs that the browser blocks as mixed content. `TRUSTED_HOSTS` is deliberately unset — StartOS serves the service on several addresses at once and pinning one would break the others.

## Dependencies

None.

## Network Access and Interfaces

One HTTP interface serving both the web UI and Kimai's REST API.

| Interface | Id   | Type | Internal port | Serves                                   |
| --------- | ---- | ---- | ------------- | ---------------------------------------- |
| Web Interface | `ui` | ui | 8001        | Kimai's web UI, and its REST API under `/api` |

The port is bound on the `ui-multi` host with `protocol: 'http'`, so StartOS terminates TLS and adds the `X-Forwarded-*` headers.

## Installation and First-Run Flow

Install generates the MySQL root password and Symfony `APP_SECRET` into `store.json`, then holds the service on a critical task until an admin password exists — Kimai ships with no accounts, and its own first-run path (`ADMINPASS`/`ADMINMAIL`) can create an account but never rotate one, so it is not used.

On every start:

1. MySQL comes up (on the first start it initializes its data directory — several minutes is normal) and the `ensure-db-access` oneshot grants `root@%`, which a restored data directory lacks (see [Backups and Restore](#backups-and-restore)).
2. Kimai's entrypoint runs `kimai:install`, applying any pending schema migrations, then starts Apache.
3. The `apply-admin-credentials` oneshot runs `kimai:user:create --ignore-existing` followed by `kimai:user:password`, so the `admin` super-admin exists and carries the password in `store.json`. **The package owns this account's password**: a change made inside Kimai reverts on the next start, and rotation goes through the Set Admin Password action.

The account is created with the placeholder address `admin@kimai.local`; nothing is ever sent to it, and the user is told to change it inside Kimai.

## Actions

Two, both user-facing. Either one rewrites `store.json`, which restarts the service if it is running.

| Action               | When to run it                                       | Cost / repeat safety                                                                 | State changed                       |
| -------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------- |
| `set-admin-password` | First setup (raised as a task), a lost password, or rotation | Restarts the service (about a minute); each run invalidates the previous password; safe to repeat | `adminPassword` in `store.json`, then the `admin` row in MySQL on the next start |
| `configure-smtp`     | Kimai should send password resets, invoices or reports | Restarts the service (about a minute); safe to repeat                              | `smtp` in `store.json`, rendered into `MAILER_URL`/`MAILER_FROM` |

`set-admin-password` returns the username and the new password once; it is not readable afterwards. `configure-smtp` renders the stored selection into a Symfony Mailer DSN — `smtps://` for implicit TLS, `smtp://` for STARTTLS, `null://null` when disabled — with credentials percent-encoded.

## Tasks

One.

| Task                 | Severity   | Raised when                             | Cleared by                                  |
| -------------------- | ---------- | --------------------------------------- | ------------------------------------------- |
| `set-admin-password` | `critical` | `store.json` holds no `adminPassword` — on install, or after a restore of a backup taken before one was set | Running the action; it does not return once a password is stored |

While it is raised the service cannot be started and its ordinary controls are hidden.

## Health Checks

Three.

| Check   | Displayed as  | Probes                                                                          | A failure means                                                                                                                              |
| ------- | ------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `mysql` | Database      | `SELECT 1` over the unix socket                                                 | `loading` while the data directory initializes (first start) or the server starts; a persistent failure is in the `mysql-sub` logs           |
| `kimai` | Web Interface | Port 8001 listening, with a 5-minute grace period                                | Apache only binds after `kimai:install` finishes, so "starting" during the first minutes is migrations running; past the grace period, read the `kimai-sub` log for the migration or database error |
| `email` | Email         | Whether an SMTP configuration is stored                                          | `disabled` is informational: no mailer is configured and Kimai's email features silently do nothing until Configure SMTP is run              |

## Backups and Restore

The database is **dumped, not copied**: `sdk.Backups.withMysqlDump` writes a logical dump before the backup and replays it into a freshly initialized data directory on restore, so the `mysql` volume's files are never captured and a restore survives a MySQL upgrade. The `main` volume (invoices, exports, templates, plugins) and the `startos` volume (`store.json`, whose `dbPassword` the restore uses to load the dump) are copied wholesale.

A restored data directory differs from a fresh one: the SDK's restore creates only `root@localhost`, reachable over the socket, while Kimai connects over TCP to `127.0.0.1`. The `mysql` readiness check therefore probes the socket, and the `ensure-db-access` oneshot recreates `root@%` before Kimai starts — a no-op on a fresh install. The restored instance needs nothing else: the admin password and SMTP settings come back with `store.json`.

## Limitations and Differences

1. **The `admin` password is owned by StartOS.** It is re-applied on every start; change it with the Set Admin Password action, not inside Kimai. Other users' passwords are Kimai's own.
2. **The `admin` account's email is the placeholder `admin@kimai.local`** until changed inside Kimai, so password-reset mail for it goes nowhere.
3. **`DEFAULT_URI` cannot be set.** The image's Apache vhost passes a fixed list of variables through to PHP and this is not on it; only absolute URLs built outside a web request (some CLI-generated links) are affected.
4. **`TRUSTED_HOSTS` is not set**, so host-header validation is not enforced at the application layer.
5. **The database password is alphanumeric by construction**, because the image's entrypoint splits `DATABASE_URL` on `/`, `:` and `@`.
6. **LDAP and SAML are not configured** by the package, though the image ships support for them.

---

## Quick Reference for AI Consumers

```yaml
package_id: kimai
image: kimai/kimai2, mysql
architectures: [x86_64, aarch64]
subcontainers: [kimai-sub, mysql-sub]
volumes:
  main: /opt/kimai/var
  mysql: /var/lib/mysql
  startos: not mounted (store.json)
file_models:
  - store.json
startos_managed_env_vars:
  - APP_ENV
  - APP_SECRET
  - DATABASE_URL
  - TRUSTED_PROXIES
  - MAILER_URL
  - MAILER_FROM
  - MYSQL_ROOT_PASSWORD
  - MYSQL_DATABASE
dependencies: none
interfaces:
  ui: { type: ui, port: 8001 }
actions:
  - set-admin-password
  - configure-smtp
tasks:
  - { action: set-admin-password, severity: critical }
health_checks:
  - mysql
  - kimai
  - email
```
