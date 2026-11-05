import {useEffect, useState} from "react"

import {removeSubscription, saveSubscription} from "./api"

const toKeyBytes = (base64Url) => {
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/")
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0))
}

const getPushManager = async () =>
  (await navigator.serviceWorker.ready).pushManager

// `isSubscribed` stays null where push is not available, such as outside the installed app
export const usePushSubscription = (password, vapidPublicKey) => {
  const [isSubscribed, setIsSubscribed] = useState(null)

  useEffect(() => {
    if (!("serviceWorker" in navigator && "PushManager" in window)) return
    getPushManager()
      .then((pushManager) => pushManager.getSubscription())
      .then((subscription) => setIsSubscribed(Boolean(subscription)))
  }, [])

  const subscribe = async () => {
    const subscription = await (
      await getPushManager()
    ).subscribe({
      userVisibleOnly: true,
      applicationServerKey: toKeyBytes(vapidPublicKey),
    })
    await saveSubscription(password, subscription)
    setIsSubscribed(true)
  }

  const unsubscribe = async () => {
    const subscription = await (await getPushManager()).getSubscription()
    if (subscription) {
      await removeSubscription(password, subscription)
      await subscription.unsubscribe()
    }
    setIsSubscribed(false)
  }

  return {isSubscribed, subscribe, unsubscribe}
}
