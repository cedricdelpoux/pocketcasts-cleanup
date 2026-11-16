import {
  PiArrowsLeftRightBold,
  PiChartBarBold,
  PiCheckCircleBold,
  PiCopyBold,
  PiHeadphonesBold,
  PiInfoBold,
  PiLinkSimpleBold,
  PiMegaphoneBold,
  PiNoteBold,
  PiQuotesBold,
  PiScissorsBold,
  PiTagBold,
  PiTextTBold,
  PiTrashBold,
} from "react-icons/pi"

// The reasons are the strings built by netlify/cleanup.mjs, also kept in the stored history
const REASON_DETAILS = [
  [/^title (".+")$/, PiQuotesBold, "Title word"],
  [/^notes (".+")$/, PiNoteBold, "Notes word"],
  [/^tag "(.+)"$/, PiTagBold, "Tag"],
  [/^similarity (.+)$/, PiChartBarBold, "Content match"],
  [/^title (.+)$/, PiTextTBold, "Title match"],
  [/^extract$/, PiScissorsBold, "Extract of an episode"],
  [/^promo$/, PiMegaphoneBold, "Promo for another podcast"],
  [/^played$/, PiCheckCircleBold, "Played"],
  [/^removed from the feed$/, PiTrashBold, "Removed from the feed"],
  [/^copy$/, PiCopyBold, "Same episode as the original"],
  [
    /^played status moved to the original$/,
    PiArrowsLeftRightBold,
    "Played status moved to the original",
  ],
]

const toReasonDetail = (part) => {
  for (const [pattern, Icon, label] of REASON_DETAILS) {
    const match = part.match(pattern)
    if (match) return {Icon, label, value: match[1]}
  }
  return {Icon: PiInfoBold, label: part}
}

export const toReasonDetails = (reason) =>
  reason ? reason.split(", ").map(toReasonDetail) : []

export const toDetails = ({reason, original}) => {
  // The reason only names the podcast of the played copy, which the original line already shows
  const isPlayedCopy = Boolean(reason?.startsWith("played in"))
  return [
    original && {
      Icon: isPlayedCopy ? PiHeadphonesBold : PiLinkSimpleBold,
      label: isPlayedCopy ? "Played" : "Original",
      value: `“${original.title}” · ${original.podcastTitle} · ${original.published}`,
    },
    ...(isPlayedCopy ? [] : toReasonDetails(reason)),
  ].filter(Boolean)
}
