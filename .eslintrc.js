module.exports = {
    "env": {
        "browser": true,
        "es6": true,
        "node": true
    },
    "globals": {
        "require_robinbase": true
    },
    "extends": "eslint:recommended",
    "rules": {
        "indent": [
            "error",
            4,
            { "SwitchCase": 1}
        ],
        "linebreak-style": [
            "error",
            "unix"
        ],
        "quotes": [
            "off",
            "double"
        ],
        "semi": [
            "error",
            "always"
        ],
        "no-console": "warn",
        "no-template-curly-in-string": "error",
        "consistent-return": "warn",
        "brace-style": ["warn", "allman", {"allowSingleLine": true}],
        "no-unused-vars": "warn",
    }
};
