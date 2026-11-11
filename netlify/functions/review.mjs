import {isAuthorized, unauthorized} from "../auth.mjs"
import {applyChoices, runCleanup} from "../runs.mjs"
import {readSettings, saveSettings} from "../settings.mjs"
import {createStore} from "../store.mjs"

const MAX_SHOWN_LOG_ENTRIES = 50

const readReview = async (store) => ({
  choices: await store.read("choices", []),
  log: (await store.read("log", [])).slice(0, MAX_SHOWN_LOG_ENTRIES),
  settings: await readSettings(store),
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY,
})

export default async (request) => {
  if (!isAuthorized(request)) return unauthorized()

  const store = createStore()
  if (request.method === "POST") {
    const {picked, run, settings} = await request.json()
    if (settings) await saveSettings(store, settings)
    else if (run) await runCleanup(store, process.env)
    else await applyChoices(store, process.env, picked)
  }

  return Response.json(await readReview(store))
}

export const config = {path: "/api/review"}
