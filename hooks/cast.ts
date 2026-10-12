// Décors et personnages repris d'agent-standup (github.com/Atoll92/agent-standup, licence MIT, © 2026 Arthur)
// Ses animations CSS sont réécrites en SMIL : le panneau affiche le SVG seul, sans la feuille de style de la page

export type Pose = 'idle' | 'working' | 'done'

export type Persona = {
  shirt: string
  shape: number
  accessory: number
  eye: number
  hasGlasses: boolean
  scene: number
  prop: number
  accent: string
  isLead: boolean
  delay: number
}

const PALETTE = ['#ff7a6b', '#ffb347', '#ffd84a', '#4fd1a5', '#4cc3ff', '#7c8cff', '#b583ff', '#ff7eb6']
const NAMES = ['Ada', 'Linus', 'Grace', 'Alan', 'Margaret', 'Dennis', 'Barbara', 'Ken', 'Radia', 'Tim', 'Hedy', 'Guido', 'Frances', 'Bjarne', 'Katherine', 'Brian', 'Sophie', 'Niklaus', 'Annie', 'Donald', 'Joan', 'Edsger', 'Lynn', 'Vint', 'Mae', 'Rob', 'Zoe', 'Ivan', 'Nina', 'Otto', 'Lena', 'Hugo', 'Ines', 'Théo', 'Maya', 'Jules', 'Alma', 'Remy', 'Cleo', 'Noah', 'Iris', 'Leo', 'Mira', 'Axel', 'Nora', 'Eli', 'Lou', 'Gaby']

// noUncheckedIndexedAccess : un index déjà borné par le modulo
const pick = <T>(list: readonly T[], index: number): T => list[index % list.length] as T

export const hash = (text: string): number => {
  let value = 2166136261
  for (const char of text) value = Math.imul(value ^ char.charCodeAt(0), 16777619)

  return value >>> 0
}

const toRgb = (hex: string): number[] => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16))

const mix = (from: string, to: string, ratio: number): string => {
  const target = toRgb(to)

  return '#' + toRgb(from).map((v, i) => Math.round(v + ((target[i] ?? v) - v) * ratio).toString(16).padStart(2, '0')).join('')
}

// le premier prénom libre à partir de l'empreinte de l'id, comme l'original
export const pickName = (id: string, taken: ReadonlySet<string>): string => {
  const start = hash(id)
  for (let k = 0; k < NAMES.length; k++) {
    const name = pick(NAMES, start + k)
    if (!taken.has(name)) return name
  }

  return `${pick(NAMES, start)} ${taken.size + 1}`
}

export const personaFor = (id: string, isLead: boolean): Persona => {
  const h = hash(id)
  const delay = (h % 45) / 10
  if (isLead) {
    return { shirt: '#e8845f', shape: 0, accessory: 1, eye: 0, hasGlasses: false, scene: 6, prop: 1, accent: '#f5c04a', isLead, delay }
  }

  return {
    shirt: pick(PALETTE, h >>> 6), shape: (h >>> 3) % 5, accessory: (h >>> 9) % 6, eye: (h >>> 12) % 3, hasGlasses: (h >>> 15) % 4 === 0,
    scene: (h >>> 18) % 6, prop: (h >>> 21) % 3, accent: pick(PALETTE, h >>> 24), isLead, delay,
  }
}

// ---------- animations SMIL ----------
const round = (n: number): number => Math.round(n * 100) / 100
const loop = (attribute: string, values: string, seconds: number, delay = 0, keyTimes = ''): string =>
  `<animate attributeName="${attribute}" values="${values}" dur="${seconds}s" begin="${round(-delay)}s" repeatCount="indefinite"${keyTimes && ` keyTimes="${keyTimes}"`}/>`
const twinkle = (seconds: number, delay = 0, base = 1): string => loop('opacity', `${base};.25;${base}`, seconds, delay)
const sway = (values: string, seconds: number, delay = 0): string =>
  `<animateTransform attributeName="transform" type="translate" values="${values}" dur="${seconds}s" begin="${round(-delay)}s" repeatCount="indefinite"/>`

