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
  uiPort,
} from './utils'

export const main = sdk.setupMain(async ({ effects }) => {
  console.info(i18n('Starting Kimai!'))

  const store = await storeJson.read().const(effects)
  if (!store) throw new Error('store.json not found')
  const { dbPassword, appSecret, adminPassword, smtp } = store

  const smtpCredentials = await resolveSmtp(effects, smtp)

  const kimaiEnv = {
    APP_ENV: 'prod',
    DATABASE_URL: `mysql://${DB_USER}:${dbPassword}@127.0.0.1:3306/${DB_NAME}?charset=utf8mb4&serverVersion=${DB_SERVER_VERSION}`,
    APP_SECRET: appSecret,
    TRUSTED_PROXIES,
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
        exec: { command: sdk.useEntrypoint(), env: kimaiEnv },
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

// `smtps://` is implicit TLS, `smtp://` negotiates STARTTLS.
function buildMailerDsn(smtp: T.SmtpValue | null): string {
  if (!smtp) return 'null://null'
  const scheme = smtp.security === 'tls' ? 'smtps' : 'smtp'
  const auth = smtp.username
    ? `${encodeURIComponent(smtp.username)}:${encodeURIComponent(smtp.password ?? '')}@`
    : ''
  return `${scheme}://${auth}${smtp.host}:${smtp.port}`
}
