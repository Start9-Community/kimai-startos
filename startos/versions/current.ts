import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '2.67.0:1',
  releaseNotes: {
    en_US: 'StartOS package improvements; no change to Kimai.',
    es_ES: 'Mejoras en el paquete de StartOS; sin cambios en Kimai.',
    de_DE: 'Verbesserungen am StartOS-Paket; keine Änderungen an Kimai.',
    pl_PL: 'Ulepszenia pakietu StartOS; bez zmian w Kimai.',
    fr_FR: 'Améliorations du paquet StartOS ; aucun changement pour Kimai.',
  },
  migrations: {
    up: async () => {},
    down: IMPOSSIBLE,
  },
})
