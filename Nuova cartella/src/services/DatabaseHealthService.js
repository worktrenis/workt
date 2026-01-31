import DatabaseService from './DatabaseService';
import AsyncStorage from '@react-native-async-storage/async-storage';

class DatabaseHealthService {
  constructor() {
    this.healthCheckInterval = null;
    this.lastHealthCheck = 0;
    this.healthStatus = 'unknown'; // 'healthy', 'warning', 'error', 'unknown'
    this.errorHistory = [];
    this.maxErrorHistory = 10;
  }

  async performHealthCheck() {
    const now = Date.now();
    try {
      console.log('DatabaseHealthService: Performing health check...');
      
      // Ensure database is initialized before performing health check
      await DatabaseService.ensureInitialized();

      // Test basic database operations
      const isHealthy = await DatabaseService.isDatabaseHealthy();
      
      if (isHealthy) {
        // Test a simple read operation
        await DatabaseService.getSetting('health_test', 'default');
        
        // Test a simple write operation
        await DatabaseService.setSetting('health_test', { 
          timestamp: now,
          status: 'healthy'
        });
        
        this.healthStatus = 'healthy';
        this.lastHealthCheck = now;
        
        // Clear error history on successful health check
        this.errorHistory = [];
        
        console.log('DatabaseHealthService: Health check passed');
        return { status: 'healthy', timestamp: now };
        
      } else {
        throw new Error('Database health check failed');
      }
      
    } catch (error) {
      console.error('DatabaseHealthService: Health check failed:', error);
      
      // Record error in history
      this.errorHistory.push({
        timestamp: now,
        error: error.message,
        stack: error.stack
      });
      
      // Keep only recent errors
      if (this.errorHistory.length > this.maxErrorHistory) {
        this.errorHistory = this.errorHistory.slice(-this.maxErrorHistory);
      }
      
      // Update health status based on error frequency
      if (this.errorHistory.length >= 3) {
        this.healthStatus = 'error';
      } else {
        this.healthStatus = 'warning';
      }
      
      this.lastHealthCheck = now;
      
      return { 
        status: this.healthStatus, 
        timestamp: now, 
        error: error.message,
        errorCount: this.errorHistory.length
      };
    }
  }

  async startPeriodicHealthCheck(intervalMs = 30000) { // 30 secondi default
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    console.log(`DatabaseHealthService: Starting periodic health check every ${intervalMs}ms`);
    
    // Immediate first check
    await this.performHealthCheck();
    
    this.healthCheckInterval = setInterval(async () => {
      // Only perform health check if database seems to be having issues
      if (this.healthStatus !== 'healthy') {
        await this.performHealthCheck();
      }
    }, intervalMs);
  }

  stopPeriodicHealthCheck() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      console.log('DatabaseHealthService: Stopped periodic health check');
    }
  }

  getHealthStatus() {
    return {
      status: this.healthStatus,
      lastCheck: this.lastHealthCheck,
      errorHistory: this.errorHistory,
      canRetry: this.healthStatus !== 'error' || this.errorHistory.length < 5
    };
  }

  async attemptDatabaseRecovery() {
    console.log('DatabaseHealthService: Attempting database recovery...');
    
    try {
      // Close current database connection
      await DatabaseService.close();
      
      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Force reinitialization
      await DatabaseService.ensureInitialized();
      
      // Test if recovery was successful
      const healthCheck = await this.performHealthCheck();
      
      if (healthCheck.status === 'healthy') {
        console.log('DatabaseHealthService: Recovery successful');
        return { success: true, status: 'recovered' };
      } else {
        console.log('DatabaseHealthService: Recovery failed');
        return { success: false, status: 'recovery_failed', error: healthCheck.error };
      }
      
    } catch (error) {
      console.error('DatabaseHealthService: Recovery attempt failed:', error);
      return { success: false, status: 'recovery_error', error: error.message };
    }
  }

  async logDatabaseError(context, error) {
    const now = Date.now();
    
    console.error(`DatabaseHealthService: Error in ${context}:`, error);
    
    // Store error details
    const errorRecord = {
      timestamp: now,
      context,
      error: error.message,
      stack: error.stack
    };
    
    this.errorHistory.push(errorRecord);
    
    // Keep only recent errors
    if (this.errorHistory.length > this.maxErrorHistory) {
      this.errorHistory = this.errorHistory.slice(-this.maxErrorHistory);
    }
    
    // Update health status
    this.healthStatus = this.errorHistory.length >= 3 ? 'error' : 'warning';
    
    // Store persistent error log
    try {
      const existingLogs = await AsyncStorage.getItem('database_error_logs');
      const logs = existingLogs ? JSON.parse(existingLogs) : [];
      logs.push(errorRecord);
      
      // Keep only last 50 error logs
      const recentLogs = logs.slice(-50);
      await AsyncStorage.setItem('database_error_logs', JSON.stringify(recentLogs));
    } catch (storageError) {
      console.error('DatabaseHealthService: Failed to store error log:', storageError);
    }
  }

  async getErrorLogs() {
    try {
      const logs = await AsyncStorage.getItem('database_error_logs');
      return logs ? JSON.parse(logs) : [];
    } catch (error) {
      console.error('DatabaseHealthService: Failed to retrieve error logs:', error);
      return [];
    }
  }

  async clearErrorLogs() {
    try {
      await AsyncStorage.removeItem('database_error_logs');
      this.errorHistory = [];
      console.log('DatabaseHealthService: Error logs cleared');
    } catch (error) {
      console.error('DatabaseHealthService: Failed to clear error logs:', error);
    }
  }
}

export default new DatabaseHealthService();
