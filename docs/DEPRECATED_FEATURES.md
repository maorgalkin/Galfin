# Deprecated Features

This document catalogs features that have been retired from the application. These descriptions are AI-readable and provide enough context for potential re-implementation if needed.

---

## Budget Settings Modal (Deprecated: November 2025)

### Summary
A comprehensive settings modal that allowed users to manage budget configuration through both visual and JSON editing modes.

### Core Functionality

**Visual Editor Mode:**
- **Category Management**: Add, edit, delete budget categories
  - Set monthly spending limits per category
  - Configure warning thresholds (percentage-based)
  - Toggle category active/inactive status
  - Assign colors for visualization
  - Add descriptions
- **Global Settings**: 
  - Currency selection (USD, ILS, EUR, GBP)
  - Warning notifications toggle
  - Email alerts toggle
- **Family Members**: Quick navigation to family members management
- **Real-time validation**: Ensure category names are unique

**JSON Editor Mode:**
- Direct JSON editing of budget configuration
- Syntax validation with error reporting
- Live preview of changes
- Import/Export functionality

### Technical Implementation

**Component**: `src/components/BudgetSettings.tsx`

**Key Features:**
- Dual-mode interface (Visual/JSON tabs)
- Modal-based UI with backdrop
- Local state management for unsaved changes
- Integration with `BudgetConfigService`
- Color picker integration using `getNextAvailableColor` utility
- Category edit modal for detailed configuration
- Real-time JSON synchronization between visual and JSON modes

**Data Structure:**
```typescript
interface BudgetConfiguration {
  version: string;
  lastModified: string;
  categories: {
    [name: string]: {
      monthlyLimit: number;
      warningThreshold: number;
      isActive: boolean;
      color: string;
      description: string;
    }
  };
  globalSettings: {
    currency: string;
    warningNotifications: boolean;
    emailAlerts: boolean;
  };
}
```

**Props Interface:**
```typescript
interface BudgetSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: BudgetConfiguration) => void;
  onOpenFamilyMembers?: () => void;
  familyMembersCount?: number;
}
```

### UI Components Used
- Modal overlay with backdrop blur
- Tabbed navigation (Visual/JSON)
- Form inputs with validation
- Color picker buttons
- Icon buttons (Settings, Save, Download, Upload, Code, Plus, Edit)
- Category list with inline edit/delete actions
- JSON text area with monospace font

### State Management
- Category editing state
- JSON text synchronization
- Validation error states
- New category tracking for unsaved changes
- Global settings editing state

### Reasons for Deprecation
1. **Replaced by Personal Budget System**: All budget configuration moved to database-driven personal budget management in Budget Management tab
2. **Better UX**: New system provides more intuitive category and budget management
3. **Database-First**: Configuration now stored in Supabase instead of localStorage
4. **Reduced Complexity**: Eliminated dual Visual/JSON editing modes
5. **Integrated Workflow**: Budget configuration now part of main dashboard flow

### Migration Path
- Old `BudgetConfigService.loadConfig()` → `useActiveBudget()` hook
- Old localStorage-based categories → Supabase `personal_budgets` table
- Old JSON export/import → Native database backup/restore
- Old modal-based editing → Inline editing in Budget Management tab

### Related Components (Still Active)
- `CategoryEditModal.tsx` - Still used for editing category details
- `PersonalBudgetEditor.tsx` - New primary interface for budget management
- `BudgetManagement.tsx` - Contains category and budget configuration

### Files to Remove
- `src/components/BudgetSettings.tsx`
- Settings button in `src/App.tsx`
- Import statements referencing BudgetSettings

### Potential Re-implementation Use Cases
- **Advanced JSON Import/Export**: Could be useful for bulk data operations
- **Migration Tools**: JSON editing could help users migrate from other budget apps
- **Power User Features**: Some users might prefer direct JSON editing
- **Backup/Restore**: JSON export could be reimplemented as a backup feature
- **Multi-configuration Management**: If users want to maintain multiple budget templates

### Code Patterns Worth Preserving
1. **Dual-mode editing** (Visual + JSON) - useful pattern for configuration UIs
2. **Real-time validation** - immediate feedback on configuration errors
3. **Category color management** - `getNextAvailableColor` utility function
4. **Modal state management** - pattern for complex form modals
5. **JSON synchronization** - keeping visual and text representations in sync

---

## Future Deprecations

_Document additional deprecated features here as they are retired._

