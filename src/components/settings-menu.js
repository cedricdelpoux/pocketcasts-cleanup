import React, {useEffect, useRef, useState} from "react"
import {
  PiArrowClockwise,
  PiCheckSquareDuotone,
  PiCircle,
  PiGearDuotone,
  PiRadioButtonDuotone,
  PiSignOut,
  PiSquare,
} from "react-icons/pi"

import {useColors} from "./colors-context"
import {ICON_SIZE, IconButton} from "./icon-button"

const HOURS = Array.from({length: 24}, (_, hour) => hour)

// Kept for the keyboard and screen readers, the icon shows the value
const hiddenInputStyle = {
  position: "absolute",
  width: 1,
  height: 1,
  opacity: 0,
}

const rowStyle = {
  position: "relative",
  display: "flex",
  alignItems: "center",
  gap: "10px",
  minHeight: "36px",
  cursor: "pointer",
}

const IconInput = ({icon: Icon, label, ...inputProps}) => (
  <label style={rowStyle}>
    <input {...inputProps} style={hiddenInputStyle} />
    <Icon size={ICON_SIZE} color={useColors().muted} />
    {label}
  </label>
)

const Toggle = ({label, checked, disabled, onChange}) => (
  <IconInput
    type="checkbox"
    icon={checked ? PiCheckSquareDuotone : PiSquare}
    label={label}
    checked={checked}
    disabled={disabled}
    onChange={(event) => onChange(event.target.checked)}
  />
)

const THEME_LABELS = {auto: "Auto", light: "Light", dark: "Dark"}

const ThemePicker = ({theme, onChange}) => (
  <div style={{display: "flex", gap: "16px"}}>
    {Object.entries(THEME_LABELS).map(([value, label]) => (
      <IconInput
        key={value}
        type="radio"
        name="theme"
        icon={value === theme ? PiRadioButtonDuotone : PiCircle}
        label={label}
        checked={value === theme}
        onChange={() => onChange(value)}
      />
    ))}
  </div>
)

const MenuSection = ({title, children}) => {
  const colors = useColors()

  return (
    <div
      style={{
        padding: "8px 16px",
        borderTop: `1px solid ${colors.separator}`,
      }}
    >
      {title && (
        <div
          style={{
            margin: "4px 0",
            fontSize: "11px",
            fontWeight: 600,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            color: colors.muted,
          }}
        >
          {title}
        </div>
      )}
      {children}
    </div>
  )
}

const MenuAction = ({icon: Icon, label, iconStyle, ...buttonProps}) => {
  const colors = useColors()

  return (
    <button
      type="button"
      style={{
        ...rowStyle,
        width: "100%",
        padding: 0,
        border: "none",
        background: "none",
        color: colors.text,
        font: "inherit",
      }}
      {...buttonProps}
    >
      <Icon size={ICON_SIZE} color={colors.muted} style={iconStyle} />
      {label}
    </button>
  )
}

const formatHour = (hour) => `${String(hour).padStart(2, "0")}:00`

const useCloseOnOutsideClick = (ref, isOpen, close) =>
  useEffect(() => {
    if (!isOpen) return
    const closeOutside = (event) => {
      if (!ref.current.contains(event.target)) close()
    }
    document.addEventListener("pointerdown", closeOutside)
    return () => document.removeEventListener("pointerdown", closeOutside)
  }, [isOpen])

export const SettingsMenu = ({
  settings,
  onSettingsChange,
  theme,
  onThemeChange,
  push,
  isBusy,
  onRun,
  onLogout,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef(null)
  const colors = useColors()
  useCloseOnOutsideClick(ref, isOpen, () => setIsOpen(false))

  return (
    <div ref={ref} style={{position: "relative"}}>
      <IconButton
        label="Settings"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <PiGearDuotone size={ICON_SIZE} />
      </IconButton>
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            zIndex: 1,
            width: "260px",
            marginTop: "4px",
            padding: "4px 0",
            borderRadius: "12px",
            background: colors.background,
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.18)",
          }}
        >
          <MenuSection title="Daily cleanup">
            <Toggle
              label="Clean up every day"
              checked={!settings.isPaused}
              onChange={(isOn) => onSettingsChange({isPaused: !isOn})}
            />
            <label style={{...rowStyle, cursor: "default"}}>
              <span style={{width: ICON_SIZE}} />
              At
              <select
                value={settings.hour}
                disabled={settings.isPaused}
                onChange={(event) =>
                  onSettingsChange({hour: Number(event.target.value)})
                }
                style={{
                  padding: "4px 8px",
                  border: `1px solid ${colors.separator}`,
                  borderRadius: "8px",
                  background: colors.background,
                  color: colors.text,
                  font: "inherit",
                }}
              >
                {HOURS.map((hour) => (
                  <option key={hour} value={hour}>
                    {formatHour(hour)}
                  </option>
                ))}
              </select>
            </label>
          </MenuSection>
          {push.isSubscribed !== null && (
            <MenuSection title="Notifications">
              <Toggle
                label="Notify me when there is something to review"
                checked={push.isSubscribed}
                onChange={(isOn) =>
                  isOn ? push.subscribe() : push.unsubscribe()
                }
              />
            </MenuSection>
          )}
          <MenuSection title="Theme">
            <ThemePicker theme={theme} onChange={onThemeChange} />
          </MenuSection>
          <MenuSection>
            <MenuAction
              icon={PiArrowClockwise}
              label={isBusy ? "Cleaning up…" : "Clean up now"}
              disabled={isBusy}
              iconStyle={{
                animation: isBusy ? "spin 1s linear infinite" : undefined,
              }}
              onClick={onRun}
            />
            <MenuAction icon={PiSignOut} label="Log out" onClick={onLogout} />
          </MenuSection>
        </div>
      )}
    </div>
  )
}
