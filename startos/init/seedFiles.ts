import { utils } from '@start9labs/start-sdk'
import { storeJson } from '../fileModels/store.json'
import { sdk } from '../sdk'

export const seedFiles = sdk.setupOnInit(async (effects, kind) => {
  if (kind !== 'install') {
    await storeJson.merge(effects, {})
    return
  }

  await storeJson.merge(effects, {
    dbPassword: utils.getDefaultString({ charset: 'a-z,A-Z,0-9', len: 32 }),
    appSecret: utils.getDefaultString({ charset: 'a-z,A-Z,0-9', len: 64 }),
    smtp: { selection: 'disabled', value: {} },
  })
})
