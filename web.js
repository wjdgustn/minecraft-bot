const express = require('express');
const { MessageEmbed } = require('discord.js');

const setting = require('./setting.json');
const utils = require('./utils');

const Server = require('./class/server');
const Process = require('./class/process');

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

    if(isJoin) {
        if(!recentChat[serverID]) recentChat[serverID] = [];
        let copiedRecentChat = JSON.parse(JSON.stringify(recentChat[serverID]));

        const sendMessage = [];
        for(let i in copiedRecentChat) {
            const c = copiedRecentChat[i];
            if(i < copiedRecentChat.length - 1) c[c.length - 1].text += '\n';
            if(c) sendMessage.push(c.filter(a => a !== undefined));
        }

        server.stdin(`tellraw ${mcNickname} ${JSON.stringify(sendMessage)}`);

        for(let i in recentChat[serverID]) {
            const contentIndex = recentChat[serverID][i].findIndex(a => a.messageId);
            if(contentIndex === -1) continue;
            const clickedPlayers = recentChat[serverID][i][contentIndex].clickedPlayers;
            if(clickedPlayers) recentChat[serverID][i][contentIndex].clickedPlayers = clickedPlayers.filter(a => a !== mcNickname);
        }
    }

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

const recentChat = {};
module.exports.recentChat = recentChat;

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
        '',
        {
            text: '[Minecraft] ',
            color: 'green'
        },
        {
            text: `${mcNickname}: `
        },
        ...utils.markdownToMincraftComponent(content)
    ];

    server.stdin(`tellraw @a ${JSON.stringify(jsonText)}`);

    if(!recentChat[serverID]) recentChat[serverID] = [];
    recentChat[serverID].push(jsonText);
    if(recentChat[serverID].length > 30) recentChat[serverID].shift();

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

const achievements = {};
const achievementTimeouts = {};

app.get('/api/achievement', (req, res) => {
    const serverID = req.query.server;
    const mcNickname = req.query.name;
    const uuid = req.query.uuid;
    const achievement = req.query.achievement;

    if(!serverID) return res.status(400).send('Missing server');
    if(!mcNickname) return res.status(400).send('Missing nickname');
    if(!uuid) return res.status(400).send('Missing uuid');
    if(!achievement) return res.status(400).send('Missing achievement');

    const server = Server.get(serverID);
    if(!server) return res.status(404).send('Server not found');

    res.send('ok');

    if(achievement.startsWith('recipes/')) return;

    const achievementName = achievement
        .split('/')
        .at(-1)
        .split('_')
        .map(a => a.charAt(0).toUpperCase() + a.slice(1))
        .join(' ');

    if(!achievements[serverID]) achievements[serverID] = {};
    if(!achievementTimeouts[serverID]) achievementTimeouts[serverID] = {};

    if(!achievements[serverID][uuid]) achievements[serverID][uuid] = [];
    if(achievementTimeouts[serverID][uuid]) clearTimeout(achievementTimeouts[serverID][uuid]);

    achievements[serverID][uuid].push(achievementName);

    achievementTimeouts[serverID][uuid] = setTimeout(async () => {
        const array = achievements[serverID][uuid];
        const description = array.length > 3 ? `발전 과제 ${array.length}개를 달성했습니다!` : `${array.join(', ')} 발전 과제를 달성했습니다!`

        achievements[serverID][uuid] = [];

        await utils.sendWebhookMessage(server.chatChannel, {
            username: mcNickname,
            avatarURL: `https://crafatar.com/avatars/${uuid}`
        }, {
            embeds: [
                new MessageEmbed()
                    .setColor('#ffff00')
                    .setTitle('발전 과제')
                    .setDescription(`${mcNickname}님이 ${description}`)
                    .setThumbnail(`https://crafatar.com/avatars/${uuid}`)
                    .setTimestamp()
            ],
            allowedMentions: {
                parse: []
            }
        });

        achievementTimeouts[serverID][uuid] = null;
    }, 100);
});

app.get('/api/spoiler', (req, res) => {
    const serverID = req.query.server;
    const mcNickname = req.query.name;
    const messageId = req.query.message;
    const spoilerId = req.query.spoiler;

    if(!serverID) return res.status(400).send('Missing server');
    if(!mcNickname) return res.status(400).send('Missing nickname');
    if(!messageId) return res.status(400).send('Missing message');
    if(!spoilerId) return res.status(400).send('Missing spoiler');

    const server = Server.get(serverID);
    if(!server) return res.status(404).send('Server not found');

    res.send('ok');

    if(!recentChat[serverID]) recentChat[serverID] = [];
    let copiedRecentChat = JSON.parse(JSON.stringify(recentChat[serverID]));

    copiedRecentChat = copiedRecentChat.map((c, i) => {
        if(recentChat[serverID][i].length < 4) return c;

        const contentIndex = recentChat[serverID][i].findIndex(a => a.messageId);
        if(contentIndex === -1) return c;

        if(!recentChat[serverID][i][contentIndex].clickedPlayers) recentChat[serverID][i][contentIndex].clickedPlayers = [];
        if(!recentChat[serverID][i][contentIndex].clickedPlayers.includes(mcNickname) && recentChat[serverID][i][contentIndex].messageId === messageId)
            recentChat[serverID][i][contentIndex].clickedPlayers.push(mcNickname);

        if(recentChat[serverID][i][contentIndex].clickedPlayers.includes(mcNickname))
            c = c.map(a => a.originalComponent || a);
        return c;
    });

    const sendMessage = [];
    for(let i in copiedRecentChat) {
        const c = copiedRecentChat[i];
        if(i < copiedRecentChat.length - 1) c[c.length - 1].text += '\n';
        if(c) sendMessage.push(c.filter(a => a !== undefined));
    }

    if(sendMessage.length < 30) sendMessage.unshift('\n'.repeat(30 - sendMessage.length));

    server.stdin(`tellraw ${mcNickname} ${JSON.stringify(sendMessage)}`);
});

app.get('/api/stdin', (req, res) => {
    const serverID = req.query.server;
    const stdin = req.query.stdin;

    if(!serverID) return res.status(400).send('Missing server');
    if(!stdin) return res.status(400).send('Missing stdin');

    const server = Server.get(serverID);
    if(!server) return res.status(404).send('Server not found');

    res.send('ok');

    server.stdin(stdin + '\n');
});

app.get('/api/waterfallstdin', (req, res) => {
    const stdin = req.query.stdin;

    if(!stdin) return res.status(400).send('Missing stdin');

    const server = Process.get('waterfall');
    if(!server) return res.status(404).send('Server not found');

    res.send('ok');

    server.stdin(stdin + '\n');
});

app.listen(setting.PORT, setting.WEB_IP, () => {
    console.log(`webserver listening on ${setting.WEB_IP}:${setting.PORT}`);
});