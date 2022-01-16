const Url = require('url');
const querystring = require('querystring');
const fs = require('fs');
const uniqueString = require('unique-string');

let client;

module.exports.setup = c => {
    client = c;
}

const escapeRegExp = s => s.toString().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
module.exports.escapeRegExp = escapeRegExp;

module.exports.checkBatchim = word => {
    if (typeof word !== 'string') return null;

    let lastLetter = word[word.length - 1];

    if(/[a-zA-Z]/.test(lastLetter)) {
        const moem = [ 'a' , 'e' , 'i' , 'o' , 'u' ];
        return moem.includes(lastLetter);
    }

    if(!isNaN(lastLetter)) {
        const k_number = '영일이삼사오육칠팔구십'.split('');
        for(let i = 0; i <= 10; i++) {
            lastLetter = lastLetter.replace(new RegExp(escapeRegExp(i.toString()), 'g'), k_number[i]);
        }
    }
    const uni = lastLetter.charCodeAt(0);

    if (uni < 44032 || uni > 55203) return null;

    return (uni - 44032) % 28 !== 0;
}

module.exports.getYoilString = num => {
    const yoilmap = [
        '일',
        '월',
        '화',
        '수',
        '목',
        '금',
        '토'
    ]

    return yoilmap[num];
}

module.exports.getEnglishMonthString = num => {
    const monthmap = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December"
    ]

    return monthmap[num - 1];
}

module.exports.chunk = (str, n, put) => {
    return Array.from(Array(Math.ceil(str.length/n)), (_,i)=>str.slice(i*n,i*n+n)).join(put);
}

module.exports.chunkAsArray = (str, n) => {
    return Array.from(Array(Math.ceil(str.length/n)), (_,i)=>str.slice(i*n,i*n+n));
}

module.exports.parseYouTubeLink = link => {
    const parsedUrl = Url.parse(link);
    const parsedQuery = querystring.parse(parsedUrl.query);

    let videoCode;

    if([ 'youtube.com' , 'www.youtube.com' ].includes(parsedUrl.host)) videoCode = parsedQuery.v;
    if([ 'youtu.be' ].includes(parsedUrl.host)) videoCode = parsedUrl.path.slice(1);

    return {
        videoCode
    }
}

