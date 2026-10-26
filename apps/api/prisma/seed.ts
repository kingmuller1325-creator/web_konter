import { PrismaClient, Role, StockMovementType, PaymentMethod, ShiftStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create default outlet
  const outlet = await prisma.outlet.upsert({
    where: { id: 'default-outlet' },
    update: {},
    create: {
      id: 'default-outlet',
      name: 'Konter Pulsa Utama',
      address: 'Jl. Contoh No. 123, Jakarta',
      phone: '081234567890',
    },
  });
  console.log('✅ Outlet created:', outlet.name);

  // Create admin user
  const passwordHash = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@konteros.com' },
    update: {},
    create: {
      email: 'admin@konteros.com',
      passwordHash,
      name: 'Admin Konteros',
      role: Role.ADMIN,
      outletId: outlet.id,
    },
  });
  console.log('✅ Admin user created:', admin.email);

  // Create cashier user
  const cashierPasswordHash = await bcrypt.hash('kasir123', 12);
  const cashier = await prisma.user.upsert({
    where: { email: 'kasir@konteros.com' },
    update: {},
    create: {
      email: 'kasir@konteros.com',
      passwordHash: cashierPasswordHash,
      name: 'Kasir Utama',
      role: Role.CASHIER,
      outletId: outlet.id,
    },
  });
  console.log('✅ Cashier user created:', cashier.email);

  // Create categories
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { outletId_slug: { outletId: outlet.id, slug: 'pulsa' } },
      update: {},
      create: { outletId: outlet.id, name: 'Pulsa', slug: 'pulsa', sortOrder: 1 },
    }),
    prisma.category.upsert({
      where: { outletId_slug: { outletId: outlet.id, slug: 'kuota' } },
      update: {},
      create: { outletId: outlet.id, name: 'Kuota Internet', slug: 'kuota', sortOrder: 2 },
    }),
    prisma.category.upsert({
      where: { outletId_slug: { outletId: outlet.id, slug: 'token' } },
      update: {},
      create: { outletId: outlet.id, name: 'Token Listrik', slug: 'token', sortOrder: 3 },
    }),
    prisma.category.upsert({
      where: { outletId_slug: { outletId: outlet.id, slug: 'aksesoris' } },
      update: {},
      create: { outletId: outlet.id, name: 'Aksesoris HP', slug: 'aksesoris', sortOrder: 4 },
    }),
    prisma.category.upsert({
      where: { outletId_slug: { outletId: outlet.id, slug: 'hp-second' } },
      update: {},
      create: { outletId: outlet.id, name: 'HP Second', slug: 'hp-second', sortOrder: 5 },
    }),
    prisma.category.upsert({
      where: { outletId_slug: { outletId: outlet.id, slug: 'service' } },
      update: {},
      create: { outletId: outlet.id, name: 'Service HP', slug: 'service', sortOrder: 6 },
    }),
    prisma.category.upsert({
      where: { outletId_slug: { outletId: outlet.id, slug: 'ppob' } },
      update: {},
      create: { outletId: outlet.id, name: 'PPOB Lainnya', slug: 'ppob', sortOrder: 7 },
    }),
  ]);
  console.log('✅ Categories created:', categories.length);

  const [pulsaCat, kuotaCat, tokenCat, aksesorisCat, hpSecondCat, serviceCat, ppobCat] = categories;

  // Create sample products
  const products = await Promise.all([
    // Digital products
    prisma.product.upsert({
      where: { outletId_sku: { outletId: outlet.id, sku: 'PULSA-TSEL-25' } },
      update: {},
      create: {
        outletId: outlet.id,
        categoryId: pulsaCat.id,
        sku: 'PULSA-TSEL-25',
        barcode: '8999999123456',
        name: 'Pulsa Telkomsel 25K',
        description: 'Pulsa reguler Telkomsel nominal 25.000',
        unit: 'pcs',
        costPrice: 24000,
        sellPrice: 25000,
        stockQty: 100,
        minStock: 10,
        isDigital: true,
      },
    }),
    prisma.product.upsert({
      where: { outletId_sku: { outletId: outlet.id, sku: 'PULSA-XL-20' } },
      update: {},
      create: {
        outletId: outlet.id,
        categoryId: pulsaCat.id,
        sku: 'PULSA-XL-20',
        barcode: '8999999123457',
        name: 'Pulsa XL 20K',
        description: 'Pulsa reguler XL nominal 20.000',
        unit: 'pcs',
        costPrice: 19000,
        sellPrice: 20000,
        stockQty: 100,
        minStock: 10,
        isDigital: true,
      },
    }),
    prisma.product.upsert({
      where: { outletId_sku: { outletId: outlet.id, sku: 'KUOTA-TSEL-5GB' } },
      update: {},
      create: {
        outletId: outlet.id,
        categoryId: kuotaCat.id,
        sku: 'KUOTA-TSEL-5GB',
        barcode: '8999999123458',
        name: 'Kuota Telkomsel 5GB',
        description: 'Kuota internet Telkomsel 5GB masa aktif 30 hari',
        unit: 'pcs',
        costPrice: 45000,
        sellPrice: 50000,
        stockQty: 50,
        minStock: 5,
        isDigital: true,
      },
    }),
    prisma.product.upsert({
      where: { outletId_sku: { outletId: outlet.id, sku: 'TOKEN-PLN-50' } },
      update: {},
      create: {
        outletId: outlet.id,
        categoryId: tokenCat.id,
        sku: 'TOKEN-PLN-50',
        barcode: '8999999123459',
        name: 'Token PLN 50K',
        description: 'Token listrik PLN prabayar nominal 50.000',
        unit: 'pcs',
        costPrice: 49500,
        sellPrice: 50000,
        stockQty: 200,
        minStock: 20,
        isDigital: true,
      },
    }),
    // Physical products
    prisma.product.upsert({
      where: { outletId_sku: { outletId: outlet.id, sku: 'CASE-IP14' } },
      update: {},
      create: {
        outletId: outlet.id,
        categoryId: aksesorisCat.id,
        sku: 'CASE-IP14',
        barcode: '8999999223456',
        name: 'Case iPhone 14 Pro Max',
        description: 'Case transparan anti gores iPhone 14 Pro Max',
        unit: 'pcs',
        costPrice: 15000,
        sellPrice: 35000,
        stockQty: 30,
        minStock: 5,
        isDigital: false,
      },
    }),
    prisma.product.upsert({
      where: { outletId_sku: { outletId: outlet.id, sku: 'CHARGER-20W' } },
      update: {},
      create: {
        outletId: outlet.id,
        categoryId: aksesorisCat.id,
        sku: 'CHARGER-20W',
        barcode: '8999999223457',
        name: 'Charger 20W Fast Charging',
        description: 'Charger USB-C 20W original support fast charging',
        unit: 'pcs',
        costPrice: 45000,
        sellPrice: 85000,
        stockQty: 25,
        minStock: 3,
        isDigital: false,
      },
    }),
    prisma.product.upsert({
      where: { outletId_sku: { outletId: outlet.id, sku: 'HP-SAMSUNG-A54' } },
      update: {},
      create: {
        outletId: outlet.id,
        categoryId: hpSecondCat.id,
        sku: 'HP-SAMSUNG-A54',
        barcode: '8999999323456',
        name: 'Samsung Galaxy A54 5G (Second)',
        description: 'Samsung Galaxy A54 5G 8/128GB kondisi 90% garansi 3 bulan',
        unit: 'unit',
        costPrice: 2500000,
        sellPrice: 3200000,
        stockQty: 3,
        minStock: 1,
        isDigital: false,
      },
    }),
    prisma.product.upsert({
      where: { outletId_sku: { outletId: outlet.id, sku: 'SERVICE-GANTI-LCD' } },
      update: {},
      create: {
        outletId: outlet.id,
        categoryId: serviceCat.id,
        sku: 'SERVICE-GANTI-LCD',
        name: 'Service Ganti LCD',
        description: 'Jasa ganti LCD smartphone (harga per model)',
        unit: 'jasa',
        costPrice: 0,
        sellPrice: 150000,
        stockQty: 0,
        minStock: 0,
        isDigital: false,
      },
    }),
  ]);
  console.log('✅ Products created:', products.length);

  // Record initial stock as ledger entries (source of truth for reconciliation).
  for (const product of products) {
    if (product.isDigital || product.stockQty <= 0) continue;

    const existingInitial = await prisma.stockMovement.count({
      where: { productId: product.id, refType: 'initial' },
    });

    if (existingInitial === 0) {
      await prisma.stockMovement.create({
        data: {
          outletId: outlet.id,
          productId: product.id,
          type: StockMovementType.IN,
          qty: product.stockQty,
          refType: 'initial',
          note: 'Stok awal (seed)',
          createdBy: admin.id,
        },
      });
    }
  }

  // Create default settings
  const defaultSettings = {
    receipt_header: 'KONTER PULSA UTAMA',
    receipt_subheader: 'Jl. Contoh No. 123, Jakarta',
    receipt_footer: 'Terima kasih atas kunjungan Anda\nBarang yang sudah dibeli tidak bisa dikembalikan',
    tax_rate: 0.11,
    low_stock_threshold: 5,
    auto_print_receipt: true,
    currency: 'IDR',
    timezone: 'Asia/Jakarta',
  };

  for (const [key, value] of Object.entries(defaultSettings)) {
    await prisma.setting.upsert({
      where: { outletId_key: { outletId: outlet.id, key } },
      update: { value: value as any },
      create: { outletId: outlet.id, key, value: value as any },
    });
  }
  console.log('✅ Default settings created');

  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });