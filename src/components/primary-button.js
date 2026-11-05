import React from "react"

import {useColors} from "./colors-context"

export const PrimaryButton = ({style, children, ...buttonProps}) => {
  const colors = useColors()

  return (
    <button
      style={{
        padding: "12px 20px",
        border: "none",
        borderRadius: "10px",
        background: colors.primary,
        color: "#ffffff",
        font: "inherit",
        fontWeight: 600,
        cursor: "pointer",
        opacity: buttonProps.disabled ? 0.6 : 1,
        ...style,
      }}
      {...buttonProps}
    >
      {children}
    </button>
  )
}
