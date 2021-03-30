module.exports = {
  MONGO_URI: process.env.MONGO_URI || "MONGO_URL",
  TOKEN_SECRET: process.env.TOKEN_SECRET || "YOUR_UNIQUE_JWT_TOKEN_SECRET",

  // OAuth 2.0
  FACEBOOK_SECRET: process.env.FACEBOOK_SECRET || "YOUR_FACEBOOK_CLIENT_SECRET",
  FOURSQUARE_SECRET:
    process.env.FOURSQUARE_SECRET || "YOUR_FOURSQUARE_CLIENT_SECRET",
  GOOGLE_SECRET: process.env.GOOGLE_SECRET || "YOUR_GOOGLE_CLIENT_SECRET",
  //
  GITHUB_SECRET: process.env.GITHUB_SECRET || "YOUR_GITHUB_CLIENT_SECRET",
  INSTAGRAM_SECRET:
    process.env.INSTAGRAM_SECRET || "YOUR_INSTAGRAM_CLIENT_SECRET",
  LINKEDIN_SECRET: process.env.LINKEDIN_SECRET || "YOUR_LINKEDIN_CLIENT_SECRET",
  TWITCH_SECRET: process.env.TWITCH_SECRET || "YOUR_TWITCH_CLIENT_SECRET",
  WINDOWS_LIVE_SECRET:
    process.env.WINDOWS_LIVE_SECRET || "YOUR_MICROSOFT_CLIENT_SECRET",
  YAHOO_SECRET: process.env.YAHOO_SECRET || "YOUR_YAHOO_CLIENT_SECRET",
  BITBUCKET_SECRET:
    process.env.BITBUCKET_SECRET || "YOUR_BITBUCKET_CLIENT_SECRET",
  SPOTIFY_SECRET: process.env.SPOTIFY_SECRET || "YOUR_SPOTIFY_CLIENT_SECRET",

  // OAuth 1.0
  TWITTER_KEY: process.env.TWITTER_KEY || "YOUR_TWITTER_CLIENT_KEY",
  TWITTER_SECRET: process.env.TWITTER_SECRET || "YOUR_TWITTER_CLIENT_SECRET",

  auth: {
    // OAuth 2.0
    FACEBOOK_SECRET: "YOUR_FACEBOOK_CLIENT_SECRET",
    FOURSQUARE_SECRET: "YOUR_FOURSQUARE_CLIENT_SECRET",
    GOOGLE_SECRET: "YOUR_GOOGLE_CLIENT_SECRET",
    //
    GITHUB_SECRET: "YOUR_GITHUB_CLIENT_SECRET",
    INSTAGRAM_SECRET: "YOUR_INSTAGRAM_CLIENT_SECRET",
    LINKEDIN_SECRET: "YOUR_LINKEDIN_CLIENT_SECRET",
    TWITCH_SECRET: "YOUR_TWITCH_CLIENT_SECRET",
    WINDOWS_LIVE_SECRET: "YOUR_MICROSOFT_CLIENT_SECRET",
    YAHOO_SECRET: "YOUR_YAHOO_CLIENT_SECRET",
    BITBUCKET_SECRET: "YOUR_BITBUCKET_CLIENT_SECRET",
    SPOTIFY_SECRET: "YOUR_SPOTIFY_CLIENT_SECRET",

    // OAuth 1.0
    TWITTER_KEY: "YOUR_TWITTER_CLIENT_KEY",
    TWITTER_SECRET: "YOUR_TWITTER_CLIENT_SECRET",

    login_verification: true,
    signup_verification: false,
    recaptcha_key: "6LezaAsUAAAAAFbtiyMzOlMmqEwzMwmMYszmO_Ve",

    ui_host: "http://localhost:3000/",
    agent_host: "http://localhost:3000/",
  },
  Redis: {
    mode: "instance", //instance, cluster, sentinel
    ip: "13.59.52.179",
    port: 6379,
    user: "",
    password: "DuoS123",
    sentinels: {
      hosts: "SENTNELS_URL",
      port: 16389,
      name: "redis-cluster",
    },
  },
  Security: {
    mode: "instance", //instance, cluster, sentinel
    ip: "13.59.52.179",
    port: 6379,
    user: "",
    password: "DuoS123",
    sentinels: {
      hosts: "SENTNELS_URL",
      port: 16389,
      name: "redis-cluster",
    },
  },
  Host: {
    profilesearch: "secondary",
    resource: "cluster",
    vdomain: "localhost",
    domain: "localhost",
    port: "9001",
    version: "1.0.0.0",
  },
  RabbitMQ: {
    ip: "13.59.52.179",
    port: 5672,
    user: "duo ",
    password: "DuoS123",
    vhost: "/",
  },
  Mongo: {
    ip: "13.59.52.179",
    port: "",
    dbname: "dvpdb",
    password: "DuoS123",
    user: "duo",
    type: "mongodb+srv",
  },
  Services: {
    accessToken: "TOKEN",
    resourceServiceHost: "resourceservice.app.veery.cloud",
    resourceServicePort: "8831",
    resourceServiceVersion: "1.0.0.0",
    sipuserendpointserviceHost: "sipuserendpointservice.app.veery.cloud",
    sipuserendpointservicePort: "8831",
    sipuserendpointserviceVersion: "1.0.0.0",
    clusterconfigserviceHost: "clusterconfig.app.veery.cloud",
    clusterconfigservicePort: "8831",
    clusterconfigserviceVersion: "1.0.0.0",
    billingserviceHost: "billingservice.app.veery.cloud",
    billingservicePort: "4444",
    billingserviceVersion: "1.0.0.0",
    notificationServiceHost: "notificationservice.app1.veery.cloud",
    notificationServicePort: "8089",
    notificationServiceVersion: "1.0.0.0",
    dynamicPort : false
  },

  Tenant: {
    activeTenant: 1,
  },

  ActiveDirectory: {
    groupName: "FaceTone",
  },
};
