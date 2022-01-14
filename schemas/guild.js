const mongoose = require('mongoose');

const { Schema } = mongoose;
const newSchema = new Schema({
    id: {
        type: String,
        required: true,
        unique: true
    },
    features: {
        type: Array,
        required: true,
        default: []
    },
    ticketGuildDescription: {
        type: String,
        required: true,
        default: '설명이 작성되지 않았습니다. / No description.',
        maxLength: 100
    },
    openTicketCategory: {
        type: String
    },
    closedTicketCategory: {
        type: String
    },
    archivedTicketCategory: {
        type: String
    },
    musicCommandChannel: {
        type: String
    },
    todoNoticeChannel: {
        type: String
    }
});

module.exports = mongoose.model('Guild', newSchema);