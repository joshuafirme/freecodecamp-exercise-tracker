// server.js
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');

// Basic middleware
app.use(cors());
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());


const connStr = "mongodb+srv://joshuafirme1:dCygCT73SPK6nctl@cluster0.v3vmvrn.mongodb.net/";
const localConnStr = "mongodb://localhost:27017/exercise-tracker";
// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || connStr, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// --- Mongoose Schemas --- //

// User Schema: each user just has a username.
const userSchema = new mongoose.Schema({
  username: { type: String, required: true }
});
const User = mongoose.model('User', userSchema);

// Exercise Schema: linked to a user via userId.
const exerciseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, required: true }
});
const Exercise = mongoose.model('Exercise', exerciseSchema);

// --- Routes --- //

// Home page (optional static file serving)
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// POST /api/users -> create a new user with form data "username"
app.post('/api/users', async (req, res) => {
  try {
    const username = req.body.username;
    const newUser = new User({ username });
    const savedUser = await newUser.save();
    res.json({
      username: savedUser.username,
      _id: savedUser._id
    });
  } catch (err) {
    res.status(500).json({ error: 'Error creating user' });
  }
});

// GET /api/users -> returns an array of all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}).select('username _id');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching users' });
  }
});

// POST /api/users/:_id/exercises -> add an exercise
app.post('/api/users/:_id/exercises', async (req, res) => {
  try {
    const userId = req.params._id;
    // Find the user first
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Get form data
    const { description, duration, date } = req.body;
    // If no date provided, use current date
    const exerciseDate = date ? new Date(date) : new Date();

    // Create new exercise document
    const exercise = new Exercise({
      userId,
      description,
      duration: parseInt(duration),
      date: exerciseDate
    });
    const savedExercise = await exercise.save();

    res.json({
      username: user.username,
      description: savedExercise.description,
      duration: savedExercise.duration,
      date: savedExercise.date.toDateString(), // use toDateString() as hinted
      _id: user._id
    });
  } catch (err) {
    res.status(500).json({ error: 'Error adding exercise' });
  }
});

// GET /api/users/:_id/logs -> get a user’s exercise log with optional query parameters: from, to, limit.
app.get('/api/users/:_id/logs', async (req, res) => {
  try {
    const userId = req.params._id;
    const { from, to, limit } = req.query;

    // Find the user
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Build query for exercises
    let query = { userId };
    let dateQuery = {};
    if (from) {
      dateQuery.$gte = new Date(from);
    }
    if (to) {
      dateQuery.$lte = new Date(to);
    }
    if (from || to) {
      query.date = dateQuery;
    }

    let exerciseQuery = Exercise.find(query).select('description duration date');
    if (limit) {
      exerciseQuery = exerciseQuery.limit(parseInt(limit));
    }
    const exercises = await exerciseQuery.exec();

    // Format the log array
    const log = exercises.map(e => ({
      description: e.description,
      duration: e.duration,
      date: e.date.toDateString()
    }));

    res.json({
      username: user.username,
      count: exercises.length,
      _id: user._id,
      log: log
    });
  } catch (err) {
    res.status(500).json({ error: 'Error fetching log' });
  }
});

// Start the server
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});
