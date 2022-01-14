module.exports = {
    info: {
        name: 'servercount',
        description: '현재 봇이 있는 서버 갯수를 보여줍니다. // It shows the number of servers that currently have bots.'
    },
    handler: async interaction => {
        return interaction.reply(`현재 봇이 ${interaction.client.guilds.cache.size}개의 서버에 있습니다.`);
    }
}