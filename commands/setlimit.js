const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const CreatedChannels = require("../models/createdChannels");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setlimit")
    .setDescription(
      "Allows a user to change the user limit of their private VC"
    )
    .addIntegerOption((option) =>
      option
        .setName("limit")
        .setDescription("Number of users to be allowed in the VC.")
        .setRequired(true)
    ),

  async execute(interaction) {
    // const userVC = interaction.member.voice.channel;

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const userId = interaction.member.user.id;
    const limit = interaction.options.getInteger("limit");

    const userCustomVC = await CreatedChannels.findOne({ userId });
    const userVC = await interaction.guild.channels.cache.get(
      userCustomVC.channelId
    );

    if (limit < 0 || limit > 99) {
      return interaction.editReply({
        content: "Please enter a number between 0 and 99",
        flags: MessageFlags.Ephemeral,
      });
    }

    try {
      await userVC.setUserLimit(limit);
      interaction.editReply({
        content: `VC limit set to ${limit}`,
        flags: MessageFlags.Ephemeral,
      });
    } catch (error) {
      console.error("Error setting VC limit: ", error);
      interaction.editReply({
        content: "Failed to update VC limit",
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
