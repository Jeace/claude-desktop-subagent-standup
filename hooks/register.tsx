import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Member, MemberStatus } from '../types'
import { avatarSvg, personaFor, pickName, type Pose } from './cast'
import { describeTool, gist } from './describe'

const PANE = 'standup'
const TITLE = 'Standup'
const LEAD = 'lead'
// un sous-agent fini quitte l'appel au tour suivant s'il a fini depuis deux minutes
const VANISH_MS = 120_000
// chaque tuile pèse quelques Ko de SVG : on borne leur nombre
const MAX_TILES = 9
// l'appli mesure les boîtes en caractères : 36 ch couvrent à peu près les 280 px de l'image
const TILE_WIDTH = 280
const TILE_HEIGHT = 210
const TILE_COLUMNS = 36
// le rapport tient dans la bulle : trois lignes d'une trentaine de caractères
const REPORT_CHARS = 85

const POSES: Record<MemberStatus, Pose> = { idle: 'idle', working: 'working', done: 'done', failed: 'idle' }
const BADGES: Record<MemberStatus, string> = { idle: '◌', working: '⚙', done: '✓', failed: '✕' }
const LABELS: Record<MemberStatus, string> = { idle: 'en attente', working: 'au travail', done: 'terminé', failed: 'interrompu' }
const COLORS: Record<MemberStatus, string> = { idle: '#8b93a7', working: '#ffd24a', done: '#58d68d', failed: '#ff6b6b' }

const newMember = (id: string, name: string, role: string, status: MemberStatus): Member =>
  ({ id, name, role, status, activity: '', toolCount: 0, report: '', endedAt: null })

// l'analyse du module veut le nom du plugin et la clé en littéraux
const lead = atom({ plugin: 'subagent-standup', key: 'lead' } as const, newMember(LEAD, 'Claude', 'Chef', 'idle'))
const crew = atom({ plugin: 'subagent-standup', key: 'crew' } as const, [])
const isDismissed = atom({ plugin: 'subagent-standup', key: 'isDismissed' } as const, false)
const lastRefusal = atom({ plugin: 'subagent-standup', key: 'lastRefusal' } as const, '')
const isHintShown = atom({ plugin: 'subagent-standup', key: 'isHintShown' } as const, false)

// dès que Claude se met au travail, sauf fermé à la main ou déjà affiché
const openOnWork = async ($: EngineInterface): Promise<void> => {
  if (await read($, isDismissed)) return
  if ((await $.ui.panes()).some(pane => pane.id === PANE && pane.isPlaced)) return

  const opened = await $.ui.open({ id: PANE, title: TITLE })
  if (opened.isPlaced) return

  // ouvert sans demande, il peut rester caché (fenêtre étroite) : on le signale une fois par session
  await update($, lastRefusal, () => opened.reason)
  if (await read($, isHintShown)) return
  await update($, isHintShown, () => true)
  $.ui.toast('Standup : Claude est au travail, /standup pour le voir')
}

// sans agentId c'est la boucle principale ; un id inconnu (fork du moteur, compaction) ne change rien
const touch = async ($: EngineInterface, agentId: string | undefined, change: (member: Member) => Member): Promise<void> => {
  if (agentId === undefined) {
    await update($, lead, change)

    return
  }
  await update($, crew, list => (list.some(member => member.id === agentId)
    ? list.map(member => (member.id === agentId ? change(member) : member))
    : list))
}

// on garde ceux qui travaillent et ceux finis depuis peu
const prune = (list: Member[], now: number): Member[] =>
  list.filter(member => member.endedAt === null || now - member.endedAt < VANISH_MS)

// le chef, puis les sous-agents au travail dans leur ordre d'arrivée, puis les derniers finis
const onStage = (chief: Member, list: Member[]): Member[] => [
  chief,
  ...[...list.filter(member => member.endedAt === null), ...list.filter(member => member.endedAt !== null).reverse()].slice(0, MAX_TILES - 1),
]

// sa réplique : le début de son rapport une fois fini, sinon ce qu'il est en train de faire
const speechOf = (member: Member): string => member.report || member.activity

