require("dotenv").config();
module.exports = {
  token: process.env.BOT_TOKEN,
  clientId: process.env.BOT_ID,
  guildId: process.env.SERVER_ID,
  joinToCreateChannelId: process.env.VOICE_CHANNEL_ID,
  activeCategoryId: process.env.ACTIVE_CATEGORY_ID,
  archivedCategoryId: process.env.ARCHIVED_CATEGORY_ID,
  dbConnectionString: process.env.MONGO_URI,
  __archivedCategoryId: "1398625688923406356",
  ___archivedCategoryId: "1398625709072584808",
  notificationChannelId: process.env.NOTIFICATION_CHANNEL_ID,
};