const star = (x: number, y: number, s: number, fill = '#ffe58a', animation = ''): string =>
  `<path d="M${x} ${y - s}L${x + s * .3} ${y - s * .3}L${x + s} ${y}L${x + s * .3} ${y + s * .3}L${x} ${y + s}L${x - s * .3} ${y + s * .3}L${x - s} ${y}L${x - s * .3} ${y - s * .3}Z" fill="${fill}">${animation}</path>`
const gradient = (id: string, top: string, middle: string, bottom?: string): string =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/>${bottom ? `<stop offset=".55" stop-color="${middle}"/><stop offset="1" stop-color="${bottom}"/>` : `<stop offset="1" stop-color="${middle}"/>`}</linearGradient>`

// ---------- décors (viewBox 100×75) ----------
type Scene = { desk: [string, string]; svg: () => string }

const SCENES: Scene[] = [
  { desk: ['#c98a5a', '#9a6238'], svg: () => `<defs>${gradient('sb-s0', '#ffc2a8', '#ff93b4', '#9a7bff')}</defs><rect width="100" height="75" fill="url(#sb-s0)"/>
    <circle cx="74" cy="31" r="19" fill="#fff3d0" opacity=".22"/><circle cx="74" cy="31" r="11" fill="#fff3d0"/>
    <path d="M0 50Q24 34 48 48T100 44V75H0z" fill="#7b5fd6"/><path d="M0 57Q30 45 62 56T100 53V75H0z" fill="#5b46b8"/>
    <path d="M18 22q2-3 4 0M26 17q2-3 4 0" stroke="#5a3d8a" stroke-width=".8" fill="none" stroke-linecap="round"/>` },
  { desk: ['#6b6fa8', '#43467a'], svg: () => `<defs>${gradient('sb-s1', '#0d1230', '#2a2e68')}</defs><rect width="100" height="75" fill="url(#sb-s1)"/>
    ${([[12, 10, 1], [30, 18, .8], [58, 8, 1.1], [88, 22, .8], [72, 14, .7], [44, 24, .6], [8, 30, .7], [94, 8, .9]] as const).map(([x, y, r], i) => `<circle cx="${x}" cy="${y}" r="${round(r * .7)}" fill="#fff">${twinkle(3.2, i * .4)}</circle>`).join('')}
    <circle cx="80" cy="18" r="7" fill="#fff4cf"/><circle cx="83" cy="16" r="6.2" fill="#1d2150"/>
    <g fill="#161a45">${([[0, 40, 12], [12, 34, 9], [21, 44, 11], [32, 30, 8], [40, 41, 12], [52, 36, 9], [61, 45, 11], [72, 33, 10], [82, 42, 9], [91, 37, 10]] as const).map(([x, y, w]) => `<rect x="${x}" y="${y}" width="${w}" height="${75 - y}"/>`).join('')}</g>
    <g fill="#ffd36e">${Array.from({ length: 26 }, (_, i) => `<rect x="${3 + (i * 37) % 92}" y="${42 + (i * 13) % 14}" width="1.4" height="1.8" opacity="${round(.5 + (i % 3) * .2)}"/>`).join('')}</g>` },
  { desk: ['#caa27a', '#9c7650'], svg: () => `<defs>${gradient('sb-s2', '#ffeadb', '#ffd2b5')}${gradient('sb-w2', '#bfe9ff', '#eaf8ff')}</defs><rect width="100" height="75" fill="url(#sb-s2)"/>
    <rect x="9" y="9" width="30" height="30" rx="3" fill="#fff"/><rect x="11" y="11" width="26" height="26" rx="2" fill="url(#sb-w2)"/><path d="M24 11v26M11 24h26" stroke="#fff" stroke-width="1.6"/>
    <circle cx="30" cy="18" r="3.2" fill="#fff" opacity=".8"/>
    <rect x="62" y="22" width="32" height="2.4" rx="1" fill="#b98a64"/><rect x="62" y="40" width="32" height="2.4" rx="1" fill="#b98a64"/>
    ${([['#ff7a6b', 64, 12], ['#4cc3ff', 68, 14], ['#ffd84a', 72, 10], ['#7c8cff', 76, 13], ['#4fd1a5', 80, 11]] as const).map(([c, x, h]) => `<rect x="${x}" y="${22 - h}" width="3.6" height="${h}" rx=".8" fill="${c}"/>`).join('')}
    <path d="M70 40q-7-5-3-10q5 3 3 10zM74 40q3-8 9-6q-2 7-9 6z" fill="#46b97f"/>` },
  { desk: ['#b9e0c4', '#86be9a'], svg: () => `<defs>${gradient('sb-s3', '#bdf1ff', '#effff6')}</defs><rect width="100" height="75" fill="url(#sb-s3)"/>
    <g fill="#fff">${sway('0 0;9 0;0 0', 48)}<ellipse cx="22" cy="16" rx="9" ry="3.6"/><ellipse cx="28" cy="13.5" rx="6" ry="3.6"/><ellipse cx="74" cy="24" rx="8" ry="3"/><ellipse cx="79" cy="21.8" rx="5" ry="3"/></g>
    <path d="M0 48Q25 36 52 47T100 42V75H0z" fill="#7ddc9a"/><path d="M0 56Q30 46 64 56T100 52V75H0z" fill="#4fc482"/>
    <rect x="80" y="30" width="2.6" height="14" fill="#8a5a3a"/><circle cx="81.3" cy="27" r="8" fill="#3fae6c"/><circle cx="77" cy="30" r="5" fill="#4fc482"/>
    ${([[14, 56, '#ff7eb6'], [24, 59, '#ffd84a'], [36, 55, '#fff'], [48, 58, '#ff7eb6']] as const).map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="1.1" fill="${c}"/>`).join('')}` },
  { desk: ['#e6c48f', '#bf9a63'], svg: () => `<defs>${gradient('sb-s4', '#ffe9ae', '#a4e8ff')}</defs><rect width="100" height="75" fill="url(#sb-s4)"/>
    <circle cx="22" cy="22" r="9" fill="#fff6d6"/><path d="M0 46Q12 41 24 46T48 46T72 46T100 46V75H0z" fill="#3cb7d9"/><path d="M0 52Q12 47 24 52T48 52T72 52T100 52V75H0z" fill="#2a95c4"/>
    <path d="M70 42V26L82 42z" fill="#fff"/><path d="M69 43h14l-2 3H71z" fill="#c4705a"/><path d="M69 43V24" stroke="#8a5a3a" stroke-width=".8"/>` },
  { desk: ['#7a5ea8', '#4d3a7a'], svg: () => `<defs>${gradient('sb-s5', '#190f3d', '#4c2183')}</defs><rect width="100" height="75" fill="url(#sb-s5)"/>
    ${Array.from({ length: 16 }, (_, i) => `<circle cx="${(i * 53) % 97 + 2}" cy="${(i * 29) % 50 + 3}" r=".7" fill="#fff">${twinkle(3.2, i * .3)}</circle>`).join('')}
    <circle cx="22" cy="26" r="11" fill="#ff9bb8"/><ellipse cx="22" cy="26" rx="18" ry="3.6" fill="none" stroke="#ffe0a8" stroke-width="1.6" transform="rotate(-18 22 26)"/><path d="M13 22q9 4 18 1" stroke="#e86f98" stroke-width="1.4" fill="none"/>
    <circle cx="80" cy="20" r="6" fill="#6fd3ff"/><circle cx="77.5" cy="18" r="1.4" fill="#4ab6e6"/>${star(60, 14, 3)}${star(90, 40, 2.2, '#cfc2ff')}` },
  // le bureau du chef : les fenêtres de la ville la nuit
  { desk: ['#506b73', '#2f4850'], svg: () => `<defs>${gradient('sb-s6', '#10282f', '#18444f')}</defs><rect width="100" height="75" fill="url(#sb-s6)"/>
    <rect x="9" y="-6" width="82" height="42" rx="3" fill="#0a1a1f"/>
    ${([[12, 22, 9], [22, 31, 8], [68, 27, 9], [78, 19, 9]] as const).map(([x, h, w], i) => `<rect x="${x}" y="${36 - h}" width="${w}" height="${h}" fill="${i % 2 ? '#15373f' : '#123038'}"/>`
      + [0, 1, 2].map(r => `<rect x="${round(x + 1.6 + ((i + r) % 2) * 3.4)}" y="${round(39 - h + r * 6.4)}" width="1.8" height="2.4" rx=".4" fill="#ffd84a" opacity="${r === 1 ? '.9' : '.5'}">${r === 1 ? twinkle(3.2, i * .8, .9) : ''}</rect>`).join('')).join('')}
    <path d="M36.6 0V36M63.4 0V36" stroke="#2b6a78" stroke-width="1.2"/><rect x="9" y="-6" width="82" height="42" rx="3" fill="none" stroke="#2b6a78" stroke-width="1.2"/>` },
]

