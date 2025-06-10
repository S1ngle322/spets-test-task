import { DataTypes, Model, Sequelize } from 'sequelize'

export interface TaskHistoryAttributes {
  id?: number
  taskId: number
  serverId: string
  startTime: Date
  endTime: Date | null
  status: 'running' | 'completed' | 'failed'
}

class TaskHistory extends Model<TaskHistoryAttributes> implements TaskHistoryAttributes {
  public id!: number
  public taskId!: number
  public serverId!: string
  public startTime!: Date
  public endTime!: Date | null
  public status!: 'running' | 'completed' | 'failed'

  public static initModel(sequelize: Sequelize): void {
    TaskHistory.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        taskId: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        serverId: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        startTime: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        endTime: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        status: {
          type: DataTypes.ENUM('running', 'completed', 'failed'),
          allowNull: false,
        },
      },
      {
        sequelize,
        modelName: 'TaskHistory',
        tableName: 'task_history',
        timestamps: false,
      }
    );
  }
}

export default TaskHistory
