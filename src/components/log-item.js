import React from "react"
import {
  PiArchiveBold,
  PiArrowUUpLeftBold,
  PiCheckCircleBold,
  PiCopyBold,
  PiMegaphoneBold,
  PiRepeatBold,
  PiScissorsBold,
  PiTrashBold,
} from "react-icons/pi"

import {toDetails} from "./details"
import {EpisodeRow} from "./episode-row"

const getIcon = ({action, reason}) => {
  if (action === "play") return PiCheckCircleBold
  if (action === "unarchive") return PiArrowUUpLeftBold
  if (reason === "extract") return PiScissorsBold
  if (reason === "promo") return PiMegaphoneBold
  if (reason === "played") return PiArchiveBold
  if (reason === "removed from the feed") return PiTrashBold
  if (reason.startsWith("copy")) return PiCopyBold
  return PiRepeatBold
}

const ACTION_LABELS = {
  play: "Marked as played",
  archive: "Archived",
  unarchive: "Unarchived",
}

const formatDay = (date) =>
  new Date(date).toLocaleDateString(undefined, {day: "numeric", month: "short"})

export const LogItem = ({entry}) => (
  <EpisodeRow
    icon={getIcon(entry)}
    label={`${ACTION_LABELS[entry.action]} · ${formatDay(entry.date)}`}
    title={entry.title}
    subtitle={`${entry.podcastTitle} · ${entry.published}`}
    details={toDetails(entry)}
  />
)