const statusLine = (member: Member): string =>
  `${BADGES[member.status]} ${LABELS[member.status]}${member.toolCount ? ` · ${member.toolCount} outil${member.toolCount > 1 ? 's' : ''}` : ''}`

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'standup', description: 'Ouvre le panneau où vos sous-agents travaillent en visio' })

    return next(e)
  })

  on('command.run', { command: 'standup' }, async $ => {
    await update($, isDismissed, () => false)
    await $.ui.open({ id: PANE, title: TITLE })
    // la raison donnée par l'appli quand le panneau n'est pas venu seul
    const refusal = await read($, lastRefusal)
    await update($, lastRefusal, () => '')

    return { text: refusal ? `Le standup est ouvert. L'appli l'avait gardé caché : ${refusal}` : 'Le standup est ouvert.' }
  })

  // fermé à la main : il ne se rouvre plus tout seul, jusqu'au prochain /standup
  on('ui.close', { id: PANE }, async ($, e, next) => {
    if (e.origin.kind === 'person') await update($, isDismissed, () => true)

    return next(e)
  })

  // un message tapé l'ouvre : une ouverture demandée, affichée quelle que soit la largeur de la fenêtre
  on('prompt.submit', async ($, e, next) => {
    await openOnWork($)

    return next(e)
  })

  on('turn.start', async ($, e, next) => {
    const now = await $.clock.now()
    await update($, lead, (member): Member => ({ ...member, status: 'working', activity: 'Je réfléchis…', endedAt: null }))
    await update($, crew, list => prune(list, now))
    // un tour lancé sans message tapé (notification, reprise) l'ouvre aussi
    await openOnWork($)

    return next(e)
  })

  on('agent.spawn', async ($, e, next) => {
    const started = await next(e)
    if (started.deny !== undefined || started.agentId === undefined) return started

    const agentId = started.agentId
    await update($, crew, list => [
      ...list,
      { ...newMember(agentId, pickName(agentId, new Set(list.map(member => member.name))), e.description, 'working'), activity: 'Je lis mes consignes' },
    ])

    return started
  })

  on('tool.call', async ($, e, next) => {
    const activity = describeTool(e)
    await touch($, e.agentId, member => ({ ...member, status: 'working', activity, toolCount: member.toolCount + 1, endedAt: null }))

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const isFailed = e.reason !== 'answer'
    if (e.agentId === undefined) {
      await touch($, undefined, member => ({ ...member, status: 'idle', activity: isFailed ? "On m'a interrompu" : "J'attends ta réponse" }))
    } else {
      const now = await $.clock.now()
      await touch($, e.agentId, member => ({
        ...member,
        status: isFailed ? 'failed' : 'done',
        activity: isFailed ? "On m'a interrompu" : 'Terminé !',
        report: isFailed ? '' : gist(e.answer, REPORT_CHARS),
        endedAt: now,
      }))
    }

    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const members = onStage(await read($, lead), await read($, crew))

    // le terminal ne dessine pas de SVG : une ligne par agent
    if (e.surface === 'terminal') {
      const { Box, Text } = $.ui.resolve(e)

      return (
        <Box flexDirection="column">
          {members.map(member => (
            <Text key={member.id} color={COLORS[member.status]} wrap="truncate-end">
              {member.name} · {member.role} — {statusLine(member)} : {speechOf(member)}
            </Text>
          ))}
        </Box>
      )
    }

    const { Box, Svg, Text } = $.ui.resolve(e)

    return (
      <Box flexDirection="row" flexWrap="wrap" gap={1}>
        {members.map(member => (
          <Box key={member.id} flexDirection="column" width={TILE_COLUMNS}>
            {/* une image et non un cadre interactif : l'appli redessine tout le panneau, un cadre se recharge à vide et clignote */}
            <Svg
              source={avatarSvg(personaFor(member.id, member.id === LEAD), POSES[member.status], speechOf(member))}
              alt={`${member.name}, ${member.role} : « ${speechOf(member)} »`}
              width={TILE_WIDTH}
              height={TILE_HEIGHT}
            />
            <Box flexDirection="row" gap={1}>
              <Text bold>{member.name}</Text>
              <Text dimColor wrap="truncate-end">{member.role}</Text>
            </Box>
            <Text color={COLORS[member.status]} wrap="truncate-end">{statusLine(member)}</Text>
          </Box>
        ))}
      </Box>
    )
  })
}
