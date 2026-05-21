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
const router = express.Router();

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
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

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


app.post('/api/tasks', async (req, res) => {
  try {
    const { title, status, priority, description, assignedTo } = req.body;

    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: "Access Denied." });

    let decodedUser;
    try {
      decodedUser = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(403).json({ error: "Invalid token." });
    }

    const userRole = decodedUser.role.toLowerCase();
    const canAssignOthers = userRole === 'super_admin' || userRole === 'manager';

    if (!title || !status || !priority) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    let finalAssignedTo = (canAssignOthers && assignedTo) ? parseInt(assignedTo, 10) : decodedUser.id;

    const newTask = await Task.create({
      title,
      status: status || 'pending',
      priority,
      description: description || '',
      assignedTo: finalAssignedTo
    });

    return res.status(201).json({ message: 'Task created successfully', task: newTask });

  } catch (error) {
    console.error("Backend Error:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
});

app.get('/api/team-members', async (req, res) => {
  try {
    // 1. Get the authenticated user's role from JWT (middleware/verification)
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    const decodedUser = jwt.verify(token, JWT_SECRET);

    const role = decodedUser.role.toLowerCase();

    let whereClause = {};

    if (decodedUser.role === 'super_admin') {
      whereClause = { role: ['manager', 'executive'] };
    } else if (decodedUser.role === 'manager') {
      whereClause = { role: 'executive' };
    } else if (decodedUser.role === 'executive') {
      return res.json([]);
    } else {
      return res.status(403).json({ error: "Invalid user role." });
    }

    const teamMembers = await User.findAll({
      where: whereClause,
      attributes: ['id', 'name', 'role']
    });

    return res.json(teamMembers);
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch team members." });
  }
});

app.get('/api/tasks/stats', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.split(' ')[1];
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    const decodedUser = jwt.verify(token, JWT_SECRET);

    let whereClause = {};
    if (decodedUser.role !== 'super_admin' && decodedUser.role !== 'manager') {
      whereClause = { assignedTo: decodedUser.id };
    }

    const tasks = await Task.findAll({
      where: whereClause,
      include: [{
        model: User,
        as: 'assignee',
        attributes: ['name']
      }]
    });

    const stats = {
      total: tasks.length,
      pending: tasks.filter(t => t.status === 'pending').length,
      inProgress: tasks.filter(t => t.status === 'in-progress').length,
      review: tasks.filter(t => t.status === 'review').length,
      completed: tasks.filter(t => t.status === 'completed').length
    };

    return res.json({ tasks, stats });
  } catch (err) {
    console.error("FULL ERROR DETAILS:", err);
    return res.status(500).json({ error: "Failed to fetch tasks." });
  }
});

app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await Task.destroy({ where: { id } });
    return res.status(200).json({ message: "Task deleted successfully" });
  } catch (error) {
    return res.status(500).json({ error: "Failed to delete task" });
  }
});

startServer();