import { Op } from 'sequelize'
import Task from './task.model'
import TaskHistory from './task-history.model'
import { sequelize } from '../../server'

const TASK_FUNCTIONS: Record<string, () => Promise<void>> = {
  task1: async () => {
    console.log('Running task1')
    await new Promise(resolve => setTimeout(resolve, 120000)) // 2 минуты
    console.log('Completed task1')
  },
  task2: async () => {
    console.log('Running task2')
    await new Promise(resolve => setTimeout(resolve, 130000)) // 2.16 минуты
    console.log('Completed task2')
  },
  task3: async () => {
    console.log('Running task3')
    await new Promise(resolve => setTimeout(resolve, 125000)) // 2.08 минуты
    console.log('Completed task3')
  },
  task4: async () => {
    console.log('Running task4')
    await new Promise(resolve => setTimeout(resolve, 135000)) // 2.25 минуты
    console.log('Completed task4')
  },
  task5: async () => {
    console.log('Running task5')
    await new Promise(resolve => setTimeout(resolve, 140000)) // 2.33 минуты
    console.log('Completed task5')
  },
};

class TaskService {
  private serverId: string

  constructor() {
    this.serverId = `server-${Math.random().toString(36).substr(2, 9)}`
    console.log(`Initialized TaskService for server ${this.serverId}`)
  }

  private createTaskData(
    id: number,
    name: string,
    interval: string,
    functionName: string
  ) {
    return {
      id,
      name,
      interval,
      functionName,
      nextRun: new Date(),
      isRunning: false,
      serverId: null,
      startTime: null,
      lastRun: null
    }
  }

  public async initializeTasks(): Promise<void> {
    // Создаем задачи при первом запуске
    const count = await Task.count();
    if (count === 0) {
      await sequelize.transaction(async (transaction) => {
        await Task.bulkCreate([
          this.createTaskData(1, 'Task 1', '*/5 * * * *', 'task1'),
          this.createTaskData(2, 'Task 2', '*/7 * * * *', 'task2'),
          this.createTaskData(3, 'Task 3', '*/10 * * * *', 'task3'),
          this.createTaskData(4, 'Task 4', '*/12 * * * *', 'task4'),
          this.createTaskData(5, 'Task 5', '*/15 * * * *', 'task5'),
        ], { transaction: transaction })
      })
    }
  }

  public async startScheduler(): Promise<void> {
    setInterval(() => this.distributeTasks(), 30000) // Проверка каждые 30 секунд
  }

  private async distributeTasks(): Promise<void> {
    try {
      const now = new Date();
      const tasksToRun = await sequelize.transaction(async (transaction) => {
        // Находим задачи, которые нужно выполнить
        const tasks = await Task.findAll({
          where: {
            nextRun: { [Op.lte]: now },
            [Op.or]: [
              { isRunning: false },
              {
                isRunning: true,
                startTime: { [Op.lt]: new Date(Date.now() - 180000) }, // Зависшие задачи (>3 минут)
              }
            ]
          },
          transaction: transaction,
          lock: transaction.LOCK.UPDATE,
          skipLocked: true,
        });

        // Берем только часть задач для равномерного распределения
        const availableTasks = tasks.slice(0, Math.ceil(tasks.length / 5)) // Примерно 1/5 задач на сервер

        // Помечаем задачи как выполняемые
        for (const task of availableTasks) {
          await task.update({
            isRunning: true,
            serverId: this.serverId,
            startTime: now,
            nextRun: this.calculateNextRun(task.interval, now),
          }, { transaction: transaction })

          await TaskHistory.create({
            id: task.id,
            taskId: task.id,
            serverId: this.serverId,
            startTime: now,
            status: 'running',
          }, { transaction: transaction })
        }

        return availableTasks
      });

      // Выполняем задачи
      for (const task of tasksToRun) {
        this.executeTask(task).catch(console.error)
      }
    } catch (error) {
      console.error('Error in distributeTasks:', error)
    }
  }

  private calculateNextRun(cronExpression: string, now: Date): Date {
    // Простая реализация для демонстрации
    const [minutes] = cronExpression.split(' ')
    const interval = parseInt(minutes.replace('*/', ''), 10)
    return new Date(now.getTime() + interval * 60000)
  }

  private async executeTask(task: Task): Promise<void> {
    try {
      const taskFunction = TASK_FUNCTIONS[task.functionName];
      if (!taskFunction) {
        throw new Error(`Unknown task function: ${task.functionName}`)
      }

      await taskFunction()

      await sequelize.transaction(async (transaction) => {
        await TaskHistory.update(
          {
            endTime: new Date(),
            status: 'completed',
          },
          {
            where: {
              taskId: task.id,
              serverId: this.serverId,
              status: 'running',
            },
            transaction: transaction,
          }
        );

        await task.update({
          isRunning: false,
          serverId: null,
          startTime: null,
          lastRun: new Date(),
        }, { transaction: transaction })
      })
    } catch (error) {
      console.error(`Error executing task ${task.name}:`, error);
      await sequelize.transaction(async (transaction) => {
        await TaskHistory.update(
          {
            endTime: new Date(),
            status: 'failed',
          },
          {
            where: {
              taskId: task.id,
              serverId: this.serverId,
              status: 'running',
            },
            transaction: transaction,
          }
        )

        await task.update({
          isRunning: false,
          serverId: null,
          startTime: null,
          lastRun: new Date(),
        }, { transaction: transaction });
      })
    }
  }

  public async getTasksStatus(): Promise<any[]> {
    const tasks = await Task.findAll({
      include: [{
        model: TaskHistory,
        as: 'history',
        required: false,
        where: {
          endTime: null,
        },
      }],
    })

    return tasks.map(task => ({
      id: task.id,
      name: task.name,
      interval: task.interval,
      lastRun: task.lastRun,
      nextRun: task.nextRun,
      isRunning: task.isRunning,
      serverId: task.serverId,
      runningTime: task.startTime ?
        Math.floor((Date.now() - task.startTime.getTime()) / 1000) : null
    }))
  }
}

export default new TaskService()
