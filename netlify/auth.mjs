import {timingSafeEqual} from "node:crypto"

export const isAuthorized = (request) => {
  const expected = Buffer.from(`Bearer ${process.env.APP_PASSWORD}`)
  const given = Buffer.from(request.headers.get("authorization") || "")
  return (
    Boolean(process.env.APP_PASSWORD) &&
    given.length === expected.length &&
    timingSafeEqual(given, expected)
  )
}

export const unauthorized = () => new Response("Unauthorized", {status: 401})
