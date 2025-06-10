export interface IUser {
  id: number
  balance: number
  createdAt: Date
  updatedAt: Date
}

export interface IUpdateBalanceRequest {
  userId: number
  amount: number
}

export interface IUpdateBalanceResponse {
  success: boolean
  balance?: number
  error?: string
}
