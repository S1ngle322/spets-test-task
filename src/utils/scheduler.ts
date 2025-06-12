import { Op, Transaction } from 'sequelize'
import { sequelize } from '../server'
import Task from '../api/tasks/task.model'
import TaskHistory from '../api/tasks/task-history.model'
import { performance } from 'perf_hooks'
import { setInterval } from 'timers/promises'

// Конфиг планировщика
const SCHEDULER_CONFIG = {
  checkInterval: 1000, // Проверка задач каждую секунду
  taskTimeout: 300000, // 5 минут на выполнение задачи
  lockDuration: 60000, // Блокировка на 1 минуту
  staleTaskCheckInterval: 60000 // Проверка зависших задач каждую минуту
}

// const TASK_FUNCTIONS: Record<string, () => Promise<void>> = {
//   task1: async () => {
//     console.log('Running task1')
//     await new Promise(resolve => setTimeout(resolve, 120000)) // 2 минуты
//     console.log('Completed task1')
//   },
//   task2: async () => {
//     console.log('Running task2')
//     await new Promise(resolve => setTimeout(resolve, 130000)) // 2.16 минуты
//     console.log('Completed task2')
//   },
//   task3: async () => {
//     console.log('Running task3')
//     await new Promise(resolve => setTimeout(resolve, 125000)) // 2.08 минуты
//     console.log('Completed task3')
//   },
//   task4: async () => {
//     console.log('Running task4')
//     await new Promise(resolve => setTimeout(resolve, 135000)) // 2.25 минуты
//     console.log('Completed task4')
//   },
//   task5: async () => {
//     console.log('Running task5')
//     await new Promise(resolve => setTimeout(resolve, 140000)) // 2.33 минуты
//     console.log('Completed task5')
//   }
// }

// Функции задач (пример)
const TASK_FUNCTIONS = {
  processPayments: async () => {
    console.log('Processing payments...')
    await new Promise(resolve => setTimeout(resolve, 120000)) // 2 минуты работы
  },
  generateReports: async () => {
    console.log('Generating reports...')
    await new Promise(resolve => setTimeout(resolve, 180000)) // 3 минуты работы
  }
  // ... другие задачи
}

export default class DistributedScheduler {
  private readonly serverId: string
  private isRunning: boolean = false

  constructor() {
    this.serverId = `srv-${require('os').hostname()}-${process.pid}`
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
          console.error('Scheduler error:', error)
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

      await transaction.commit()

      // 2. Выполняем задачу
      await this.executeTask(task)
    } catch (error) {
      await transaction.rollback()
      throw error
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
          lockedBy: this.serverId,
          lockedUntil: { [Op.lt]: now }
        },
        transaction
      }
    )

    // Пытаемся захватить новую задачу
    const [task] = await sequelize.query<Task>(
      `
          WITH updated_task AS (
          UPDATE tasks
          SET
              lockedUntil = :lockExpire,
              lockedBy = :serverId,
              nextRun = :nextRun
          WHERE id = (
              SELECT id FROM tasks
              WHERE nextRun <= :now
                AND (lockedUntil IS NULL OR lockedUntil <= :now)
              ORDER BY nextRun
              LIMIT 1
              FOR UPDATE SKIP LOCKED
                      )
                      RETURNING *;
      `,
      {
        replacements: {
          now,
          serverId: this.serverId,
          lockExpire: new Date(now.getTime() + SCHEDULER_CONFIG.lockDuration),
          nextRun: this.calculateNextRun('*/5 * * * *', now) // Пример для интервала
        },
        transaction,
        model: Task,
        mapToModel: true
      }
    )

    // @ts-ignore
    return task[0] || null
  }

  private async executeTask(task: Task): Promise<void> {
    const taskFunction = TASK_FUNCTIONS[task.functionName as keyof typeof TASK_FUNCTIONS]

    if (typeof taskFunction !== 'function') {
      throw new Error(`Unknown task function: ${task.functionName}`)
    } // ТС не может гарантировать что вызов соответствует ключу объекта, поэтому пришлось сделать вот так
    // Можно было сделать вот так, TASK_FUNCTIONS[task.functionName as keyof typeof TASK_FUNCTIONS], но если всё же оно н соответствует?

    // Выполняем задачу
    await taskFunction()

    const historyRecord = await TaskHistory.create({
      taskId: task.id,
      serverId: this.serverId,
      startTime: new Date(),
      status: 'running',
      // @ts-ignore
      functionName: TASK_FUNCTIONS[task.functionName]()
    })

    try {
      console.log(`[${this.serverId}] Starting task ${task.name}`)

      // Выполняем задачу
      await taskFunction()

      // Успешное завершение
      await sequelize.transaction(async (t: any) => {
        await Task.update(
          {
            lastRun: new Date(),
            lockedUntil: null,
            lockedBy: null
          },
          {
            where: { id: task.id },
            transaction: t
          }
        )

        await historyRecord.markAsCompleted()
      })

      console.log(`[${this.serverId}] Completed task ${task.name}`)
    } catch (error) {
      console.error(`[${this.serverId}] Task failed:`, error)

      await sequelize.transaction(async (t: any) => {
        await Task.update(
          {
            lockedUntil: null,
            lockedBy: null
          },
          {
            where: { id: task.id },
            transaction: t
          }
        )

        // @ts-ignore
        await historyRecord.markAsFailed(error)
      })
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
    // Упрощенная реализация. В проде я бы использовал cron-parser
    // Учитывая что его использовать нельзя конечно
    const [_, minutes] = cronExpression.split(' ')
    const interval = parseInt(minutes.replace('*/', ''), 10)
    return new Date(fromDate.getTime() + interval * 60000)
  }
}
