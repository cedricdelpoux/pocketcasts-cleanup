import fs from "node:fs/promises"
import {getStore} from "@netlify/blobs"

const STORE_NAME = "cleanup"
const LOCAL_DIR = new URL("../.state/", import.meta.url)

const toJsonStore = (blobs) => ({
  read: async (key, fallback) =>
    (await blobs.get(key, {type: "json"})) ?? fallback,
  write: (key, value) => blobs.setJSON(key, value),
})

const localStore = {
  read: async (key, fallback) => {
    try {
      return JSON.parse(await fs.readFile(new URL(`${key}.json`, LOCAL_DIR)))
    } catch {
      return fallback
    }
  },
  write: async (key, value) => {
    await fs.mkdir(LOCAL_DIR, {recursive: true})
    await fs.writeFile(
      new URL(`${key}.json`, LOCAL_DIR),
      JSON.stringify(value, null, 1),
    )
  },
}

// The choices are read right after the run that wrote them
export const createStore = () =>
  toJsonStore(getStore({name: STORE_NAME, consistency: "strong"}))

// Without a Netlify site, the scripts keep their state in `.state`
export const createScriptStore = ({NETLIFY_SITE_ID, NETLIFY_AUTH_TOKEN}) =>
  NETLIFY_SITE_ID && NETLIFY_AUTH_TOKEN
    ? toJsonStore(
        getStore({
          name: STORE_NAME,
          siteID: NETLIFY_SITE_ID,
          token: NETLIFY_AUTH_TOKEN,
          consistency: "strong",
        }),
      )
    : localStore