// ---------- personnages ----------
const SHAPES = [{ top: 20, fy: 40, hw: 23 }, { top: 14, fy: 35, hw: 19 }, { top: 15, fy: 41, hw: 24 }, { top: 16, fy: 40, hw: 22 }, { top: 22, fy: 40, hw: 22 }]
const EYES = [{ rx: 3.1, ry: 4.3 }, { rx: 3.7, ry: 3.7 }, { rx: 2.5, ry: 5 }]

const BODIES: ((fill: string, dark: string) => string)[] = [
  (fill) => `<rect x="27" y="20" width="46" height="56" rx="22" fill="${fill}"/>`,
  (fill) => `<rect x="31" y="14" width="38" height="64" rx="19" fill="${fill}"/>`,
  (fill) => `<g fill="${fill}"><circle cx="38" cy="36" r="13"/><circle cx="50" cy="29" r="15"/><circle cx="62" cy="36" r="13"/><rect x="26" y="36" width="48" height="40" rx="12"/></g>`,
  (fill) => `<path d="M28 78V38a22 22 0 0 1 44 0V78z" fill="${fill}"/>`,
  // le robot, avec son antenne qui clignote
  (fill, dark) => `<rect x="28" y="22" width="44" height="54" rx="11" fill="${fill}"/><rect x="23.5" y="36" width="4.4" height="11" rx="2.2" fill="${dark}"/><rect x="72.1" y="36" width="4.4" height="11" rx="2.2" fill="${dark}"/><path d="M50 22V13" stroke="${dark}" stroke-width="1.5" stroke-linecap="round"/><circle cx="50" cy="11.4" r="2.8" fill="#8ff0ff">${twinkle(1.7)}</circle>`,
]

