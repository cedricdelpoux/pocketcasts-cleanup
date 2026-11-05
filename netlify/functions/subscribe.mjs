import {isAuthorized, unauthorized} from "../auth.mjs"
import {addSubscription, removeSubscription} from "../push.mjs"
import {createStore} from "../store.mjs"

export default async (request) => {
  if (!isAuthorized(request)) return unauthorized()

  const subscription = await request.json()
  if (request.method === "DELETE") {
    await removeSubscription(createStore(), subscription.endpoint)
    return new Response("Unsubscribed")
  }

  await addSubscription(createStore(), subscription)
  return new Response("Subscribed")
}

export const config = {path: "/api/subscribe"}