module.exports.increaseBrightness = (hex, percent) => {
    hex = hex.replace(/^\s*#|\s*$/g, '');

    if(hex.length === 3) {
        hex = hex.replace(/(.)/g, '$1$1');
    }

    const r = parseInt(hex.substr(0, 2), 16),
        g = parseInt(hex.substr(2, 2), 16),
        b = parseInt(hex.substr(4, 2), 16);

    return '#' +
        ((0|(1<<8) + r + (256 - r) * percent / 100).toString(16)).substr(1) +
        ((0|(1<<8) + g + (256 - g) * percent / 100).toString(16)).substr(1) +
        ((0|(1<<8) + b + (256 - b) * percent / 100).toString(16)).substr(1);
}

module.exports.getRandomInt = (min, max) => {
    min = Math.ceil(min);
    max = Math.floor(max + 1);
    return Math.floor(Math.random() * (max - min)) + min;
}

module.exports.msToTime = (duration, en = false) => {
    // const weeks = duration / (1000 * 60 * 60 * 24 * 7);
    // const absoluteWeeks = Math.floor(weeks);
    // const w = absoluteWeeks ? (absoluteWeeks + '주 ') : '';

    // const days = (weeks - absoluteWeeks) * 7;
    const days = duration / (1000 * 60 * 60 * 24);
    const absoluteDays = Math.floor(days);
    const d = absoluteDays ? (absoluteDays + (en ? ` Day${absoluteDays > 1 ? 's' : ''} ` : '일 ')) : '';

    const hours = (days - absoluteDays) * 24;
    const absoluteHours = Math.floor(hours);
    const h = absoluteHours ? (absoluteHours + (en ? ` Hour${absoluteHours > 1 ? 's' : ''} ` : '시간 ')) : '';

    const minutes = (hours - absoluteHours) * 60;
    const absoluteMinutes = Math.floor(minutes);
    const m = absoluteMinutes ? (absoluteMinutes + (en ? ` Minute${absoluteMinutes > 1 ? 's' : ''} ` : '분 ')) : '';

    const seconds = (minutes - absoluteMinutes) * 60;
    const absoluteSeconds = Math.floor(seconds);
    const s = absoluteSeconds ? (absoluteSeconds + (en ? ` Second${absoluteSeconds > 1 ? 's' : ''} ` : '초 ')) : '';

    return (/* w + */ d + h + m + s).trim();
}

module.exports.msToTimeNumber = s => {
    const ms = s % 1000;
    s = (s - ms) / 1000;
    const secs = s % 60;
    s = (s - secs) / 60;
    const mins = s % 60;
    const hrs = (s - mins) / 60;

    return (hrs > 0 ? `${hrs}:` : '') + `${mins}:${secs.toString().padStart(2, '0')}`;
}

module.exports.parseDiscordCodeBlock = str => {
    let codeBlock = str.match(/```(.+)\n((?:.*?\r?\n?)*)\n```/);
    if(!codeBlock) codeBlock = str.match(/```((?:.*?\r?\n?)*)```/s);
    if(!codeBlock) return null;

    const language = codeBlock.length > 1 ? codeBlock[1] : null;
    const code = codeBlock[codeBlock.length > 1 ? 2 : 1];

    return {
        language,
        code
    }
}

module.exports.subCommandHandler = directory => async interaction => {
    let command = interaction.options.getSubcommand();
    if(!fs.existsSync(`./commands/${directory}/${command}.js`)) command = interaction.options.getSubcommandGroup();

    if(fs.existsSync(`./commands/${directory}/${command}.js`)) {
        const file = require.resolve(`./commands/${directory}/${command}.js`);
        if(process.argv[2] === '--debug') delete require.cache[file];
        const handler = require(file);
        if(handler.commandHandler) handler.commandHandler(interaction);
        else handler(interaction);
    }
    else interaction.reply({
        content: '오류가 발생하였습니다.',
        ephemeral: true
    });
}

module.exports.autoCompleteHandler = directory => async interaction => {
    let command = interaction.options.getSubcommand();
    if(!fs.existsSync(`./commands/${directory}/${command}.js`)) command = interaction.options.getSubcommandGroup();

    if(fs.existsSync(`./commands/${directory}/${command}.js`)) {
        const file = require.resolve(`./commands/${directory}/${command}.js`);
        if(process.argv[2] === '--debug') delete require.cache[file];
        const handler = require(file);
        if(handler.autoCompleteHandler) handler.autoCompleteHandler(interaction);
    }
}

module.exports.textProgressBar = (percentage, size) => {
    percentage /= 100;

    const progress = Math.round(size * percentage);
    const emptyProgress = size - progress;

    return `${'▇'.repeat(progress)}${' '.repeat(emptyProgress)}`;
}

module.exports.sendWebhookMessage = async (channel, user = {
    username: '',
    avatarURL: ''
}, message = {}) => {
    let webhook;
    const webhooks = await channel.fetchWebhooks();
    if(!webhooks.size) webhook = await channel.createWebhook(`${channel.client.user.username} Webhook`);
    else webhook = webhooks.first();

    message.username = user.username;
    message.avatarURL = user.avatarURL;

    return webhook.send(message);
}

const minecraftComponents = {
    '||': 'spoiler',
    '§bold§': 'bold',
    '*': 'italic',
    '_': 'italic',
    '§underlined§': 'underlined',
    '~~': 'strikethrough'
}

module.exports.markdownToMincraftComponent = component => {
    if(typeof component === 'string') component = [
        {
            text: component
        }
    ];
    if(!Array.isArray(component)) component = [component];

    component[0].text = component[0].text.split('**').join('§bold§');
    component[0].text = component[0].text.split('__').join('§underlined§');

    component[0].messageId = uniqueString();

    const minecraftComponentKeys = Object.keys(minecraftComponents);

    for(let i in component) for(let key of minecraftComponentKeys)
        component[i].text = component[i].text.split(`\\${key}`).join(`§safe${minecraftComponents[key]}§`);

    const firstString = component[0].text;

    const loopComponents = [];
    for(let i in minecraftComponentKeys) loopComponents.push(...minecraftComponentKeys.slice(Number(i)));

    for(let str of loopComponents) {
        const copiedComponent = JSON.parse(JSON.stringify(component));
        for(let i in component) {
            const c = copiedComponent[i];
            
            let arr = c.text.split(str);
            const noLastClose = !(arr.length % 2);

            let skipThis = false;
            arr = arr.map((a, i) => {
                const json = JSON.parse(JSON.stringify(c));

                json.text = a;
                for(let c of Object.keys(minecraftComponents)) {
                    const splited = firstString.split(`${str}${json.text}${i === arr.length - 1 && noLastClose ? '' : str}`);
                    if(splited[0].includes(c) && splited[1]?.includes(c)) skipThis = true;
                }

                if(skipThis) return;

                if(minecraftComponents[str] === 'spoiler' && i % 2 === 1 && !noLastClose) {
                    console.log(json.text);
                    json.originalComponent = JSON.parse(JSON.stringify(json));
                    json.spoilerId = uniqueString();
                    json.clickEvent = {
                        action: 'run_command',
                        value: `/openspoiler §messageid§ ${json.spoilerId}`
                    };
                    json.hoverEvent = {
                        action: 'show_text',
                        value: '클릭하여 스포일러 내용을 확인하세요!'
                    };
                    json.spoiler = true;
                    json.text = '▇'.repeat(json.text.length);
                    json.color = 'dark_gray';

                    for(let c of Object.values(minecraftComponents)) if(c !== 'spoiler') json[c] = false;
                }
                else {
                    json[minecraftComponents[str]] = !noLastClose && (json[minecraftComponents[str]] || i % 2 === 1);

                    if(!json.spoiler) {
                        delete json.spoilerId;
                        delete json.clickEvent;
                    }
                }
                return json;
            });
            if(skipThis) continue;

            if(noLastClose) arr[arr.length - 1].text = `§safe${minecraftComponents[str]}§${arr[arr.length - 1].text}`;

            component.splice(Number(i) + (component.length - copiedComponent.length), 1, ...arr);
            component = component.filter(c => c.text);
        }
    }

    component = component.map(a => {
        for(let c of Object.keys(minecraftComponents)) if(a.text.includes(c)) {
            a = module.exports.markdownToMincraftComponent(a);
            break;
        }
        return a;
    });

    const result = [];
    const arraySolver = a => {
        if(Array.isArray(a)) for(let aa of a) arraySolver(aa);
        else result.push(a);
    }
    arraySolver(component);

    for(let i in result) {
        for(let key of minecraftComponentKeys)
            result[i].text = result[i].text.split(`§safe${minecraftComponents[key]}§`).join(key);
        result[i].text = result[i].text.split('§bold§').join('**');
        result[i].text = result[i].text.split('§underlined§').join('__');
        if(result[i].clickEvent?.value) result[i].clickEvent.value = result[i].clickEvent.value.split('§messageid§').join(result[0].messageId);

        if(Number(i)) delete result[i].messageId;
    }

    return result;
}