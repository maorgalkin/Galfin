# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

# Galfin - Family Finance Tracker

A modern, intuitive family finance tracking application built with React and TypeScript. Track expenses, manage budgets, and gain insights into your family's financial health.

## 🌟 Features

- **Transaction Management**: Add, view, and categorize income and expenses
- **Family-Friendly**: Track transactions by family member
- **Visual Dashboard**: Interactive charts and summaries
- **Advanced Budget System**: Comprehensive budget planning with spending limits, alerts, and variance tracking
- **Smart Alerts**: Real-time notifications when approaching or exceeding budget limits
- **Savings Goals**: Track progress toward financial objectives
- **Data Persistence**: Local storage keeps your data safe
- **Responsive Design**: Works on desktop and mobile devices

## 🚀 Getting Started

### Prerequisites

- Node.js (version 18 or higher)
- npm or yarn

### Installation

1. Clone or download this repository
2. Navigate to the project directory
3. Install dependencies:
   ```bash
   npm install
   ```

### Running the Application

Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Building for Production

Create a production build:
```bash
npm run build
```

## 💡 How to Use

### Adding Transactions

1. Click the "Add Transaction" button in the top navigation
2. Fill in the transaction details:
   - Description (required)
   - Amount (required)
   - Type (Income or Expense)
   - Category (required)
   - Family Member (optional)
   - Date
3. Click "Add Transaction" to save

### Dashboard Overview

The dashboard provides two main views:

#### Transaction Overview
- **Summary Cards**: Total income, expenses, balance, family member count, and budget status
- **Month Navigation**: Switch between current and previous months
- **Transaction Filtering**: Filter by income/expense types
- **Expense Categories Chart**: Visual breakdown of spending by category
- **Transaction List**: Detailed view of all transactions

#### Budget Analysis
- **Budget Overview**: Comprehensive budget tracking with spending limits
- **Category Budgets**: Individual budget limits for each expense category
- **Real-time Alerts**: Notifications when approaching or exceeding budget limits
- **Progress Tracking**: Visual progress bars showing budget utilization
- **Variance Analysis**: Compare actual spending vs. budgeted amounts
- **Savings Rate**: Track your savings percentage and financial health

### Budget Configuration

Customize your budget by editing `src/config/budget-template.json`:
- Set monthly spending limits for each category
- Configure alert thresholds (when to warn about overspending)
- Define family member allowances
- Set income targets and savings goals

### Data Storage

All data is stored locally in your browser's localStorage, ensuring:
- Privacy: Your financial data never leaves your device
- Persistence: Data is saved between sessions
- No account required: Start using immediately

## 🛠 Technology Stack

- **Frontend Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Icons**: Lucide React
- **State Management**: React Context API
- **Data Persistence**: Local Storage

## 📱 Mobile App Potential

This web application is designed with mobile development in mind:

- **Component-based architecture** makes it easy to adapt to React Native
- **TypeScript** ensures type safety across platforms
- **Modular design** allows for easy feature migration
- **Responsive UI** already works well on mobile browsers

### Path to iOS App

To convert this to a React Native iOS app:

1. **React Native Setup**: Install React Native CLI and Xcode
2. **Component Migration**: Most components can be adapted with minor changes
3. **Navigation**: Add React Navigation for native navigation
4. **Data Storage**: Replace localStorage with AsyncStorage or SQLite
5. **Native Features**: Add iOS-specific features like Face ID, notifications

## 🎯 Future Enhancements

- [ ] Budget alerts and notifications
- [ ] Data export/import functionality  
- [ ] Multiple currency support
- [ ] Advanced reporting and analytics
- [ ] Goal setting and tracking
- [ ] Bill reminders
- [ ] Photo attachments for receipts
- [ ] Cloud sync and backup

## 🤝 Contributing

This is a personal project, but suggestions and improvements are welcome!

## 📄 License

This project is open source and available under the MIT License.

---

**Happy budgeting! 💰**

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
