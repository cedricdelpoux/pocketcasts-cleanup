import {gunzipSync} from "node:zlib"

// The private API of the Pocket Casts web player
const API = "https://api.pocketcasts.com"
const PODCAST_API = "https://podcast-api.pocketcasts.com"

export const NOT_PLAYED = 1
export const IN_PROGRESS = 2
export const PLAYED = 3

const fetchJson = async (url, {body, token} = {}) => {
  const response = await fetch(url, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      "content-type": "application/json",
      "user-agent": "pocketcasts-cleanup",
      ...(token && {authorization: `Bearer ${token}`}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (!response.ok) throw new Error(`${url} failed: ${response.status}`)

  const raw = Buffer.from(await response.arrayBuffer())
  // The podcast API sends gzip without saying so
  const isGzip = raw[0] === 0x1f && raw[1] === 0x8b
  return JSON.parse(isGzip ? gunzipSync(raw) : raw)
}

export const login = async (email, password) => {
  const response = await fetchJson(`${API}/user/login`, {
    body: {email, password, scope: "webplayer"},
  })
  const token = response.token || response.accessToken
  const post = (path, body) => fetchJson(`${API}${path}`, {body, token})

  return {
    getPodcasts: async () =>
      (await post("/user/podcast/list", {v: 1})).podcasts,
    getEpisodeStates: async (podcast) => {
      const {episodes} = await post("/user/podcast/episodes", {uuid: podcast})
      return new Map(episodes.map((episode) => [episode.uuid, episode]))
    },
    getHistory: async () => (await post("/user/history", {})).episodes,
    setStatus: (episode, status) =>
      post("/sync/update_episode", {...episode, status}),
    setArchived: (episodes, isArchived) =>
      post("/sync/update_episodes_archive", {episodes, archive: isArchived}),
  }
}

export const getEpisodes = async (podcast) => {
  const [full, showNotes] = await Promise.all([
    fetchJson(`${PODCAST_API}/podcast/full/${podcast}`),
    fetchJson(`${PODCAST_API}/mobile/show_notes/full/${podcast}`),
  ])
  const notesByEpisode = new Map(
    showNotes.podcast.episodes.map((episode) => [
      episode.uuid,
      episode.show_notes || "",
    ]),
  )

  return full.podcast.episodes.map((episode) => ({
    ...episode,
    notes: notesByEpisode.get(episode.uuid) || "",
  }))
}
