import React from "react"

import {useColors} from "./colors-context"

export const Tabs = ({tabs, activeTab, onChange}) => {
  const colors = useColors()

  return (
    <div
      role="tablist"
      style={{
        display: "flex",
        gap: "4px",
        margin: "16px 8px 0",
        padding: "4px",
        borderRadius: "12px",
        background: colors.separator,
      }}
    >
      {tabs.map(({id, label, count}) => {
        const isActive = id === activeTab

        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(id)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              flex: 1,
              padding: "8px",
              border: "none",
              borderRadius: "9px",
              background: isActive ? colors.background : "none",
              boxShadow: isActive ? "0 1px 3px rgba(0, 0, 0, 0.12)" : "none",
              color: isActive ? colors.text : colors.muted,
              font: "inherit",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {label}
            {count > 0 && (
              <span
                style={{
                  minWidth: "20px",
                  padding: "1px 6px",
                  borderRadius: "10px",
                  background: colors.primary,
                  color: "#ffffff",
                  fontSize: "12px",
                }}
              >
                {count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
