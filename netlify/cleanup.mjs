import {decodeHTML} from "entities"

import {
  IN_PROGRESS,
  NOT_PLAYED,
  PLAYED,
  getEpisodes,
  login,
} from "./pocketcasts.mjs"

// Matched on lowercase ASCII text, in French and English
const TITLE_RERUN_WORDS = [
  "redif",
  "replay",
  "best of",
  "best-of",
  "bestof",
  "rerun",
  "rebroadcast",
]
const NOTES_RERUN_WORDS = [
  ...TITLE_RERUN_WORDS,
  "initialement diffuse",
  "deja diffuse",
  "redecouvr",
  "originally aired",
  "originally released",
]
// Lives and videos first published in the podcast are new episodes
const NEW_CONTENT_WORDS = [
  "replay twitch",
  "best of youtube",
  "en replay",
  "pas de replay",
]
const EXTRACT_PATTERN = /\b(extrait|excerpt|snippet)/
const MAX_DURATION_GAP_S = 60
const MIN_TITLE_SIMILARITY = 0.7
const MIN_SIMILARITY = 0.5
// A rerun word in the notes alone also shows up in unrelated episodes
const MIN_HINT_SIMILARITY = 0.4
// Words found in this share of a podcast's episodes are boilerplate (ads, links, credits)
const MAX_WORD_FREQUENCY = 0.2
// The same episode published in two podcasts
const MAX_COPY_DURATION_GAP_S = 20
const MIN_COPY_SIMILARITY = 0.4
// An episode removed from its feed keeps its title only in the recent history, otherwise only its duration
const MIN_REMOVED_TITLE_SHARE = 0.6
const MAX_REMOVED_DURATION_GAP_S = 1
const GENERIC_AUTHOR_WORDS = new Set([
  "podcast",
  "podcasts",
  "media",
  "studio",
  "studios",
  "production",
  "productions",
])
// A title tag mostly used on reruns, such as "[ARCHIVES]", marks all its episodes as reruns
const MIN_TAG_EPISODES = 3
const MIN_TAG_RERUN_SHARE = 0.5
const STATUS_LABELS = {[IN_PROGRESS]: "in progress", [PLAYED]: "played"}
const ARCHIVE_BATCH_SIZE = 100
const REQUESTS_CONCURRENCY = 16
// Reasons applied without asking
const SURE_REASONS = [
  'title "',
  'tag "',
  "extract",
  "played",
  "removed from the feed",
]
export const ACTIONS = ["play", "archive", "unarchive"]

export const normalize = (text) =>
  decodeHTML(text || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/’/g, "'")
    .normalize("NFKD")
    .replace(/[^\x00-\x7f]/g, "")
    .toLowerCase()

const toWords = (text) => new Set(normalize(text).match(/[a-z0-9]{4,}/g))

// Called for every pair of episodes, so it loops on the smaller set without copying it
const countShared = (items, otherItems) => {
  const [smaller, larger] =
    items.size < otherItems.size ? [items, otherItems] : [otherItems, items]
  let count = 0
  for (const item of smaller) if (larger.has(item)) count++
  return count
}

const getSimilarity = (shared, words, otherWords) => {
  const union = words.size + otherWords.size - shared
  return union ? shared / union : 0
}

const compareWords = (words, otherWords) =>
  getSimilarity(countShared(words, otherWords), words, otherWords)

const increment = (counts, key) => counts.set(key, (counts.get(key) || 0) + 1)

const toDay = (published) => published.slice(0, 10)

const toPercent = (share) => `${Math.round(share * 100)}%`

const stripTags = (title) => normalize(title).replace(/\[[^\]]*\]/g, " ")

const findBoilerplate = (wordSets) => {
  const counts = new Map()
  wordSets.forEach((words) => words.forEach((word) => increment(counts, word)))
  const maxCount = MAX_WORD_FREQUENCY * wordSets.length
  return new Set(
    [...counts].filter(([, count]) => count > maxCount).map(([word]) => word),
  )
}

