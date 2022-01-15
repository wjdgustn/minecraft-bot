const { MessageActionRow , MessageButton } = require('discord.js');

const Server = require('../../class/server');

module.exports = async interaction => {
    const server = Server.get(interaction.dbServer.id);
    if(server.isRunning) return interaction.reply({
        content: '월드를 초기화하려면 서버를 끈 상태여야 합니다!',
        ephemeral: true
    });

    const msg = await interaction.reply({
        fetchReply: true,
        content: '정말로 월드를 초기화하시겠습니까? 초기화한 뒤에는 복구할 수 없습니다.',
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
        const i = await msg.awaitMessageComponent({
            time: 30000
        });
        await i.update({
            content: '월드 초기화 중입니다...',
            ephemeral: true,
            components: []
        });
    } catch(e) {
        msg.components[0].components[0].setDisabled();
        return interaction.editReply({
            content: '시간이 초과되었습니다.',
            components: msg.components
        });
    }

    server.resetWorld();
    return interaction.editReply('월드를 리셋하였습니다!');
}