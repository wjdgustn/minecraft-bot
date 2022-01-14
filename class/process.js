const { spawn } = require('child_process');

const processes = {};

const eventAliases = {
    exit: 'stop',
    err: 'error',
    data: 'log'
};

module.exports = class Process {
    constructor(name, command, options = {
        args: [],
        cwd: process.cwd()
    }) {
        if(!name) throw new Error('Process name is required');
        if(!command) throw new Error('Process command is required');

        this.name = name;
        this.command = command;
        this.options = options;
        this.process = null;
        this.isRunning = false;
        this.stopLog = false;
        this.handler = {
            start: [],
            stop: [],
            log: [],
            error: [],
            allLog: []
        }

        processes[name] = this;
    }

    on(name, handler) {
        if(eventAliases[name]) name = eventAliases[name];
        if(!this.handler[name]) throw new Error(`Unknown event: ${name}`);
        this.handler[name].push(handler);
    }

    start() {
        if(this.isRunning) return;
        this.isRunning = true;
        this.process = spawn(this.command, this.options.args, {
            cwd: this.options.cwd
        });
        this.process.stdout.on('data', data => {
            if(this.stopLog) return;
            this.handler.log.forEach(handler => handler(data.toString()));
            this.handler.allLog.forEach(handler => handler(data.toString()));
        });
        this.process.stderr.on('data', data => {
            if(this.stopLog) return;
            this.handler.error.forEach(handler => handler(data.toString()));
            this.handler.allLog.forEach(handler => handler(data.toString()));
        });
        this.process.on('exit', code => {
            this.isRunning = false;
            this.process = null;
            this.handler.stop.forEach(handler => handler(code));
        });

        this.handler.start.forEach(handler => handler());
    }

    stop(signal = 'SIGINT') {
        if(!this.isRunning) return;
        this.process.kill(signal);
    }

    stdin(data, options = {
        noNewline: false
    }) {
        if(!this.isRunning) return;
        this.process.stdin.write(data + (options.noNewline ? '' : '\n'));
    }

    static get(name) {
        return processes[name];
    }
}