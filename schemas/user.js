const mongoose = require('mongoose');

const { Schema } = mongoose;
const newSchema = new Schema({
    id: {
        type: String,
        required: true,
        unique: true
    },
    blacklist: {
        type: Boolean,
        required: true,
        default: false
    },
    dokdoPermission: {
        type: Boolean,
        required: true,
        default: false
    },
    serverSlot: {
        type: Number,
        required: true,
        default: 0
    },
    maxMemory: {
        type: Number,
        required: true,
        default: 1024
    },
    allowAutoRestart: {
        type: Boolean,
        required: true,
        default: false
    },
    trackError: {
        type: Boolean,
        required: true,
        default: false
    }
});

module.exports = mongoose.model('User', newSchema);