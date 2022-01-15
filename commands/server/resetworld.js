const Server = require('../../class/server');

module.exports = async interaction => {
    const server = Server.get(interaction.dbServer.id);
    if(server.isRunning) return interaction.reply({
        content: '월드를 초기화하려면 서버를 끈 상태여야 합니다!',
        ephemeral: true
    });

    await interaction.deferReply({
        ephemeral: true
    });

    server.resetWorld();
    return interaction.editReply('월드를 리셋하였습니다!');
}