type Accessory = (top: number, color: string, faceY: number, halfWidth: number) => string

const ACCESSORIES: Accessory[] = [
  (t) => `<path d="M50 ${t + 1}v-7" stroke="#3a9d68" stroke-width="1.6" stroke-linecap="round"/><path d="M50 ${t - 5}q-8-1-8-8q7 0 8 8z" fill="#53c98a"/><path d="M50 ${t - 5}q8-1 8-8q-7 0-8 8z" fill="#3fb677"/>`,
  (t, c, fy, hw) => `<path d="M${50 - hw - .5} ${fy - 3}Q${50 - hw} ${t - 7} 50 ${t - 7}Q${50 + hw} ${t - 7} ${50 + hw + .5} ${fy - 3}" fill="none" stroke="#2c2f40" stroke-width="3" stroke-linecap="round"/>
    <rect x="${50 - hw - 4}" y="${fy - 7}" width="7" height="14" rx="3.5" fill="${c}" stroke="#2c2f40" stroke-width="1.4"/><rect x="${50 + hw - 3}" y="${fy - 7}" width="7" height="14" rx="3.5" fill="${c}" stroke="#2c2f40" stroke-width="1.4"/>`,
  (t, c) => `<path d="M30 ${t + 11}Q30 ${t - 9} 50 ${t - 9}Q70 ${t - 9} 70 ${t + 11}z" fill="${c}"/><rect x="29" y="${t + 7}" width="42" height="7" rx="3.5" fill="${mix(c, '#000000', .16)}"/><circle cx="50" cy="${t - 10}" r="4" fill="${mix(c, '#ffffff', .45)}"/>`,
  (t, c) => `<path d="M31 ${t + 8}Q31 ${t - 8} 50 ${t - 8}Q69 ${t - 8} 69 ${t + 8}z" fill="${c}"/><path d="M45 ${t + 7}q22-3 30 3q-12 3-30-1z" fill="${mix(c, '#000000', .16)}"/>`,
  (t, c) => `<g transform="translate(60 ${t + 3}) rotate(14)"><path d="M0 0L-9-5V5z" fill="${c}"/><path d="M0 0L9-5V5z" fill="${c}"/><circle r="2.6" fill="${mix(c, '#000000', .18)}"/></g>`,
  (t, c) => `<path d="M44 ${t + 2}L40 ${t - 8}M56 ${t + 2}L60 ${t - 8}" stroke="#2c2f40" stroke-width="1.2" stroke-linecap="round"/><circle cx="40" cy="${t - 9}" r="2.4" fill="${c}"/><circle cx="60" cy="${t - 9}" r="2.4" fill="${c}"/>`,
]

