import mongoose from "mongoose";

const campSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    location: {
        type: String,
        required: true,
        trim: true
    },
    date: {
        type: Date,
        required: true
    },
    description: {
        type: String,
        default: ''
    },
    organisation: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    notificationSent: {
        type: Boolean,
        default: false
    },
    notificationSentAt: {
        type: Date,
        default: null
    }
}, { timestamps: true });

export default mongoose.model('Camp', campSchema);