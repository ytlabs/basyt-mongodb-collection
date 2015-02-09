var pmongo = require("promised-mongo"),
    config = GLOBAL.APP_CONFIG.mongodb;

module.exports = pmongo(config);
