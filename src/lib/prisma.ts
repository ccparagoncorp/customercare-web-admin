import { PrismaClient } from '@prisma/client'

// Create a new Prisma client for each request with prepared statements disabled
export function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL
  
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not defined')
  }

  // Modify connection string to disable prepared statements
  const url = new URL(databaseUrl)
  url.searchParams.set('prepared_statements', 'false')
  url.searchParams.set('connection_limit', '1')
  url.searchParams.set('pool_timeout', '0')
  url.searchParams.set('pgbouncer', 'true')

  return new PrismaClient({
    datasources: {
      db: {
        url: url.toString(),
      },
    },
    log: ['error'],
  })
}


// Retry wrapper with connection recreation for prepared statement errors
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error as Error
      
      // Check if it's a prepared statement error
      if (error instanceof Error && (error.message.includes('prepared statement') || error.message.includes('already exists'))) {
        console.warn(`Prepared statement error (attempt ${i + 1}/${maxRetries}), recreating connection...`)
        
        // Wait longer before retry to allow connection cleanup
        await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)))
        
        continue
      }
      
      // If it's not a prepared statement error, throw immediately
      throw error
    }
  }
  
  throw lastError!
}
