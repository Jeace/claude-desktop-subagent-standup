import { describe, expect, mock, test } from 'claude-code/testing'
import type { AgentSpawnInput, On, TurnCompleteInput } from 'claude-code'

import { avatarSvg, personaFor, wrapText, type Pose } from '../hooks/cast'
import { describeTool, gist } from '../hooks/describe'

const PANE = {
  plugin: 'subagent-standup',
  component: 'Pane',
  requestId: 'standup',
  props: { title: 'Standup', isFocused: false, bodyColumns: 120, placement: 'dock', scroll: { offset: 0, bodyRows: 40 }, view: {} },
} as const

const POSES: Pose[] = ['idle', 'working', 'done']

const spawnOf = (description: string): AgentSpawnInput => ({
  tool_use_id: `tu-${description}`,
  prompt: 'Vérifie la logique de retry du client',
  description,
  subagentType: 'general-purpose',
  provider: { plugin: 'engine', tier: 'core' },
  parentModel: 'test-model',
  background: false,
  fork: false,
})

const answerOf = (agentId: string, answer: string, reason: 'answer' | 'aborted' = 'answer'): TurnCompleteInput => ({
  agentId, answer, reason, durationMs: 1000, isAborted: reason === 'aborted', turnId: `turn-${agentId}`,
})

const NARROW = 'ouvert sans demande sous 144 colonnes, 120 maintenant'

// le moteur sous le plugin : chaque sous-agent lancé reçoit agent-1, agent-2… ; ouvertures et notifications sont relevées
const engine = (on: On, { isPlaced = true } = {}) => {
  const opened: string[] = []
  const toasts: string[] = []
  let spawned = 0
  on('agent.spawn', () => ({ model: 'test-model', agentId: `agent-${++spawned}` }))
  on('turn.complete', ($, e) => ({ text: e.answer }))
  on('turn.start', ($, e) => ({ turnId: e.turnId }))
  on('ui.open', ($, e) => {
    opened.push(e.id)

    return { value: isPlaced ? { isPlaced: true } : { isPlaced: false, reason: NARROW } }
  })
  on('ui.toast', ($, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })

  return { opened, toasts, clock: mock.clock(on, { now: 1_000_000 }) }
}

const COMMAND = { command: 'standup', args: '', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 120 } } as const

// les répliques se lisent dans le texte alternatif des images : la bulle est dessinée dans le SVG
const altsOf = async (ui: { findAll: (query: { type: string }) => Promise<{ props: Record<string, unknown> }[]> }): Promise<string> =>
  (await ui.findAll({ type: 'Svg' })).map(svg => String(svg.props.alt)).join('\n')

