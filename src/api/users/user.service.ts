import { Transaction } from 'sequelize'
import User from './user.model'
import { IUpdateBalanceRequest, IUpdateBalanceResponse } from './user.interface'
import { sequelize } from '../../server'

class UsersService {
  public async updateBalance(data: IUpdateBalanceRequest): Promise<IUpdateBalanceResponse> {
    try {
      const result = await sequelize.transaction(
        {
          isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE,
        },
        async (transaction) => {
          const user = await User.findByPk(data.userId, { transaction: transaction })

          if (!user) {
            throw new Error('User not found')
          }

          // в апишке кидаем -2, если хотим отнять от текущего баланса(+ на - даст -)
          const newBalance = user.balance + data.amount

          if (newBalance < 0) {
            throw new Error('Insufficient funds')
          }

          await user.update({ balance: newBalance }, { transaction: transaction })
          return user
        }
      )

      return {
        success: true,
        balance: result.balance,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  public async getUserById(id: number): Promise<User | null> {
    return User.findByPk(id)
  }
}

export default new UsersService()
