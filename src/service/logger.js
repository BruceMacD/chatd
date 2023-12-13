const path = require("path");
const os = require("os"); 
const winston = require("winston");

class Logger {
 static instance = null;

 constructor() {
    this.logger = winston.createLogger({
        format: winston.format.simple(),
        transports: [
          new winston.transports.Console(),
          new winston.transports.File({
            filename: path.join(os.homedir(), ".chatd", "service.log"),
            maxSize: 1000000, // 1 MB
            maxFiles: 1,
          })
        ]
    });
  }

 static getLogger() {
    if (this.instance === null) {
      this.instance = new this();
    }
    return this.instance;
  }
}

function info(msg) {
    console.log(msg);
    Logger.getLogger().logger.info(msg);
}

function error(msg) {
    console.log(msg);
    Logger.getLogger().logger.error(msg);
}

module.exports = {
    logInfo: info,
    logErr: error
}