import { Router } from 'express'
import usersRoute from './users.route'
import tasksRoute from './tasks.route'

const router = Router()

router.use(usersRoute)
router.use(tasksRoute)

export default router
