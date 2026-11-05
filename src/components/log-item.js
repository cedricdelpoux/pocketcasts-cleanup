import React from "react"
import {
  PiArchiveBold,
  PiArrowUUpLeftBold,
  PiCheckCircleBold,
  PiCopyBold,
  PiRepeatBold,
  PiScissorsBold,
  PiTrashBold,
} from "react-icons/pi"

import {EpisodeRow} from "./episode-row"

const findIcon = ({action, reason}) => {
  if (action === "play") return PiCheckCircleBold
  if (action === "unarchive") return PiArrowUUpLeftBold
  if (reason === "extract") return PiScissorsBold
  if (reason === "played") return PiArchiveBold
  if (reason === "removed from the feed") return PiTrashBold
  if (reason.startsWith("copy")) return PiCopyBold
  return PiRepeatBold
}

const LABELS = {
  play: "Marked as played",
  archive: "Archived",
  unarchive: "Unarchived",
}

const formatDay = (date) =>
  new Date(date).toLocaleDateString(undefined, {day: "numeric", month: "short"})

export const LogItem = ({entry}) => (
  <EpisodeRow
    Icon={findIcon(entry)}
    label={`${LABELS[entry.action]} · ${formatDay(entry.date)}`}
    title={entry.title}
    subtitle={`${entry.podcastTitle} · ${entry.published}`}
    detail={[
      entry.reason && `Reason: ${entry.reason}.`,
      entry.original &&
        `Original: “${entry.original.title}” (${entry.original.podcastTitle}, ${entry.original.published}).`,
    ]
      .filter(Boolean)
      .join(" ")}
  />
)
