<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Galfin - Family Finance Tracker

This is a React TypeScript family finance tracking application built with Vite, Tailwind CSS, and Supabase.

## Key Information

- **Framework**: React 19.1.1 with TypeScript 5.8.3
- **Backend**: Supabase (PostgreSQL + Auth)
- **Styling**: Tailwind CSS 4.1.12
- **Testing**: Vitest 3.2.4 + React Testing Library
- **Build Tool**: Vite 7.1.2

## Documentation

For complete project information, refer to:
- `/docs/COMPLETE_FEATURE_SUMMARY.md` - All features and capabilities
- `/docs/SUPABASE_BRINGUP.md` - Backend setup guide
- `/docs/TEST_DOCUMENTATION.md` - Testing guide
- `/docs/DEPRECATED_FEATURES.md` - Historical context

## Important Notes

- All data is stored in Supabase (no localStorage)
- User authentication required
- Budget configuration includes family members and active categories in globalSettings
- Row Level Security (RLS) enabled on all database tables