const addWords = (episodes) => {
  episodes.forEach((episode) => {
    const title = stripTags(episode.title)
    episode.titleText = normalize(episode.title)
    episode.notesText = normalize(episode.notes)
    episode.words = new Set([
      ...toWords(episode.title),
      ...toWords(episode.notes),
    ])
    episode.titleWords = toWords(title)
    episode.titleNumbers = new Set(title.match(/\d+/g))
  })
  const boilerplate = findBoilerplate(episodes.map(({words}) => words))
  episodes.forEach((episode) =>
    boilerplate.forEach((word) => episode.words.delete(word)),
  )
}

const findNotesRerunWords = (episodes) => {
  const wordSets = episodes.map(
    ({notesText}) =>
      new Set(NOTES_RERUN_WORDS.filter((word) => notesText.includes(word))),
  )
  const boilerplate = findBoilerplate(wordSets)
  return NOTES_RERUN_WORDS.filter((word) => !boilerplate.has(word))
}

const isSameDuration = (episode, other) => {
  const durations = [episode.duration || 0, other.duration || 0]
  return (
    durations.every(Boolean) &&
    Math.abs(durations[0] - durations[1]) <= MAX_DURATION_GAP_S
  )
}

const isOtherPart = (episode, other) => {
  const [numbers, otherNumbers] = [episode.titleNumbers, other.titleNumbers]
  const isSame =
    numbers.size === otherNumbers.size &&
    countShared(numbers, otherNumbers) === numbers.size
  return numbers.size > 0 && otherNumbers.size > 0 && !isSame
}

// Indexed by word, so that an episode is only compared with the originals sharing a word with it
const createOriginals = () => ({
  episodes: [],
  byWord: new Map(),
  byTitleWord: new Map(),
})

const addToIndex = (index, words, position) =>
  words.forEach((word) => {
    const positions = index.get(word)
    if (positions) positions.push(position)
    else index.set(word, [position])
  })

const addOriginal = (originals, episode) => {
  const position = originals.episodes.push(episode) - 1
  addToIndex(originals.byWord, episode.words, position)
  addToIndex(originals.byTitleWord, episode.titleWords, position)
}

const countSharedByPosition = (index, words) => {
  const counts = new Map()
  words.forEach((word) =>
    (index.get(word) || []).forEach((position) => increment(counts, position)),
  )
  return counts
}

const findOriginal = (episode, originals) => {
  const day = toDay(episode.published)
  // Parts and full versions of one story are published the same day: they are not reruns
  const isCandidate = (other) =>
    toDay(other.published) < day && !isOtherPart(episode, other)
  const shared = countSharedByPosition(originals.byWord, episode.words)
  const sharedTitle = countSharedByPosition(
    originals.byTitleWord,
    episode.titleWords,
  )
  const positions = [...new Set([...shared.keys(), ...sharedTitle.keys()])]
  let best = null

  positions
    .sort((a, b) => a - b)
    .forEach((position) => {
      const other = originals.episodes[position]
      if (!isCandidate(other)) return
      const similarity = getSimilarity(
        shared.get(position) || 0,
        episode.words,
        other.words,
      )
      const titleSimilarity = getSimilarity(
        sharedTitle.get(position) || 0,
        episode.titleWords,
        other.titleWords,
      )
      const isBetter =
        !best ||
        similarity + titleSimilarity > best.similarity + best.titleSimilarity
      if (isBetter) best = {similarity, titleSimilarity, original: other}
    })

  // Sharing no word, the first candidate is the original, with a zero score
  return (
    best || {
      similarity: 0,
      titleSimilarity: 0,
      original: originals.episodes.find(isCandidate) || null,
    }
  )
}

