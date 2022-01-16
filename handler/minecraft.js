const setting = require('../setting.json');
const utils = require('../utils');

const Server = require('../class/server');
const Waterfall = require('../class/waterfall');

const { recentChat } = require('../web');

const ServerDB = require('../schemas/server');

module.exports = client => {
    client.on('messageCreate', async message => {
        if(message.author.bot) return;

        if(message.channel.id === setting.WATERFALL_CONSOLE_CHANNEL) Waterfall.get?.stdin(message.content);

         const checkConsole = await ServerDB.findOne({
             consoleChannel: message.channel.id
         });
         if(checkConsole) {
             if(message.content.trim().startsWith('setupserver ')) return;
             const server = Server.get(checkConsole.id);
             if(server) server.stdin(message.content);
             return;
         }

         const checkChat = await ServerDB.findOne({
             chatChannel: message.channel.id
         });
         if(checkChat) {
             const server = Server.get(checkChat.id);
             if(!server) return;

             const highestRole = message.member.roles.highest;
             const jsonText = [
                 '',
                 {
                     text: '[Discord] ',
                     color: '#5865F2'
                 },
                 {
                     text: message.member.displayName,
                     color: highestRole.id === message.guild.id ? 'white' : highestRole.hexColor
                 },
                 {
                     text: ': '
                 },
                 ...utils.markdownToMincraftComponent(message.cleanContent, message.id)
             ];

             server.stdin(`tellraw @a ${JSON.stringify(jsonText)}`);

             if(!recentChat[server.id]) recentChat[server.id] = [];
             recentChat[server.id].push(jsonText);
             if(recentChat[server.id].length > 30) recentChat[server.id].shift();
         }
    });

    client.on('messageUpdate', async (before, message) => {
        if(before?.content === message.content) return;

        const checkChat = await ServerDB.findOne({
            chatChannel: message.channel.id
        });
        if(!checkChat) return;

        const server = Server.get(checkChat.id);
        if(!server) return;

        const chatIndex = recentChat[server.id].findIndex(chat => chat.find((a => a.messageId)).messageId === message.id);
        if(chatIndex === -1) return;

        const highestRole = message.member.roles.highest;
        recentChat[server.id][chatIndex] = [
            '',
            {
                text: '[Discord] ',
                color: '#5865F2'
            },
            {
                text: message.member.displayName,
                color: highestRole.id === message.guild.id ? 'white' : highestRole.hexColor
            },
            {
                text: ': '
            },
            ...utils.markdownToMincraftComponent(message.cleanContent, message.id),
            {
                text: ' (수정됨)',
                color: 'dark_gray'
            }
        ];

        const sendMessage = [];
        const copiedRecentChat = JSON.parse(JSON.stringify(recentChat[server.id]));
        for(let i in copiedRecentChat) {
            const c = copiedRecentChat[i];
            if(i < copiedRecentChat.length - 1) c[c.length - 1].text += '\n';
            if(c) sendMessage.push(c.filter(a => a !== undefined));
        }

        if(sendMessage.length < 30) sendMessage.unshift('\n'.repeat(30 - sendMessage.length));

        server.stdin(`tellraw @a ${JSON.stringify(sendMessage)}`);
    });

    client.on('messageDelete', async message => {
        const checkChat = await ServerDB.findOne({
            chatChannel: message.channel.id
        });
        if(!checkChat) return;

        const server = Server.get(checkChat.id);
        if(!server) return;

        const chatIndex = recentChat[server.id].findIndex(chat => chat.find((a => a.messageId)).messageId === message.id);
        if(chatIndex === -1) return;

        recentChat[server.id].splice(chatIndex, 1);

        const sendMessage = [];
        const copiedRecentChat = JSON.parse(JSON.stringify(recentChat[server.id]));
        for(let i in copiedRecentChat) {
            const c = copiedRecentChat[i];
            if(i < copiedRecentChat.length - 1) c[c.length - 1].text += '\n';
            if(c) sendMessage.push(c.filter(a => a !== undefined));
        }

        if(sendMessage.length < 30) sendMessage.unshift('\n'.repeat(30 - sendMessage.length));

        server.stdin(`tellraw @a ${JSON.stringify(sendMessage)}`);
    });
}