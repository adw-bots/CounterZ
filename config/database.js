const mongoose = require('mongoose');

const connectDatabase = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log("Connected to MongoDB!");
    } catch (err) {
        console.error("Failed to connect to MongoDB:", err);
        process.exit(1);
    }
};

module.exports = connectDatabase;
