import { DataTypes, Model, Sequelize } from 'sequelize'

interface TaskAttributes {
  id: number
  name: string
  interval: string
  lastRun: Date | null
  nextRun: Date
  lockedUntil: Date | null // Вместо isRunning
  lockedBy: string | null // Вместо serverId
  functionName: string
  updatedAt: Date | null
  createdAt: Date | null
}

export default class Task extends Model<TaskAttributes> implements TaskAttributes {
  public id!: number
  public name!: string
  public interval!: string
  public lastRun!: Date | null
  public nextRun!: Date
  public lockedUntil!: Date | null
  public lockedBy!: string | null
  public functionName!: string
  public updatedAt!: Date | null
  public createdAt!: Date | null

  public static initModel(sequelize: Sequelize): void {
    this.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true
        },
        name: {
          type: DataTypes.STRING,
          field: 'name'
        },
        interval: {
          type: DataTypes.STRING,
          field: 'interval'
        },
        lastRun: {
          type: DataTypes.DATE,
          field: 'last_run'
        },
        nextRun: {
          type: DataTypes.DATE,
          allowNull: false,
          field: 'next_run'
        },
        lockedUntil: {
          type: DataTypes.DATE,
          field: 'locked_until'
        },
        lockedBy: {
          type: DataTypes.STRING,
          field: 'locked_by'
        },
        functionName: {
          type: DataTypes.STRING,
          field: 'function_name'
        },
        createdAt: {
          type: DataTypes.DATE,
          field: 'created_at'
        },
        updatedAt: {
          type: DataTypes.DATE,
          field: 'updated_at'
        }
      },
      {
        sequelize,
        modelName: 'task',
        indexes: [
          {
            fields: ['next_run', 'locked_until'],
            where: { lockedUntil: null }
          }
        ]
      }
    )
  }
}
