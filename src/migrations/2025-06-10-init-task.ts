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
        allowNull: true,
        field: 'last_run'
      },
      nextRun: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'next_run'
      },
      lockedUntil: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'locked_until'
      },
      lockedBy: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'locked_by'
      },
      functionName: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'function_name'
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: queryInterface.sequelize.literal('CURRENT_TIMESTAMP'),
        field: 'created_at'
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: queryInterface.sequelize.literal('CURRENT_TIMESTAMP'),
        field: 'updated_at'
      }
    })

    await queryInterface.sequelize.query(`
        CREATE INDEX "tasks_next_run_locked_until_index"
            ON "tasks" ("next_run", "locked_until") WHERE "locked_until" IS NULL;
    `)

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
        onDelete: 'CASCADE',
        field: 'task_id'
      },
      serverId: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'server_id'
      },
      functionName: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'function_name'
      },
      startTime: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'start_time'
      },
      endTime: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'end_time'
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
        comment: 'Duration in milliseconds',
        field: 'duration_ms'
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: queryInterface.sequelize.literal('CURRENT_TIMESTAMP'),
        field: 'created_at'
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: queryInterface.sequelize.literal('CURRENT_TIMESTAMP'),
        field: 'updated_at'
      }
    })

    await queryInterface.addIndex('task_history', ['task_id'])
    await queryInterface.addIndex('task_history', ['status'])
    await queryInterface.addIndex('task_history', ['server_id'])
    await queryInterface.addIndex('task_history', ['created_at'])
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable('task_history')
    await queryInterface.sequelize.query(
      'DROP INDEX IF EXISTS "tasks_next_run_locked_until_index";'
    )
    await queryInterface.dropTable('tasks')
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "enum_task_history_status";`)
  }
}
