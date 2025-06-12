import { QueryInterface, DataTypes } from 'sequelize'

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable('tasks', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      interval: {
        type: DataTypes.STRING,
        allowNull: false
      },
      lastRun: {
        type: DataTypes.DATE,
        allowNull: true
      },
      nextRun: {
        type: DataTypes.DATE,
        allowNull: false
      },
      lockedUntil: {
        type: DataTypes.DATE,
        allowNull: true
      },
      lockedBy: {
        type: DataTypes.STRING,
        allowNull: true
      },
      functionName: {
        type: DataTypes.STRING,
        allowNull: false
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: queryInterface.sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: queryInterface.sequelize.literal('CURRENT_TIMESTAMP')
      }
    })

    await queryInterface.sequelize.query(`
        CREATE INDEX "tasks_nextRun_lockedUntil_index"
            ON "tasks" ("nextRun", "lockedUntil") WHERE "lockedUntil" IS NULL;
    `)

    // Create task_history table
    await queryInterface.createTable('task_history', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      taskId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'tasks',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      serverId: {
        type: DataTypes.STRING,
        allowNull: false
      },
      functionName: {
        type: DataTypes.STRING,
        allowNull: false
      },
      startTime: {
        type: DataTypes.DATE,
        allowNull: false
      },
      endTime: {
        type: DataTypes.DATE,
        allowNull: true
      },
      status: {
        type: DataTypes.ENUM('pending', 'running', 'completed', 'failed', 'timeout'),
        allowNull: false
      },
      error: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      durationMs: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Duration in milliseconds'
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: queryInterface.sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: queryInterface.sequelize.literal('CURRENT_TIMESTAMP')
      }
    })

    await queryInterface.addIndex('task_history', ['taskId'])
    await queryInterface.addIndex('task_history', ['status'])
    await queryInterface.addIndex('task_history', ['serverId'])
    await queryInterface.addIndex('task_history', ['createdAt'])
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable('task_history')
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS "tasks_nextRun_lockedUntil_index";')
    await queryInterface.dropTable('tasks')
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "enum_task_history_status";`)
  }
}
