// Génère un aperçu local de l'e-mail : node --experimental-strip-types emails/preview.mjs
import { writeFileSync } from 'node:fs'
import { acdInviteHtml } from './acd-invitation.ts'

const html = acdInviteHtml({
  greeting: 'Bonjour Claire,',
  docName: "Autorisation d'accès aux données de consommation — BOULANGERIE MARTIN",
  companies: ['BOULANGERIE MARTIN'],
  meters: 2,
  url: 'https://crm.dms-conseil.fr/signer?t=exemple',
  deadline: 'lundi 19 octobre 2026 à 15:04',
  mandate: true,
  essai: false,
  logo: 'https://crm.dms-conseil.fr/email/dms-logo.png',
  sender: { name: 'Émile Bréhant', phone: '06 12 34 56 78', email: 'emile@dms-conseil.fr' },
})
writeFileSync(process.argv[2] ?? 'acd-preview.html', html)
