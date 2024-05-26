const express = require("express");
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");
require("dotenv").config();
const jwt = require("jsonwebtoken");

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: ["http://localhost:5173"], credentials: true }));
app.use(express.json());

// ! verify jwt
const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "Unauthorized access" });
  }
  const token = authorization.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(403).send({ error: true, message: "Forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
};

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
    app.post("/api/v1/user", async (req, res) => {
      const { displayName, photoUrl, email, coin } = req.body;
      console.log(req.body);

      // check if email already exists
      const existingUser = await usersCollection.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "User already exists",
        });
      }

      // insert user into the database
      await usersCollection.insertOne({ displayName, photoUrl, email, coin });

      res.status(201).json({
        success: true,
        message: "User registered successfully",
      });
    });

    // ! jwt
    app.post("/api/v1/jwt", async (req, res) => {
      const body = req.body;
      console.log(body);
      const token = jwt.sign(body, process.env.ACCESS_TOKEN, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    //! user login
    // app.post("/api/v1/login", async (req, res) => {
    //   const { email } = req.body;

    //   // find user by email
    //   const user = await usersCollection.findOne({ email });
    //   if (!user) {
    //     return res.status(401).json({ message: "Invalid email or password" });
    //   }

    //   // generate JWT token
    //   // const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET, {
    //   //   expiresIn: process.env.EXPIRES_IN,
    //   // });

    //   res.json({
    //     success: true,
    //     message: "Login successful",
    //     token,
    //   });
    // });

    //! getting all users
    app.get("/api/v1/users", async (req, res) => {
      try {
        const users = await usersCollection.find().toArray();
        res.status(200).json({
          success: true,
          message: "Users fetched successfully",
          data: users,
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: "An error occurred while fetching users",
        });
      }
    });

    //! recipe create api
    app.post("/api/v1/recipe", verifyJWT, async (req, res) => {
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
    app.get("/api/v1/recipes", verifyJWT, async (req, res) => {
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

    //! get single recipe data
    app.get("/api/v1/recipes/:id", verifyJWT, async (req, res) => {
      const { id } = req.params;

      try {
        const recipe = await recipesCollection.findOne({
          _id: ObjectId.createFromHexString(id),
        });
        if (!recipe) {
          return res.status(404).json({
            success: false,
            message: "Recipe not found",
          });
        }

        res.status(200).json({
          success: true,
          message: "Recipe fetched successfully",
          data: recipe,
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: "An error occurred while fetching the recipe",
        });
      }
    });

    //! Coin buy endpoint and update coin
    app.patch("/api/v1/coin", verifyJWT, async (req, res) => {
      console.log(req.body);
      const { userEmail, boughtCoins } = req.body;
      console.log(userEmail);

      try {
        const user = await usersCollection.findOne({ email: userEmail });
        if (!user) {
          return res.status(404).json({
            success: false,
            message: "User not found",
          });
        }
        // update user's coin balance
        await usersCollection.updateOne(
          { email: userEmail },
          { $inc: { coin: boughtCoins } }
        );

        res.status(200).json({
          success: true,
          message: "Coins purchased successfully",
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: "An error occurred while coin purchase",
        });
      }
    });

    //! coin update after successful recipe view
    app.patch("/api/v1/recipe-update", async (req, res) => {
      console.log(req.body);
      const { userEmail, recipeId } = req.body;

      try {
        const user = await usersCollection.findOne({ email: userEmail });

        if (!user) {
          return res.status(404).json({
            success: false,
            message: "User not found",
          });
        }

        // fetch recipe details
        const recipe = await recipesCollection.findOne({
          _id: ObjectId.createFromHexString(recipeId),
        });
        console.log("user", recipe);
        if (!recipe) {
          return res.status(404).json({
            success: false,
            message: "Recipe not found",
          });
        }

        // reduced 10 coin from user's balance
        await usersCollection.updateOne(
          { email: userEmail },
          { $inc: { coin: -10 } }
        );

        // add 1 coin to the recipe creator
        await usersCollection.updateOne(
          { email: recipe.creatorEmail },
          { $inc: { coin: 1 } }
        );

        // insert user email into purchased_by array of the recipe
        await recipesCollection.updateOne(
          { _id: ObjectId.createFromHexString(recipeId) },
          { $push: { purchased_by: userEmail } }
        );

        // increase watchCount of the recipe
        await recipesCollection.updateOne(
          { _id: ObjectId.createFromHexString(recipeId) },
          { $inc: { watchCount: 1 } }
        );

        res.status(200).json({
          success: true,
          message: "Coin updated successfully based on actions",
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message:
            "An error occurred while updating coin and performing actions",
        });
      }
    });

    //! reaction add/remove api
    app.patch("/api/v1/recipes/:id/reaction", async (req, res) => {
      const { id } = req.params;
      const { userEmail } = req.body;

      try {
        const user = await usersCollection.findOne({ email: userEmail });
        if (!user) {
          return res.status(404).json({
            success: false,
            message: "User not found",
          });
        }

        const recipe = await recipesCollection.findOne({
          _id: ObjectId.createFromHexString(id),
        });
        if (!recipe) {
          return res.status(404).json({
            success: false,
            message: "Recipe not found",
          });
        }

        // check if the user has already reacted to this recipe
        const existingReactionIndex = recipe.reaction.indexOf(userEmail);

        if (existingReactionIndex !== -1) {
          // removing the reaction if already reacted
          await recipesCollection.updateOne(
            { _id: ObjectId.createFromHexString(id) },
            { $pull: { reaction: userEmail } }
          );
        } else {
          // adding the reaction if user is reacting for the first time
          await recipesCollection.updateOne(
            { _id: ObjectId.createFromHexString(id) },
            { $push: { reaction: userEmail } }
          );
        }

        res.status(200).json({
          success: true,
          message: "User reaction updated successfully",
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: "An error occurred while updating user reaction",
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
