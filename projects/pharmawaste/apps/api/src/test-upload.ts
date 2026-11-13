import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { InventoryService } from './inventory/inventory.service';
import * as fs from 'fs';
import * as path from 'path';

async function testUpload() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const inventoryService = app.get(InventoryService);

  const filePath = path.join(__dirname, '..', 'test_data', 'inventario_farmacia_amostra.csv');
  const fileBuffer = fs.readFileSync(filePath);
  const fileStats = fs.statSync(filePath);

  console.log('🧪 A testar upload e cálculo de inventário farmacêutico...');
  const result = await inventoryService.processInventoryFile(
    fileBuffer,
    'inventario_farmacia_amostra.csv',
    fileStats.size,
    'org_test_1',
    'usr_test_1',
  );

  console.log('📊 Resultado do Processamento:');
  console.log(result);

  const summary = await inventoryService.getDashboardSummary('org_test_1');
  console.log('📈 Resumo Executivo para o Dashboard:');
  console.log(JSON.stringify(summary, null, 2));

  await app.close();
}

testUpload().catch((e) => {
  console.error(e);
  process.exit(1);
});
