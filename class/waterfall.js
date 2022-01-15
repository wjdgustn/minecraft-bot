const { Util } = require('discord.js');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const Process = require('./process');

const setting = require('../setting.json');
const utils = require('../utils');

const paper = require('../paper');

let waterfall;

let client;

const required_dir = [
    './waterfall/plugins',
    './waterfall/plugins/minecraftBotWaterfall'
];

const auto_dl = {
    './waterfall/plugins/minecraftBotWaterfall-1.0-SNAPSHOT.jar': 'https://cdn.discordapp.com/attachments/389391148797657089/931981459017850912/minecraftBotWaterfall-1.0-SNAPSHOT.jar'
}

module.exports = class Waterfall extends Process {
    static async setup(c) {
        client = c;

        if(waterfall) return;

        if(!fs.existsSync('./waterfall/config.yml')) fs.copyFileSync('./waterfall/config.backup.yml', './waterfall/config.yml');
        for(let d of required_dir) if(!fs.existsSync(d)) fs.mkdirSync(d);

        if(!fs.existsSync('./waterfall/plugins/minecraftBotWaterfall/config.yml')) fs.writeFileSync('./waterfall/plugins/minecraftBotWaterfall/config.yml',
            `api-server: http://${setting.WEB_IP}:${setting.PORT}`
        );

        if(!fs.existsSync('./assets/waterfall.jar')) await paper.downloadWaterfall();

        let downloading = 0;

        for(let path in auto_dl) {
            if(!fs.existsSync(path)) {
                console.log(`[WATERFALL] ${path} not exist, start download`);

                downloading++;
                const stream = fs.createWriteStream(path);

                axios({
                    url: auto_dl[path],
                    method: 'GET',
                    responseType: 'stream'
                }).then(res => {
                    res.data.pipe(stream);
                    res.data.on('end', () => {
                        console.log(`[WATERFALL] ${path} downloaded`);
                        downloading--;

                        if(downloading === 0) new this();
                    });
                });
            }
            else console.log(`[WATERFALL] ${path} checked`);
        }
        if(downloading === 0) new this();
    }

    constructor() {
        super('waterfall', setting.JAVA_PATH, {
            cwd: './waterfall',
            args: [
                '-Djline.terminal=jline.UnsupportedTerminal',
                '-jar',
                path.resolve('./assets/waterfall.jar')
            ]
        });

        this.starting = false;

        this.setupChannel();

        waterfall = this;

        this.on('start', () => {
            this.starting = true;
        });

        this.on('exit', () => {
            this.start();
        });

        let logs = '';
        this.on('allLog', async d => {
            let log = d.toString().trim();
            // if(log.endsWith('>')) log = log.slice(0, -1).trim();
            if(!log) return;
            if(log.includes('Error pinging remote server')) return;

            if(this.starting && log.includes('Listening on')) {
                this.starting = false;
                // const logsArray = utils.chunkAsArray(logs, 3950);
                // logs = '';
                // for(let l of logsArray) await utils.sendWebhookMessage(this.consoleChannel, {
                //     username: '서버 로그',
                //     avatarURL: client.user.avatarURL()
                // }, {
                //     content: Util.escapeMarkdown(l)
                // });
                //
                // return;
            }

            const beforeLogs = logs;
            logs += `\n${log}`;
            logs = logs.trim();
            if(logs !== beforeLogs) {
                if(this.logTimeout) clearTimeout(this.logTimeout);
                this.logTimeout = setTimeout(async () => {
                    const array = utils.chunkAsArray(Util.escapeMarkdown(logs), 4000);
                    logs = '';
                    for(let s of array) await utils.sendWebhookMessage(this.consoleChannel, {
                        username: '서버 로그',
                        avatarURL: client.user.avatarURL()
                    }, {
                        content: s
                    });

                    this.logTimeout = null;
                }, 100);
            }
        });

        this.start();
    }

    async setupChannel() {
        this.consoleChannel = await client.channels.fetch(setting.WATERFALL_CONSOLE_CHANNEL);
    }

    static get get() {
        return waterfall;
    }
}