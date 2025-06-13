import { Op, Transaction } from 'sequelize'
import { sequelize } from '../server'
import Task from '../api/tasks/task.model'
import TaskHistory from '../api/tasks/task-history.model'
import { CronExpressionParser } from 'cron-parser'
import { setInterval } from 'timers/promises'

// Конфиг планировщика
const SCHEDULER_CONFIG = {
  checkInterval: 1000, // Проверка задач каждую секунду
  taskTimeout: 300000, // 5 минут на выполнение задачи
  lockDuration: 600000, // Блокировка на 1 минуту
  staleTaskCheckInterval: 660000 // Проверка зависших задач каждую минуту
}

// Функции задач (пример)
const TASK_FUNCTIONS: Record<string, () => Promise<void>> = {
  processPayments: async () => {
    console.log('Processing payments...')
    await new Promise(resolve => setTimeout(resolve, 120000)) // 2 минуты работы
  },
  generateReports: async () => {
    console.log('Generating reports...')
    await new Promise(resolve => setTimeout(resolve, 180000)) // 3 минуты работы
  },
  databaseBackup: async () => {
    console.log('Backup database...')
    await new Promise(resolve => setTimeout(resolve, 200000)) // 3.3 минуты
  },
  calculateFee: async () => {
    console.log('Calculate fee...')
    await new Promise(resolve => setTimeout(resolve, 280000)) // 4 минуты
  },
  clearMiners: async () => {
    console.log('Clear miners...')
    await new Promise(resolve => setTimeout(resolve, 380000)) // 5.2 минуты
  }
}

export default class DistributedScheduler {
  private readonly serverId: string
  private isRunning: boolean = false

  constructor() {
    this.serverId = `srv-${require('os').hostname()}-${process.pid}`
  }

  private createTaskData(id: number, name: string, interval: string, functionName: string) {
    return {
      id,
      name,
      interval,
      functionName,
      nextRun: new Date(),
      lastRun: null,
      lockedUntil: null,
      lockedBy: null,
      updatedAt: null
    }
  }

  public async initializeTasks(): Promise<void> {
    // Создаем задачи при первом запуске
    const count = await Task.count()
    if (count === 0) {
      await sequelize.transaction(async transaction => {
        await Task.bulkCreate(
          [
            this.createTaskData(1, 'Task 1', '*/5 * * * *', TASK_FUNCTIONS.processPayments.name),
            this.createTaskData(2, 'Task 2', '*/7 * * * *', TASK_FUNCTIONS.generateReports.name),
            this.createTaskData(3, 'Task 3', '*/10 * * * *', TASK_FUNCTIONS.databaseBackup.name),
            this.createTaskData(4, 'Task 4', '*/12 * * * *', TASK_FUNCTIONS.calculateFee.name),
            this.createTaskData(5, 'Task 5', '*/15 * * * *', TASK_FUNCTIONS.clearMiners.name)
          ],
          { transaction: transaction }
        )
      })
    }
  }

  public async start(): Promise<void> {
    if (this.isRunning) return
    this.isRunning = true

    console.log(`Starting scheduler ${this.serverId}`)

    // Основной цикл распределения задач
    await (async () => {
      for await (const _ of setInterval(SCHEDULER_CONFIG.checkInterval)) {
        try {
          await this.tryRunTask()
        } catch (error) {
          console.error('No tasks available to run scheduler')
        }
      }
    })()

    // Фоновый процесс для очистки зависших задач
    await (async () => {
      for await (const _ of setInterval(SCHEDULER_CONFIG.staleTaskCheckInterval)) {
        await this.cleanupStaleTasks()
      }
    })()
  }

  private async tryRunTask(): Promise<void> {
    const now = new Date()
    const transaction = await sequelize.transaction({
      isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED
    })

    try {
      // 1. Пытаемся захватить задачу
      const task = await this.acquireTask(transaction, now)
      if (!task) {
        await transaction.commit()
        return
      }

      // 2. Выполняем задачу
      await this.executeTask(task, transaction)
      await transaction.commit()
    } catch (error) {
      await transaction.rollback()
      console.info('No tasks available to run scheduler')
    }
  }

