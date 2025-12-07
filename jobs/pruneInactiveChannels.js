const CreatedChannels = require("../models/createdChannels");
const { guildId, activeCategoryId } = require("../config/config");
const logger = require("../config/logger");

const pruneInactiveChannels = async (client) => {
  const guild = client.guilds.cache.get(guildId);

  if (!guild) {
    console.error("Guild not found!");
    logger.error("Guild not found!");
    return;
  }

  let inactiveChannels;
  try {
    const thirtyDaysAgo = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30);
    console.log(
      `Pruning channels inactive since: ${thirtyDaysAgo.toISOString()}`
    );
    logger.info(
      `Pruning channels inactive since: ${thirtyDaysAgo.toISOString()}`
    );

    inactiveChannels = await CreatedChannels.find({
      lastMovedAt: { $lte: thirtyDaysAgo }, // 30 days or more
    });
  } catch (error) {
    console.error(
      "Failed to fetch inactive channels from database:",
      error.message
    );
    logger.error(
      `Failed to fetch inactive channels from database: ${error.message}`,
      error
    );
    return;
  }

  if (inactiveChannels.length === 0) {
    console.log("No inactive channels to prune.");
    logger.info("No inactive channels to prune.");
  }

  for (const channelData of inactiveChannels) {
    const channel = guild.channels.cache.get(channelData.channelId);

    if (!channel) {
      // Channel doesn't exist in Discord, skip (might have been manually deleted)
      continue;
    }

    // SAFETY CHECK: Never delete channels in the active category (they're currently in use)
    if (channel.parentId === activeCategoryId) {
      console.log(
        `Skipping ${
          channelData.username || channelData.userId
        }'s channel - it's in the active category (currently in use)`
      );
      logger.info(
        `Skipping channel ${channelData.channelId} - it's in the active category (currently in use)`
      );
      continue;
    }

    // SAFETY CHECK: Never delete channels with members
    if (channel.members.size > 0) {
      console.log(
        `Skipping ${
          channelData.username || channelData.userId
        }'s channel - it has ${channel.members.size} member(s)`
      );
      logger.info(
        `Skipping channel ${channelData.channelId} - it has ${channel.members.size} member(s)`
      );
      continue;
    }

    const userIdentifier = channelData.username
      ? `${channelData.username}'s channel`
      : `Channel (userId: ${channelData.userId})`;

    const lastMovedDate = new Date(channelData.lastMovedAt);
    const daysInactive = Math.floor(
      (Date.now() - lastMovedDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    console.log(
      `${userIdentifier} has been inactive for ${daysInactive} days (lastMovedAt: ${lastMovedDate.toISOString()}). Pruning channel...`
    );
    logger.info(
      `${userIdentifier} has been inactive for ${daysInactive} days (lastMovedAt: ${lastMovedDate.toISOString()}). Pruning channel...`
    );

    try {
      await channel.delete();
    } catch (error) {
      console.error(
        `Failed to prune channel for ${userIdentifier}: ${error.message}`
      );
      logger.error(
        `Failed to prune channel for ${userIdentifier}: ${error.message}`,
        error
      );
      continue; // Don't delete DB record if channel deletion failed
    }

    try {
      await CreatedChannels.deleteOne({ channelId: channelData.channelId });
      console.log(
        `Successfully pruned channel and DB record for ${userIdentifier}`
      );
      logger.info(
        `Successfully pruned channel and DB record for ${userIdentifier}`
      );
    } catch (error) {
      console.error(
        `Failed to prune db channel record for ${userIdentifier}: ${error.message}`
      );
      logger.error(
        `Failed to prune db channel record for ${userIdentifier}: ${error.message}`,
        error
      );
      // Channel was deleted but DB record remains - this is logged but we continue
    }
  }
};

module.exports = pruneInactiveChannels;
