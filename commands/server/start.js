const Server = require('../../class/server');

module.exports = async interaction => {
    const server = Server.get(interaction.dbServer.id);
    if(server.isRunning) return interaction.reply({
        content: '이미 서버가 실행중입니다!',
        ephemeral: true
    });

    server.start();
    return interaction.reply({
        content: '서버를 시작합니다!',
        ephemeral: true
    });
}