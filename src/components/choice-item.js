import React from "react"
import {
  PiArchiveBold,
  PiCopyBold,
  PiHeadphonesBold,
  PiRepeatBold,
} from "react-icons/pi"

import {toDetails, toReasonDetails} from "./details"
import {EpisodeRow} from "./episode-row"

const describeChoice = ({actions}) => {
  const played = actions.find(({action}) => action === "play")?.entry
  const archived = actions.find(({action}) => action === "archive")?.entry

  if (played && archived)
    return {
      Icon: PiHeadphonesBold,
      label: "Mark the original as played",
      entry: played,
      details: [
        ...toDetails(played),
        ...toReasonDetails(archived.reason),
        {Icon: PiArchiveBold, label: "Both episodes archived"},
      ],
    }
  if (played)
    return {
      Icon: PiHeadphonesBold,
      label: "Mark as played",
      entry: played,
      details: toDetails(played),
    }

  const isCopy = archived.reason.startsWith("copy")
  return {
    Icon: isCopy ? PiCopyBold : PiRepeatBold,
    label: isCopy ? "Archive the copy" : "Archive the rerun",
    entry: archived,
    details: toDetails(archived),
  }
}

export const ChoiceItem = ({choice, isChecked, onCheck}) => {
  const {Icon, label, entry, details} = describeChoice(choice)

  return (
    <EpisodeRow
      icon={Icon}
      label={label}
      title={entry.title}
      subtitle={`${entry.podcastTitle} · ${entry.published}`}
      details={details}
      isChecked={isChecked}
      onCheck={onCheck}
    />
  )
}
