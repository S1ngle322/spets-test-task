import { Request, Response } from 'express'
import userService from './user.service'
import { IUpdateBalanceRequest } from './user.interface'

class UsersController {
  public async updateBalance(req: Request, res: Response) {
    const { userId, amount } = req.body as IUpdateBalanceRequest

    if (!userId || amount === undefined) {
      return res.status(400).json({ error: 'userId and amount are required' })
    }

    const result = await userService.updateBalance({ userId, amount })

    if (!result.success) {
      return res.status(400).json(result)
    }

    return res.json(result)
  }
}

export default new UsersController()