const findRerunReason = (episode, originals, notesRerunWords) => {
  const {similarity, titleSimilarity, original} = findOriginal(
    episode,
    originals,
  )
  const scores = `similarity ${toPercent(similarity)}, title ${toPercent(titleSimilarity)}`
  const {titleText, notesText} = episode

  if (NEW_CONTENT_WORDS.some((word) => titleText.includes(word))) return {}

  const titleWord = TITLE_RERUN_WORDS.find((word) => titleText.includes(word))
  if (titleWord) return {reason: `title "${titleWord}", ${scores}`, original}

  const notesWord = notesRerunWords.find((word) => notesText.includes(word))
  if (notesWord && Math.max(similarity, titleSimilarity) >= MIN_HINT_SIMILARITY)
    return {reason: `notes "${notesWord}", ${scores}`, original}

  const isSameTitle = titleSimilarity >= MIN_TITLE_SIMILARITY
  if (
    original &&
    isSameTitle &&
    (isSameDuration(episode, original) || similarity >= MIN_SIMILARITY)
  )
    return {reason: scores, original}

  return {}
}

const toPlanEntry = (
  episode,
  {reason = null, original = null, shouldUnplay = false, isSure = false} = {},
) => {
  const published = toDay(episode.published)
  let line = `- ${published} ${episode.title}`
  if (reason) line += ` · ${reason}`
  if (original) line += ` → ${original.title} (${toDay(original.published)})`

  return {
    podcast: episode.podcast.uuid,
    podcastTitle: episode.podcast.title,
    uuid: episode.uuid,
    title: episode.title,
    published,
    reason,
    original: original && {
      uuid: original.uuid,
      title: original.title,
      published: toDay(original.published),
      podcastTitle: original.podcast.title,
    },
    line,
    shouldUnplay,
    isSure,
  }
}

const formatDuration = (seconds) =>
  seconds
    ? `${Math.floor(seconds / 60)} min ${String(seconds % 60).padStart(2, "0")} s`
    : "unknown duration"

const toRemovedEpisode = (podcast, uuid, state, title) => {
  const status = STATUS_LABELS[state.playingStatus] || "not played"
  return {
    uuid,
    podcast,
    duration: state.duration || 0,
    isPlayed: state.playingStatus === PLAYED,
    isArchived: Boolean(state.isDeleted),
    title:
      title ||
      `episode removed from the feed (${formatDuration(state.duration || 0)}, ${status})`,
    titleWords: toWords(title || ""),
    published: "?",
  }
}

const loadEpisodes = async (client, podcast, historyTitles) => {
  const [catalog, states] = await Promise.all([
    getEpisodes(podcast.uuid),
    client.getEpisodeStates(podcast.uuid),
  ])
  const episodes = catalog.sort((a, b) =>
    a.published < b.published ? -1 : a.published > b.published ? 1 : 0,
  )
  addWords(episodes)
  episodes.forEach((episode) => {
    const state = states.get(episode.uuid) || {}
    const isInProgress =
      (state.playedUpTo || 0) > 0 || state.playingStatus === IN_PROGRESS
    episode.podcast = podcast
    episode.isArchived = Boolean(state.isDeleted)
    episode.isPlayed = state.playingStatus === PLAYED
    episode.isStarted = episode.isPlayed || isInProgress
  })
  const catalogUuids = new Set(episodes.map(({uuid}) => uuid))
  const removed = [...states]
    .filter(([uuid]) => !catalogUuids.has(uuid))
    .map(([uuid, state]) =>
      toRemovedEpisode(podcast, uuid, state, historyTitles.get(uuid)),
    )
  return {episodes, removed}
}

const getTags = (episode) =>
  new Set(
    [...episode.titleText.matchAll(/\[([^\]]+)\]/g)].map(([, tag]) =>
      tag.trim(),
    ),
  )

