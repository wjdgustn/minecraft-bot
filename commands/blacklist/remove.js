const User = require('../../schemas/user');

module.exports = async interaction => {
    await interaction.deferReply({
        ephemeral: true
    });

    const user = interaction.options.getUser('user');

    await User.updateOne({ id : user.id }, {
        blacklist: false
    });

    return interaction.editReply(`${user.tag}님을 블랙리스트에서 제거했습니다.`);
}