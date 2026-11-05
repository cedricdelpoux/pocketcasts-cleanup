import {runCleanup} from "../runs.mjs"
import {sendPush} from "../push.mjs"
import {getLocalHour, readSettings} from "../settings.mjs"
import {createStore} from "../store.mjs"

export default async () => {
  const store = createStore()
  const {hour, timeZone, isPaused} = await readSettings(store)
  if (isPaused || getLocalHour(timeZone) !== hour)
    return new Response("Not the time of the cleanup")

  const {doneCount, choices} = await runCleanup(store, process.env)

  // The sure changes only show in the history of the app
  if (choices.length) {
    const titles = choices.map(({actions}) => actions[0].entry.title)
    await sendPush(store, {
      title: `${choices.length} to review`,
      body: titles.slice(0, 3).join("\n"),
    })
  }

  return new Response(`Cleaned up ${doneCount}, ${choices.length} to review`)
}

// Every hour, to run at the hour of the settings in their time zone
export const config = {schedule: "@hourly"}
