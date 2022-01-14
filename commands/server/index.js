const setting = require('../../setting.json');
const utils = require('../../utils');

const main = require('../../main');
const paper = require('../../paper');
const ServerDB = require('../../schemas/server');

const createOptions = [
    {
        name: 'name',
        description: '서버의 이름입니다.',
        type: 'STRING',
        required: true
    },
    {
        name: 'domain',
        description: `서버의 도메인입니다. ${setting.MC_ADDR_RULE} [CUSTOM] 자리에 들어가고, 최대 ${setting.MAX_SUBDOMAIN_LENGTH}자입니다.`,
        type: 'STRING',
        required: true
    },
    {
        name: 'memory',
        description: '서버의 메모리 용량입니다.',
        type: 'INTEGER',
        min_value: 1,
        required: true
    },
    {
        name: 'version',
        description: '서버의 버전입니다.',
        type: 'STRING',
        required: true,
        choices: paper.versions.reverse().slice(0, 25).map(a => ({
            name: a,
            value: a
        }))
    },
    {
        name: 'ftpusername',
        description: 'FTP 서버에 접속할때 사용할 유저명입니다.',
        type: 'STRING',
        required: true
    },
    {
        name: 'ftppassword',
        description: 'FTP 서버에 접속할때 사용할 비밀번호입니다.',
        type: 'STRING',
        required: true
    },
    {
        name: 'serverstatusmessage',
        description: '서버가 켜지거나 꺼질 때 메시지를 전송할지 여부입니다.',
        type: 'BOOLEAN',
        required: true
    },
    {
        name: 'autorestart',
        description: '서버가 꺼지면 자동으로 재시작할지 여부입니다.',
        type: 'BOOLEAN',
        required: true
    }
]

module.exports = {
    info: {
        name: 'server',
        description: '마인크래프트 서버 관련 명령어입니다.',
        options: [
            {
                name: 'create',
                description: '마인크래프트 서버를 생성합니다.',
                type: 'SUB_COMMAND',
                options: createOptions
            },
            {
                name: 'delete',
                description: '마인크래프트 서버를 삭제합니다.',
                type: 'SUB_COMMAND'
            },
            {
                name: 'start',
                description: '마인크래프트 서버를 시작합니다.',
                type: 'SUB_COMMAND'
            },
            {
                name: 'stop',
                description: '마인크래프트 서버를 종료합니다.',
                type: 'SUB_COMMAND',
                options: [
                    {
                        name: 'force',
                        description: '서버를 강제로 종료할지 여부입니다.',
                        type: 'BOOLEAN'
                    }
                ]
            },
            {
                name: 'edit',
                description: '마인크래프트 서버를 수정합니다.',
                type: 'SUB_COMMAND',
                options: JSON.parse(JSON.stringify(createOptions)).map(a => {
                    a.required = false;
                    return a;
                })
            },
            {
                name: 'file',
                description: '마인크래프트 서버의 파일을 확인합니다.',
                type: 'SUB_COMMAND',
                options: [
                    {
                        name: 'file',
                        description: '파일의 이름입니다.',
                        type: 'STRING',
                        required: true,
                        choices: [
                            'server.properties'
                        ].map(a => ({
                            name: a,
                            value: a
                        }))
                    }
                ]
            }
        ]
    },
    checkPermission: async interaction => {
        if(interaction.options.getSubcommand() === 'create') return true;

        const category = interaction.channel.parent;
        const checkServer = await ServerDB.findOne({
            channelCategory: category.id
        });
        if(!checkServer) {
            await interaction.reply({
                content: '이 채널은 서버 카테고리 채널이 아닙니다!',
                ephemeral: true
            });
            return false;
        }
        if(checkServer.owner !== interaction.user.id && main.getTeamOwner() !== interaction.user.id) {
            await interaction.reply({
                content: '권한이 없습니다.',
                ephemeral: true
            });
            return false;
        }

        interaction.dbServer = checkServer;

        return true;
    },
    handler: utils.subCommandHandler('server')
}