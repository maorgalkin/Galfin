// Dummy transactions for UI testing - imports from JSON
import type { Transaction } from '../types';
import dummyTransactionsData from '../data/dummyTransactions.json';

export const dummyTransactions: Transaction[] = dummyTransactionsData as Transaction[];
