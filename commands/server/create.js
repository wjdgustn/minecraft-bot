const bcrypt = require('bcrypt');
const portfinder = require('portfinder');

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
    
    const countServers = await ServerDB.countDocuments({
        owner: interaction.user.id
    });
    if(countServers >= interaction.dbUser.serverSlot) return interaction.editReply(`만들 수 있는 서버 한도인 ${interaction.dbUser.serverSlot}개에 도달했습니다!`);
    
    if(subDomain.length > setting.MAX_SUBDOMAIN_LENGTH) return interaction.editReply('도메인이 너무 깁니다.');
    if(memory > interaction.dbUser.maxMemory) return interaction.editReply('사용 가능한 메모리를 초과했습니다.');
    
    const domain = setting.MC_ADDR_RULE.replace('[CUSTOM]', subDomain);
    
    const checkDomain = await ServerDB.findOne({
        domain
    });
    if(checkDomain) return interaction.editReply('이미 사용중인 도메인입니다.');
    
    const checkFtpUsername = await ServerDB.findOne({
        ftpUsername
    });
    if(checkFtpUsername) return interaction.editReply('이미 사용중인 FTP 유저명입니다.');

    let lastServer = await ServerDB.findOne({
        ip: setting.MC_SERVER_IP
    }).sort({
        createdAt: -1
    });
    if(!lastServer) lastServer = { port : 7999 };

    const port = await portfinder.getPortPromise({
        port: lastServer.port + 1
    });

    const ftpPasswordHash = await bcrypt.hash(ftpPassword, 12);

    const permissionOverwrites = [
        {
            id: interaction.guild.id,
            deny: ['VIEW_CHANNEL']
        },
        {
            id: interaction.user.id,
            allow: ['VIEW_CHANNEL']
        }
    ];

    const channelCategory = await interaction.guild.channels.create(name, {
        type: 'GUILD_CATEGORY'
    });
    // const controlChannel = await interaction.guild.channels.create('제어', {
    //     parent: channelCategory,
    //     permissionOverwrites: permissionOverwrites.concat([
    //         {
    //             id: interaction.user.id,
    //             deny: ['SEND_MESSAGES']
    //         }
    //     ])
    // });
    const consoleChannel = await interaction.guild.channels.create('콘솔', {
        parent: channelCategory,
        permissionOverwrites
    });
    const chatChannel = await interaction.guild.channels.create('채팅', {
        parent: channelCategory
    });

    const server = await Server.create({
        owner: interaction.user.id,
        name,
        port,
        domain,
        memory,
        ftpUsername,
        ftpPassword: ftpPasswordHash,
        version,
        channelCategory: channelCategory.id,
        // controlChannel: controlChannel.id,
        consoleChannel: consoleChannel.id,
        chatChannel: chatChannel.id,
        serverStatusMessage,
        autoRestart
    });

    // await controlChannel.send(utils.getServerControlMessage(server.id));

    return interaction.editReply(`${server.name} 서버가 생성되었습니다!`);
}