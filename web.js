const express = require('express');
const { MessageEmbed } = require('discord.js');

const setting = require('./setting.json');
const utils = require('./utils');

const Server = require('./class/server');

const ServerDB = require('./schemas/server');

const app = express();

let client;

module.exports = c => {
    client = c;
}

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.get('/api/getserveraddress', async (req, res) => {
    const domain = req.query.domain;

    const server = await ServerDB.findOne({
        domain
    });
    if(!server) return res.send('no');

    return res.send(`${server.ip}:${server.port}`);
});

app.get('/api/user/:action', async (req, res) => {
    if(![ 'join', 'left' ].includes(req.params.action)) return res.status(400).send('Invalid action');

    const serverID = req.query.server;
    const mcNickname = req.query.name;
    const uuid = req.query.uuid;

    if(!serverID) return res.status(400).send('Missing server');
    if(!mcNickname) return res.status(400).send('Missing nickname');
    if(!uuid) return res.status(400).send('Missing uuid');

    const server = Server.get(serverID);
    if(!server) return res.status(404).send('Server not found');

    res.send('ok');

    const isJoin = req.params.action === 'join';

    return utils.sendWebhookMessage(server.chatChannel, {
        username: '서버 알림',
        avatarURL: client.user.avatarURL()
    }, {
        embeds: [
            new MessageEmbed()
                .setColor(isJoin ? '#00ff00' : '#ff0000')
                .setTitle(`유저 ${isJoin ? '입' : '퇴'}장`)
                .setDescription(`${mcNickname}님이 서버에 ${isJoin ? '입' : '퇴'}장하셨습니다.`)
                .setThumbnail(`https://crafatar.com/avatars/${uuid}`)
                .setTimestamp()
        ]
    });
});

app.get('/api/chat', async (req, res) => {
    const serverID = req.query.server;
    const mcNickname = req.query.name;
    const uuid = req.query.uuid;
    const content = req.query.content;

    if(!serverID) return res.status(400).send('Missing server');
    if(!mcNickname) return res.status(400).send('Missing nickname');
    if(!uuid) return res.status(400).send('Missing uuid');
    if(!content) return res.status(400).send('Missing content');

    const server = Server.get(serverID);
    if(!server) return res.status(404).send('Server not found');

    res.send('ok');

    const jsonText = [
        {
            text: '[Minecraft] ',
            color: 'green'
        },
        {
            text: mcNickname,
            color: 'white'
        },
        {
            text: `: ${content}`,
            color: 'white'
        }
    ];

    server.stdin(`tellraw @a ${JSON.stringify(jsonText)}`);

    return utils.sendWebhookMessage(server.chatChannel, {
        username: mcNickname,
        avatarURL: `https://crafatar.com/avatars/${uuid}`
    }, {
        content,
        allowedMentions: {
            parse: []
        }
    });
});

app.listen(setting.PORT, setting.WEB_IP, () => {
    console.log(`webserver listening on ${setting.WEB_IP}:${setting.PORT}!`);
});