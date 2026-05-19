require('dotenv').config(); 
const express = require('express');
const cors = require('cors');
const { connectDB } = require('./database'); 

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

    app.listen(PORT, () => {
      console.log(`🚀 Express Server operational on http://localhost:${PORT}`);
    });

  } catch (error) {
    console.error('Critical System Boot Failure:', error.message);
    process.exit(1); 
  }
};

startServer();