describe('le panneau', () => {
  test('un sous-agent arrive, travaille, puis rend son rapport', async ($, on) => {
    const { opened } = engine(on)
    await $.agent.spawn(spawnOf('Vérif. du retry'))
    expect(opened).toEqual(['standup'])

    const desktop = await $.ui.mount({ ...PANE, surface: 'desktop' })
    expect((await desktop.findAll({ type: 'Svg' })).length).toBe(2)
    expect(await altsOf(desktop)).toMatch(/Vérif\. du retry : « Je lis mes consignes »/)
    expect(await desktop.find({ type: 'Text', text: /⚙ au travail/ })).toBeDefined()

    // l'écriture de l'état redessine le panneau monté
    await $.turn.complete(answerOf('agent-1', 'Pas de boucle infinie. Mais aucun backoff : cinq **retries** immédiats martèlent le serveur.'))
    expect(await desktop.find({ type: 'Text', text: /✓ terminé/ })).toBeDefined()
    expect(await altsOf(desktop)).toMatch(/« Pas de boucle infinie\. Mais aucun backoff : cinq retries immédiats martèlent le… »/)
  })

  test('les images ne sont pas des cadres interactifs, qui clignotent à chaque redessin', async ($, on) => {
    engine(on)
    await $.agent.spawn(spawnOf('Vérif. du retry'))
    const desktop = await $.ui.mount({ ...PANE, surface: 'desktop' })
    for (const svg of await desktop.findAll({ type: 'Svg' })) expect(svg.props.isInteractive).toBeFalsy()
  })

  test('le terminal reçoit une ligne par agent, sans SVG', async ($, on) => {
    engine(on)
    await $.agent.spawn(spawnOf('Profilage du login'))
    const terminal = await $.ui.mount({ ...PANE, surface: 'terminal' })
    expect(await terminal.find({ type: 'Text', text: /Claude · Chef/ })).toBeDefined()
    expect(await terminal.find({ type: 'Text', text: /Profilage du login — ⚙ au travail : Je lis mes consignes/ })).toBeDefined()
  })

  test('une mission interrompue est marquée comme telle', async ($, on) => {
    engine(on)
    await $.agent.spawn(spawnOf('Tests du panier'))
    await $.turn.complete(answerOf('agent-1', 'Un début de rapport', 'aborted'))
    const desktop = await $.ui.mount({ ...PANE, surface: 'desktop' })
    expect(await desktop.find({ type: 'Text', text: /✕ interrompu/ })).toBeDefined()
    expect(await altsOf(desktop)).toMatch(/« On m'a interrompu »/)
  })

  test('les outils du chef sont comptés, et le dernier est dans sa bulle', async ($, on) => {
    engine(on)
    on('tool.call', () => ({ result: 'ok' }) as never)
    await $.tool.call({ tool: 'Read', file_path: 'C:/projet/src/client.js' })
    await $.tool.call({ tool: 'Grep', pattern: 'retry' })
    const desktop = await $.ui.mount({ ...PANE, surface: 'desktop' })
    expect(await desktop.find({ type: 'Text', text: /⚙ au travail · 2 outils/ })).toBeDefined()
    expect(await altsOf(desktop)).toMatch(/Claude, Chef : « Je cherche « retry » »/)
  })

  test('/standup ouvre le panneau', async ($, on) => {
    const { opened, toasts } = engine(on)
    const ran = await $.command.run(COMMAND)
    expect(ran.text).toBe('Le standup est ouvert.')
    expect(opened).toEqual(['standup'])
    expect(toasts).toEqual([])
  })

  test('gardé caché par l’appli : une seule notification, et /standup en donne la raison', async ($, on) => {
    const { opened, toasts } = engine(on, { isPlaced: false })
    await $.agent.spawn(spawnOf('Première mission'))
    await $.agent.spawn(spawnOf('Deuxième mission'))
    expect(opened).toEqual(['standup', 'standup'])
    expect(toasts).toEqual(['Standup : vos sous-agents sont au travail, /standup pour les voir'])

    expect((await $.command.run(COMMAND)).text).toBe(`Le standup est ouvert. L'appli l'avait gardé caché : ${NARROW}`)
    // la raison n'est donnée qu'une fois
    expect((await $.command.run(COMMAND)).text).toBe('Le standup est ouvert.')
  })

  test('un agent fini quitte l’appel au premier tour après deux minutes', async ($, on) => {
    const { clock } = engine(on)
    await $.agent.spawn(spawnOf('Ancienne mission'))
    await $.turn.complete(answerOf('agent-1', 'Fait.'))
    const desktop = await $.ui.mount({ ...PANE, surface: 'desktop' })

    await clock.advance(60_000)
    await $.turn.start({ text: 'suite', turnId: 't-1' })
    expect(await desktop.find({ type: 'Text', text: /Ancienne mission/ })).toBeDefined()

    await clock.advance(61_000)
    await $.turn.start({ text: 'encore', turnId: 't-2' })
    expect(await desktop.find({ type: 'Text', text: /Ancienne mission/ })).toBeUndefined()
  })
})

describe('les textes', () => {
  test('une réplique par outil, sans jamais afficher une commande', () => {
    expect(describeTool({ tool: 'Read', file_path: 'C:\\projet\\src\\client.js' } as never)).toBe('Je lis client.js')
    expect(describeTool({ tool: 'Edit', file_path: '/srv/app/errors.js' } as never)).toBe('Je modifie errors.js')
    expect(describeTool({ tool: 'Bash', command: 'curl -H "Authorization: Bearer abc" x', description: 'Appelle l’API' } as never)).toBe('Appelle l’API')
    expect(describeTool({ tool: 'Bash', command: 'curl -H "Authorization: Bearer abc" x' } as never)).toBe('Je lance curl')
    expect(describeTool({ tool: 'WebFetch', url: 'https://example.com/a/b' } as never)).toBe('Je lis example.com')
    expect(describeTool({ tool: 'mcp__github__create_issue' } as never)).toBe("J'utilise create_issue")
  })

  test('le rapport en texte brut, coupé en fin de phrase', () => {
    expect(gist('## Bilan\n\nTout **va bien** : `npm test` passe.\n```\ncode\n```')).toBe('Bilan Tout va bien : npm test passe.')
    const long = `${'Une phrase assez longue pour remplir la bulle. '.repeat(5)}`
    expect(gist(long).endsWith('bulle.')).toBe(true)
    expect(gist(long).length).toBeLessThanOrEqual(180)
    expect(gist(long, 85)).toBe('Une phrase assez longue pour remplir la bulle.')
  })

  test('les lignes de la bulle tiennent dans la largeur et le nombre permis', () => {
    expect(wrapText('Je lis client.js', 27, 3)).toEqual(['Je lis client.js'])
    expect(wrapText('Pas de boucle infinie. Mais aucun backoff : cinq retries immédiats', 27, 3))
      .toEqual(['Pas de boucle infinie. Mais', 'aucun backoff : cinq', 'retries immédiats'])
    // un mot plus long qu'une ligne est tranché
    expect(wrapText('a'.repeat(30), 27, 3)).toEqual(['a'.repeat(27), 'aaa'])
    // au-delà de trois lignes, la dernière finit par …
    const lines = wrapText('mot '.repeat(40), 27, 3)
    expect(lines.length).toBe(3)
    expect(lines[2]?.endsWith('…')).toBe(true)
    for (const line of lines) expect(line.length).toBeLessThanOrEqual(27)
    expect(wrapText('   ', 27, 3)).toEqual([])
  })
})

describe('les personnages', () => {
  test('chaque forme et chaque pose donnent un SVG complet, sous la limite du panneau', () => {
    for (let i = 0; i < 40; i++) {
      for (const pose of POSES) {
        const svg = avatarSvg(personaFor(`agent-${i}`, i === 0), pose, 'Une réplique assez longue pour remplir les trois lignes de la bulle, et même déborder un peu')
        expect(svg.startsWith('<svg')).toBe(true)
        expect(svg.endsWith('</svg>')).toBe(true)
        expect(svg).not.toMatch(/undefined|NaN/)
        expect(svg.length).toBeLessThan(131072)
      }
    }
  })

  test('chaque url(#…) vise un id préfixé qui existe dans le même SVG', () => {
    for (let i = 0; i < 40; i++) {
      for (const pose of POSES) {
        const svg = avatarSvg(personaFor(`agent-${i}`, i === 0), pose, 'Bonjour')
        const ids = new Set([...svg.matchAll(/ id="([^"]+)"/g)].map(match => match[1]))
        for (const id of ids) expect(id).toMatch(/^sb-/)
        for (const [, target] of svg.matchAll(/url\(#([^)]+)\)/g)) expect(ids.has(target)).toBe(true)
      }
    }
  })

  test('la bulle n’apparaît qu’avec une réplique, et son texte est échappé', () => {
    const persona = personaFor('agent-3', false)
    expect(avatarSvg(persona, 'working')).not.toMatch(/<text/)
    const svg = avatarSvg(persona, 'working', 'Je cherche « <a href> & co »')
    expect(svg).toMatch(/<text[^>]*><tspan[^>]*>Je cherche « &lt;a href&gt; &amp; co/)
    expect(svg).not.toMatch(/<a href>/)
  })

  test('les poses changent ce qu’il faut', () => {
    const persona = personaFor('agent-7', false)
    // le clavier au travail, les étoiles à la fin
    expect(avatarSvg(persona, 'working')).toMatch(/fill="#d3d8e6"/)
    expect(avatarSvg(persona, 'idle')).not.toMatch(/fill="#d3d8e6"/)
    expect(avatarSvg(persona, 'done')).toMatch(/fill="#ff9bb8"/)
    expect(avatarSvg(persona, 'working', 'Je lis')).toBe(avatarSvg(persona, 'working', 'Je lis'))
  })
})
