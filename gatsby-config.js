const {PRIMARY, SPLASH_BACKGROUND} = require("./src/colors")

module.exports = {
  siteMetadata: {
    title: "Pocket Casts cleanup",
  },
  plugins: [
    {
      resolve: "gatsby-plugin-manifest",
      options: {
        name: "Pocket Casts cleanup",
        short_name: "Cleanup",
        start_url: "/",
        display: "standalone",
        background_color: SPLASH_BACKGROUND,
        theme_color: PRIMARY,
        icon: "src/images/icon.png",
        icon_options: {purpose: "any maskable"},
      },
    },
    {
      resolve: "gatsby-plugin-offline",
      options: {appendScript: require.resolve("./src/sw-push.js")},
    },
  ],
}