  private async acquireTask(transaction: Transaction, now: Date): Promise<Task | null> {
    // Освобождаем свою старую блокировку если есть
    await Task.update(
      {
        lockedUntil: null,
        lockedBy: null
      },
      {
        where: {
          lockedUntil: { [Op.lt]: now }
        },
        transaction
      }
    )

    const lockExpire = new Date(now.getTime() + SCHEDULER_CONFIG.lockDuration)
    if (isNaN(lockExpire.getTime())) {
      throw new Error('Invalid lock expire date')
    }

    // Пытаемся захватить новую задачу
    // Если задача заблокирована и у неё запуск следующий в определенное время раньше, чем спадёт блокировка
    // То задача не запустится
    // Лок снимается, если задача зависла
    const task = await Task.findOne({
      where: {
        nextRun: { [Op.lte]: now },
        [Op.or]: [{ lockedUntil: null }, { lockedUntil: { [Op.lte]: now } }]
      },
      order: [['next_run', 'ASC']],
      lock: true,
      skipLocked: true,
      transaction
    })

    if (task) {
      // Обновить поля блокировки и вернуть обновлённую задачу
      const nextRun = this.calculateNextRun(task.interval, now)
      await task.update(
        {
          id: task.id,
          lockedUntil: lockExpire,
          lockedBy: this.serverId,
          nextRun: nextRun
        },
        { transaction }
      )
      return task
    }

    return null
  }

  async executeTask(task: Task, transaction: Transaction): Promise<void> {
    try {
      // 1. Создаем запись в истории (с транзакцией)
      const historyRecord = await TaskHistory.create(
        {
          taskId: task.id,
          serverId: this.serverId,
          startTime: new Date(),
          status: 'running',
          functionName: task.functionName
        },
        { transaction }
      )

      // 2. Получаем функцию задачи
      const taskFunction = TASK_FUNCTIONS[task.functionName]
      if (!taskFunction) {
        throw new Error(`Task function ${task.functionName} not found`)
      }

      // 3. Выполняем задачу
      console.log(`Starting task ${task.functionName}`)
      await taskFunction()

      // 4. Обновляем историю при успехе
      await historyRecord.update(
        {
          endTime: new Date(),
          status: 'completed'
        },
        { transaction }
      )
    } catch (error) {
      // 5. Обновляем историю при ошибке
      await TaskHistory.update(
        {
          endTime: new Date(),
          status: 'failed',
          error: 'Timeout error'
        },
        {
          where: { taskId: task.id },
          transaction
        }
      )
      throw error
    }
  }

  private async cleanupStaleTasks(): Promise<void> {
    const staleTime = new Date(Date.now() - SCHEDULER_CONFIG.taskTimeout)

    await sequelize.transaction(async t => {
      // Освобождаем зависшие задачи
      await Task.update(
        {
          lockedUntil: null,
          lockedBy: null
        },
        {
          where: {
            lockedUntil: { [Op.lt]: new Date() },
            lockedBy: { [Op.not]: null }
          },
          transaction: t
        }
      )
      await TaskHistory.update(
        {
          endTime: new Date(),
          status: 'failed',
          error: 'Task timeout'
        },
        {
          where: {
            status: 'running',
            startTime: { [Op.lt]: staleTime }
          },
          transaction: t
        }
      )
    })
  }

  private calculateNextRun(cronExpression: string, fromDate: Date): Date {
    try {
      const cron = CronExpressionParser.parse(cronExpression, { currentDate: fromDate })

      return cron.next().toDate()
    } catch (error) {
      console.error('Invalid cron expression:', cronExpression)
      throw new Error('Invalid cron expression')
    }
  }
}
