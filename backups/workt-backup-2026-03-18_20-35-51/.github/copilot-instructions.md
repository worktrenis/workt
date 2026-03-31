<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Work Hours Tracker App - Copilot Instructions

This is a React Native Expo application for tracking work hours with automatic salary calculation based on Italian CCNL contracts.

## Project Structure
- **src/screens**: Contains all screen components (Dashboard, Settings, Time Entry, etc.)
- **src/components**: Reusable UI components
- **src/services**: Database services (SQLite), backup services, calculation services
- **src/utils**: Utility functions for calculations, date formatting, etc.
- **src/constants**: Application constants including CCNL rates and configurations
- **src/hooks**: Custom React hooks

## Key Features to Implement
1. **CCNL Contract Management**: Support for Italian labor contracts with automatic salary calculations
2. **Time Tracking**: Comprehensive work time entry with travel time, overtime, and night work
3. **Local Database**: SQLite for offline data storage
4. **Backup System**: Local and cloud backup functionality
5. **Dashboard**: Monthly overview with detailed breakdowns
6. **Settings Pages**: Multiple configuration screens for contracts, travel, standby, meals, etc.

## Technical Requirements
- Use Expo SQLite for database operations
- Implement React Navigation for screen management
- Use AsyncStorage for app preferences
- Support Italian language and date formats
- Implement proper error handling and data validation
- Follow React Native best practices for performance

## Salary Calculation Logic
Base the calculations on Italian CCNL Metalmeccanico PMI Level 5 (configurable for multi-user):
- Monthly salary: €2,800.00 (Level 5 standard, user configurable)
- Daily rate: €107.69 (calculated from monthly)
- Hourly rate: €16.15 (calculated from monthly)
- Overtime rates: +20% day, +25% night until 22h, +35% night after 22h
- Travel compensation: 100% of hourly rate (configurable per user)
- Multi-user support: each user can configure their own contract parameters

When writing code, prioritize:
1. Type safety and data validation
2. Clear separation of concerns
3. Italian localization
4. Mobile-first responsive design
5. Offline-first functionality
6. Multi-user privacy and data separation
