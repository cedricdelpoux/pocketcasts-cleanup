import React from "react"

import {useColors} from "./colors-context"

export const ICON_SIZE = 20

export const IconButton = ({label, style, children, ...buttonProps}) => {
  const colors = useColors()

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      style={{
        display: "inline-flex",
        flexShrink: 0,
        padding: "8px",
        border: "none",
        borderRadius: "50%",
        background: "none",
        color: colors.muted,
        cursor: "pointer",
        ...style,
      }}
      {...buttonProps}
    >
      {children}
    </button>
  )
}
