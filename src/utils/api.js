const toHeaders = (password) => ({
  authorization: `Bearer ${password}`,
  "content-type": "application/json",
})

export class UnauthorizedError extends Error {}

const fetchApi = async (
  path,
  password,
  body,
  method = body ? "POST" : "GET",
) => {
  const response = await fetch(path, {
    method,
    headers: toHeaders(password),
    body: body && JSON.stringify(body),
  })

  if (response.status === 401) throw new UnauthorizedError()
  if (!response.ok) throw new Error(`${path} failed: ${response.status}`)

  return response
}

export const fetchReview = async (password, body) =>
  (await fetchApi("/api/review", password, body)).json()

export const saveSubscription = (password, subscription) =>
  fetchApi("/api/subscribe", password, subscription)

export const removeSubscription = (password, subscription) =>
  fetchApi("/api/subscribe", password, subscription, "DELETE")
