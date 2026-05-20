// server.js
require('dotenv').config(); 
const express = require('express');
const cors = require('cors');

const { sequelize, connectDB } = require('./database'); 

const User = require('./models/User');
const Task = require('./models/Task');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
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

startServer();