// Fixed by the image's Apache vhost (`.docker/000-default.conf`).
export const uiPort = 8001

export const MYSQL_DATADIR = '/var/lib/mysql'
export const MYSQL_SOCKET = '/var/run/mysqld/mysqld.sock'

// The image declares this as its VOLUME; invoices, exports and templates live
// here alongside the `data` and `plugins` dirs upstream's compose file mounts.
export const KIMAI_VAR_DIR = '/opt/kimai/var'
export const KIMAI_APP_DIR = '/opt/kimai'

export const DB_NAME = 'kimai'
export const DB_USER = 'root'
// Must match the `mysql` image tag in the manifest: Doctrine picks its SQL
// platform from it.
export const DB_SERVER_VERSION = '8.4.11'

export const ADMIN_USERNAME = 'admin'
// Kimai validates the address but never sends to it unless SMTP is configured.
export const ADMIN_EMAIL = 'admin@kimai.local'

// Symfony ignores the OS proxy's X-Forwarded-Proto unless the sender is
// trusted, and then builds http:// URLs the browser blocks as mixed content.
export const TRUSTED_PROXIES =
  '127.0.0.1,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,169.254.0.0/16'

export const uiMultiHostId = 'ui-multi'
export const uiInterfaceId = 'ui'
