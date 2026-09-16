import { storeJson } from './fileModels/store.json'
import { sdk } from './sdk'
import { DB_NAME, DB_USER, MYSQL_DATADIR } from './utils'

export const { createBackup, restoreInit } = sdk.setupBackups(async () =>
  sdk.Backups.withMysqlDump({
    imageId: 'mysql',
    dbVolume: 'mysql',
    datadir: MYSQL_DATADIR,
    database: DB_NAME,
    user: DB_USER,
    // Resolved after the volumes are restored, so store.json is on disk.
    password: async () => {
      const password = await storeJson.read((s) => s.dbPassword).once()
      if (!password) throw new Error('No database password found in store.json')
      return password
    },
    engine: 'mysql',
  })
    .addVolume('main')
    .addVolume('startos'),
)
