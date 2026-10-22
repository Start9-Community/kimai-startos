import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '2.70.1:1',
  releaseNotes: {
    en_US: `Self-service password reset works again when SMTP is configured. Kimai now trusts every address enabled on the Web Interface — LAN addresses, .local, Tor and custom domains — and rejects a request whose host is not one of them. The admin account is still recovered with Set Admin Password.

[Full upstream release notes](https://github.com/kimai/kimai/releases/tag/2.70.1)`,
    es_ES: `El restablecimiento de contraseñas vuelve a funcionar cuando SMTP está configurado. Kimai ahora confía en todas las direcciones activadas en la interfaz web — direcciones de la red local, .local, Tor y dominios personalizados — y rechaza una petición cuyo host no sea una de ellas. La cuenta admin se sigue recuperando con Establecer contraseña de administrador.

[Notas completas de la versión](https://github.com/kimai/kimai/releases/tag/2.70.1)`,
    de_DE: `Das Zurücksetzen des Passworts per E-Mail funktioniert wieder, wenn SMTP konfiguriert ist. Kimai vertraut nun jeder für die Weboberfläche aktivierten Adresse — LAN-Adressen, .local, Tor und eigenen Domains — und weist eine Anfrage zurück, deren Host keine davon ist. Das admin-Konto wird weiterhin über Administrator-Passwort festlegen wiederhergestellt.

[Vollständige Versionshinweise](https://github.com/kimai/kimai/releases/tag/2.70.1)`,
    pl_PL: `Samodzielne resetowanie hasła znów działa, gdy SMTP jest skonfigurowane. Kimai ufa teraz każdemu adresowi włączonemu w interfejsie WWW — adresom w sieci lokalnej, .local, Tor i własnym domenom — i odrzuca żądanie, którego host nie jest jednym z nich. Konto admin nadal odzyskuje się akcją Ustaw hasło administratora.

[Pełne informacje o wydaniu](https://github.com/kimai/kimai/releases/tag/2.70.1)`,
    fr_FR: `La réinitialisation du mot de passe fonctionne de nouveau lorsque SMTP est configuré. Kimai fait désormais confiance à chaque adresse activée sur l'interface web — adresses du réseau local, .local, Tor et domaines personnalisés — et refuse une requête dont l'hôte n'en fait pas partie. Le compte admin se récupère toujours avec Définir le mot de passe administrateur.

[Notes de version complètes](https://github.com/kimai/kimai/releases/tag/2.70.1)`,
  },
  migrations: {
    up: async () => {},
    down: IMPOSSIBLE,
  },
})
