import { DataTypes, Model, Sequelize } from 'sequelize'

export interface TaskAttributes {
  id: number
  name: string
  interval: string
  lastRun: Date | null
  nextRun: Date
  isRunning: boolean
  serverId: string | null
  startTime: Date | null
  functionName: string
}

class Task extends Model<TaskAttributes> implements TaskAttributes {
  public id!: number
  public name!: string
  public interval!: string
  public lastRun!: Date | null
  public nextRun!: Date
  public isRunning!: boolean
  public serverId!: string | null
  public startTime!: Date | null
  public functionName!: string

  public static initModel(sequelize: Sequelize): void {
    Task.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        name: {
          type: DataTypes.STRING,
          allowNull: false,
          unique: true,
        },
        interval: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        lastRun: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        nextRun: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        isRunning: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        serverId: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        startTime: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        functionName: {
          type: DataTypes.STRING,
          allowNull: false,
        },
      },
      {
        sequelize,
        modelName: 'Task',
        tableName: 'tasks',
        timestamps: false,
      }
    );
  }
}

export default Task
