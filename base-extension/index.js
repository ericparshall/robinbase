module.exports = {
    path: __dirname,
    name: "Base",
    namespace: "base",
    dependencies: [],
    env: {
        RB_CUSTOM_PROPS_ENABLED: false,
        RB_ROLES_MODEL: "roles",
        RB_POLICIES_MODEL: "rolePolicies",
    },
    compileEnv: function(config)
    {
        if (typeof process.env.RB_API_LINK === "undefined") {
            config.RB_API_LINK = config.RB_PROTOCOL+'://'+config.RB_API_HOST+':'+config.RB_API_PORT; //apiLink
        }
        if (typeof process.env.RB_WEB_LINK === "undefined") {
            config.RB_WEB_LINK = config.RB_PROTOCOL+'://'+config.RB_WEB_HOST+':'+config.RB_WEB_PORT; //webLink
        }
        if (typeof process.env.RB_ADMIN_LINK === 'undefined') {
            config.RB_ADMIN_LINK = config.RB_PROTOCOL+'://'+config.RB_ADMIN_HOST+':'+config.RB_ADMIN_PORT; //adminLink
        }
    }
}