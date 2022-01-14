const { Util } = require('discord.js');

const User = require('../../schemas/user');

module.exports = async interaction => {
    const {options} = interaction;

    const user = options.getUser('user');
    const key = options.getString('key');
    const value = options.getString('value');

    const checkUser = await User.findOne({
        id: user.id
    });
    if(!checkUser) return interaction.reply({
        content: '해당 유저 정보를 찾을 수 없습니다.',
        ephemeral: true
    });

    try {
        await User.updateOne({
            id: user.id
        }, {
            [key]: value
        });

        return interaction.reply({
            content: `${user}님의 "${key}" 값을 "${value}"(으)로 변경하였습니다.`,
            ephemeral: true
        });
    } catch(e) {
        return interaction.reply({
            content: `오류가 발생하였습니다!\`\`\`js\n${Util.escapeCodeBlock(e.toString())}\`\`\``,
            ephemeral: true
        });
    }
}