module.exports = {
  RabbitMQ: {
    ip: "SYS_RABBITMQ_HOST",
    port: "SYS_RABBITMQ_PORT",
    user: "SYS_RABBITMQ_USER",
    password: "SYS_RABBITMQ_PASSWORD",
    vhost: "SYS_RABBITMQ_VHOST"
  },

  Redis: {
    mode: "SYS_REDIS_MODE",
    ip: "SYS_REDIS_HOST",
    port: "SYS_REDIS_PORT",
    user: "SYS_REDIS_USER",
    password: "SYS_REDIS_PASSWORD",
    sentinels: {
      hosts: "SYS_REDIS_SENTINEL_HOSTS",
      port: "SYS_REDIS_SENTINEL_PORT",
      name: "SYS_REDIS_SENTINEL_NAME"
    }
  },

  Security: {
    mode: "SYS_REDIS_MODE",
    ip: "SYS_REDIS_HOST",
    port: "SYS_REDIS_PORT",
    user: "SYS_REDIS_USER",
    password: "SYS_REDIS_PASSWORD",
    sentinels: {
      hosts: "SYS_REDIS_SENTINEL_HOSTS",
      port: "SYS_REDIS_SENTINEL_PORT",
      name: "SYS_REDIS_SENTINEL_NAME"
    }
  },

  Mongo: {
    ip: "SYS_MONGO_HOST",
    port: "SYS_MONGO_PORT",
    dbname: "SYS_MONGO_DB",
    password: "SYS_MONGO_PASSWORD",
    user: "SYS_MONGO_USER",
    type: "SYS_MONGO_TYPE",
    replicaset: "SYS_MONGO_REPLICASETNAME"
  },

  auth: {
    // OAuth 2.0
    FACEBOOK_SECRET: "FACEBOOK_CLIENT_SECRET",
    FOURSQUARE_SECRET: "FOURSQUARE_CLIENT_SECRET",
    GOOGLE_SECRET: "GOOGLE_CLIENT_SECRET",
    //
    GITHUB_SECRET: "GITHUB_CLIENT_SECRET",
    INSTAGRAM_SECRET: "INSTAGRAM_CLIENT_SECRET",
    LINKEDIN_SECRET: "INKEDIN_CLIENT_SECRET",
    TWITCH_SECRET: "TWITCH_CLIENT_SECRET",
    WINDOWS_LIVE_SECRET: "MICROSOFT_CLIENT_SECRET",
    YAHOO_SECRET: "YAHOO_CLIENT_SECRET",
    BITBUCKET_SECRET: "BITBUCKET_CLIENT_SECRET",
    SPOTIFY_SECRET: "SPOTIFY_CLIENT_SECRET",

    // OAuth 1.0
    TWITTER_KEY: "TWITTER_CLIENT_KEY",
    TWITTER_SECRET: "TWITTER_CLIENT_SECRET",

    login_verification: "LOGIN_VERIFICATION_REQUIRE",
    signup_verification: "SIGNUP_VERIFICATION_REQUIRE",
    recaptcha_key: "GOOGLE_RECAPTCHA_KEY",

    ui_host: "SYS_APP_UI_HOST",
    agent_host: "SYS_APP_AGENT_UI_HOST"
  },

  Host: {
    profilesearch: "EXTERNAL_PROFILE_SEARCH",
    vdomain: "LB_FRONTEND",
    domain: "HOST_NAME",
    port: "HOST_USERSERVICE_PORT",
    version: "HOST_VERSION"
  },

  Services: {
    accessToken: "HOST_TOKEN",
    resourceServiceHost: "SYS_RESOURCESERVICE_HOST",
    resourceServicePort: "SYS_RESOURCESERVICE_PORT",
    resourceServiceVersion: "SYS_RESOURCESERVICE_VERSION",
    sipuserendpointserviceHost: "SYS_SIPUSERENDPOINTSERVICE_HOST",
    sipuserendpointservicePort: "SYS_SIPUSERENDPOINTSERVICE_PORT",
    sipuserendpointserviceVersion: "SYS_SIPUSERENDPOINTSERVICE_VERSION",
    clusterconfigserviceHost: "SYS_CLUSTERCONFIG_HOST",
    clusterconfigservicePort: "SYS_CLUSTERCONFIG_PORT",
    clusterconfigserviceVersion: "SYS_CLUSTERCONFIG_VERSION",
    billingserviceHost: "SYS_BILLINGSERVICE_HOST",
    billingservicePort: "SYS_BILLINGSERVICE_PORT",
    billingserviceVersion: "SYS_BILLINGSERVICE_VERSION",
    notificationServiceHost: "SYS_NOTIFICATIONSERVICE_HOST",
    notificationServicePort: "SYS_NOTIFICATIONSERVICE_PORT",
    notificationServiceVersion: "SYS_NOTIFICATIONSERVICE_VERSION",
  },
  

  Tenant: {
    activeTenant: "ACTIVE_TENANT"
  },

  ActiveDirectory: {
    groupName: "AD_GROUPNAME"
  }
};
