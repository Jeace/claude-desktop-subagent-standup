// idle : le chef attend un message ; failed : interrompu ou en erreur
export type MemberStatus = 'idle' | 'working' | 'done' | 'failed'

export type Member = {
  // l'agentId du sous-agent, `lead` pour la boucle principale
  id: string
  name: string
  role: string
  status: MemberStatus
  activity: string
  toolCount: number
  report: string
  endedAt: number | null
}

declare module 'claude-code' {
  interface PluginState {
    'subagent-standup': {
      lead: Member
      crew: Member[]
      isDismissed: boolean
      // pourquoi l'appli a gardé caché le dernier panneau ouvert sans demande, vide sinon
      lastRefusal: string
      isHintShown: boolean
    }
  }
}