const findRerunTags = (episodes) => {
  const tagged = new Map()
  const reruns = new Map()
  episodes.forEach((episode) => {
    const isRerun = episode.reason && episode.reason !== "extract"
    getTags(episode).forEach((tag) => {
      increment(tagged, tag)
      if (isRerun) increment(reruns, tag)
    })
  })
  return new Set(
    [...tagged]
      .filter(
        ([tag, count]) =>
          count >= MIN_TAG_EPISODES &&
          (reruns.get(tag) || 0) / count >= MIN_TAG_RERUN_SHARE,
      )
      .map(([tag]) => tag),
  )
}

const addReruns = (episodes) => {
  const notesRerunWords = findNotesRerunWords(episodes)
  const originals = createOriginals()
  episodes.forEach((episode) => {
    const isExtract = EXTRACT_PATTERN.test(episode.titleText)
    const {reason = null, original = null} = isExtract
      ? {reason: "extract"}
      : findRerunReason(episode, originals, notesRerunWords)
    episode.reason = reason
    episode.original = original
    if (!reason) addOriginal(originals, episode)
  })
  const rerunTags = findRerunTags(episodes)
  episodes.forEach((episode) => {
    const tag = [...getTags(episode)].find((tag) => rerunTags.has(tag))
    if (tag && !episode.reason) episode.reason = `tag "[${tag}]"`
  })
}

const findCopies = (episodes) => {
  const toSlot = (episode) =>
    Math.floor((episode.duration || 0) / MAX_COPY_DURATION_GAP_S)
  const bySlot = new Map()
  episodes.forEach((episode) => addToIndex(bySlot, [toSlot(episode)], episode))
  const copies = []
  episodes.forEach((original) => {
    const slot = toSlot(original)
    if (!slot) return
    const candidates = [slot - 1, slot, slot + 1].flatMap(
      (key) => bySlot.get(key) || [],
    )
    candidates.forEach((copy) => {
      const isLater =
        copy.published > original.published ||
        (copy.published === original.published && copy.uuid > original.uuid)
      const isOtherPodcast = copy.podcast.uuid !== original.podcast.uuid
      const isClose =
        Math.abs(copy.duration - original.duration) <= MAX_COPY_DURATION_GAP_S
      if (
        isLater &&
        isOtherPodcast &&
        isClose &&
        compareWords(copy.words, original.words) >= MIN_COPY_SIMILARITY
      )
        copies.push([copy, original])
    })
  })
  return copies
}

const isSamePublisher = (podcast, other) => {
  const otherWords = toWords(other.author)
  return [...toWords(podcast.author)].some(
    (word) => otherWords.has(word) && !GENERIC_AUTHOR_WORDS.has(word),
  )
}

const isRemovedCopy = (removedEpisode, episode) => {
  const {titleWords, duration} = removedEpisode
  if (titleWords.size)
    return (
      countShared(titleWords, episode.titleWords) / titleWords.size >=
      MIN_REMOVED_TITLE_SHARE
    )
  const isExactDuration =
    duration &&
    Math.abs((episode.duration || 0) - duration) <= MAX_REMOVED_DURATION_GAP_S
  return (
    Boolean(isExactDuration) &&
    isSamePublisher(episode.podcast, removedEpisode.podcast)
  )
}

const findRemovedCopies = (removed, episodes) =>
  removed
    .filter(({isPlayed}) => isPlayed)
    .flatMap((removedEpisode) =>
      episodes
        .filter(
          (episode) =>
            episode.podcast.uuid !== removedEpisode.podcast.uuid &&
            isRemovedCopy(removedEpisode, episode),
        )
        .map((episode) => [removedEpisode, episode]),
    )

const isSameStory = (episode, other) =>
  Boolean(other) &&
  (compareWords(episode.titleWords, other.titleWords) >= MIN_TITLE_SIMILARITY ||
    compareWords(episode.words, other.words) >= MIN_SIMILARITY)

const findOriginals = (episodes) => {
  const originals = new Map(
    episodes
      .filter((episode) => isSameStory(episode, episode.original))
      .map((episode) => [episode, episode.original]),
  )
  findCopies(episodes).forEach(([copy, original]) =>
    originals.set(copy, original),
  )
  return originals
}

