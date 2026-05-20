// server.js
require('dotenv').config(); 
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const { sequelize, connectDB } = require('./database'); 
const Task = require('./models/Task');
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/api/greet', (req, res) => {
  res.send('API running perfectly!');
});

const startServer = async () => {
  try {
    await connectDB();
    await sequelize.sync({ alter: true });
    console.log('Database schemas and tables synchronized perfectly!');

    app.listen(PORT, () => {
      console.log(`Express Server operational on http://localhost:${PORT}`);
    });

  } catch (error) {
    console.error('Critical System Boot Failure:', error.message);
    process.exit(1); 
  }
};

app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // 1. Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Email is already registered' });
    }

    // 2. Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 3. Create the new user record
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      role // Will use 'executive' default if not passed in body
    });

    // 4. Return user data (excluding password)
    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role
      }
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Find user by email
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // 2. Check password matches the stored hash
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // 3. Generate JWT Token (Includes ID and Role)
    const token = jwt.sign(
      { id: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    // 4. Send response back to the client
    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

startServer();