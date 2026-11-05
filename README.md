# pocketcasts-cleanup

Clean up your [Pocket Casts](https://pocketcasts.com) subscriptions every morning: archive reruns, extracts and
duplicates, and keep played episodes in sync between copies. A notification on your phone tells you what was cleaned
up, and the uncertain changes wait in the app for you to check them.

It uses the private API of the Pocket Casts web player. This API is not documented and may change without notice.

## What it does

- **Reruns, extracts and duplicates** are archived, even when played. This includes episodes published in another
  podcast you follow and episodes removed from their feed.
- **Played episodes** are archived and stay played.
- **An episode heard anywhere is played everywhere**, but only on its original version: when you played a rerun or a
  copy, the original is marked as played and archived, and the rerun goes back to not played.
- **An action is never repeated** on an episode. If it archives an episode you want to keep, unarchive it in Pocket
  Casts and it will stay unarchived.

The sure changes are applied every morning: extracts, reruns with a rerun word or tag in their title, played episodes
and episodes removed from their feed. The uncertain ones, such as a rerun only spotted by its notes or a copy in
another podcast, are listed in the app. Unchecked changes are skipped for good.

### Rerun detection

An episode is a rerun of an earlier one when:

- its title contains a rerun word such as "rerun", "replay" or "best of";
- or its notes contain such a word and share enough words with the earlier episode;
- or its title is nearly the same as the earlier episode's, with the same duration or similar notes.

An extract has "excerpt" or "snippet" in its title. A title tag such as `[ARCHIVES]` that is mostly used on reruns
marks all its episodes as reruns. Words found in many episodes of a podcast (ads, links, credits) are ignored. The
word lists cover English and French, and all thresholds are at the top of `netlify/cleanup.mjs`.

## The app

The app is a [Gatsby](https://www.gatsbyjs.com) site hosted on [Netlify](https://www.netlify.com):

- `netlify/functions/daily.mjs` runs every hour, cleans up at the hour chosen in the settings of the app, in the
  time zone of the phone, and sends the notification when there is something to review;
- `netlify/functions/review.mjs` lists the changes to review and applies the checked ones;
- the state (the changes done, skipped and to review) is kept in [Netlify Blobs](https://docs.netlify.com/blobs/overview/).

### Deployment

1. Install the dependencies with `yarn`, then copy `.env.example` to `.env` and fill it in. `APP_PASSWORD` is the
   password the app asks for, and `npx web-push generate-vapid-keys` gives the two `VAPID_` keys.
2. Create a Netlify site with `yarn netlify sites:create`, then copy the variables of `.env` to it with
   `yarn netlify env:set`.
3. Deploy with `yarn build && yarn netlify deploy --prod --dir=public --functions=netlify/functions`. On GitHub,
   `.github/workflows/deploy.yml` deploys every push to `main` once the `NETLIFY_SITE_ID` variable and the
   `NETLIFY_AUTH_TOKEN` secret are set.
4. On your phone, open the site in Chrome, log in, and add it to the home screen. The settings menu turns on the
   notification and sets the hour of the cleanup.

## Scripts

The scripts run the same cleanup from a terminal. With `NETLIFY_SITE_ID` and `NETLIFY_AUTH_TOKEN` in `.env`, they
share the state of the app. Otherwise they keep their own in `.state`.

```sh
yarn report     # writes report.md, changing nothing
yarn apply      # applies the lines left in report.md
yarn auto       # does what the daily function does, without the notification
```

`yarn report` takes part of podcast names to analyse only some of them, such as `yarn report "Serial"`. Delete the
lines you want to skip from `report.md` before `yarn apply`: they will not show up in the next reports.

### First run

If you archived episodes by mistake, for example while moving from another podcast app, `yarn report --unarchive` also
lists the archived episodes you never started. Two optional settings of `.env` refine it:

- `PREVIOUS_APP_UNTIL`: the date you stopped using your previous podcast app, such as `2023-08-01`. Archived episodes
  published before it may have been heard there, so they stay archived.
- `NEVER_HEARD_PODCASTS`: a comma-separated list of podcasts you never listened to anywhere else. Their archived
  episodes are unarchived whatever their date.

## Limitations

- The history API only returns the last 100 episodes, so the title of an older episode removed from its feed is lost.
  Such episodes are matched by duration instead.
- Some episodes only exist in the app on your phone, until you play or archive them there. The cleanup cannot see them.

## License

[MIT](LICENSE)
