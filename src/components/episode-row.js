import React, {useState} from "react"
import {PiCaretDownBold} from "react-icons/pi"

import {useColors} from "./colors-context"
import {ICON_SIZE, IconButton} from "./icon-button"

const ellipsisStyle = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
}

export const EpisodeRow = ({
  icon: Icon,
  label,
  title,
  subtitle,
  detail,
  isChecked,
  onCheck,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const colors = useColors()
  const hasCheckbox = Boolean(onCheck)

  return (
    <li style={{borderTop: `1px solid ${colors.separator}`}}>
      <div style={{display: "flex", alignItems: "center"}}>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            flex: 1,
            minWidth: 0,
            padding: "12px 0 12px 16px",
            cursor: hasCheckbox ? "pointer" : "default",
          }}
        >
          {hasCheckbox && (
            <input
              type="checkbox"
              checked={isChecked}
              onChange={onCheck}
              style={{
                width: "20px",
                height: "20px",
                margin: 0,
                flexShrink: 0,
                accentColor: colors.primary,
              }}
            />
          )}
          <span
            style={{
              display: "flex",
              flexShrink: 0,
              padding: "8px",
              borderRadius: "50%",
              background: `${colors.primary}1f`,
              color: colors.primary,
            }}
          >
            <Icon size={ICON_SIZE} />
          </span>
          <span style={{display: "flex", flexDirection: "column", minWidth: 0}}>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 600,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: colors.primary,
              }}
            >
              {label}
            </span>
            <span style={{...ellipsisStyle, fontWeight: 500}}>{title}</span>
            <span
              style={{...ellipsisStyle, fontSize: "13px", color: colors.muted}}
            >
              {subtitle}
            </span>
          </span>
        </label>
        <IconButton
          label={isOpen ? "Hide the details" : "Show the details"}
          aria-expanded={isOpen}
          onClick={() => setIsOpen((open) => !open)}
          style={{margin: "0 8px"}}
        >
          <PiCaretDownBold
            size={ICON_SIZE}
            style={{transform: isOpen ? "rotate(180deg)" : undefined}}
          />
        </IconButton>
      </div>
      {isOpen && (
        <p
          style={{
            margin: 0,
            padding: `0 16px 14px ${hasCheckbox ? 96 : 64}px`,
            fontSize: "14px",
            color: colors.muted,
          }}
        >
          {detail}
        </p>
      )}
    </li>
  )
}
