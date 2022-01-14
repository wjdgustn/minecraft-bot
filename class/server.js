const { MessageEmbed , Util } = require('discord.js');
const fs = require('fs');
const path = require('path');
const rimraf = require('rimraf');
const properties = require('properties');

const Process = require('./process');

const setting = require('../setting.json');
const utils = require('../utils');

const paper = require('../paper');

const ServerDB = require('../schemas/server');
const axios = require('axios');

const servers = {};

let client;

const required_dir = [
    './assets/plugins'
];

const auto_dl = {
    './assets/plugins/worldedit.jar': 'https://dev.bukkit.org/projects/worldedit/files/3559523/download',
    './assets/plugins/minecraftBotPaper.jar': 'https://cdn.discordapp.com/attachments/389391148797657089/931588172247351336/minecraftBotPaper.jar'
}

module.exports = class Server extends Process {
    static async setup(c) {
        client = c;

        for(let d of required_dir) if(!fs.existsSync(d)) fs.mkdirSync(d);

        const servers = await ServerDB.find();

        const startServers = () => {
            for(let s of servers) {
                const server = new this(s);
                if(s.open) server.start();
            }
        }

        let downloading = 0;

        for(let path in auto_dl) {
            if(!fs.existsSync(path)) {
                console.log(`[PAPER] ${path} not exist, start download`);

                downloading++;
                const stream = fs.createWriteStream(path);

                axios({
                    url: auto_dl[path],
                    method: 'GET',
                    responseType: 'stream'
                }).then(res => {
                    res.data.pipe(stream);
                    res.data.on('end', () => {
                        console.log(`[PAPER] ${path} downloaded`);
                        downloading--;

                        if(downloading === 0) startServers();
                    });
                });
            }
            else console.log(`[PAPER] ${path} checked`);
        }
        if(downloading === 0) startServers();
    }

    constructor(server = {}) {
        if(!server) throw new Error('Server missing');

        const id = server.id;

        const serverPath = path.resolve(setting.MC_SERVER_PATH, `server_${id}`);
        if(!fs.existsSync(serverPath)) fs.mkdirSync(serverPath);

        const useJava17 = Number(server.version.split('.')[1]) >= 17;
        super(`server_${id}`, useJava17 ? setting.JAVA_17_PATH : setting.JAVA_PATH, {
            cwd: serverPath,
            args: [
                `-Xms${server.memory}M`,
                `-Xmx${server.memory}M`,
                '-XX:+UseG1GC',
                '-XX:+ParallelRefProcEnabled',
                '-XX:MaxGCPauseMillis=200',
                '-XX:+UnlockExperimentalVMOptions',
                '-XX:+DisableExplicitGC',
                '-XX:+AlwaysPreTouch',
                '-XX:G1NewSizePercent=30',
                '-XX:G1MaxNewSizePercent=40',
                '-XX:G1HeapRegionSize=8M',
                '-XX:G1ReservePercent=20',
                '-XX:G1HeapWastePercent=5',
                '-XX:G1MixedGCCountTarget=4',
                '-XX:InitiatingHeapOccupancyPercent=15',
                '-XX:G1MixedGCLiveThresholdPercent=90',
                '-XX:G1RSetUpdatingPauseTimePercent=5',
                '-XX:SurvivorRatio=32',
                '-XX:+PerfDisableSharedMem',
                '-XX:MaxTenuringThreshold=1',
                '-Dusing.aikars.flags=https://mcflags.emc.gs',
                '-Daikars.new.flags=true',
                '-Dfile.encoding=UTF-8',
                '-Dcom.mojang.eula.agree=true',
                '-Djdk.attach.allowAttachSelf=true',
                `-jar`,
                path.resolve(`./assets/paper/${server.version}.jar`),
                '--world-dir',
                'worlds/',
                'nogui',
                '--server-ip',
                server.ip,
                '--server-port',
                server.port.toString(),
                '--online-mode',
                'false',
                '--log-append',
                'false',
                '--add-plugin',
                path.resolve('./assets/plugins/worldedit.jar'),
                '--add-plugin',
                path.resolve('./assets/plugins/minecraftBotPaper.jar')
            ]
        });

        this.db = server;
        this.path = serverPath;

        this.id = server.id;
        this.name = server.name;

        this.starting = false;
        this.stopping = false;

        this.logTimeout = null;

        servers[this.id] = this;

        this.setupChannel();

        this.on('start', async () => {
            await this.updateDB({
                open: true
            });
            this.starting = true;

            await utils.sendWebhookMessage(this.chatChannel, {
                username: '서버 알림',
                avatarURL: client.user.avatarURL()
            }, {
                embeds: [
                    new MessageEmbed()
                        .setColor('#00ff00')
                        .setTitle('서버가 시작중입니다...')
                ]
            });
        });

        this.on('exit', async () => {
            if(this.db.autoRestart && !this.stopping) {
                this.start();

                await utils.sendWebhookMessage(this.chatChannel, {
                    username: '서버 알림',
                    avatarURL: client.user.avatarURL()
                }, {
                    embeds: [
                        new MessageEmbed()
                            .setColor('#ffff00')
                            .setTitle('서버가 재시작됩니다.')
                    ]
                });
            }
            else {
                await this.updateDB({
                    open: false
                });
                this.starting = false;
                this.stopping = false;

                await utils.sendWebhookMessage(this.chatChannel, {
                    username: '서버 알림',
                    avatarURL: client.user.avatarURL()
                }, {
                    embeds: [
                        new MessageEmbed()
                            .setColor('#ff0000')
                            .setTitle('서버가 종료되었습니다.')
                    ]
                });
            }
        });

        let logs = '';
        this.on('allLog', async d => {
            let log = d.toString().trim();
            // if(log.endsWith('>')) log = log.slice(0, -1).trim();
            if(!log) return;

            if(this.starting && log.includes('Done') && log.includes('For help, type "help"')) {
                this.starting = false;

                this.stdin(`setupserver ${this.id} http://${setting.WEB_IP}:${setting.PORT}`);

                const logsArray = utils.chunkAsArray(logs, 3950);
                logs = '';
                for(let l of logsArray) await utils.sendWebhookMessage(this.consoleChannel, {
                    username: '서버 로그',
                    avatarURL: client.user.avatarURL()
                }, {
                    embeds: [
                        new MessageEmbed()
                            .setColor('#349eeb')
                            .setTitle('시작 로그')
                            .setDescription(`\`\`\`\n${Util.escapeCodeBlock(l)}\n\`\`\``)
                    ]
                });

                await utils.sendWebhookMessage(this.chatChannel, {
                    username: '서버 알림',
                    avatarURL: client.user.avatarURL()
                }, {
                    embeds: [
                        new MessageEmbed()
                            .setColor('#349eeb')
                            .setTitle('서버가 시작되었습니다.')
                    ]
                });

                return;
            }

            if(log.includes('Reload complete.') && !log.includes('>'))
                this.stdin(`setupserver ${this.id} http://${setting.WEB_IP}:${setting.PORT}`);

            const beforeLogs = logs;
            logs += `\n${log}`;
            logs = logs.trim();
            if(!this.starting && logs !== beforeLogs) {
                if(this.logTimeout) clearTimeout(this.logTimeout);
                this.logTimeout = setTimeout(async () => {
                    for(let s of utils.chunkAsArray(logs, 1950)) await utils.sendWebhookMessage(this.consoleChannel, {
                        username: '서버 로그',
                        avatarURL: client.user.avatarURL()
                    }, {
                        content: Util.escapeMarkdown(s)
                    });

                    logs = '';
                    this.logTimeout = null;
                }, 100);
            }
        });
    }

    async setupChannel() {
        this.channelCategory = await client.channels.fetch(this.db.channelCategory);
        this.consoleChannel = await client.channels.fetch(this.db.consoleChannel);
        this.chatChannel = await client.channels.fetch(this.db.chatChannel);
    }

    stop() {
        this.stopping = true;
        this.stdin('stop');
    }

    reload() {
        this.stdin('reload');
    }

    forceStop() {
        this.stopping = true;
        super.stop('SIGKILL');
    }

    delete() {
        const finalDelete = async () => {
            this.channelCategory.children.forEach(c => c.delete());
            this.channelCategory.delete();
            await ServerDB.deleteOne({
                id: this.id
            });
            rimraf.sync(this.path);
        }
        this.on('exit', finalDelete);

        this.stopLog = true;
        if(this.isRunning) this.stop();
        else finalDelete();
    }

    async updateDB(data = {}) {
        const result = await ServerDB.updateOne({
            id: this.id
        }, data);
        for(let key in data) this.db[key] = data[key];

        return result;
    }

    static get(id) {
        return servers[id];
    }

    static get templateProperties() {
        const file = fs.readFileSync('./assets/server.properties');
        return properties.parse(file.toString());
    }

    saveProperties(data = {}) {
        const dir = path.resolve(this.path, 'server.properties');

        data['server-ip'] = this.db.ip;
        data['server-port'] = this.db.port;
        data['online-mode'] = false;

        const string = properties.stringify(data);

        fs.writeFileSync(dir, string);
    }

    saveDefaultSpigotConfig() {
        const dir = path.resolve(this.path, 'spigot.yml');

        fs.copyFileSync('./assets/spigot.yml', dir);
    }

    static async create(data) {
        const server = new ServerDB(data);
        await server.save();

        const serverClass = new this(server);

        const serverDir = path.resolve(setting.MC_SERVER_PATH, `server_${server.id}`);
        if(fs.existsSync(serverDir)) rimraf.sync(serverDir);
        fs.mkdirSync(serverDir);

        const properties = this.templateProperties;
        serverClass.saveProperties(properties);

        serverClass.saveDefaultSpigotConfig();

        const paperDir = path.resolve(`./assets/paper/${server.version}.jar`);
        if(!fs.existsSync(paperDir)) await paper.download(server.version);

        return serverClass;
    }
}