module.exports = async interaction => {
    // const globalCommands = await interaction.client.application?.commands.fetch();
    // const guildCommands = await interaction.guild.commands.fetch();

    await interaction.reply({
        content: '삭제 작업을 시작합니다.',
        ephemeral: true
    });

    // for(let c of globalCommands) await c[1].delete();
    // for(let c of guildCommands) await c[1].delete();

    await interaction.guild.commands.set([]);
}