import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '2.70.1:0',
  releaseNotes: {
    en_US: `Updated Kimai to 2.70.1, built on PHP releases that fix two critical remote code execution vulnerabilities (PHP2Shell, CVE-2026-109618 and CVE-2026-109619). Also includes the security fixes from Kimai 2.70.0, configurable password strength, and improvements to duration entry, reports and batch timesheet editing.

[Full upstream release notes](https://github.com/kimai/kimai/releases/tag/2.70.1)`,
    es_ES: `Actualiza Kimai a 2.70.1, compilado sobre versiones de PHP que corrigen dos vulnerabilidades críticas de ejecución remota de código (PHP2Shell, CVE-2026-109618 y CVE-2026-109619). Incluye además las correcciones de seguridad de Kimai 2.70.0, la configuración de la robustez de contraseñas y mejoras en la introducción de duraciones, los informes y la edición masiva de registros de tiempo.

[Notas completas de la versión](https://github.com/kimai/kimai/releases/tag/2.70.1)`,
    de_DE: `Aktualisiert Kimai auf 2.70.1, gebaut auf PHP-Versionen, die zwei kritische Sicherheitslücken zur Remotecodeausführung beheben (PHP2Shell, CVE-2026-109618 und CVE-2026-109619). Enthält außerdem die Sicherheitskorrekturen aus Kimai 2.70.0, konfigurierbare Passwortstärke sowie Verbesserungen bei der Dauereingabe, den Berichten und der Massenbearbeitung von Zeiteinträgen.

[Vollständige Versionshinweise](https://github.com/kimai/kimai/releases/tag/2.70.1)`,
    pl_PL: `Aktualizuje Kimai do wersji 2.70.1, zbudowanej na wydaniach PHP, które usuwają dwie krytyczne luki umożliwiające zdalne wykonanie kodu (PHP2Shell, CVE-2026-109618 i CVE-2026-109619). Zawiera też poprawki bezpieczeństwa z Kimai 2.70.0, konfigurowalną siłę haseł oraz usprawnienia wprowadzania czasu trwania, raportów i zbiorczej edycji wpisów czasu.

[Pełne informacje o wydaniu](https://github.com/kimai/kimai/releases/tag/2.70.1)`,
    fr_FR: `Met à jour Kimai vers la version 2.70.1, construite sur des versions de PHP qui corrigent deux vulnérabilités critiques d'exécution de code à distance (PHP2Shell, CVE-2026-109618 et CVE-2026-109619). Inclut aussi les correctifs de sécurité de Kimai 2.70.0, la robustesse des mots de passe configurable et des améliorations de la saisie des durées, des rapports et de la modification groupée des feuilles de temps.

[Notes de version complètes](https://github.com/kimai/kimai/releases/tag/2.70.1)`,
  },
  migrations: {
    up: async () => {},
    down: IMPOSSIBLE,
  },
})
