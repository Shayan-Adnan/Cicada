const {
  SlashCommandBuilder,
  PermissionsBitField,
  MessageFlags,
} = require("discord.js");

const { notificationChannelId } = require("../config/config");
const CreatedChannels = require("../models/createdChannels");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("allow")
    .setDescription("Allows users to join a private VC.")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to allow.")
        .setRequired(true)
    ),

  async execute(interaction) {
    //const userVC = interaction.member.voice.channel;
    //const userTextChannel = interaction.channel;

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const userId = interaction.member.user.id;
    const targetUser = interaction.options.getUser("user");

    const userCustomVC = await CreatedChannels.findOne({ userId });
    const userVC = await interaction.guild.channels.cache.get(
      userCustomVC.channelId
    );

    const notificationChannel = interaction.guild.channels.cache.get(
      notificationChannelId
    );

    try {
      const currentPermissions = userVC.permissionOverwrites.resolve(
        targetUser.id
      );

      if (currentPermissions?.allow.has(PermissionsBitField.Flags.Connect)) {
        return interaction.editReply({
          content: `${targetUser.username} already has permission to join your VC.`,
          flags: MessageFlags.Ephemeral,
        });
      }

      await userVC.permissionOverwrites.edit(targetUser.id, {
        [PermissionsBitField.Flags.Connect]: true,
      });

      interaction.editReply({
        content: `${targetUser.username} can now join your VC.`,
        flags: MessageFlags.Ephemeral,
      });

      notificationChannel?.send(
        `${targetUser} You have been allowed in ${interaction.member.user.username}'s VC!`
      );
    } catch (error) {
      console.error("Error allowing user: ", error);
      interaction.editReply({
        content: "Failed to allow user!",
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
