import { Router } from 'express';
import taskController from '../api/tasks/task.controller'

const router = Router()

router.get('/tasks', (req, res, next) => {
  taskController.getTasksStatus(req, res).catch(next)
})

export default router;
