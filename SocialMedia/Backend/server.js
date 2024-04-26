const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = "mongodb://localhost:27017/social_media_db";

// Connect to MongoDB
mongoose
  .connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Error connecting to MongoDB:", err));

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  comments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Comment" }],
});

const commentSchema = new mongoose.Schema({
  content: String,
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
});

const User = mongoose.model("User", userSchema);
const Comment = mongoose.model("Comment", commentSchema);

app.use(bodyParser.json());

app.use(cors());

async function createAdminUser() {
  try {
    const adminExists = await User.exists({ username: "admin" });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash("admin123", 10);
      const adminUser = new User({
        username: "admin",
        password: hashedPassword,
      });
      await adminUser.save();
      console.log("Admin user created");
    } else {
      console.log("Admin user already exists");
    }
  } catch (error) {
    console.error("Error creating admin user:", error);
  }
}

// Migration script to add a new field
async function migrateAddNewField() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Add new field to existing documents
    await User.updateMany({}, { $set: { newField: "defaultValue" } });

    console.log("Migration completed successfully");
  } catch (error) {
    console.error("Error performing migration:", error);
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
  }
}

// Route for user login
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).send("User not found");
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).send("Invalid username or password");
    }
    // If login successful, send user ID
    res.status(200).json({ userId: user._id });
  } catch (error) {
    console.error("Error logging in:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Route for user registration
app.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).send("Username already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();
    res.sendStatus(200);
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Route for fetching all comments
app.get("/comments", async (req, res) => {
  try {
    const comments = await Comment.find().populate("user", "username");
    res.json(comments);
  } catch (error) {
    console.error("Error fetching comments:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Route for posting comments
app.post("/comment", async (req, res) => {
  try {
    const { content } = req.body;
    const userId = req.body.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send("User not found");
    }
    // Create new comment
    const newComment = new Comment({ content, user: user._id });
    await newComment.save();
    res.sendStatus(200);
  } catch (error) {
    console.error("Error posting comment:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Route for deleting all comments
app.delete("/comments", async (req, res) => {
  try {
    await Comment.deleteMany({}); // Delete all comments
    res.sendStatus(200);
  } catch (error) {
    console.error("Error deleting comments:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Start server
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await createAdminUser();
});
