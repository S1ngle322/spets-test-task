import { Router } from 'express'
import userController from '../api/users/user.controller'

const router = Router()

router.post('/update-balance', (req, res, next) => {
  userController.updateBalance(req, res).catch(next)
})

export default router
