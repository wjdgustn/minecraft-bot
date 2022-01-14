const mongoose = require('mongoose');

const { Schema } = mongoose;
const newSchema = new Schema({
    type: {
        type: String,
        required: true
    },
    guild: {
        type: String
    },
    channel: {
        type: String,
        required: true
    },
    user: {
        type: String,
        required: true
    },
    customId: {
        type: String,
        required: true
    },
    values: {
        type: Array
    }
});

module.exports = mongoose.model('InteractionHistory', newSchema);