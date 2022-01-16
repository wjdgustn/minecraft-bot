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
                 ...utils.markdownToMincraftComponent(message.content)
             ];

             server.stdin(`tellraw @a ${JSON.stringify(jsonText)}`);

             if(!recentChat[server.id]) recentChat[server.id] = [];
             recentChat[server.id].push(jsonText);
             if(recentChat[server.id].length > 30) recentChat[server.id].shift();
         }
    });
}