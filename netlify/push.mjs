import webpush from "web-push"

const EXPIRED_STATUSES = [404, 410]
// Android holds the normal ones back while the phone sleeps
const PUSH_OPTIONS = {urgency: "high", TTL: 12 * 60 * 60}

export const addSubscription = async (store, subscription) => {
  const subscriptions = await store.read("subscriptions", [])
  const others = subscriptions.filter(
    ({endpoint}) => endpoint !== subscription.endpoint,
  )
  await store.write("subscriptions", [...others, subscription])
}

export const removeSubscription = async (store, endpoint) => {
  const subscriptions = await store.read("subscriptions", [])
  await store.write(
    "subscriptions",
    subscriptions.filter((subscription) => subscription.endpoint !== endpoint),
  )
}

export const sendPush = async (store, message) => {
  const subscriptions = await store.read("subscriptions", [])
  if (!subscriptions.length) return

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  )
  const results = await Promise.allSettled(
    subscriptions.map((subscription) =>
      webpush.sendNotification(
        subscription,
        JSON.stringify(message),
        PUSH_OPTIONS,
      ),
    ),
  )
  const kept = subscriptions.filter(
    (_, index) => !EXPIRED_STATUSES.includes(results[index].reason?.statusCode),
  )
  if (kept.length < subscriptions.length)
    await store.write("subscriptions", kept)
}
