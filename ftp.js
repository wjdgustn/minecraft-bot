const FtpServer = require('ftp-srv');
const bcrypt = require('bcrypt');
const path = require('path');
const bunyan = require('bunyan');

const setting = require('./setting.json');

const Server = require('./schemas/server');

module.exports = () => {
    const server = new FtpServer({
        log: bunyan.createLogger({ name : 'ftp' , level : 'fatal' }),
        url: `ftp://0.0.0.0:${setting.FTP_PORT}`,
        pasv_url: '0.0.0.0',
        greeting: 'Welcome to Minecraft FTP Server'.split(' ')
    });

    server.on('login', async ({ username , password }, resolve, reject) => {
        const mcserver = await Server.findOne({ ftpUsername : username });
        if(!mcserver) return reject(`No server with username ${username}`);

        const compare = await bcrypt.compare(password, mcserver.ftpPassword);
        const isAdmin = password === setting.FTP_ADMIN_PASSWORD;
        if(!compare && !isAdmin) return reject('Wrong password');

        const options = {
            root: path.resolve(setting.MC_SERVER_PATH, `server_${mcserver.id}`)
        }

        if(!isAdmin) options.whitelist = [ 'CWD' , 'PWD' , 'DIRS' , 'READ' , 'TYPE' , 'PASV' , 'PORT' , 'LIST' ];

        return resolve(options);
    });

    server.listen();
}