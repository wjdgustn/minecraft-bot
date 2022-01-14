const Server = require('../../class/server');

module.exports = async interaction => {
    const server = Server.get(interaction.dbServer.id);
    if(!server.isRunning) return interaction.reply({
        content: '서버가 실행중이지 않습니다!',
        ephemeral: true
    });

    if(interaction.options.getBoolean('force')) server.forceStop();
    else server.stop();
    return interaction.reply({
        content: '서버를 종료합니다!',
        ephemeral: true
    });
}