const PROPS = [
  `<path d="M11 62.4l1.6-7.4h7.2l1.6 7.4z" fill="#e07a5f"/><path d="M16 55q-6-8-2-12q5 4 2 12z" fill="#3fbf7f"/><path d="M16 55q6-7 10-5q-1 6-10 5z" fill="#53c98a"/>`,
  `<rect x="79" y="55.6" width="7.4" height="6.8" rx="1.6" fill="#f6f2ea"/><path d="M86.2 57q3.2 0 3.2 2.2t-3.2 2.2" fill="none" stroke="#f6f2ea" stroke-width="1.3"/><g fill="none" stroke="#fff" stroke-width=".8" stroke-linecap="round" opacity=".7">${sway('0 0;0 -1.4;0 0', 2.6)}${loop('opacity', '.7;.25;.7', 2.6)}<path d="M81.5 53q-1.4-1.8 0-3.4M84.3 53q-1.4-1.8 0-3.4"/></g>`,
  `<rect x="76" y="58.2" width="14" height="4.2" rx="1" fill="#ff7a6b"/><rect x="77.5" y="54.4" width="12" height="3.8" rx="1" fill="#4cc3ff"/><rect x="76.5" y="50.8" width="11" height="3.6" rx="1" fill="#ffd84a"/>`,
]

const SPARKS = star(22, 28, 3, '#ffe58a', twinkle(1.6)) + star(78, 22, 2.6, '#ff9bb8', twinkle(1.6, .4))
  + star(70, 40, 1.9, '#9be7ff', twinkle(1.6, .8)) + star(30, 46, 1.6, '#ffe58a', twinkle(1.6, 1.2))

// ---------- bulle ----------
const BUBBLE_FONT = 4.2
const BUBBLE_LINE = 5.2
// largeur moyenne d'un caractère à cette taille : la police est celle de l'appli, on ne peut pas mesurer
const CHAR_WIDTH = 2.15
const BUBBLE_CHARS = 27
const BUBBLE_LINES = 3

const escapeXml = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// des lignes coupées au mot ; un mot trop long est tranché, et la dernière ligne finit par … si ça déborde
export const wrapText = (text: string, maxChars: number, maxLines: number): string[] => {
  const lines: string[] = []
  let line = ''
  for (const word of text.split(/\s+/).filter(Boolean)) {
    for (let rest = word; rest; rest = rest.slice(maxChars)) {
      const piece = rest.slice(0, maxChars)
      if (line && line.length + 1 + piece.length <= maxChars) {
        line += ` ${piece}`
      } else {
        if (line) lines.push(line)
        line = piece
      }
    }
  }
  if (line) lines.push(line)
  if (lines.length <= maxLines) return lines

  const kept = lines.slice(0, maxLines)
  kept[maxLines - 1] = `${(kept[maxLines - 1] ?? '').slice(0, maxChars - 1).trimEnd()}…`

  return kept
}

