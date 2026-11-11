import "dotenv/config"
import fs from "node:fs"

import {
  ACTIONS,
  filterPlan,
  findPodcasts,
  loadPlan,
  loginFromEnv,
  toFlatPlan,
} from "../netlify/cleanup.mjs"
import {addIgnored, applyAndRemember, runCleanup} from "../netlify/runs.mjs"
import {createScriptStore} from "../netlify/store.mjs"

const PLAN_PATH = "plan.json"
const REPORT_PATH = "report.md"
const ACTION_LABELS = {
  play: "Mark as played and archive",
  archive: "Archive",
  unarchive: "Unarchive",
}

const readReportLines = () =>
  new Set(fs.readFileSync(REPORT_PATH, "utf8").split("\n"))

const readSavedPlan = () => JSON.parse(fs.readFileSync(PLAN_PATH, "utf8"))

// The lines deleted from the last report are never offered again
const ignoreDeletedLines = async (store) => {
  if (!fs.existsSync(PLAN_PATH) || !fs.existsSync(REPORT_PATH))
    return store.read("ignored", [])
  const keptLines = readReportLines()
  const plan = readSavedPlan()
  const deleted = ACTIONS.flatMap((action) => plan[action])
    .filter(({line}) => !keptLines.has(line))
    .map(({uuid}) => uuid)
  return addIgnored(store, deleted)
}

const toReportSection = (title, podcastPlan) => [
  `# ${title}`,
  ...ACTIONS.flatMap((action) => [
    `## ${ACTION_LABELS[action]} (${podcastPlan[action].length})`,
    ...podcastPlan[action].map(({line}) => line),
  ]),
  "",
]

const report = async (store, names, shouldUnarchive) => {
  const ignored = await ignoreDeletedLines(store)
  const handled = await store.read("handled", {})
  const client = await loginFromEnv(process.env)
  const planByPodcast = await loadPlan(client, process.env, {
    names,
    shouldUnarchive,
    ignored,
    handled,
  })
  const plan = toFlatPlan(planByPodcast)
  const lines = [...planByPodcast]
    .filter(([, podcastPlan]) =>
      ACTIONS.some((action) => podcastPlan[action].length),
    )
    .flatMap(([title, podcastPlan]) => toReportSection(title, podcastPlan))
  fs.writeFileSync(PLAN_PATH, JSON.stringify(plan, null, 2))
  fs.writeFileSync(REPORT_PATH, lines.join("\n"))
  console.log(
    `To mark as played: ${plan.play.length}, to archive: ${plan.archive.length}, to unarchive: ${plan.unarchive.length}`,
  )
  console.log(
    `Delete the lines to skip from ${REPORT_PATH}, then run: yarn apply`,
  )
}

const apply = async (store, names) => {
  const client = await loginFromEnv(process.env)
  const keptLines = readReportLines()
  const podcasts = new Set(
    (await findPodcasts(client, names)).map(({uuid}) => uuid),
  )
  const plan = filterPlan(
    readSavedPlan(),
    ({line, podcast}) => keptLines.has(line) && podcasts.has(podcast),
  )
  await applyAndRemember(client, store, plan)
  console.log(
    `Marked as played: ${plan.play.length}, archived: ${plan.play.length + plan.archive.length}, unarchived: ${plan.unarchive.length}`,
  )
}

const auto = async (store) => {
  const {doneCount, choices} = await runCleanup(store, process.env)
  console.log(
    `Cleaned up: ${doneCount}, to review in the app: ${choices.length}`,
  )
}

const [command = "report", ...args] = process.argv.slice(2)
const shouldUnarchive = args.includes("--unarchive")
const names = args.filter((arg) => arg !== "--unarchive")
const store = createScriptStore(process.env)

if (command === "apply") await apply(store, names)
else if (command === "auto") await auto(store)
else await report(store, names, shouldUnarchive)
