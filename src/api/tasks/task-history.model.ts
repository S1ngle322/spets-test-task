import { DataTypes, Model, Sequelize } from 'sequelize'

// Типы для статусов задачи
export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'timeout'

export interface TaskHistoryCreationAttributes {
  taskId: number
  serverId: string
  startTime: Date
  functionName: string
  status?: TaskStatus
  endTime?: Date | null
  error?: string | null
  durationMs?: number | null
}

export interface TaskHistoryAttributes extends TaskHistoryCreationAttributes {
  id: number
  createdAt?: Date
  updatedAt?: Date
}

export default class TaskHistory
  extends Model<TaskHistoryAttributes, TaskHistoryCreationAttributes>
  implements TaskHistoryAttributes
{
  public id!: number
  public taskId!: number
  public serverId!: string
  public functionName!: string
  public startTime!: Date
  public endTime!: Date | null
  public status!: TaskStatus
  public error!: string | null
  public durationMs!: number | null
  public createdAt!: Date
  public updatedAt!: Date

  public static initModel(sequelize: Sequelize): void {
    this.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true
        },
        taskId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'tasks',
            key: 'id'
          }
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
          allowNull: false,
          defaultValue: 'pending'
        },
        error: {
          type: DataTypes.TEXT,
          allowNull: true
        },
        durationMs: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: 'Duration in milliseconds'
        }
      },
      {
        sequelize,
        modelName: 'taskHistory',
        tableName: 'task_history',
        timestamps: true,
        paranoid: false,
        indexes: [
          {
            fields: ['taskId']
          },
          {
            fields: ['status']
          },
          {
            fields: ['serverId']
          },
          {
            fields: ['createdAt']
          }
        ]
      }
    )
  }

  // Вспомогательные методы
  public markAsRunning(): Promise<this> {
    return this.update({
      status: 'running',
      startTime: new Date()
    })
  }

  public markAsCompleted(): Promise<this> {
    const endTime = new Date()
    return this.update({
      status: 'completed',
      endTime,
      durationMs: endTime.getTime() - this.startTime.getTime()
    })
  }

  public markAsFailed(error: Error): Promise<this> {
    const endTime = new Date()
    return this.update({
      status: 'failed',
      endTime,
      error: error.message,
      durationMs: endTime.getTime() - this.startTime.getTime()
    })
  }

  public markAsTimeout(error: Error) {
    const endTime = new Date()
    return this.update({
      status: 'timeout',
      endTime: new Date(),
      error: error.message,
      durationMs: endTime.getTime() - this.startTime.getTime()
    })
  }
}
