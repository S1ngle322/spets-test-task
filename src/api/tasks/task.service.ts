import Task from './task.model'
import TaskHistory from './task-history.model'

class TaskService {
  constructor() {}

  public async getTasksStatus(): Promise<any[]> {
    const tasks = await Task.findAll({
      include: [
        {
          model: TaskHistory,
          as: 'taskHistories',
          required: false,
          where: {
            endTime: null
          }
        }
      ]
    })

    return tasks.map(task => ({
      id: task.id,
      name: task.name,
      interval: task.interval,
      lastRun: task.lastRun,
      nextRun: task.nextRun,
      isRunning: task.lockedUntil,
      serverId: task.lockedBy
    }))
  }
}

export default new TaskService()
