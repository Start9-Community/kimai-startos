import { utils } from '@start9labs/start-sdk'
import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'
import { ADMIN_USERNAME } from '../utils'

export const setAdminPassword = sdk.Action.withoutInput(
  'set-admin-password',

  async ({ effects }) => ({
    name: i18n('Set Admin Password'),
    description: i18n(
      'Generate a new random password for the Kimai admin account. Replaces the existing password.',
    ),
    warning: (await storeJson.read((s) => s.adminPassword).const(effects))
      ? i18n('Replaces the current admin password. Kimai restarts to apply it.')
      : null,
    allowedStatuses: 'any',
    group: null,
    visibility: 'enabled',
  }),

  async ({ effects }) => {
    // Kimai accepts 8-60 characters.
    const adminPassword = utils.getDefaultString({
      charset: 'a-z,A-Z,0-9',
      len: 22,
    })

    await storeJson.merge(effects, { adminPassword })

    return {
      version: '1',
      title: i18n('Login Credentials'),
      message: i18n(
        'Use these credentials to sign in to Kimai. If Kimai is running it will restart to apply them; this takes a few moments.',
      ),
      result: {
        type: 'group',
        value: [
          {
            type: 'single',
            name: i18n('Username'),
            description: null,
            value: ADMIN_USERNAME,
            masked: false,
            copyable: true,
            qr: false,
          },
          {
            type: 'single',
            name: i18n('Password'),
            description: null,
            value: adminPassword,
            masked: true,
            copyable: true,
            qr: false,
          },
        ],
      },
    }
  },
)
