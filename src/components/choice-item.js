import React from "react"
import {PiCopyBold, PiHeadphonesBold, PiRepeatBold} from "react-icons/pi"

import {EpisodeRow} from "./episode-row"

export const describeOriginal = ({title, published, podcastTitle}) =>
  `“${title}” (${podcastTitle}, ${published})`

const describeChoice = ({actions}) => {
  const played = actions.find(({action}) => action === "play")?.entry
  const archived = actions.find(({action}) => action === "archive")?.entry

  if (played && archived)
    return {
      Icon: PiHeadphonesBold,
      label: "Mark the original as played",
      entry: played,
      detail: `You played the rerun ${describeOriginal(archived)}. The original goes to played, the rerun back to not played, and both are archived.`,
    }
  if (played)
    return {
      Icon: PiHeadphonesBold,
      label: "Mark as played",
      entry: played,
      detail: `You played the same episode in ${describeOriginal(played.original)}.`,
    }

  const isCopy = archived.reason.startsWith("copy")
  const original = archived.original
    ? `It looks like ${describeOriginal(archived.original)}. `
    : ""
  return {
    Icon: isCopy ? PiCopyBold : PiRepeatBold,
    label: isCopy ? "Archive the copy" : "Archive the rerun",
    entry: archived,
    detail: `${original}Clue: ${archived.reason}.`,
  }
}

export const ChoiceItem = ({choice, isChecked, onCheck}) => {
  const {Icon, label, entry, detail} = describeChoice(choice)

  return (
    <EpisodeRow
      icon={Icon}
      label={label}
      title={entry.title}
      subtitle={`${entry.podcastTitle} · ${entry.published}`}
      detail={detail}
      isChecked={isChecked}
      onCheck={onCheck}
    />
  )
}
