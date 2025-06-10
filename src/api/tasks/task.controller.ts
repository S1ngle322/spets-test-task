import { Request, Response } from 'express'
import taskService from './task.service'

class TaskController {
  public async getTasksStatus(req: Request, res: Response): Promise<Response> {
    try {
      const tasks = await taskService.getTasksStatus()
      return res.json(tasks)
    } catch (error) {
      console.error('Error getting tasks status:', error)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }
}

export default new TaskController()
