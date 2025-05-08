const mongoose = require("mongoose");
const { dbConnectionString } = require("../config/config");

const connectDatabase = async () => {
  try {
    await mongoose.connect(dbConnectionString, {
      serverSelectionTimeoutMS: 120000,
    });

    console.log("Database connected!");
  } catch (error) {
    console.error("Database connection error: ", error);
    setTimeout(connectDatabase, 5000);
  }
};

module.exports = connectDatabase;
