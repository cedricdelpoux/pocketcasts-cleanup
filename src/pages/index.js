import React, {useEffect, useState} from "react"

import {ChoiceItem} from "../components/choice-item"
import {
  ColorsContext,
  useColors,
  useColorsForTheme,
} from "../components/colors-context"
import {LogItem} from "../components/log-item"
import {PasswordForm} from "../components/password-form"
import {PrimaryButton} from "../components/primary-button"
import {EmptyText, RowList, Section} from "../components/section"
import {SettingsMenu} from "../components/settings-menu"
import {Tabs} from "../components/tabs"
import {UnauthorizedError, fetchReview} from "../utils/api"
import {usePushSubscription} from "../utils/use-push-subscription"
import {useStoredState} from "../utils/use-stored-state"

const PASSWORD_KEY = "pocketcasts-cleanup-password"
const THEME_KEY = "pocketcasts-cleanup-theme"

const toCheckedIds = (choices) => new Set(choices.map(({id}) => id))

const Review = ({password, theme, onThemeChange, onLogout}) => {
  const [review, setReview] = useState(null)
  const [checkedIds, setCheckedIds] = useState(new Set())
  const [isBusy, setIsBusy] = useState(false)
  const [activeTab, setActiveTab] = useState("review")
  const [error, setError] = useState(null)
  const colors = useColors()
  const push = usePushSubscription(password, review?.vapidPublicKey)

  const callApi = async (body) => {
    setError(null)
    try {
      return await fetchReview(password, body)
    } catch (caught) {
      if (caught instanceof UnauthorizedError) onLogout(true)
      else setError(caught.message)
      return null
    }
  }

  const updateReview = async (body) => {
    setIsBusy(true)
    const nextReview = await callApi(body)
    if (nextReview) {
      setReview(nextReview)
      setCheckedIds(toCheckedIds(nextReview.choices))
    }
    setIsBusy(false)
  }

  // The hour of the cleanup is read in the time zone of the phone
  const changeSettings = (change) => {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
    const settings = {...change, timeZone}
    setReview((current) => ({
      ...current,
      settings: {...current.settings, ...settings},
    }))
    callApi({settings})
  }

  useEffect(() => {
    updateReview()
  }, [password])

  const toggleChoice = (id) =>
    setCheckedIds((ids) => {
      const nextIds = new Set(ids)
      if (!nextIds.delete(id)) nextIds.add(id)
      return nextIds
    })

  const choices = review?.choices || []

  return (
    <>
      <header style={{display: "flex", alignItems: "center", gap: "4px"}}>
        <h1 style={{flex: 1, margin: "0 0 0 16px", fontSize: "22px"}}>
          Pocket Casts cleanup
        </h1>
        {review && (
          <SettingsMenu
            settings={review.settings}
            onSettingsChange={changeSettings}
            theme={theme}
            onThemeChange={onThemeChange}
            push={push}
            isBusy={isBusy}
            onRun={() => updateReview({run: true})}
            onLogout={() => onLogout(false)}
          />
        )}
      </header>
      <Tabs
        tabs={[
          {id: "review", label: "To review", count: choices.length},
          {id: "history", label: "History"},
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />
      {error && <p style={{margin: "16px", color: colors.primary}}>{error}</p>}
      {review && activeTab === "review" && (
        <>
          <Section>
            {choices.length ? (
              <RowList>
                {choices.map((choice) => (
                  <ChoiceItem
                    key={choice.id}
                    choice={choice}
                    isChecked={checkedIds.has(choice.id)}
                    onCheck={() => toggleChoice(choice.id)}
                  />
                ))}
              </RowList>
            ) : (
              <EmptyText>
                Nothing to review. The sure changes are applied every day, see
                the history.
              </EmptyText>
            )}
          </Section>
          {choices.length > 0 && (
            <div style={{margin: "12px 16px 0"}}>
              <PrimaryButton
                disabled={isBusy}
                onClick={() => updateReview({picked: [...checkedIds]})}
                style={{width: "100%"}}
              >
                Apply {checkedIds.size} of {choices.length}
              </PrimaryButton>
              <p
                style={{
                  margin: "8px 0 0",
                  fontSize: "13px",
                  textAlign: "center",
                  color: colors.muted,
                }}
              >
                Unchecked changes are skipped for good.
              </p>
            </div>
          )}
        </>
      )}
      {review && activeTab === "history" && (
        <Section>
          {review.log.length ? (
            <RowList>
              {review.log.map((entry) => (
                <LogItem
                  key={`${entry.date}-${entry.action}-${entry.uuid}`}
                  entry={entry}
                />
              ))}
            </RowList>
          ) : (
            <EmptyText>Nothing cleaned up yet.</EmptyText>
          )}
        </Section>
      )}
    </>
  )
}

const IndexPage = () => {
  const [password, setPassword] = useStoredState(PASSWORD_KEY, null)
  const [theme, setTheme] = useStoredState(THEME_KEY, "auto")
  const [isWrongPassword, setIsWrongPassword] = useState(false)
  const colors = useColorsForTheme(theme)

  return (
    <ColorsContext.Provider value={colors}>
      <style>{`
        body {margin: 0; background: ${colors.page}; color: ${colors.text}}
        @keyframes spin {to {transform: rotate(360deg)}}
      `}</style>
      <main
        style={{
          maxWidth: "640px",
          margin: "0 auto",
          padding: "16px 8px 40px",
          fontFamily: "system-ui, sans-serif",
          fontSize: "15px",
        }}
      >
        {password ? (
          <Review
            password={password}
            theme={theme}
            onThemeChange={setTheme}
            onLogout={(isWrong) => {
              setIsWrongPassword(isWrong)
              setPassword(null)
            }}
          />
        ) : (
          <PasswordForm
            isWrong={isWrongPassword}
            onSubmit={(nextPassword) => {
              setIsWrongPassword(false)
              setPassword(nextPassword)
            }}
          />
        )}
      </main>
    </ColorsContext.Provider>
  )
}

export default IndexPage

export const Head = () => (
  <>
    <html lang="en" />
    <title>Pocket Casts cleanup</title>
  </>
)
