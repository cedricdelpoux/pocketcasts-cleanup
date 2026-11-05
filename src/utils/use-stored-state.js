import {useEffect, useState} from "react"

export const readStoredValue = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key))
  } catch {
    return null
  }
}

export const writeStoredValue = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Without local storage, the value lasts until the page closes
  }
}

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value)

// Read after the first render, which must match the server one. A stored
// object keeps the initial keys it lacks, added since it was stored.
export const useStoredState = (key, initialValue) => {
  const [value, setValue] = useState(initialValue)

  useEffect(() => {
    const storedValue = readStoredValue(key)
    if (storedValue === null) return

    setValue((currentValue) =>
      isPlainObject(currentValue) && isPlainObject(storedValue)
        ? {...currentValue, ...storedValue}
        : storedValue,
    )
  }, [key])

  const changeValue = (update) =>
    setValue((currentValue) => {
      const nextValue =
        typeof update === "function" ? update(currentValue) : update
      writeStoredValue(key, nextValue)
      return nextValue
    })

  return [value, changeValue]
}
