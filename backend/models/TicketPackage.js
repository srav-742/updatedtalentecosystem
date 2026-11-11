const mongoose = require('mongoose');

const ticketPackageSchema = new mongoose.Schema({
    packageId: { 
        type: String, 
        required: true, 
        unique: true, 
        index: true,
        trim: true 
    },
    name: { 
        type: String, 
        required: true, 
        trim: true 
    },
    ticketCount: { 
        type: Number, 
        required: true, 
        min: 1 
    },
    price: { 
        type: Number, 
        required: true, 
        min: 0 
    },
    currency: { 
        type: String, 
        default: 'INR' 
    },
    badge: { 
        type: String, 
        default: '' 
    },
    description: { 
        type: String, 
        default: '' 
    },
    features: [{ 
        type: String 
    }],
    popular: { 
        type: Boolean, 
        default: false 
    },
    accentColor: { 
        type: String, 
        default: 'from-blue-600 to-indigo-600' 
    },
    badgeColor: { 
        type: String, 
        default: 'bg-blue-500/10 text-blue-400 border-blue-500/20' 
    },
    isActive: { 
        type: Boolean, 
        default: true,
        index: true 
    },
    sortOrder: {
        type: Number,
        default: 0
    }
}, { 
    timestamps: true 
});

module.exports = mongoose.model('TicketPackage', ticketPackageSchema);

