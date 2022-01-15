const bcrypt = require('bcrypt');

const setting = require('../../setting.json');

const Server = require('../../class/server');

const ServerDB = require('../../schemas/server');

module.exports = async interaction => {
    await interaction.deferReply({
        ephemeral: true
    });
    
    const { options } = interaction;

    const name = options.getString('name') || undefined;
    const subDomain = options.getString('domain') || undefined;
    const memory = options.getInteger('memory') || undefined;
    const version = options.getString('version') || undefined;
    const ftpUsername = options.getString('ftpusername') || undefined;
    const ftpPassword = options.getString('ftppassword') || undefined;
    const serverStatusMessage = options.getBoolean('serverstatusmessage') || undefined;
    const autoRestart = (options.getBoolean('autorestart') || interaction.dbServer.autoRestart) && interaction.dbUser.allowAutorestart;
    
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