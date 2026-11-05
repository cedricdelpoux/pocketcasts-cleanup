import {createContext, useContext, useEffect, useState} from "react"

import {PRIMARY, SPLASH_BACKGROUND} from "../colors"

const DARK_SCHEME_QUERY = "(prefers-color-scheme: dark)"

const LIGHT_COLORS = {
  primary: PRIMARY,
  page: SPLASH_BACKGROUND,
  background: "#ffffff",
  hover: "rgba(0, 0, 0, 0.06)",
  text: "#1f2329",
  separator: "#e5e7eb",
  muted: "#6b7280",
}

const DARK_COLORS = {
  primary: PRIMARY,
  page: "#17181a",
  background: "#202124",
  hover: "rgba(255, 255, 255, 0.1)",
  text: "#e8eaed",
  separator: "#3c4043",
  muted: "#9aa0a6",
}

export const ColorsContext = createContext(LIGHT_COLORS)

export const useColors = () => useContext(ColorsContext)

export const useColorsForTheme = (theme) => {
  const [isSystemDark, setIsSystemDark] = useState(false)

  useEffect(() => {
    const darkSchemeQuery = window.matchMedia(DARK_SCHEME_QUERY)
    const updateIsSystemDark = () => setIsSystemDark(darkSchemeQuery.matches)

    updateIsSystemDark()
    darkSchemeQuery.addEventListener("change", updateIsSystemDark)

    return () =>
      darkSchemeQuery.removeEventListener("change", updateIsSystemDark)
  }, [])

  const isDark = theme === "dark" || (theme === "auto" && isSystemDark)
  return isDark ? DARK_COLORS : LIGHT_COLORS
}
