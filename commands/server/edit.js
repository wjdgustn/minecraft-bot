const bcrypt = require('bcrypt');

const setting = require('../../setting.json');

const Server = require('../../class/server');

const ServerDB = require('../../schemas/server');

module.exports = async interaction => {
    await interaction.deferReply({
        ephemeral: true
    });
    
    const { options } = interaction;

    const name = options.getString('name');
    const subDomain = options.getString('domain');
    const memory = options.getInteger('memory');
    const version = options.getString('version');
    const ftpUsername = options.getString('ftpusername');
    const ftpPassword = options.getString('ftppassword');
    const serverStatusMessage = options.getBoolean('serverstatusmessage');
    const autoRestart = options.getBoolean('autorestart') && interaction.dbUser.allowAutorestart;
    
    if(subDomain && subDomain.length > setting.MAX_SUBDOMAIN_LENGTH) return interaction.editReply('도메인이 너무 깁니다.');
    if(memory && memory > interaction.dbUser.maxMemory) return interaction.editReply('사용 가능한 메모리를 초과했습니다.');
    
    let domain;
    if(subDomain) domain = setting.MC_ADDR_RULE.replace('[CUSTOM]', subDomain);
    
    const checkDomain = await ServerDB.findOne({
        domain
    });
    if(checkDomain) return interaction.editReply('이미 사용중인 도메인입니다.');

    if(ftpUsername) {
        const checkFtpUsername = await ServerDB.findOne({
            ftpUsername
        });
        if(checkFtpUsername) return interaction.editReply('이미 사용중인 FTP 유저명입니다.');
    }

    let ftpPasswordHash;
    if(ftpPassword) ftpPasswordHash = await bcrypt.hash(ftpPassword, 12);

    const server = Server.get(interaction.dbServer.id);
    await server.updateDB({
        name,
        domain,
        memory,
        version,
        ftpUsername,
        ftpPassword: ftpPasswordHash,
        serverStatusMessage,
        autoRestart
    });

    return interaction.editReply(`${server.name} 서버의 정보를 수정했습니다.`);
}