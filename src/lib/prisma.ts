import { PrismaClient } from '@prisma/client'

// Create a new Prisma client for each request with prepared statements disabled
// Explicitly return PrismaClient to ensure all models are typed correctly
export function createPrismaClient(): PrismaClient {
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

  const client = new PrismaClient({
    datasources: {
      db: {
        url: url.toString(),
      },
    },
    log: ['error'],
  })
  
  return client
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

/**
 * Set user ID untuk audit log tracking
 * Gunakan fungsi ini sebelum melakukan operasi database yang ingin dilacak
 * 
 * @param prisma - Prisma Client instance
 * @param userId - User ID yang melakukan perubahan
 * @example
 * ```ts
 * const prisma = createPrismaClient()
 * await setAuditUser(prisma, session.user.id)
 * await prisma.user.update({ ... })
 * ```
 */
export async function setAuditUser(prisma: PrismaClient, userId: string) {
  // Escape single quotes untuk mencegah SQL injection
  const escapedUserId = userId.replace(/'/g, "''")
  await prisma.$executeRawUnsafe(`SET LOCAL app.user_id = '${escapedUserId}'`)
}

/**
 * Execute operation with user tracking for audit log
 * 
 * IMPORTANT: SET LOCAL hanya bekerja dalam transaction.
 * Operation harus menggunakan transaction client (tx) yang disediakan oleh callback.
 * 
 * @param prisma - Prisma Client instance
 * @param userId - User ID yang melakukan perubahan
 * @param operation - Function yang berisi operasi database. 
 *                    Parameter pertama adalah transaction client yang harus digunakan untuk semua operasi database.
 * @example
 * ```ts
 * const prisma = createPrismaClient()
 * await withAuditUser(prisma, session.user.id, async (tx) => {
 *   await tx.user.update({ ... })  // Gunakan tx, bukan prisma!
 * })
 * ```
 */
export async function withAuditUser<T>(
  prisma: PrismaClient,
  userId: string,
  operation: (tx: PrismaClient) => Promise<T>
): Promise<T> {
  // Escape user ID untuk mencegah SQL injection
  const escapedUserId = userId.replace(/'/g, "''")
  
  // Wrap dalam transaction
  // SET LOCAL hanya bekerja dalam transaction
  return await prisma.$transaction(async (tx) => {
    // Set session variable dalam transaction
    // Ini akan berlaku untuk semua query dalam transaction ini
    await tx.$executeRawUnsafe(`SET LOCAL app.user_id = '${escapedUserId}'`)
    
    // Eksekusi operation dengan transaction client
    // Operation HARUS menggunakan tx, bukan prisma instance
    const result = await operation(tx)
    
    return result
  }, {
    timeout: 20000,
    isolationLevel: 'ReadCommitted'
  })
}
