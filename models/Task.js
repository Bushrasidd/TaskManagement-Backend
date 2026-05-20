const { DataTypes } = require('sequelize');
const { sequelize } = require('../database');
const User = require('./User'); // Import User to link them

const Task = sequelize.define('Task', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('pending', 'in-progress', 'completed', 'review'),
    allowNull: false,
    defaultValue: 'pending'
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high'),
    allowNull: false,
    defaultValue: 'medium'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  // Relational Foreign Key column linked to User table
  assignedTo: {
    type: DataTypes.INTEGER,
    allowNull: true, // Null means the task is unassigned
    references: {
      model: User,
      key: 'id'
    }
  }
}, {
  timestamps: true
});

// Define Relationships (Associations)
User.hasMany(Task, { foreignKey: 'assignedTo', as: 'tasks' });
Task.belongsTo(User, { foreignKey: 'assignedTo', as: 'assignee' });

module.exports = Task;