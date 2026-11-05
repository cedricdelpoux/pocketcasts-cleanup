const DEFAULT_SETTINGS = {hour: 7, timeZone: "UTC", isPaused: false}

export const readSettings = async (store) => ({
  ...DEFAULT_SETTINGS,
  ...(await store.read("settings", {})),
})

export const saveSettings = async (store, settings) =>
  store.write("settings", {...(await readSettings(store)), ...settings})

export const getLocalHour = (timeZone) =>
  Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone,
    }).format(new Date()),
  )
