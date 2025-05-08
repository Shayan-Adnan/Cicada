const {
  SlashCommandBuilder,
  PermissionsBitField,
  MessageFlags,
} = require("discord.js");

const { clientId } = require("../config/config");

const CreatedChannels = require("../models/createdChannels");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Kicks a user from a private VC and revokes their access.")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to kick.")
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    //const userVC = interaction.member.voice.channel;
    const userId = interaction.member.user.id;
    const targetUser = interaction.options.getUser("user");

    const userCustomVC = await CreatedChannels.findOne({ userId });
    const userVC = await interaction.guild.channels.cache.get(
      userCustomVC.channelId
    );

    if (targetUser.id === interaction.member.user.id) {
      return interaction.editReply({
        content: "You cannot kick yourself from your own VC!",
        flags: MessageFlags.Ephemeral,
      });
    }

    if (targetUser.id === clientId) {
      return interaction.editReply({
        content: "You cannot kick the bot from your VC!",
        flags: MessageFlags.Ephemeral,
      });
    }

    try {
      if (userVC.members.has(targetUser.id)) {
        const memberToKick = await interaction.guild.members.fetch(
          targetUser.id
        );
        await memberToKick.voice.disconnect();
      }
      await userVC.permissionOverwrites.edit(targetUser.id, {
        [PermissionsBitField.Flags.Connect]: false,
      });
      interaction.editReply({
        content: `${targetUser.username} has been kicked from your VC. They can no longer join.`,
        flags: MessageFlags.Ephemeral,
      });
    } catch (error) {
      console.error("Error kicking user: ", error);
      interaction.editReply("Failed to kick user!", MessageFlags.Ephemeral);
    }
  },
};
