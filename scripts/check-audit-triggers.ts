import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkAuditTriggers() {
  try {
    console.log('🔍 Checking audit triggers...\n')

    // Check if trigger function exists
    const functionCheck = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS(
        SELECT 1 
        FROM pg_proc 
        WHERE proname = 'audit_trigger_function'
      ) as exists;
    `
    console.log(`📝 Trigger Function exists: ${functionCheck[0].exists}`)

    // Check triggers for tables
    const triggers = await prisma.$queryRaw<Array<{
      trigger_name: string
      event_object_table: string
      action_timing: string
      event_manipulation: string
    }>>`
      SELECT 
        trigger_name,
        event_object_table,
        action_timing,
        event_manipulation
      FROM information_schema.triggers
      WHERE trigger_name LIKE 'audit_trigger_%'
      ORDER BY event_object_table, trigger_name;
    `

    console.log(`\n📊 Found ${triggers.length} audit triggers:\n`)
    
    if (triggers.length === 0) {
      console.log('❌ No triggers found! Please run: npm run setup:audit\n')
    } else {
      triggers.forEach(trigger => {
        console.log(`  ✅ ${trigger.trigger_name}`)
        console.log(`     Table: ${trigger.event_object_table}`)
        console.log(`     Timing: ${trigger.action_timing}`)
        console.log(`     Event: ${trigger.event_manipulation}\n`)
      })
    }

    // Check if tracer_updates table exists
    const tableCheck = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS(
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_name = 'tracer_updates'
      ) as exists;
    `
    console.log(`📋 tracer_updates table exists: ${tableCheck[0].exists}`)

    // Check recent audit logs
    const recentLogs = await prisma.$queryRaw<Array<{
      count: bigint
      sourceTable: string
    }>>`
      SELECT 
        COUNT(*) as count,
        "sourceTable"
      FROM "tracer_updates"
      GROUP BY "sourceTable"
      ORDER BY count DESC
      LIMIT 10;
    `
    
    console.log(`\n📊 Recent audit logs by table:`)
    if (recentLogs.length === 0) {
      console.log('  ⚠️  No audit logs found')
    } else {
      recentLogs.forEach(log => {
        console.log(`  - ${log.sourceTable}: ${log.count} logs`)
      })
    }

    // Check if produks table has trigger
    const produksTrigger = triggers.find(t => t.event_object_table === 'produks')
    if (produksTrigger) {
      console.log(`\n✅ Trigger for 'produks' table is installed`)
    } else {
      console.log(`\n❌ Trigger for 'produks' table is NOT installed!`)
      console.log(`   Run: npm run setup:audit`)
    }

  } catch (error) {
    console.error('❌ Error checking triggers:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkAuditTriggers()
  .then(() => {
    console.log('\n✅ Check completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Check failed:', error)
    process.exit(1)
  })

