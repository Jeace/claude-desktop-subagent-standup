# Standup des sous-agents

Un mod pour Claude Code qui montre les sous-agents de la session en visio, dans un panneau de
l'application Claude Desktop : chacun à son bureau, avec une bulle qui dit ce qu'il fait, puis le
début de son rapport.

Adapté d'[agent-standup](https://github.com/Atoll92/agent-standup), d'Arthur, dont il reprend les
personnages et les décors. agent-standup est un serveur local qui relit les journaux de toutes vos
sessions et les affiche dans un navigateur ; ce mod vit dans la session elle-même : pas de serveur,
pas de navigateur, rien à lancer.

## Ce qu'il affiche

- Une tuile pour l'agent principal, « Claude », le chef, puis une par sous-agent, avec un prénom et
  sa mission.
- Le personnage s'anime : il respire et cligne des yeux, tape au clavier quand il travaille, et se
  couvre d'étoiles quand il a fini.
- Sa bulle dit l'action en cours (« Je lis client.js », « Je cherche « retry » »), puis le début de
  son rapport.
- Sous l'image : son état et le nombre d'outils utilisés.
- Un sous-agent fini quitte le panneau au premier message envoyé deux minutes après sa fin.
- Dans un terminal, le panneau passe en texte : une ligne par agent.

## Installation

Il faut Claude Code en ligne de commande, dans une version récente : les mods sont encore une
fonction expérimentale, et une version trop ancienne refuse celui-ci. Testé avec la 2.1.296 ;
`claude update` met la vôtre à jour.

Dans un terminal, PowerShell ou autre, sans ouvrir de session :

```
claude plugin marketplace add Jeace/claude-desktop-subagent-standup
claude plugin install subagent-standup@subagent-standup
```

Le mod se charge dans les sessions ouvertes ensuite, celles de l'application de bureau comprises.

Pour le mettre à jour :

```
claude plugin marketplace update subagent-standup
claude plugin update subagent-standup@subagent-standup
```

Pour le retirer : `claude plugin uninstall subagent-standup@subagent-standup`.

## Utilisation

- Le panneau s'ouvre tout seul au premier sous-agent lancé.
- `/standup` l'ouvre à la demande.
- Fermé à la main, il ne se rouvre plus tout seul, jusqu'au prochain `/standup`.

## Ce qu'il fait de vos données

- Rien ne quitte votre machine : aucun appel réseau, aucune lecture de fichier. Le mod reçoit les
  événements de la session (un sous-agent qui démarre, un outil appelé, un tour qui finit) et les
  dessine.
- Il observe sans rien bloquer ni modifier : chacun de ses hooks passe la main tel quel.
- Une commande shell n'est jamais affichée, seulement sa description : une commande peut porter un
  jeton.
- Le chemin d'un fichier lu ou modifié est réduit à son nom.

## Limites

- Il ne voit que la session où il tourne : ni les autres sessions, ni les autres projets.
- Pas de voix, contrairement à agent-standup.
- La largeur des bulles est estimée : l'image ne connaît pas la police de l'application, et un
  texte peut déborder un peu.

## Développement

```
hooks/register.tsx   les hooks : sous-agents, outils, fins de tour, et le dessin du panneau
hooks/cast.ts        personnages, décors et bulle, en SVG
hooks/describe.ts    la réplique de chaque outil, le résumé du rapport
types/index.d.ts     l'état que garde le mod
tests/               les tests
```

- Charger le mod depuis ce dossier : `claude --plugin-dir <dossier>` ; pour l'application de
  bureau, nommer le dossier dans `CLAUDE_CODE_PLUGIN_DIRS`, dans le bloc `env` de
  `~/.claude/settings.json`.
- Vérifier : `claude plugin validate .` puis `claude plugin test .`.
- Les types : Claude Code dépose ses déclarations dans `.claude-plugin/types/` quand il charge le
  mod depuis un dossier ; ensuite `npx -p typescript tsc -p .`.

## Licence

MIT, voir [LICENSE](LICENSE). Les personnages et les décors viennent d'agent-standup,
© 2026 Arthur, sous licence MIT.
