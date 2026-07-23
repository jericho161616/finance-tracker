import { supabase } from './supabaseClient'
import type { Tables } from './database.types'

export type Account = Tables<'accounts'>
export type Category = Tables<'categories'>
export type CreditCard = Tables<'credit_cards'>
export type Expense = Tables<'expenses'>
export type CreditCardPayment = Tables<'credit_card_payments'>
export type Income = Tables<'income'>
export type CardOutstanding = Tables<'card_outstanding'>
export type CardCurrentCycle = Tables<'card_current_cycle'>
export type IncomeAllocation = Tables<'income_allocations'>

async function unwrap<T>(promise: PromiseLike<{ data: T | null; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await promise
  if (error) throw new Error(error.message)
  return data as T
}

export const api = {
  accounts: {
    list: () => unwrap(supabase.from('accounts').select('*').order('created_at')),
    create: (row: { name: string; type: string; starting_balance?: number }) =>
      unwrap(supabase.from('accounts').insert(row).select().single()),
    remove: (id: string) => unwrap(supabase.from('accounts').delete().eq('id', id).select()),
  },
  categories: {
    list: () => unwrap(supabase.from('categories').select('*').order('created_at')),
    create: (row: { name: string; kind: 'expense' | 'income'; budget_bucket?: string | null }) =>
      unwrap(supabase.from('categories').insert(row).select().single()),
    update: (id: string, row: Partial<{ name: string; kind: string; budget_bucket: string | null }>) =>
      unwrap(supabase.from('categories').update(row).eq('id', id).select().single()),
    remove: (id: string) => unwrap(supabase.from('categories').delete().eq('id', id).select()),
  },
  creditCards: {
    list: () => unwrap(supabase.from('credit_cards').select('*').order('created_at')),
    create: (row: { bank_name: string; card_name?: string; credit_limit: number; statement_day: number; due_day: number }) =>
      unwrap(supabase.from('credit_cards').insert(row).select().single()),
    update: (id: string, row: Partial<CreditCard>) =>
      unwrap(supabase.from('credit_cards').update(row).eq('id', id).select().single()),
    remove: (id: string) => unwrap(supabase.from('credit_cards').delete().eq('id', id).select()),
  },
  outstanding: {
    list: () => unwrap(supabase.from('card_outstanding').select('*')),
  },
  cycles: {
    list: () => unwrap(supabase.from('card_current_cycle').select('*')),
  },
  expenses: {
    list: () => unwrap(supabase.from('expenses').select('*').order('expense_date', { ascending: false })),
    create: (row: {
      amount: number
      category_id?: string | null
      payment_method: string
      credit_card_id?: string | null
      account_id?: string | null
      description?: string
      expense_date: string
    }) => unwrap(supabase.from('expenses').insert(row).select().single()),
    update: (
      id: string,
      row: Partial<{
        amount: number
        category_id: string | null
        payment_method: string
        credit_card_id: string | null
        account_id: string | null
        description: string
        expense_date: string
      }>,
    ) => unwrap(supabase.from('expenses').update(row).eq('id', id).select().single()),
    remove: (id: string) => unwrap(supabase.from('expenses').delete().eq('id', id).select()),
  },
  creditCardPayments: {
    list: () => unwrap(supabase.from('credit_card_payments').select('*').order('payment_date', { ascending: false })),
    create: (row: {
      credit_card_id: string
      amount: number
      payment_source_account_id?: string | null
      payment_date: string
      notes?: string
    }) => unwrap(supabase.from('credit_card_payments').insert(row).select().single()),
    update: (
      id: string,
      row: Partial<{
        credit_card_id: string
        amount: number
        payment_source_account_id: string | null
        payment_date: string
        notes: string
      }>,
    ) => unwrap(supabase.from('credit_card_payments').update(row).eq('id', id).select().single()),
    remove: (id: string) => unwrap(supabase.from('credit_card_payments').delete().eq('id', id).select()),
  },
  income: {
    list: () => unwrap(supabase.from('income').select('*').order('income_date', { ascending: false })),
    create: (row: {
      amount: number
      category_id?: string | null
      account_id?: string | null
      description?: string
      income_date: string
    }) => unwrap(supabase.from('income').insert(row).select().single()),
    update: (
      id: string,
      row: Partial<{
        amount: number
        category_id: string | null
        account_id: string | null
        description: string
        income_date: string
      }>,
    ) => unwrap(supabase.from('income').update(row).eq('id', id).select().single()),
    remove: (id: string) => unwrap(supabase.from('income').delete().eq('id', id).select()),
  },
  incomeAllocations: {
    list: () => unwrap(supabase.from('income_allocations').select('*').order('allocation_date', { ascending: false })),
    create: (row: {
      bucket: string
      amount: number
      account_id?: string | null
      allocation_date: string
      notes?: string
    }) => unwrap(supabase.from('income_allocations').insert(row).select().single()),
    update: (
      id: string,
      row: Partial<{
        bucket: string
        amount: number
        account_id: string | null
        allocation_date: string
        notes: string
      }>,
    ) => unwrap(supabase.from('income_allocations').update(row).eq('id', id).select().single()),
    remove: (id: string) => unwrap(supabase.from('income_allocations').delete().eq('id', id).select()),
  },
}
