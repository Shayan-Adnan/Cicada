const {
  PermissionsBitField,
  DiscordAPIError,
  ChannelType,
} = require("discord.js");
const {
  joinToCreateChannelId,
  activeCategoryId,
  __archivedCategoryId,
  ___archivedCategoryId,
  archivedCategoryId,
} = require("../config/config");
const CreatedChannels = require("../models/createdChannels");
const logger = require("../config/logger");

const archiveChannel = async (channel, guild) => {
  await channel.permissionOverwrites.edit(guild.roles.everyone, {
    [PermissionsBitField.Flags.ViewChannel]: false,
  });
  console.log("Attempting to archive channel", channel.name);
  logger.info(`Attempting to archive channel ${channel.name}`);

  const categories = [
    { id: archivedCategoryId, name: "Main Archived Category" },
    { id: __archivedCategoryId, name: "Second Archived Category" },
    { id: ___archivedCategoryId, name: "Third Archived Category" },
  ];

  for (const { id, name } of categories) {
    const category = guild.channels.cache.get(id);
    if (!category) {
      console.log(`${name} doesn't exist!`);
      logger.error(`${name} doesn't exist!`);
      continue;
    }

    const voiceChannelCount = category.children.cache.filter(
      (ch) => ch.type === ChannelType.GuildVoice
    ).size;

    if (voiceChannelCount < 50) {
      try {
        await channel.setParent(id, { lockPermissions: false });
        console.log(`Successfully archived to ${name}`);
        logger.info(`Successfully archived to ${name}`);
        return;
      } catch (error) {
        if (error instanceof DiscordAPIError && error.code === 50035) {
          console.log(`${name} is full, trying next category`);
          logger.info(`${name} is full, trying next category`);
          continue;
        }
        throw error;
      }
    } else {
      console.log(`${name} is full (${voiceChannelCount}/50 channels)`);
      logger.info(`${name} is full (${voiceChannelCount}/50 channels)`);
    }
  }
  throw new Error("All archive categories are full or unavailable");
};

const restoreChannel = async (channel, guild, user, existingChannelEntry) => {
  await channel.setParent(activeCategoryId, {
    lockPermissions: false,
  });

  await channel.permissionOverwrites.edit(guild.roles.everyone, {
    [PermissionsBitField.Flags.ViewChannel]: true,
  });

  await channel.permissionOverwrites.edit(user.id, {
    [PermissionsBitField.Flags.MoveMembers]: false,
  });

  await existingChannelEntry.updateOne({
    lastMovedAt: Date.now(),
  });

  // Update username if it doesn't exist or is null/empty
  if (
    !existingChannelEntry.username ||
    existingChannelEntry.username === null
  ) {
    console.log(
      `Username doesn't exist in database record for ${user.username}. Adding username.`
    );
    logger.info(
      `Username doesn't exist in database record for ${user.username}. Adding username.`
    );
    try {
      await existingChannelEntry.updateOne({
        username: user.username,
      });
    } catch (error) {
      console.error(
        `Failed to add username to ${user.username}'s record in the database`
      );
      logger.error(
        `Failed to add username to ${user.username}'s record in the database`
      );
    }
  }
};

const createChannel = async (user, client, guild) => {
  const newChannel = await guild.channels.create({
    name: `${user.username}'s channel`,
    type: 2,
    parent: activeCategoryId,
    permissionOverwrites: [
      {
        id: client.user.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.ManageChannels,
          PermissionsBitField.Flags.Connect,
          PermissionsBitField.Flags.MoveMembers,
        ],
      },
      {
        id: user.id,
        allow: [PermissionsBitField.Flags.Connect],
      },
      {
        id: guild.roles.everyone,
        allow: [PermissionsBitField.Flags.ViewChannel],
        deny: [PermissionsBitField.Flags.Connect],
      },
    ],
  });

  // Use findOneAndUpdate with upsert to handle orphaned records
  // If a record exists (orphaned from failed DB deletion), it will be updated
  // Otherwise, a new record will be created
  await CreatedChannels.findOneAndUpdate(
    { userId: user.id },
    {
      userId: user.id,
      channelId: newChannel.id,
      username: user.username,
    },
    { upsert: true, new: true }
  );

  console.log(`Added new channel to database (for ${user.username})`);
  logger.info(`Added new channel to database (for ${user.username})`);

  return newChannel;
};

