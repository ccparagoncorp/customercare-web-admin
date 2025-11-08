import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

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

// Daftar semua tabel yang akan dilacak
// Tabel tracer_updates sendiri tidak perlu dilacak untuk menghindari rekursi
const TABLES_TO_AUDIT = [
  'brands',
  'kategori_produks',
  'subkategori_produks',
  'produks',
  'detail_produks',
  'kategori_sops',
  'sops',
  'jenis_sops',
  'detail_sops',
  'users',
  'agents',
  'knowledges',
  'detail_knowledges',
  'jenis_detail_knowledges',
  'produk_jenis_detail_knowledges',
  'quality_trainings',
  'jenis_quality_trainings',
  'detail_quality_trainings',
  'subdetail_quality_trainings',
]

async function setupAuditTriggers() {
  try {
    console.log('🚀 Starting audit trigger setup...\n')

    // 1. Baca SQL script untuk membuat fungsi trigger
    // Gunakan path.resolve untuk mendapatkan path absolut
    // __dirname di ts-node mengarah ke directory compiled, jadi kita perlu mencari dari process.cwd()
    const scriptsDir = path.join(process.cwd(), 'scripts')
    const sqlFilePath = path.join(scriptsDir, 'create-audit-triggers.sql')
    if (!fs.existsSync(sqlFilePath)) {
      throw new Error(`SQL file not found at: ${sqlFilePath}. Current directory: ${process.cwd()}`)
    }
    const sqlScript = fs.readFileSync(sqlFilePath, 'utf-8')

    console.log('📝 Creating audit trigger function...')
    // Execute DROP statement first (if exists)
    try {
      await prisma.$executeRawUnsafe('DROP FUNCTION IF EXISTS audit_trigger_function() CASCADE;')
    } catch (error) {
      // Ignore errors for DROP
      console.log('  (Drop function - ok if not exists)')
    }
    
    // Execute CREATE FUNCTION as single statement
    // Remove comments and execute the function definition
    const functionSQL = sqlScript
      .replace(/^--.*$/gm, '') // Remove comment lines
      .replace(/DROP FUNCTION IF EXISTS.*?CASCADE;/i, '') // Remove DROP statement (already executed)
      .trim()
    
    try {
      await prisma.$executeRawUnsafe(functionSQL)
      console.log('✅ Audit trigger function created successfully\n')
    } catch (error) {
      console.error('❌ Error creating function:', error)
      throw error
    }

    // 2. Buat trigger untuk setiap tabel
    console.log('🔧 Creating triggers for tables...\n')

    for (const tableName of TABLES_TO_AUDIT) {
      try {
        // Hapus trigger jika sudah ada
        const dropTriggerSQL = `
          DROP TRIGGER IF EXISTS audit_trigger_${tableName} ON ${tableName};
        `
        await prisma.$executeRawUnsafe(dropTriggerSQL)

        // Buat trigger baru
        const createTriggerSQL = `
          CREATE TRIGGER audit_trigger_${tableName}
          AFTER INSERT OR UPDATE OR DELETE ON ${tableName}
          FOR EACH ROW
          EXECUTE FUNCTION audit_trigger_function();
        `
        await prisma.$executeRawUnsafe(createTriggerSQL)

        console.log(`✅ Trigger created for table: ${tableName}`)
      } catch (error) {
        console.error(`❌ Error creating trigger for ${tableName}:`, error)
        // Continue dengan tabel berikutnya
      }
    }

    console.log('\n✨ Audit trigger setup completed successfully!')
    console.log('\n📊 Summary:')
    console.log(`   - Function: audit_trigger_function()`)
    console.log(`   - Triggers created: ${TABLES_TO_AUDIT.length}`)
    console.log(`   - Audit table: tracer_updates`)
    console.log('\n💡 Note: To track user changes, set session variable before queries:')
    console.log('   SET LOCAL app.user_id = \'user-id-here\';')
  } catch (error) {
    console.error('❌ Error setting up audit triggers:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Jalankan setup
setupAuditTriggers()
  .then(() => {
    console.log('\n✅ Setup completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Setup failed:', error)
    process.exit(1)
  })