const findPlayedCopies = (episodes, removed, originalsByCopy) => {
  const pairs = [...originalsByCopy, ...findRemovedCopies(removed, episodes)]
  const playedCopies = new Map()
  pairs.forEach(([copy, original]) => {
    if (copy.isPlayed && !original.isPlayed && !originalsByCopy.has(original))
      playedCopies.set(original, copy)
  })
  return playedCopies
}

const findNeverHeardPodcasts = (env) =>
  (env.NEVER_HEARD_PODCASTS || "")
    .split(",")
    .map((name) => normalize(name).trim())
    .filter(Boolean)

const isUnheard = (episode, env, neverHeardPodcasts) => {
  const {podcast} = episode
  const podcastTitle = normalize(podcast.title)
  if (neverHeardPodcasts.some((name) => podcastTitle.includes(name)))
    return true
  // Episodes published before subscribing, or while another app was in use, may have been heard there
  const since = [podcast.dateAdded, env.PREVIOUS_APP_UNTIL || ""].sort().pop()
  return episode.published >= since
}

export const mapActions = (map) =>
  Object.fromEntries(ACTIONS.map((action) => [action, map(action)]))

const buildPlan = (episodes, removed, {ignored, env, shouldUnarchive}) => {
  const originalsByCopy = findOriginals(episodes)
  const playedCopies = findPlayedCopies(episodes, removed, originalsByCopy)
  const neverHeardPodcasts = findNeverHeardPodcasts(env)
  const plan = new Map()
  const getPodcastPlan = (podcast) => {
    if (!plan.has(podcast.title))
      plan.set(
        podcast.title,
        mapActions(() => []),
      )
    return plan.get(podcast.title)
  }

  episodes.forEach((episode) => {
    if (ignored.has(episode.uuid)) return
    const podcastPlan = getPodcastPlan(episode.podcast)
    const playedCopy = playedCopies.get(episode)
    const original = originalsByCopy.get(episode)
    const isCopy = Boolean(episode.reason || original)
    // Only the original keeps the played status, so a played rerun hands it over
    const shouldUnplay = episode.isPlayed && Boolean(original)

    if (playedCopy) {
      podcastPlan.play.push(
        toPlanEntry(episode, {
          reason: `played in ${playedCopy.podcast.title}`,
          original: playedCopy,
        }),
      )
    } else if (isCopy && (!episode.isArchived || shouldUnplay)) {
      let reason = episode.reason || "copy"
      if (shouldUnplay) reason += ", played status moved to the original"
      const isSure =
        !shouldUnplay &&
        SURE_REASONS.some((sureReason) => reason.startsWith(sureReason))
      podcastPlan.archive.push(
        toPlanEntry(episode, {
          reason,
          original: original || episode.original,
          shouldUnplay,
          isSure,
        }),
      )
    } else if (episode.isPlayed && !episode.isArchived) {
      podcastPlan.archive.push(
        toPlanEntry(episode, {reason: "played", isSure: true}),
      )
    } else if (
      shouldUnarchive &&
      !isCopy &&
      episode.isArchived &&
      !episode.isStarted &&
      isUnheard(episode, env, neverHeardPodcasts)
    ) {
      podcastPlan.unarchive.push(toPlanEntry(episode))
    }
  })

  removed.forEach((removedEpisode) => {
    if (ignored.has(removedEpisode.uuid) || removedEpisode.isArchived) return
    getPodcastPlan(removedEpisode.podcast).archive.push(
      toPlanEntry(removedEpisode, {
        reason: "removed from the feed",
        isSure: true,
      }),
    )
  })
  return plan
}

const mapWithLimit = async (items, limit, map) => {
  const results = []
  let next = 0
  const work = async () => {
    while (next < items.length) {
      const index = next++
      results[index] = await map(items[index])
    }
  }
  await Promise.all(Array.from({length: limit}, work))
  return results
}