module.exports = {
  name: "voiceStateUpdate",
  async execute(oldState, newState) {
    const guild = newState.guild;
    const user = newState.member?.user;
    const joinToCreateChannel = guild.channels.cache.get(joinToCreateChannelId);

    if (oldState.channelId) {
      const customVC = await CreatedChannels.findOne({
        channelId: oldState.channelId,
      });
      const oldChannel = oldState.guild.channels.cache.get(oldState.channelId);

      if (customVC && oldChannel?.members.size === 0) {
        try {
          await archiveChannel(oldChannel, guild);
          console.log(
            `Removing voice channel permissions for ${
              customVC.username ? customVC.username : customVC.userId
            } for join to create channel`
          );
          logger.info(
            `Removing voice channel permissions for ${
              customVC.username ? customVC.username : customVC.userId
            } for join to create channel`
          );
          await joinToCreateChannel.permissionOverwrites.edit(customVC.userId, {
            [PermissionsBitField.Flags.Connect]: true,
          });
          console.log(
            `Removed voice channel permissions successfully for join to create channel for user ${
              customVC.username ? customVC.username : customVC.userId
            }`
          );
          logger.info(
            `Removed voice channel permissions successfully for join to create channel for user ${
              customVC.username ? customVC.username : customVC.userId
            }`
          );
        } catch (error) {
          console.error("Error archiving channel: ", error);
          logger.error(`Error archiving channel: ${error}`);
        }
      }

      /*  const isInTheirOwnVC = await CreatedChannels.findOne({
        channelId: newState.channelId,
        userId: user.id,
      });

      if (!isInTheirOwnVC) {
        try {
          console.log(
            `Removing voice channel permissions for ${user.username} for join-to-create channel`
          );

          await joinToCreateChannel.permissionOverwrites.delete(user.id);
        } catch (error) {
          console.error(
            `Error unlocking join to create for ${user.username}`,
            error
          );
        }
      } */
    }

    if (!newState.channelId) return;

    if (newState.channelId !== joinToCreateChannelId) {
      const returnedToTheirOwnChannel = await CreatedChannels.findOne({
        channelId: newState.channelId,
        userId: user.id,
      });

      if (returnedToTheirOwnChannel) {
        console.log(
          `Locking join-to-create channel for ${user.username} (they returned to their own channel)`
        );
        logger.info(
          `Locking join-to-create channel for ${user.username} (they returned to their own channel)`
        );

        await joinToCreateChannel.permissionOverwrites.edit(user.id, {
          [PermissionsBitField.Flags.Connect]: false,
        });
      }

      return;
    }

    try {
      const existingChannelEntry = await CreatedChannels.findOne({
        userId: user.id,
      });

      if (existingChannelEntry) {
        const existingChannel = guild.channels.cache.get(
          existingChannelEntry.channelId
        );

        if (existingChannel) {
          await restoreChannel(
            existingChannel,
            guild,
            user,
            existingChannelEntry
          );

          await newState.member.voice.setChannel(existingChannel);

          //when a user's custom vc in in the active category, lock join-to-create channel for them

          console.log(`Locking join-to-create channel for ${user.username}`);
          logger.info(`Locking join-to-create channel for ${user.username}`);

          return await joinToCreateChannel.permissionOverwrites.edit(user.id, {
            [PermissionsBitField.Flags.Connect]: false,
          });
        } else {
          // Channel doesn't exist, clean up orphaned record
          try {
            await CreatedChannels.deleteOne({ userId: user.id });
            console.log(`Deleted orphaned record of ${user.id}`);
            logger.info(`Deleted orphaned record of ${user.id}`);
          } catch (error) {
            console.error(
              `Failed to delete orphaned record for ${user.id}: ${error.message}`
            );
            logger.error(
              `Failed to delete orphaned record for ${user.id}: ${error.message}`,
              error
            );
            // Continue anyway - createChannel will handle this with upsert
          }
        }
      }

      const newChannel = await createChannel(user, newState.client, guild);

      await newState.member.voice.setChannel(newChannel);

      await joinToCreateChannel.permissionOverwrites.edit(user.id, {
        [PermissionsBitField.Flags.Connect]: false,
      });
    } catch (error) {
      console.error("Error creating voice channel: ", error);
      logger.error(`Error creating voice channel: ${error}`);

      //if someone joins join-to-create channel but leaves too quickly
      if (
        error.rawError?.message === "Target user is not connected to voice."
      ) {
        try {
          const existingChannelEntry = await CreatedChannels.findOne({
            userId: user.id,
          });

          if (existingChannelEntry) {
            const existingChannel = guild.channels.cache.get(
              existingChannelEntry.channelId
            );
            if (existingChannel) {
              await archiveChannel(existingChannel, guild);
            }
            // await existingChannel?.setParent(archivedCategoryId, {
            //   lockPermissions: false,
            // });
            // await existingChannel?.permissionOverwrites.edit(
            //   guild.roles.everyone,
            //   {
            //     [PermissionsBitField.Flags.ViewChannel]: false,
            //   }
            // );
          }
        } catch (error) {
          console.log("Failed to archive channel.", error);
          logger.error(`Failed to archive channel: ${error}`);
        }
      }
    }
  },
};

//when user's custom vc in in the archived category, open join-to-create channel for them
// await joinToCreateChannel.permissionOverwrites.edit(user.id, {
//   [PermissionsBitField.Flags.Connect]: true,
// });
