const express = require("express");
const cors = require("cors");
const { MongoClient } = require("mongodb");
require("dotenv").config();
const jwt = require("jsonwebtoken");

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: ["http://localhost:5173"], credentials: true }));
app.use(express.json());

// MongoDB Connection URL
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function run() {
  try {
    // Connect to MongoDB
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db("dish-palate");
    const collection = db.collection("users");

    // User Registration
    app.post("/api/v1/register", async (req, res) => {
      const { displayName, photoUrl, email, coin } = req.body;
      console.log(req.body);

      // Check if email already exists
      const existingUser = await collection.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "User already exists",
        });
      }

      // Insert user into the database
      await collection.insertOne({ displayName, photoUrl, email, coin });

      res.status(201).json({
        success: true,
        message: "User registered successfully",
      });
    });

    // Start the server
    app.listen(port, () => {
      console.log(`Server is running on port ${process.env.PORT}`);
    });
  } finally {
  }
}

run().catch(console.dir);

// Test route
app.get("/", (req, res) => {
  const serverStatus = {
    message: "Server is running",
    timestamp: new Date(),
  };
  res.json(serverStatus);
});
