const { MessageActionRow , MessageButton } = require('discord.js');

const Server = require('../../class/server');

module.exports = async interaction => {
    const msg = await interaction.reply({
        fetchReply: true,
        content: '정말로 서버를 삭제하시겠습니까? 삭제한 뒤에는 복구할 수 없습니다.',
        ephemeral: true,
        components: [
            new MessageActionRow()
                .addComponents(
                    new MessageButton()
                        .setCustomId('delete')
                        .setStyle('DANGER')
                        .setLabel('삭제')
                )
        ]
    });

    try {
        await msg.awaitMessageComponent({
            time: 30000
        });
    } catch(e) {
        msg.components[0].components[0].setDisabled();
        return interaction.editReply({
            content: '시간이 초과되었습니다.',
            components: msg.components
        });
    }

    await interaction.editReply({
        content: '서버를 삭제하는 중입니다...',
        components: []
    });

    const server = Server.get(interaction.dbServer.id);
    return server.delete();
}