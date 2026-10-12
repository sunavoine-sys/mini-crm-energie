// Modèle de l'e-mail « invitation à signer l'ACD », aux couleurs du nouveau CRM.
// Destiné à remplacer le HTML de deliver() dans la fonction Supabase `acd`.
// Contraintes e-mail : tableaux, styles en ligne, pas de CSS externe, largeur 560 px.

export interface AcdInviteData {
  greeting: string // « Bonjour Claire, » ou « Bonjour, »
  docName: string // « Autorisation d'accès aux données de consommation — BOULANGERIE MARTIN »
  companies: string[] // raisons sociales concernées
  meters: number // nombre de compteurs (PDL/PCE)
  url: string // lien de signature unique
  deadline: string // « lundi 19 octobre 2026 à 15:04 »
  mandate: boolean // clause de mandat facultative présente
  essai: boolean
  logo: string
  sender: { name: string; phone: string; email: string }
}

const esc = (s: string) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

const C = {
  bg: '#F3F5F4',
  card: '#FFFFFF',
  ink: '#0F1A1F',
  muted: '#5E6B70',
  faint: '#8A969A',
  line: '#E4E8E6',
  teal: '#1F8A80',
  tealSoft: '#E8F4F2',
  night: '#0E2135',
}
const FONT = "'Geist','Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif"

export function acdInviteHtml(d: AcdInviteData) {
  const companies = d.companies.filter(Boolean)
  const scope = [companies.length > 1 ? `${companies.length} sociétés` : companies[0], `${d.meters} compteur${d.meters > 1 ? 's' : ''}`].filter(Boolean).join(' · ')
  const initials = d.sender.name.split(/\s+/).map((p) => p[0] ?? '').join('').slice(0, 2).toUpperCase()

  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(d.docName)}</title></head>
<body style="margin:0;padding:0;background:${C.bg};-webkit-font-smoothing:antialiased">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">Document à signer : ${esc(d.docName)} — avant le ${esc(d.deadline)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};padding:32px 12px;font-family:${FONT};color:${C.ink}">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">

<!-- En-tête : marque -->
<tr><td style="padding:0 4px 18px">
  <table role="presentation" cellpadding="0" cellspacing="0"><tr>
    <td style="vertical-align:middle"><img src="${d.logo}" width="32" height="32" alt="DMS" style="display:block;border-radius:8px;border:0"></td>
    <td style="vertical-align:middle;padding-left:10px;font-size:14px;font-weight:600;letter-spacing:-0.01em;color:${C.ink}">DMS Conseil</td>
  </tr></table>
</td></tr>

<!-- Carte principale -->
<tr><td style="background:${C.card};border:1px solid ${C.line};border-radius:14px;padding:36px 36px 30px">
  ${d.essai ? `<div style="margin:0 0 20px;padding:10px 14px;border-radius:8px;background:#FDF0EC;color:#9A2A14;font-size:13px;line-height:1.5"><b>ESSAI</b> — tu t'envoies ce document pour voir ce que reçoit le client. Rien ne sera enregistré sur une fiche.</div>` : ''}
  <div style="display:inline-block;padding:4px 10px;border-radius:999px;background:${C.tealSoft};color:${C.teal};font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase">Signature électronique</div>
  <h1 style="margin:16px 0 8px;font-size:22px;line-height:1.3;font-weight:600;letter-spacing:-0.02em;color:${C.ink}">${esc(d.greeting)}</h1>
  <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:${C.muted}">DMS Conseil vous invite à signer le document ci-dessous. Cela prend moins d'une minute.</p>

  <!-- Document -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${C.line};border-radius:10px">
    <tr><td style="padding:16px 18px">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td style="vertical-align:top;padding-right:14px">
          <div style="width:40px;height:48px;border-radius:6px;background:${C.tealSoft};border:1px solid #CFE7E3;text-align:center;line-height:48px;font-size:10px;font-weight:700;color:${C.teal};letter-spacing:0.04em">PDF</div>
        </td>
        <td style="vertical-align:top">
          <div style="font-size:14px;line-height:1.45;font-weight:600;color:${C.ink}">${esc(d.docName)}</div>
          <div style="margin-top:4px;font-size:13px;line-height:1.45;color:${C.faint}">${esc(scope)}</div>
        </td>
      </tr></table>
    </td></tr>
  </table>

  <!-- Bouton -->
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:26px 0 0"><tr>
    <td style="border-radius:8px;background:${C.teal}">
      <a href="${d.url}" style="display:inline-block;padding:13px 26px;font-size:14px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:8px">Lire et signer le document&nbsp;&nbsp;→</a>
    </td>
  </tr></table>

  <p style="margin:18px 0 0;font-size:13px;line-height:1.55;color:${C.muted}">
    <span style="color:${C.ink};font-weight:600">À signer avant le ${esc(d.deadline)}.</span>
    ${d.mandate ? '<br>La clause de mandat exclusif est facultative : elle a sa propre case.' : ''}
  </p>

  <!-- Expéditeur -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:30px;border-top:1px solid ${C.line}">
    <tr><td style="padding-top:22px">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td style="vertical-align:top;padding-right:14px">
          <div style="width:40px;height:40px;border-radius:999px;background:${C.night};color:#FFFFFF;text-align:center;line-height:40px;font-size:13px;font-weight:600">${esc(initials || 'D')}</div>
        </td>
        <td style="vertical-align:top;font-size:13px;line-height:1.6;color:${C.muted}">
          <div style="font-size:14px;font-weight:600;color:${C.ink}">${esc(d.sender.name)}</div>
          <div style="color:${C.teal};font-weight:600">Conseiller en énergie · Électricité &amp; gaz</div>
          ${d.sender.phone ? `<a href="tel:${esc(d.sender.phone.replace(/[^\d+]/g, ''))}" style="color:${C.muted};text-decoration:none">${esc(d.sender.phone)}</a> · ` : ''}<a href="mailto:${esc(d.sender.email)}" style="color:${C.muted};text-decoration:none">${esc(d.sender.email)}</a>
        </td>
      </tr></table>
    </td></tr>
  </table>
</td></tr>

<!-- Pied -->
<tr><td style="padding:22px 8px 0;font-size:12px;line-height:1.6;color:${C.faint};text-align:center">
  Signature électronique simple conforme au règlement eIDAS (n° 910/2014).<br>
  Ce lien vous est personnel : ne le transférez pas.<br>
  <a href="https://dms-conseil.fr" style="color:${C.teal};text-decoration:none;font-weight:600">dms-conseil.fr</a> · Le bon contrat au bon moment
</td></tr>

</table>
</td></tr></table>
</body></html>`
}
