import { smtpShape, T, z } from '@start9labs/start-sdk'
import { storeJson } from './fileModels/store.json'
import { i18n } from './i18n'
import { sdk } from './sdk'
import {
  ADMIN_EMAIL,
  ADMIN_USERNAME,
  DB_NAME,
  DB_SERVER_VERSION,
  DB_USER,
  KIMAI_APP_DIR,
  KIMAI_VAR_DIR,
  MYSQL_DATADIR,
  MYSQL_SOCKET,
  TRUSTED_PROXIES,
  uiInterfaceId,
  uiMultiHostId,
  uiPort,
} from './utils'

export const main = sdk.setupMain(async ({ effects }) => {
  console.info(i18n('Starting Kimai!'))

  const store = await storeJson.read().const(effects)
  if (!store) throw new Error('store.json not found')
  const { dbPassword, appSecret, adminPassword, smtp } = store

  const smtpCredentials = await resolveSmtp(effects, smtp)

  // Re-runs setupMain (and so restarts Kimai) when an address is added or
  // removed. Kimai 2.70 refuses password reset while this list is empty, and
  // rejects any Host header that is not on it.
  const ui = await sdk.host
    .getOwn(
      effects,
      uiMultiHostId,
      host => host?.bindings[uiPort]?.interfaces[uiInterfaceId],
    )
    .const()
  const trustedHosts = trustedHostsEnv(ui?.addressInfo.hostnames ?? [])

  const kimaiEnv = {
    APP_ENV: 'prod',
    DATABASE_URL: `mysql://${DB_USER}:${dbPassword}@127.0.0.1:3306/${DB_NAME}?charset=utf8mb4&serverVersion=${DB_SERVER_VERSION}`,
    APP_SECRET: appSecret,
    TRUSTED_PROXIES,
    TRUSTED_HOSTS: trustedHosts,
    MAILER_URL: buildMailerDsn(smtpCredentials),
    // Kimai requires an address-shaped value even when nothing is ever sent.
    MAILER_FROM: smtpCredentials?.from ?? 'kimai@kimai.local',
  }

  const mysqlSub = sdk.SubContainer.of(
    effects,
    { imageId: 'mysql' },
    sdk.Mounts.of().mountVolume({
      volumeId: 'mysql',
      subpath: null,
      mountpoint: MYSQL_DATADIR,
      readonly: false,
    }),
    'mysql-sub',
  )

  const kimaiSub = sdk.SubContainer.of(
    effects,
    { imageId: 'kimai' },
    sdk.Mounts.of().mountVolume({
      volumeId: 'main',
      subpath: null,
      mountpoint: KIMAI_VAR_DIR,
      readonly: false,
    }),
    'kimai-sub',
  )

  const freshInstall =
    (await mysqlSub.exec(['test', '-f', `${MYSQL_DATADIR}/ibdata1`]))
      .exitCode !== 0

  return (
    sdk.Daemons.of(effects)
      .addDaemon('mysql', {
        subcontainer: mysqlSub,
        exec: {
          command: sdk.useEntrypoint(['--bind-address=127.0.0.1']),
          env: {
            MYSQL_ROOT_PASSWORD: dbPassword,
            MYSQL_DATABASE: DB_NAME,
          },
        },
        ready: {
          display: i18n('Database'),
          fn: async () => {
            // Over the socket: a restored datadir has no TCP-reachable account
            // until ensure-db-access has run.
            const { exitCode } = await mysqlSub.exec(
              [
                'mysql',
                `--socket=${MYSQL_SOCKET}`,
                '-u',
                DB_USER,
                '-e',
                'SELECT 1',
              ],
              { env: { MYSQL_PWD: dbPassword } },
            )
            return exitCode === 0
              ? { result: 'success', message: i18n('The database is ready') }
              : {
                  result: 'loading',
                  message: freshInstall
                    ? i18n(
                        'Initializing a new database. This can take a while...',
                      )
                    : i18n('Starting the database...'),
                }
          },
        },
        requires: [],
      })
      // The SDK's mysqldump restore creates only root@localhost, and Kimai
      // connects over TCP.
      .addOneshot('ensure-db-access', {
        subcontainer: mysqlSub,
        exec: {
          command: [
            'sh',
            '-ec',
            `mysql --socket=${MYSQL_SOCKET} -u ${DB_USER} -e "CREATE USER IF NOT EXISTS '${DB_USER}'@'%' IDENTIFIED BY '$MYSQL_PWD'; GRANT ALL PRIVILEGES ON *.* TO '${DB_USER}'@'%' WITH GRANT OPTION; FLUSH PRIVILEGES;"`,
          ],
          env: { MYSQL_PWD: dbPassword },
        },
        requires: ['mysql'],
      })
      .addDaemon('kimai', {
        subcontainer: kimaiSub,
        // The image's vhost PassEnvs a fixed list that does not include
        // TRUSTED_HOSTS, and the entrypoint never rewrites it. Apache includes
        // conf-enabled/*.conf, so a drop-in written here reaches PHP. The
        // wrapper runs as root (no daemon user is set) and then hands off to
        // the image entrypoint, which drops to www-data.
        exec: {
          command: [
            'sh',
            '-c',
            "printf '%s\\n' 'PassEnv TRUSTED_HOSTS' > /etc/apache2/conf-enabled/trusted-hosts.conf && exec /entrypoint.sh",
          ],
          env: kimaiEnv,
        },
        ready: {
          display: i18n('Web Interface'),
          // Apache binds only after the entrypoint's kimai:install migrations.
          gracePeriod: 300_000,
          fn: () =>
            sdk.healthCheck.checkPortListening(effects, uiPort, {
              successMessage: i18n('Kimai is ready'),
              errorMessage: i18n(
                'Kimai is starting — the first start applies database migrations and can take several minutes',
              ),
            }),
        },
        requires: ['mysql', 'ensure-db-access'],
      })
      // Needs the schema kimai:install creates inside the daemon's entrypoint.
      .addOneshot('apply-admin-credentials', {
        subcontainer: kimaiSub,
        exec: {
          command: [
            'sh',
            '-ec',
            [
              'bin/console -n kimai:user:create --ignore-existing "$KIMAI_ADMIN_USER" "$KIMAI_ADMIN_EMAIL" ROLE_SUPER_ADMIN "$KIMAI_ADMIN_PASSWORD"',
              'bin/console -n kimai:user:password "$KIMAI_ADMIN_USER" "$KIMAI_ADMIN_PASSWORD"',
            ].join('\n'),
          ],
          cwd: KIMAI_APP_DIR,
          user: 'www-data',
          env: {
            ...kimaiEnv,
            KIMAI_ADMIN_USER: ADMIN_USERNAME,
            KIMAI_ADMIN_EMAIL: ADMIN_EMAIL,
            KIMAI_ADMIN_PASSWORD: adminPassword,
          },
        },
        requires: ['kimai'],
      })
      .addHealthCheck('email', {
        ready: {
          display: i18n('Email'),
          fn: async () =>
            smtpCredentials
              ? { result: 'success', message: i18n('Kimai can send email') }
              : {
                  result: 'disabled',
                  message: i18n(
                    'No SMTP server configured. Kimai cannot send password-reset emails, invoices, or reports. Use the "Configure SMTP" action to enable it.',
                  ),
                },
        },
        requires: ['kimai'],
      })
  )
})

