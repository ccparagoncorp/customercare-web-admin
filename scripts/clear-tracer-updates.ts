import { PrismaClient } from '@prisma/client'

// Create Prisma client with prepared statements disabled for setup script
const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  throw new Error('DATABASE_URL is not defined')
}

// Modify connection string to disable prepared statements
const url = new URL(databaseUrl)
url.searchParams.set('prepared_statements', 'false')
url.searchParams.set('pgbouncer', 'true')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: url.toString(),
    },
  },
  log: ['error'],
})

async function clearTracerUpdates() {
  try {
    console.log('🗑️  Clearing all tracer_updates data...\n')

    // Get count before deletion
    const countBefore = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM tracer_updates;
    `
    const count = Number(countBefore[0].count)
    
    console.log(`📊 Current records in tracer_updates: ${count}`)
    
    if (count === 0) {
      console.log('✅ Table is already empty. Nothing to delete.\n')
      return
    }

    // Ask for confirmation
    console.log('⚠️  WARNING: This will delete ALL records from tracer_updates table!')
    console.log('   This action cannot be undone.\n')
    
    // Delete all records
    const result = await prisma.$executeRawUnsafe('DELETE FROM tracer_updates;')
    
    console.log(`✅ Successfully deleted ${count} records from tracer_updates table\n`)
    
    // Verify deletion
    const countAfter = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM tracer_updates;
    `
    const remaining = Number(countAfter[0].count)
    
    if (remaining === 0) {
      console.log('✅ Verification: Table is now empty')
    } else {
      console.log(`⚠️  Warning: ${remaining} records still remain`)
    }
    
  } catch (error) {
    console.error('❌ Error clearing tracer_updates:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Jalankan cleanup
clearTracerUpdates()
  .then(() => {
    console.log('\n✅ Cleanup completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Cleanup failed:', error)
    process.exit(1)
  })

