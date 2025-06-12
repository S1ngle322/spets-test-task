import { Options } from 'sequelize'

interface Config {
  [key: string]: Options
}

const config: Config = {
  local: {
    username: 's1ngle-',
    password: 'postgres',
    database: 'balance_app',
    host: 'localhost',
    dialect: 'postgres'
  }
}

export default config
