const mongoose = require('mongoose');
const uniqueString = require('unique-string');

const setting = require('../setting.json');

const { Schema } = mongoose;
const newSchema = new Schema({
    id: {
        type: String,
        required: true,
        unique: true,
        default: uniqueString
    },
    owner: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    ip: {
        type: String,
        required: true,
        default: setting.MC_SERVER_IP
    },
    port: {
        type: Number,
        required: true
    },
    domain: {
        type: String,
        required: true,
        unique: true
    },
    open: {
        type: Boolean,
        required: true,
        default: false
    },
    memory: {
        type: Number,
        required: true
    },
    createdAt: {
        type: Number,
        required: true,
        default: Date.now
    },
    autoRestart: {
        type: Boolean,
        required: true,
        default: false
    },
    ftpUsername: {
        type: String,
        required: true
    },
    ftpPassword: {
        type: String,
        required: true
    },
    version: {
        type: String,
        required: true
    },
    channelCategory: {
        type: String,
        required: true
    },
    // controlChannel: {
    //     type: String,
    //     required: true
    // },
    consoleChannel: {
        type: String,
        required: true
    },
    chatChannel: {
        type: String,
        required: true
    },
    serverStatusMessage: {
        type: Boolean,
        required: true,
        default: true
    }
});

module.exports = mongoose.model('Server', newSchema);