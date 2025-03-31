const mongoose = require("mongoose");

const connectdb = async () => {
    try {
        await mongoose.connect("mongodb://localhost:27017/mydb", {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log("MongoDB connected successfully");
    } catch (err) {
        console.error("Error connecting to MongoDB:", err);
        process.exit(1);
    }
};

module.exports = connectdb;
