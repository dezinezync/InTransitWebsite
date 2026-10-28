// The data of the site. The templates read it as `site`, for example `site.title`.
// A copy of _data/site.js on the Elytra site, with the facts of InTransit.
module.exports = function () {
  return {
    title: "InTransit",
    email: "support@intransit.app",
    description: "Your metro ride, stop by stop, in Ahmedabad, Bengaluru, Chennai, Kolkata, Mumbai, New Delhi and Pune.",
    keywords: "metro,transit,india,metro app,live activity,iPhone,Ahmedabad,Bengaluru,Chennai,Kolkata,Mumbai,New Delhi,Delhi,Pune",
    lang: "en-IN",
    // The App Store. Every badge links to /store, which redirects here (see _redirects).
    appId: "6756531079",
    appStoreUrl: "https://apps.apple.com/in/app/intransit/id6756531079",
    mastodon: "https://social.dezinezync.com/@intransit",
    // The year of the build, for the copyright line of the footer.
    year: new Date().getFullYear(),
    // The address of the live site.
    productionUrl: "https://intransit.app"
  };
};
