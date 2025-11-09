/**
 * Script to populate brandId in produks table
 * Run with: npx tsx scripts/populate-brand-id.ts
 */

import { createPrismaClient } from '../src/lib/prisma'

async function populateBrandId() {
  const prisma = createPrismaClient()

  try {
    console.log('Starting to populate brandId...')

    // Update products that have subcategory (get brand from subcategory's category)
    const result1 = await prisma.$executeRaw`
      UPDATE "produks" p
      SET "brandId" = (
        SELECT kp."brandId"
        FROM "subkategori_produks" sp
        JOIN "kategori_produks" kp ON sp."kategoriProdukId" = kp.id
        WHERE sp.id = p."subkategoriProdukId"
      )
      WHERE p."brandId" IS NULL 
        AND p."subkategoriProdukId" IS NOT NULL
    `
    console.log(`Updated ${result1} products with subcategory`)

    // Update products that have category (get brand from category)
    const result2 = await prisma.$executeRaw`
      UPDATE "produks" p
      SET "brandId" = (
        SELECT kp."brandId"
        FROM "kategori_produks" kp
        WHERE kp.id = p."categoryId"
      )
      WHERE p."brandId" IS NULL 
        AND p."categoryId" IS NOT NULL
        AND p."subkategoriProdukId" IS NULL
    `
    console.log(`Updated ${result2} products with category`)

    // Verify the update
    const stats = await prisma.$queryRaw<Array<{
      total_products: bigint
      products_with_brand: bigint
      products_without_brand: bigint
    }>>`
      SELECT 
        COUNT(*) as total_products,
        COUNT("brandId") as products_with_brand,
        COUNT(*) - COUNT("brandId") as products_without_brand
      FROM "produks"
    `

    console.log('\n=== Statistics ===')
    console.log(`Total products: ${stats[0].total_products}`)
    console.log(`Products with brand: ${stats[0].products_with_brand}`)
    console.log(`Products without brand: ${stats[0].products_without_brand}`)

    // Show products that still don't have brandId (if any)
    const productsWithoutBrand = await prisma.$queryRaw<Array<{
      id: string
      name: string
      categoryId: string | null
      subkategoriProdukId: string | null
      brandId: string | null
    }>>`
      SELECT 
        id,
        name,
        "categoryId",
        "subkategoriProdukId",
        "brandId"
      FROM "produks"
      WHERE "brandId" IS NULL
    `

    if (productsWithoutBrand.length > 0) {
      console.log('\n=== Products without brandId ===')
      console.table(productsWithoutBrand)
    } else {
      console.log('\n✅ All products have brandId!')
    }

    console.log('\n✅ Population completed successfully!')
  } catch (error) {
    console.error('Error populating brandId:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
populateBrandId()
  .then(() => {
    console.log('Script completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Script failed:', error)
    process.exit(1)
  })

