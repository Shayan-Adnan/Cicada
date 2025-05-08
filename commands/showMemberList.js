const {
  SlashCommandBuilder,
  PermissionsBitField,
  MessageFlags,
} = require("discord.js");

const CreatedChannels = require("../models/createdChannels");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("showmemberlist")
    .setDescription(
      "Shows a list of members that are allowed to join the channel."
    ),
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const userId = interaction.member.user.id;
    const userCustomVC = await CreatedChannels.findOne({ userId });

    const userVC = await interaction.guild.channels.cache.get(
      userCustomVC.channelId
    );

    let allowedUsers = [];

    try {
      for (const [userId, overwrite] of userVC.permissionOverwrites.cache) {
        //user-specific permissions are of type 1
        if (
          overwrite.type == 1 &&
          overwrite.allow.has(PermissionsBitField.Flags.Connect)
        ) {
          const member = await userVC.guild.members.fetch(userId);
          allowedUsers.push(member.user.username);
        }
      }

      const response =
        allowedUsers.length > 0
          ? `Allowed members in ${userVC.name}:\n\n${allowedUsers.join("\n")}`
          : `No members have been granted access to ${userVC.name}`;

      await interaction.editReply({
        content: response,
        flags: MessageFlags.Ephemeral,
      });
    } catch (error) {
      console.error(error);
    }
  },
};
