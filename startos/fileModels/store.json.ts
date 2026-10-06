import { FileHelper, smtpShape, z } from '@start9labs/start-sdk'
import { sdk } from '../sdk'

const shape = z.looseObject({
  // Embedded in DATABASE_URL, which the image's entrypoint splits on `/:@`.
  dbPassword: z.string().catch(''),
  appSecret: z.string().catch(''),
  adminPassword: z.string().catch(''),
  smtp: smtpShape,
})

export const storeJson = FileHelper.json(
  { base: sdk.volumes.startos, subpath: './store.json' },
  shape,
)
