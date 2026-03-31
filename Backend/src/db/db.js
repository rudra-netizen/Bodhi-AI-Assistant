const mongoose = require("mongoose");

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("DB Connection Established");
  } catch (error) {
    console.log("Error connecting MongoDb is: ", error);
  }
}

module.exports = connectDB;
