// Ce qu'on affiche sous un personnage : son action en cours, et le début de son rapport

// tous les outils ont un nom ; le reste est lu champ par champ, la liste des outils changeant d'une version à l'autre
type ToolInput = { readonly tool: string }

const field = (input: ToolInput, key: string): string => {
  const value = (input as Record<string, unknown>)[key]

  return typeof value === 'string' ? value : ''
}

const clip = (text: string, max: number): string => (text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`)

const baseName = (path: string): string => path.split(/[\\/]/).pop() || path

const hostOf = (url: string): string => {
  try {
    return new URL(url).hostname
  } catch {
    return clip(url, 32)
  }
}

// ce que l'agent dit dans sa bulle pendant qu'il utilise l'outil
export const describeTool = (input: ToolInput): string => {
  const path = field(input, 'file_path') || field(input, 'notebook_path')

  switch (input.tool) {
    case 'Read':
      return `Je lis ${baseName(path)}`
    case 'Edit':
    case 'MultiEdit':
    case 'NotebookEdit':
      return `Je modifie ${baseName(path)}`
    case 'Write':
      return `J'écris ${baseName(path)}`
    case 'Bash':
    case 'PowerShell': {
      // la description plutôt que la commande, qui peut porter un jeton
      const description = field(input, 'description')

      return description ? clip(description, 60) : `Je lance ${field(input, 'command').trim().split(/\s+/)[0] ?? 'une commande'}`
    }
    case 'Grep':
      return `Je cherche « ${clip(field(input, 'pattern'), 32)} »`
    case 'Glob':
      return `Je cherche ${clip(field(input, 'pattern'), 32)}`
    case 'WebFetch':
      return `Je lis ${hostOf(field(input, 'url'))}`
    case 'WebSearch':
      return `Je cherche « ${clip(field(input, 'query'), 32)} » sur le web`
    case 'Agent':
    case 'Task':
      return `Je délègue : ${clip(field(input, 'description'), 40)}`
    case 'TodoWrite':
      return 'Je mets ma liste à jour'
    case 'Skill':
      return `J'utilise ${field(input, 'skill')}`
  }

  // mcp__serveur__outil → outil
  return `J'utilise ${input.tool.split('__').pop()}`
}

// le rapport en texte brut, coupé en fin de phrase quand c'est possible (repris d'agent-standup)
export const gist = (markdown: string, max = 180): string => {
  const plain = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/https?:\/\/\S+/g, 'lien')
    .replace(/[#*_>|~[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (plain.length <= max) return plain

  const cut = plain.slice(0, max)
  const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '))

  // une fin de phrase trop tôt dans le texte ne vaut pas mieux qu'une coupe au mot
  return end > max * .45 ? cut.slice(0, end + 1) : `${cut.replace(/\s+\S*$/, '')}…`
}
