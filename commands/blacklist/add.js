const User = require('../../schemas/user');

module.exports = async interaction => {
    await interaction.deferReply({
        ephemeral: true
    });

    const user = interaction.options.getUser('user');

    await User.updateOne({ id : user.id }, {
        blacklist: true
    }, {
        upsert: true,
        setDefaultsOnInsert: true
    });

    return interaction.editReply(`${user.tag}님을 블랙리스트에 등록했습니다.`);
}