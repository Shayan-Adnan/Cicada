const winston = require("winston");
const { format, createLogger, transports } = require("winston");
const path = require("path");
const fs = require("fs");

// Ensure log directory exists
const logDir = path.join(__dirname, "../logs");
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// File format with JSON
const fileFormat = format.combine(
  format.timestamp({ format: () => new Date().toISOString() }),
  format.json()
);

const logger = createLogger({
  level: "info",
  transports: [
    new transports.File({
      filename: path.join(logDir, "app.log"),
      format: fileFormat,
    }),
  ],
});

module.exports = logger;