async function resolveSmtp(
  effects: T.Effects,
  smtp: z.infer<typeof smtpShape>,
): Promise<T.SmtpValue | null> {
  if (smtp.selection === 'system') {
    const credentials = await sdk.getSystemSmtp(effects).const()
    if (credentials && smtp.value.customFrom)
      credentials.from = smtp.value.customFrom
    return credentials
  }

  if (smtp.selection === 'custom') {
    const { host, from, username, password, security } =
      smtp.value.provider.value
    return {
      host,
      from,
      username,
      password: password ?? null,
      port: Number(security.value.port),
      security: security.selection,
    }
  }

  return null
}

// Kimai's trusted_hosts processor splits on '|' and, when every entry is an
// anchored hostname or bracketed IP, escapes and anchors it itself. A value
// that fails that shape is used as a raw regex, so only entries it accepts
// are emitted. An empty list stays empty: '.*' would trust every Host header.
function trustedHostsEnv(hostnames: readonly T.HostnameInfo[]): string {
  const names = new Set<string>()
  for (const { hostname, metadata } of hostnames) {
    const host = hostname.trim()
    if (!host) continue
    // Symfony compares the port-stripped Host header. IPv6 arrives unbracketed.
    const entry = metadata.kind === 'ipv6' ? `[${host}]` : host
    if (/^[a-z0-9_.-]+$/i.test(entry) || /^\[[0-9a-f:.]+\]$/i.test(entry)) {
      names.add(`^${entry}$`)
    }
  }
  return [...names].join('|')
}

// `smtps://` is implicit TLS, `smtp://` negotiates STARTTLS.
function buildMailerDsn(smtp: T.SmtpValue | null): string {
  if (!smtp) return 'null://null'
  const scheme = smtp.security === 'tls' ? 'smtps' : 'smtp'
  const auth = smtp.username
    ? `${encodeURIComponent(smtp.username)}:${encodeURIComponent(smtp.password ?? '')}@`
    : ''
  return `${scheme}://${auth}${smtp.host}:${smtp.port}`
}