export const findPodcasts = async (client, names = []) => {
  const podcasts = await client.getPodcasts()
  return podcasts.filter(
    (podcast) =>
      !names.length ||
      names.some((name) => normalize(podcast.title).includes(normalize(name))),
  )
}

export const loginFromEnv = (env) =>
  login(env.POCKETCASTS_EMAIL, env.POCKETCASTS_PASSWORD)

export const loadPlan = async (
  client,
  env,
  {names = [], shouldUnarchive = false, ignored = [], handled = {}} = {},
) => {
  const [podcasts, history] = await Promise.all([
    findPodcasts(client, names),
    client.getHistory(),
  ])
  const historyTitles = new Map(history.map(({uuid, title}) => [uuid, title]))
  const loaded = await mapWithLimit(podcasts, REQUESTS_CONCURRENCY, (podcast) =>
    loadEpisodes(client, podcast, historyTitles),
  )
  loaded.forEach(({episodes}) => addReruns(episodes))
  const plan = buildPlan(
    loaded.flatMap(({episodes}) => episodes),
    loaded.flatMap(({removed}) => removed),
    {ignored: new Set(ignored), env, shouldUnarchive},
  )
  return new Map(
    [...plan].map(([title, podcastPlan]) => [
      title,
      filterPlan(
        podcastPlan,
        ({uuid}, action) => !(handled[uuid] || []).includes(action),
      ),
    ]),
  )
}

export const toFlatPlan = (planByPodcast) =>
  mapActions((action) =>
    [...planByPodcast.values()].flatMap((podcastPlan) => podcastPlan[action]),
  )

export const filterPlan = (plan, isKept) =>
  mapActions((action) =>
    (plan[action] || []).filter((entry) => isKept(entry, action)),
  )

export const countPlan = (plan) =>
  ACTIONS.reduce((count, action) => count + plan[action].length, 0)

const toEpisode = ({uuid, podcast}) => ({uuid, podcast})

export const applyPlan = async (client, plan) => {
  const unplayed = plan.archive.filter(({shouldUnplay}) => shouldUnplay)
  await mapWithLimit(plan.play, REQUESTS_CONCURRENCY, (entry) =>
    client.setStatus(toEpisode(entry), PLAYED),
  )
  await mapWithLimit(unplayed, REQUESTS_CONCURRENCY, (entry) =>
    client.setStatus(toEpisode(entry), NOT_PLAYED),
  )
  const batches = [
    [[...plan.play, ...plan.archive], true],
    [plan.unarchive, false],
  ]
  for (const [entries, isArchived] of batches) {
    for (let start = 0; start < entries.length; start += ARCHIVE_BATCH_SIZE) {
      const batch = entries.slice(start, start + ARCHIVE_BATCH_SIZE)
      await client.setArchived(batch.map(toEpisode), isArchived)
    }
  }
}

// An action is never repeated, so an episode fixed by hand in the app stays as it is
export const addHandled = (handled, plan) => {
  const nextHandled = {...handled}
  ACTIONS.forEach((action) =>
    plan[action].forEach(({uuid}) => {
      const actions = nextHandled[uuid] || []
      if (!actions.includes(action)) nextHandled[uuid] = [...actions, action]
    }),
  )
  return nextHandled
}

// A played rerun gives two actions, marking the original as played and
// archiving the rerun: they are one choice
export const groupChoices = (plan) => {
  const choices = new Map()
  ACTIONS.forEach((action) =>
    plan[action].forEach((entry) => {
      const id = [entry.uuid, entry.original?.uuid]
        .filter(Boolean)
        .sort()
        .join("+")
      const choice = choices.get(id) || {id, actions: []}
      choice.actions.push({action, entry})
      choices.set(id, choice)
    }),
  )
  return [...choices.values()]
}
