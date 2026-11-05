import React, {useState} from "react"

import {useColors} from "./colors-context"
import {PrimaryButton} from "./primary-button"

export const PasswordForm = ({isWrong, onSubmit}) => {
  const [password, setPassword] = useState("")
  const colors = useColors()

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit(password.trim())
      }}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        maxWidth: "320px",
        margin: "20vh auto 0",
      }}
    >
      <label style={{fontWeight: 600}} htmlFor="password">
        App password
      </label>
      <input
        id="password"
        type="password"
        autoComplete="current-password"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        style={{
          padding: "12px",
          border: `1px solid ${colors.separator}`,
          borderRadius: "10px",
          background: colors.background,
          color: colors.text,
          font: "inherit",
        }}
      />
      {isWrong && (
        <span style={{color: colors.primary}}>This password is wrong.</span>
      )}
      <PrimaryButton type="submit">Open</PrimaryButton>
    </form>
  )
}
