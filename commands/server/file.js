const { MessageActionRow , MessageButton , Util } = require('discord.js');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const properties = require('properties');

const Server = require('../../class/server');

module.exports = async interaction => {
    await interaction.deferReply({
        ephemeral: true
    });

    const fileName = interaction.options.getString('file');

    const server = Server.get(interaction.dbServer.id);

    const filePath = path.resolve(server.path, fileName);
    if(!fs.existsSync(filePath)) return interaction.editReply('파일이 존재하지 않습니다!');

    const file = fs.readFileSync(filePath);
    const fileString = Util.escapeCodeBlock(file.toString());

    const msg = await interaction.editReply({
        content: fileString.length <= 4000 ? `\`\`\`\n${fileString}\n\`\`\`` : null,
        files: fileString.length > 4000 ? [
            {
                name: fileName,
                attachment: file
            }
        ] : null,
        components: [
            new MessageActionRow()
                .addComponents(
                    new MessageButton()
                        .setCustomId('edit')
                        .setStyle('PRIMARY')
                        .setLabel('수정')
                )
        ]
    });

    msg.components[0].components[0].setDisabled();

    try {
        const i = await msg.awaitMessageComponent({
            time: 30000
        });
        await i.reply({
            content: '수정된 파일의 내용을 메시지로 전송하거나 파일로 업로드하세요.',
            ephemeral: true
        });
        await interaction.editReply({
            components: msg.components
        });
    } catch(e) {
        return interaction.editReply({
            components: msg.components
        });
    }

    let response = await interaction.channel.awaitMessages({
        max: 1,
        time: 180000,
        filter: m => m.author.id === interaction.user.id
    });
    if(!response.first()) return interaction.followUp({
        content: '시간이 초과되었습니다.',
        ephemeral: true
    });

    const message = response.first();
    await message.delete();

    if(message.content) response = message.content;
    else if(message.attachments) {
        const { data } = await axios({
            url: message.attachments.first().url,
            method: 'GET',
            responseType: 'arraybuffer'
        });
        response = Buffer.from(data, 'binary');
    }
    else return interaction.followUp({
        content: '수정된 파일의 내용을 메시지로 전송하거나 파일로 업로드하지 않아 취소되었습니다!',
        ephemeral: true
    });

    if(fileName === 'server.properties') server.saveProperties(properties.parse(response.toString()));
    else fs.writeFileSync(filePath, response);

    return interaction.followUp({
        content: `${fileName}의 수정이 완료되었습니다!`,
        ephemeral: true
    });
}