// la bulle en haut à gauche, sa queue pointée vers la bouche sans la couvrir
const bubble = (speech: string, mouthY: number): string => {
  const lines = wrapText(speech, BUBBLE_CHARS, BUBBLE_LINES)
  if (!lines.length) return ''

  const x = 3, y = 3
  const width = round(Math.min(66, Math.max(...lines.map(line => line.length)) * CHAR_WIDTH + 7))
  const bottom = round(y + lines.length * BUBBLE_LINE + 3.4)
  const baseX = Math.min(x + width - 9, 28)
  // un tiers du chemin vers la bouche : la pointe s'arrête au bord de la tête
  const tipX = round(baseX + 3 + (50 - baseX - 3) * .32), tipY = round(bottom + (mouthY - bottom) * .32)
  const text = lines.map((line, i) => `<tspan x="${x + 3.5}" dy="${i ? BUBBLE_LINE : 0}">${escapeXml(line)}</tspan>`).join('')

  return `<rect x="${x}" y="${y}" width="${width}" height="${round(bottom - y)}" rx="3.5" fill="#fff" stroke="#2a2233" stroke-width=".5"/>`
    + `<path d="M${baseX} ${bottom - .6}L${tipX} ${tipY}L${baseX + 6} ${bottom - .6}z" fill="#fff"/>`
    + `<path d="M${baseX} ${bottom}L${tipX} ${tipY}L${baseX + 6} ${bottom}" fill="none" stroke="#2a2233" stroke-width=".5" stroke-linejoin="round"/>`
    + `<text y="${y + 5.3}" font-size="${BUBBLE_FONT}" fill="#1d1f29">${text}</text>`
}

