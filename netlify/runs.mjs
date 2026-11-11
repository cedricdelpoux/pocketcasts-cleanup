import {
  ACTIONS,
  addHandled,
  applyPlan,
  countPlan,
  filterPlan,
  groupChoices,
  loadPlan,
  loginFromEnv,
  mapActions,
  toFlatPlan,
} from "./cleanup.mjs"

const MAX_LOG_ENTRIES = 300

const addToLog = async (store, plan) => {
  const date = new Date().toISOString()
  const entries = ACTIONS.flatMap((action) =>
    plan[action].map((entry) => ({date, action, ...entry})),
  )
  if (!entries.length) return
  const log = await store.read("log", [])
  await store.write("log", [...entries, ...log].slice(0, MAX_LOG_ENTRIES))
}

export const applyAndRemember = async (client, store, plan) => {
  await applyPlan(client, plan)
  await store.write(
    "handled",
    addHandled(await store.read("handled", {}), plan),
  )
  await addToLog(store, plan)
}

export const addIgnored = async (store, uuids) => {
  const ignored = await store.read("ignored", [])
  const nextIgnored = [...new Set([...ignored, ...uuids])]
  await store.write("ignored", nextIgnored)
  return nextIgnored
}

// Applies the sure changes and keeps the uncertain ones as choices
export const runCleanup = async (store, env) => {
  const client = await loginFromEnv(env)
  const [ignored, handled] = await Promise.all([
    store.read("ignored", []),
    store.read("handled", {}),
  ])
  const plan = toFlatPlan(await loadPlan(client, env, {ignored, handled}))
  const sure = filterPlan(plan, ({isSure}) => isSure)
  await applyAndRemember(client, store, sure)
  const choices = groupChoices(filterPlan(plan, ({isSure}) => !isSure))
  await store.write("choices", choices)
  return {doneCount: countPlan(sure), choices}
}

// The choices left unpicked are never offered again
export const applyChoices = async (store, env, pickedIds) => {
  const choices = await store.read("choices", [])
  const picked = new Set(pickedIds)
  const actions = choices
    .filter(({id}) => picked.has(id))
    .flatMap((choice) => choice.actions)
  const plan = mapActions((action) =>
    actions.filter((item) => item.action === action).map(({entry}) => entry),
  )
  await applyAndRemember(await loginFromEnv(env), store, plan)
  const skipped = choices
    .filter(({id}) => !picked.has(id))
    .flatMap(({actions}) => actions.map(({entry}) => entry.uuid))
  await addIgnored(store, skipped)
  await store.write("choices", [])
}
