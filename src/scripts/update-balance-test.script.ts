import axios from 'axios'
import { performance } from 'perf_hooks'
import { IUpdateBalanceResponse } from '../api/users/user.interface'

const URL: string = 'http://localhost:3000/api/update-balance'
const userId: number = 1
const amount: number = -2
const requestsCount: number = 10000

async function sendRequests(): Promise<void> {
  const start: number = performance.now()
  const requests = []

  for (let i = 0; i < requestsCount; i++) {
    requests.push(
      await axios
        .post<IUpdateBalanceResponse>(URL, { userId, amount })
        .catch(error => error.response || error)
    )
  }

  const results = await Promise.all(requests)
  const end: number = performance.now()

  const successful: number = results.filter(r => !(r instanceof Error) && r.data?.success).length

  const failed: number = results.filter(r => r instanceof Error || !r.data?.success).length

  console.log(`Total time: ${((end - start) / 1000).toFixed(2)}s`)
  console.log(`Successful: ${successful}`)
  console.log(`Failed: ${failed}`)
}

sendRequests().catch(err => console.error('Error in sendRequests:', err))
