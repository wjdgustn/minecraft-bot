const fs = require('fs');
const path = require('path');
const axios = require('axios');

const setting = require('./setting.json');

const api = axios.create({
    baseURL: setting.PAPER_API_URL
});

const versions = [];
module.exports.versions = versions;

module.exports.setup = async () => {
    const { data : { versions : versionsData } } = await api.get('/projects/paper');
    versions.push(...versionsData);
}

module.exports.download = async version => {
    if(!versions.includes(version)) return null;
    const { data : { builds } } = await api.get(`/projects/paper/versions/${version}`);
    const build = builds.at(-1);
    const { data : { downloads : { application : { name : download } } } } = await api.get(`/projects/paper/versions/${version}/builds/${build}`);

    console.log(`[PAPER] Downloading ${download}`);
    const { data : file } = await api.request({
        url: `/projects/paper/versions/${version}/builds/${build}/downloads/${download}`,
        method: 'GET',
        responseType: 'stream'
    });
    const paperPath = path.resolve('./assets/paper');
    if(!fs.existsSync(paperPath)) fs.mkdirSync(paperPath);
    file.pipe(fs.createWriteStream(path.resolve(paperPath, `${version}.jar`)));
}

module.exports.downloadWaterfall = async () => {
    const { data : { versions } } = await api.get(`/projects/waterfall`);
    const version = versions.at(-1);
    const { data : { builds } } = await api.get(`/projects/waterfall/versions/${version}`);
    const build = builds.at(-1);
    const { data : { downloads : { application : { name : download } } } } = await api.get(`/projects/waterfall/versions/${version}/builds/${build}`);

    console.log(`[WATERFALL] Downloading ${download}`);
    const { data : file } = await api.request({
        url: `/projects/waterfall/versions/${version}/builds/${build}/downloads/${download}`,
        method: 'GET',
        responseType: 'stream'
    });
    file.pipe(fs.createWriteStream('./assets/waterfall.jar'));
}