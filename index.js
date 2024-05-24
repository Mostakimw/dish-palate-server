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
    const usersCollection = db.collection("users");
    const recipesCollection = db.collection("recipes");

    //! User Registration
    app.post("/api/v1/register", async (req, res) => {
      const { displayName, photoUrl, email, coin } = req.body;
      console.log(req.body);

      // Check if email already exists
      const existingUser = await usersCollection.findOne({ email });
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

    //! recipe create api
    app.post("/api/v1/recipe", async (req, res) => {
      const data = req.body;
      try {
        const result = await recipesCollection.insertOne(data);
        res.status(201).json({
          success: true,
          message: "Recipe created successfully",
          data: data,
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: "An error occurred while creating recipe data",
        });
      }
    });

    //! recipe get and filtering and search
    app.get("/api/v1/recipes", async (req, res) => {
      const { category, country, search } = req.query;
      let query = {};

      if (category) {
        query.category = category;
      }
      if (country) {
        query.country = country;
      }

      if (search) {
        query.recipeName = { $regex: search, $options: "i" };
      }

      try {
        const recipes = await recipesCollection.find(query).toArray();
        res.status(200).json({
          success: true,
          message: "Recipes fetched successfully",
          data: recipes,
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: "An error occurred while fetching recipes",
        });
      }
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
