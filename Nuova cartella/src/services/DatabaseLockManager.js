import * as SQLite from 'expo-sqlite';

/**
 * 🔒 DATABASE LOCK MANAGER
 * 
 * Sistema per gestire i lock del database e prevenire conflitti di concorrenza.
 * Implementa una coda di operazioni e retry automatici.
 */

class DatabaseLockManager {
  constructor() {
    this.operationQueue = [];
    this.isProcessing = false;
    this.maxRetries = 3;
    this.lockTimeout = 10000; // 10 secondi
  }

  /**
   * Esegue un'operazione sul database in modo sicuro con gestione dei lock
   */
  async executeWithLockHandling(operation, retryCount = 0) {
    return new Promise((resolve, reject) => {
      this.operationQueue.push({
        operation,
        resolve,
        reject,
        retryCount,
        timestamp: Date.now()
      });

      this.processQueue();
    });
  }

  async processQueue() {
    if (this.isProcessing || this.operationQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.operationQueue.length > 0) {
      const { operation, resolve, reject, retryCount, timestamp } = this.operationQueue.shift();

      // Controlla timeout
      if (Date.now() - timestamp > this.lockTimeout) {
        reject(new Error('Database operation timeout'));
        continue;
      }

      try {
        const result = await this.executeWithRetry(operation, retryCount);
        resolve(result);
        
        // Piccola pausa tra operazioni per evitare sovraccarico
        await this.sleep(10);
        
      } catch (error) {
        if (this.isDatabaseLockError(error) && retryCount < this.maxRetries) {
          console.log(`🔄 Database lock detected, retry ${retryCount + 1}/${this.maxRetries}`);
          
          // Ri-accoda l'operazione con retry incrementato
          this.operationQueue.unshift({
            operation,
            resolve,
            reject,
            retryCount: retryCount + 1,
            timestamp
          });
          
          // Pausa esponenziale prima del retry
          await this.sleep(100 * Math.pow(2, retryCount));
        } else {
          reject(error);
        }
      }
    }

    this.isProcessing = false;
  }

  async executeWithRetry(operation, retryCount) {
    try {
      return await operation();
    } catch (error) {
      if (this.isDatabaseLockError(error)) {
        console.log(`🔒 Database lock error on attempt ${retryCount + 1}:`, error.message);
        throw error;
      }
      throw error;
    }
  }

  isDatabaseLockError(error) {
    const lockMessages = [
      'database is locked',
      'database disk image is malformed',
      'no such table',
      'SQLITE_BUSY',
      'finalizeAsync has been rejected'
    ];
    
    return lockMessages.some(msg => 
      error.message?.toLowerCase().includes(msg.toLowerCase())
    );
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Pulisce la coda delle operazioni scadute
   */
  cleanupQueue() {
    const now = Date.now();
    this.operationQueue = this.operationQueue.filter(
      item => now - item.timestamp < this.lockTimeout
    );
  }

  /**
   * Forza la chiusura e pulizia del manager
   */
  async shutdown() {
    this.operationQueue = [];
    this.isProcessing = false;
  }
}

// Singleton instance
const lockManager = new DatabaseLockManager();

/**
 * Decorator per operazioni del database con gestione automatica dei lock
 */
export function withLockHandling(target, propertyName, descriptor) {
  const originalMethod = descriptor.value;

  descriptor.value = async function(...args) {
    return lockManager.executeWithLockHandling(async () => {
      return originalMethod.apply(this, args);
    });
  };

  return descriptor;
}

/**
 * Wrapper per operazioni singole del database
 */
export async function executeDbOperation(operation) {
  return lockManager.executeWithLockHandling(operation);
}

export default lockManager;
