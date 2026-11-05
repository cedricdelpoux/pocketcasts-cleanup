import React from "react"

import {useColors} from "./colors-context"

export const Section = ({title, children}) => {
  const colors = useColors()

  return (
    <section style={{marginTop: "16px"}}>
      {title && (
        <h2
          style={{
            margin: "0 0 8px 16px",
            fontSize: "13px",
            fontWeight: 600,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            color: colors.muted,
          }}
        >
          {title}
        </h2>
      )}
      <div
        style={{
          overflow: "hidden",
          borderRadius: "12px",
          background: colors.background,
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08)",
        }}
      >
        {children}
      </div>
    </section>
  )
}

export const EmptyText = ({children}) => {
  const colors = useColors()

  return (
    <p style={{margin: 0, padding: "16px", color: colors.muted}}>{children}</p>
  )
}

// The first row draws no top border
export const RowList = ({children}) => (
  <ul style={{listStyle: "none", margin: "-1px 0 0", padding: 0}}>
    {children}
  </ul>
)