// un SVG autonome par personnage, pose et réplique : même entrée, même texte, et l'image redessinée sort du cache
// ids préfixés « sb- » : l'appli efface un id homonyme d'une propriété de la page (« body »), et le dégradé disparaît
export const avatarSvg = (persona: Persona, pose: Pose, speech = ''): string => {
  const { fy, top, hw } = pick(SHAPES, persona.shape)
  const isBot = persona.shape === 4, isWorking = pose === 'working', isDone = pose === 'done'
  const light = mix(persona.shirt, '#ffffff', .3), dark = mix(persona.shirt, '#000000', .2)
  const ink = isBot ? '#8ff0ff' : '#2a2233', mouthInk = isBot ? '#8ff0ff' : '#4b1c2c'
  const scene = pick(SCENES, persona.scene), { rx, ry } = pick(EYES, persona.eye)
  const [leftX, rightX] = persona.shape === 1 ? [43, 57] as const : [41.5, 58.5] as const

  // le clignement : l'œil s'écrase et ses reflets disparaissent un instant
  const blink = (from: number) => loop('ry', `${from};${from};${round(from * .08)};${from}`, 4.6, persona.delay, '0;.94;.97;1')
  const eye = (x: number) => `<ellipse cx="${x}" cy="${fy}" rx="${rx}" ry="${ry}" fill="${ink}">${blink(ry)}</ellipse>`
    + `<g${isWorking ? ' transform="translate(0 1.2)"' : ''}>${loop('opacity', '1;1;0;1', 4.6, persona.delay, '0;.94;.97;1')}<circle cx="${x + 1}" cy="${fy - 1.5}" r="1.1" fill="#fff"/><circle cx="${x - 1}" cy="${fy + 1.4}" r=".55" fill="#fff" opacity=".7"/></g>`
  const happy = (x: number) => `<path d="M${round(x - 3.6)} ${fy + 1.4}Q${x} ${fy - 4.2} ${round(x + 3.6)} ${fy + 1.4}" fill="none" stroke="${ink}" stroke-width="1.7" stroke-linecap="round"/>`
  // au travail, les sourcils se froncent
  const brow = (x: number, tilt: number) => `<path d="M${round(x - 3.6)} ${round(fy - ry - 3)}q3.6-2 7.2 0" fill="none" stroke="${ink}" stroke-width="1.4" stroke-linecap="round"${isWorking ? ` transform="translate(0 .5) rotate(${tilt} ${x} ${round(fy - ry - 3.5)})"` : ''}/>`

  const mouthY = fy + 10.5
  const cheeks = isBot
    ? '<rect x="33" y="29" width="34" height="26" rx="9" fill="#1d2138"/>'
    : `<ellipse cx="${leftX - 6}" cy="${fy + 6}" rx="3.3" ry="2" fill="#ff6f91" opacity=".34"/><ellipse cx="${rightX + 6}" cy="${fy + 6}" rx="3.3" ry="2" fill="#ff6f91" opacity=".34"/>`
  const face = cheeks
    + (isDone ? happy(leftX) + happy(rightX) : eye(leftX) + eye(rightX))
    + brow(leftX, 13) + brow(rightX, -13)
    + (isDone
      ? `<path d="M44.5 ${mouthY - .6}q5.5 8 11 0z" fill="${mouthInk}"/>`
      : `<path d="M46 ${mouthY}q4 3.6 8 0" fill="none" stroke="${ink}" stroke-width="1.6" stroke-linecap="round"/>`)
    + (persona.hasGlasses ? `<g fill="rgba(255,255,255,.16)" stroke="#2c2f40" stroke-width="1.1"><circle cx="${leftX}" cy="${fy}" r="6.2"/><circle cx="${rightX}" cy="${fy}" r="6.2"/><path d="M${leftX + 6.2} ${fy}h${round(rightX - leftX - 12.4)}" fill="none"/></g>` : '')

  // le micro-casque du chef
  const headset = persona.isLead
    ? `<path d="M${50 - hw} ${fy + 5}q-2 11 13 12" fill="none" stroke="#2c2f40" stroke-width="1.2" stroke-linecap="round"/><circle cx="${50 - hw + 13}" cy="${fy + 17}" r="1.9" fill="#2c2f40"/>`
    : ''
  const accessory = pick(ACCESSORIES, persona.accessory)(top, persona.accent, fy, hw) + headset
  const arm = (x: number, angle: number) => `<ellipse cx="${x}" cy="56" rx="4.6" ry="9" fill="${dark}" transform="rotate(${angle} ${x} 56)"/>`
  // au travail les bras passent sur le clavier
  const arms = isWorking ? ['', ''] : [arm(25, 12), arm(75, -12)]
  const laptop = `<rect x="33" y="46" width="34" height="18" rx="2.8" fill="#d3d8e6"/><rect x="33" y="46" width="34" height="18" rx="2.8" fill="url(#sb-gloss)" opacity=".5"/><circle cx="50" cy="55" r="2.3" fill="${light}"/><rect x="29.5" y="63.4" width="41" height="3" rx="1.5" fill="#aab1c2"/>`
  const hands = [38, 62].map((x, i) => `<circle cx="${x}" cy="65.6" r="3.1" fill="${dark}">${loop('cy', '65.6;64.3;65.6', .34, i * .17)}</circle>`).join('')

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 75" preserveAspectRatio="xMidYMid slice">
<defs><linearGradient id="sb-body" gradientUnits="userSpaceOnUse" x1="0" y1="12" x2="0" y2="72"><stop offset="0" stop-color="${light}"/><stop offset="1" stop-color="${persona.shirt}"/></linearGradient>
<linearGradient id="sb-desk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${scene.desk[0]}"/><stop offset="1" stop-color="${scene.desk[1]}"/></linearGradient>
<linearGradient id="sb-gloss" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>
${scene.svg()}
<g>${sway('0 0;0 -0.9;0 0', 4.4, persona.delay)}${arms[0]}${pick(BODIES, persona.shape)('url(#sb-body)', dark)}${arms[1]}${face}${accessory}</g>
<rect y="62" width="100" height="13" fill="url(#sb-desk)"/><rect y="62" width="100" height="1.3" fill="#fff" opacity=".38"/><rect y="63.3" width="100" height="2.6" fill="#000" opacity=".1"/>
${pick(PROPS, persona.prop)}${isWorking ? laptop + hands : ''}${isDone ? SPARKS : ''}${bubble(speech, mouthY)}
</svg>`
}
