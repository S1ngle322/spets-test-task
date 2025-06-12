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

  public static initModel(sequelize: Sequelize): void {
    this.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true
        },
        name: DataTypes.STRING,
        interval: DataTypes.STRING,
        lastRun: DataTypes.DATE,
        nextRun: {
          type: DataTypes.DATE,
          allowNull: false
        },
        lockedUntil: DataTypes.DATE,
        lockedBy: DataTypes.STRING,
        functionName: DataTypes.STRING
      },
      {
        sequelize,
        modelName: 'task',
        indexes: [
          {
            fields: ['nextRun', 'lockedUntil'],
            where: { lockedUntil: null }
          }
        ]
      }
    )
  }
}
