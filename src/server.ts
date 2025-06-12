import { Sequelize } from 'sequelize'
import { Umzug, SequelizeStorage } from 'umzug'
import path from 'path'
import config from './config/config'
import UserModel from './api/users/user.model'
import express from 'express'
import routes from './routes'
import TaskHistory from './api/tasks/task-history.model'
import Task from './api/tasks/task.model'
import DistributedScheduler from './utils/scheduler'

const sequelize = new Sequelize(config.local)

const umzug = new Umzug({
  migrations: {
    glob: path.join(__dirname, 'migrations', '*.js'),
    resolve: ({ name, path: filePath }) => {
      const migration = require(filePath!)
      return {
        name,
        up: async () => migration.up(sequelize.getQueryInterface(), Sequelize),
        down: async () => migration.down(sequelize.getQueryInterface(), Sequelize)
      }
    }
  },
  storage: new SequelizeStorage({ sequelize }),
  logger: console
})

async function initializeDatabase() {
  try {
    await sequelize.authenticate()
    console.log('Connection to DB has been established successfully.')

    await umzug.up()
    console.log('Migrations executed successfully')

    UserModel.initModel(sequelize)
    Task.initModel(sequelize)
    TaskHistory.initModel(sequelize)

    Task.hasMany(TaskHistory, { foreignKey: 'taskId' })
    TaskHistory.belongsTo(Task, { foreignKey: 'taskId' })
  } catch (error) {
    console.error('Unable to connect to the database:', error)
    process.exit(1)
  }
}

const app = express()
app.use(express.json())

async function start() {
  await initializeDatabase()
  app.use('/api', routes)
  const PORT = process.env.PORT || 3000
  const HOST = process.env.HOST || 'http://127.0.0.1'
  app.listen(PORT, () => {
    console.log(`Listening ${HOST}:${PORT}`)
  })

  const scheduler = new DistributedScheduler()
  await scheduler.start()
  console.log('Tasks scheduler initialized')
}

start().catch(error => {
  console.error(error)
  process.exit(1)
})

export { sequelize, initializeDatabase }
