import type { Transaction } from '../types';

// Marker to identify dummy transactions
export const DUMMY_DATA_MARKER = '__DUMMY_DATA__';

export const generateDummyTransactions = (
  monthStart: Date, 
  monthEnd: Date, 
  familyMemberIds: string[] = []
): Transaction[] => {
  const categories = ['Groceries', 'Entertainment', 'Transport', 'Healthcare', 'Education', 'Shopping', 'Dining', 'Utilities'];
  
  // Use provided family member IDs (empty array if none)
  
  const expenseDescriptions = {
    Groceries: ['Supermarket shopping', 'Fresh vegetables', 'Weekly groceries', 'Organic produce', 'Bakery items'],
    Entertainment: ['Movie tickets', 'Concert', 'Streaming subscription', 'Video games', 'Theme park'],
    Transport: ['Gas station', 'Public transport', 'Taxi ride', 'Car maintenance', 'Parking fee'],
    Healthcare: ['Pharmacy', 'Doctor visit', 'Dental checkup', 'Medical insurance', 'Lab tests'],
    Education: ['School supplies', 'Online course', 'Books', 'Tuition fee', 'Educational toys'],
    Shopping: ['Clothing', 'Electronics', 'Home decor', 'Gadgets', 'Accessories'],
    Dining: ['Restaurant', 'Fast food', 'Coffee shop', 'Delivery', 'Lunch'],
    Utilities: ['Electricity bill', 'Water bill', 'Internet', 'Phone bill', 'Gas bill']
  };

  const incomeDescriptions = ['Salary', 'Freelance work', 'Bonus', 'Investment return', 'Side project'];

  const transactions: Transaction[] = [];
  const startTime = monthStart.getTime();
  const endTime = monthEnd.getTime();

  // Generate 50 expense transactions
  for (let i = 0; i < 50; i++) {
    const category = categories[Math.floor(Math.random() * categories.length)];
    const descriptions = expenseDescriptions[category as keyof typeof expenseDescriptions];
    const description = descriptions[Math.floor(Math.random() * descriptions.length)];
    const randomTime = startTime + Math.random() * (endTime - startTime);
    const date = new Date(randomTime);

    transactions.push({
      id: `${DUMMY_DATA_MARKER}_expense_${i}_${Date.now()}`,
      type: 'expense',
      amount: Math.floor(Math.random() * 500) + 20, // Between 20 and 520
      category,
      description: `[DUMMY] ${description}`,
      date: date.toISOString().split('T')[0],
      familyMember: (Math.random() > 0.3 && familyMemberIds.length > 0) 
        ? familyMemberIds[Math.floor(Math.random() * familyMemberIds.length)] 
        : undefined
    });
  }

  // Generate 10 income transactions
  for (let i = 0; i < 10; i++) {
    const description = incomeDescriptions[Math.floor(Math.random() * incomeDescriptions.length)];
    const randomTime = startTime + Math.random() * (endTime - startTime);
    const date = new Date(randomTime);

    transactions.push({
      id: `${DUMMY_DATA_MARKER}_income_${i}_${Date.now()}`,
      type: 'income',
      amount: Math.floor(Math.random() * 3000) + 500, // Between 500 and 3500
      category: 'Income',
      description: `[DUMMY] ${description}`,
      date: date.toISOString().split('T')[0],
      familyMember: (Math.random() > 0.5 && familyMemberIds.length > 0) 
        ? familyMemberIds[Math.floor(Math.random() * familyMemberIds.length)] 
        : undefined
    });
  }

  // Sort by date
  return transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

export const isDummyTransaction = (transaction: Transaction): boolean => {
  return transaction.description.startsWith('[DUMMY]');
};

export const removeDummyTransactions = (transactions: Transaction[]): Transaction[] => {
  return transactions.filter(t => !isDummyTransaction(t));
};

export const countDummyTransactions = (transactions: Transaction[]): number => {
  return transactions.filter(t => isDummyTransaction(t)).length;
};
