import { setupManifest } from '@start9labs/start-sdk'
import { long, short } from './i18n'

export const manifest = setupManifest({
  id: 'kimai',
  title: 'Kimai',
  license: 'AGPL-3.0-or-later',
  packageRepo: 'https://github.com/Start9-Community/kimai-startos',
  upstreamRepo: 'https://github.com/kimai/kimai',
  marketingUrl: 'https://www.kimai.org/',
  donationUrl: 'https://www.kimai.org/support.html',
  description: { short, long },
  volumes: ['main', 'mysql', 'startos'],
  images: {
    // The bare version tag is the Apache build; `latest`/`fpm` ship no web
    // server.
    kimai: {
      source: { dockerTag: 'kimai/kimai2:2.67.0' },
      arch: ['x86_64', 'aarch64'],
    },
    mysql: {
      source: { dockerTag: 'mysql:8.4.11' },
      arch: ['x86_64', 'aarch64'],
    },
  },
  dependencies: {},
})
