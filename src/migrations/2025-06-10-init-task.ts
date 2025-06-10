import { QueryInterface, DataTypes } from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface, Sequelize: typeof DataTypes) => {
    await queryInterface.createTable('tasks', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      interval: {
        type: Sequelize.STRING,
        allowNull: false
      },
      lastRun: {
        type: Sequelize.DATE,
        allowNull: true
      },
      nextRun: {
        type: Sequelize.DATE,
        allowNull: false
      },
      isRunning: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      serverId: {
        type: Sequelize.STRING,
        allowNull: true
      },
      startTime: {
        type: Sequelize.DATE,
        allowNull: true
      },
      functionName: {
        type: Sequelize.STRING,
        allowNull: false
      }
    });

    await queryInterface.createTable('task_history', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      taskId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'tasks',
          key: 'id'
        }
      },
      serverId: {
        type: Sequelize.STRING,
        allowNull: false
      },
      startTime: {
        type: Sequelize.DATE,
        allowNull: false
      },
      endTime: {
        type: Sequelize.DATE,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('running', 'completed', 'failed'),
        allowNull: false
      }
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable('task_history');
    await queryInterface.dropTable('tasks');
  }
};
