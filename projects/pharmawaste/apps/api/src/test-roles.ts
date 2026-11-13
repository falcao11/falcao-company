import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { InventoryService } from './inventory/inventory.service';
import { PrismaService } from './prisma/prisma.service';

async function testRolesAndSettings() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const inventoryService = app.get(InventoryService);
  const prisma = app.get(PrismaService);

  console.log('🧪 A testar personalização e papéis da farmácia...');

  // 1. Atualizar definições da farmácia (nome, cores, alvará)
  const updatedOrg = await inventoryService.updateOrganizationSettings('org_test_1', {
    name: 'Farmácia Central de Lisboa (Renovada)',
    primaryColor: '#059669', // Verde esmeralda farmacêutico
    licenseNumber: 'ALV-1234-INFARMED',
    nif: '509876543',
  });

  console.log('✅ Farmácia personalizada com sucesso:');
  console.log({
    id: updatedOrg.id,
    name: updatedOrg.name,
    metadata: JSON.parse(updatedOrg.metadata || '{}'),
  });

  // 2. Criar um utilizador com papel de "user" (balcão) e outro "pharm_admin"
  const staffUser = await prisma.user.upsert({
    where: { email: 'balcao@teste.pt' },
    update: {},
    create: {
      id: 'usr_balcao_1',
      name: 'João Balconista',
      email: 'balcao@teste.pt',
      role: 'user',
    },
  });

  await prisma.member.upsert({
    where: { id: 'mem_balcao_1' },
    update: {},
    create: {
      id: 'mem_balcao_1',
      userId: staffUser.id,
      organizationId: 'org_test_1',
      role: 'member', // user normal da farmácia
      createdAt: new Date(),
    },
  });

  console.log('✅ Utilizador de Balcão (user) configurado na farmácia.');

  await app.close();
}

testRolesAndSettings().catch((e) => {
  console.error(e);
  process.exit(1);
});
