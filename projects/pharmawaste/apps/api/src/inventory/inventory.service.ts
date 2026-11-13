import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../notifications/email.service';
import { BatchRiskStatus, ReturnStatus, UploadStatus } from '@prisma/client';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import PDFDocument = require('pdfkit');

export interface ProcessedBatchItem {
  cnp: string;
  name: string;
  batchNumber: string;
  expirationDate: Date;
  quantity: number;
  unitCost: number;
  totalCost: number;
  supplier?: string;
  riskStatus: BatchRiskStatus;
}

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Obtém contexto da farmácia ativa e verifica se a conta demo de 14 dias expirou
   */
  async getOrganizationContext(organizationId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org) {
      throw new NotFoundException('Farmácia não encontrada.');
    }

    let meta: Record<string, any> = {};
    if (org.metadata) {
      try {
        meta = JSON.parse(org.metadata);
      } catch {
        meta = {};
      }
    }

    const isDemoExpired = Boolean(
      org.isDemo && org.demoExpiresAt && new Date(org.demoExpiresAt) < new Date(),
    );

    return {
      id: org.id,
      name: org.name,
      logo: org.logo,
      nif: meta.nif || null,
      licenseNumber: meta.licenseNumber || null,
      primaryColor: meta.primaryColor || '#059669',
      isDemo: org.isDemo,
      demoExpiresAt: org.demoExpiresAt,
      isDemoExpired,
    };
  }

  /**
   * Garante que uma farmácia com conta demo expirada não acede às operações
   */
  async assertDemoNotExpired(organizationId: string) {
    const ctx = await this.getOrganizationContext(organizationId);
    if (ctx.isDemoExpired) {
      throw new ForbiddenException(
        'A sua conta de demonstração de 14 dias expirou. Entre em contacto connosco para continuar a utilizar o PharmaWaste.',
      );
    }
    return ctx;
  }

  /**
   * Regista um pedido de criação de conta / demonstração submetido no ecrã de login
   */
  async createAccountRequest(data: {
    pharmacyName: string;
    nif?: string;
    licenseNumber?: string;
    contactName: string;
    email: string;
    phone?: string;
    notes?: string;
  }) {
    if (!data.pharmacyName?.trim() || !data.contactName?.trim() || !data.email?.trim()) {
      throw new BadRequestException('Nome da farmácia, nome de contacto e email são obrigatórios.');
    }

    const created = await this.prisma.accountRequest.create({
      data: {
        pharmacyName: data.pharmacyName.trim(),
        nif: data.nif?.trim() || null,
        licenseNumber: data.licenseNumber?.trim() || null,
        contactName: data.contactName.trim(),
        email: data.email.trim(),
        phone: data.phone?.trim() || null,
        notes: data.notes?.trim() || null,
      },
    });

    await this.emailService.sendNewAccountRequestNotification(created);
    return created;
  }

  /**
   * Converte formatos comuns de data em JavaScript Date
   */
  private parseDate(val: any): Date | null {
    if (!val) return null;
    if (val instanceof Date) return isNaN(val.getTime()) ? null : val;

    // Se for número serial do Excel
    if (typeof val === 'number') {
      const date = XLSX.SSF.parse_date_code(val);
      if (date) {
        return new Date(Date.UTC(date.y, date.m - 1, date.d));
      }
    }

    if (typeof val === 'string') {
      const clean = val.trim();
      // Formato DD/MM/AAAA ou DD-MM-AAAA
      const ptMatch = clean.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{2,4})$/);
      if (ptMatch) {
        const day = parseInt(ptMatch[1], 10);
        const month = parseInt(ptMatch[2], 10) - 1;
        let year = parseInt(ptMatch[3], 10);
        if (year < 100) year += 2000;
        return new Date(Date.UTC(year, month, day));
      }

      // Formato MM/AAAA
      const myMatch = clean.match(/^(\d{1,2})[\/\.-](\d{2,4})$/);
      if (myMatch) {
        const month = parseInt(myMatch[1], 10) - 1;
        let year = parseInt(myMatch[2], 10);
        if (year < 100) year += 2000;
        // Assume o último dia do mês para validade farmacêutica
        return new Date(Date.UTC(year, month + 1, 0));
      }

      const d = new Date(clean);
      if (!isNaN(d.getTime())) return d;
    }

    return null;
  }

  /**
   * Determina o status de risco com base na proximidade do término de validade
   */
  private calculateRisk(expirationDate: Date): BatchRiskStatus {
    const now = new Date();
    const diffTime = expirationDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return BatchRiskStatus.EXPIRED;
    if (diffDays <= 60) return BatchRiskStatus.CRITICAL;
    if (diffDays <= 90) return BatchRiskStatus.WARNING;
    return BatchRiskStatus.HEALTHY;
  }

  /**
   * Processa o ficheiro de inventário (Excel ou CSV) e sincroniza os lotes da farmácia:
   * - Se CNP + Lote + Validade já existir: atualiza quantidade/custo/risco
   * - Se não existir: cria novo lote
   * - Se existia na DB (não devolvido) mas não veio no Excel: apaga (vendido/saído de stock)
   */
  async processInventoryFile(
    fileBuffer: Buffer,
    fileName: string,
    fileSize: number,
    organizationId: string,
    userId: string,
  ) {
    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(fileBuffer, { type: 'buffer', cellDates: true });
    } catch (e) {
      throw new BadRequestException('Ficheiro inválido ou corrompido. Envie um ficheiro .xlsx ou .csv.');
    }

    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      throw new BadRequestException('O ficheiro não contém folhas de cálculo válidas.');
    }

    const sheet = workbook.Sheets[firstSheetName];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });

    if (!rawRows || rawRows.length === 0) {
      throw new BadRequestException('A folha de inventário está vazia.');
    }

    // Agregação intra-ficheiro por chave única (CNP + Lote + Validade)
    const batchMap = new Map<string, ProcessedBatchItem>();

    for (const row of rawRows) {
      // Normalização e busca de colunas por variações comuns de software farmacêutico
      const cnp = String(row['CNP'] || row['cnp'] || row['Código'] || row['Codigo'] || row['Artigo'] || '').trim() || 'N/A';
      const name = String(row['Nome'] || row['Designação'] || row['Designacao'] || row['Descrição'] || row['Descricao'] || row['Medicamento'] || 'Sem Nome').trim();
      const batchNumber = String(row['Lote'] || row['LOTE'] || row['Batch'] || 'S/LOTE').trim();
      
      const rawExp = row['Validade'] || row['Data Validade'] || row['VAL'] || row['Expiration'] || row['Exp'];
      const expirationDate = this.parseDate(rawExp);

      if (!expirationDate) {
        continue; // Ignora linhas sem data de validade válida
      }

      const rawQty = row['Quantidade'] || row['Qtd'] || row['Stock'] || row['EXISTENCIA'] || 1;
      const quantity = Math.max(0, parseInt(String(rawQty).replace(/[^\d.-]/g, ''), 10) || 0);

      const rawCost = row['Preço Custo'] || row['Preco Custo'] || row['PVPF'] || row['Custo'] || row['PVP'] || 0;
      const unitCost = Math.max(0, parseFloat(String(rawCost).replace(',', '.').replace(/[^\d.-]/g, '')) || 0);

      const supplier = String(row['Fornecedor'] || row['Armazenista'] || row['Laboratório'] || '').trim() || undefined;
      const riskStatus = this.calculateRisk(expirationDate);

      const compositeKey = `${cnp}|${batchNumber}|${expirationDate.toISOString()}`;
      const existing = batchMap.get(compositeKey);

      if (existing) {
        existing.quantity += quantity;
        existing.unitCost = unitCost || existing.unitCost;
        existing.totalCost = Number((existing.quantity * existing.unitCost).toFixed(2));
        if (supplier && !existing.supplier) existing.supplier = supplier;
      } else {
        batchMap.set(compositeKey, {
          cnp,
          name,
          batchNumber,
          expirationDate,
          quantity,
          unitCost,
          totalCost: Number((quantity * unitCost).toFixed(2)),
          supplier,
          riskStatus,
        });
      }
    }

    const processedBatches = Array.from(batchMap.values());
    if (processedBatches.length === 0) {
      throw new BadRequestException('Não foi possível identificar lotes com datas de validade válidas no ficheiro.');
    }

    const totalValueAtRisk = processedBatches.reduce((sum, b) => {
      if (b.riskStatus === BatchRiskStatus.CRITICAL || b.riskStatus === BatchRiskStatus.WARNING || b.riskStatus === BatchRiskStatus.EXPIRED) {
        return sum + b.totalCost;
      }
      return sum;
    }, 0);

    // Persistência transacional no PostgreSQL
    return await this.prisma.$transaction(async (tx) => {
      const upload = await tx.inventoryUpload.create({
        data: {
          organizationId,
          uploadedById: userId,
          fileName,
          fileSize,
          status: UploadStatus.COMPLETED,
          totalRows: processedBatches.length,
          totalValueAtRisk: Number(totalValueAtRisk.toFixed(2)),
        },
      });

      // 1. Ler lotes atuais da farmácia para comparar (CNP + Lote + Validade)
      const existingBatches = await tx.medicationBatch.findMany({
        where: { organizationId },
        select: { id: true, cnp: true, batchNumber: true, expirationDate: true, riskStatus: true },
      });

      const incomingKeys = new Set(
        processedBatches.map((b) => `${b.cnp}|${b.batchNumber}|${b.expirationDate.toISOString()}`),
      );

      const existingMap = new Map<string, { id: string; riskStatus: BatchRiskStatus }>();
      const idsToDelete: string[] = [];

      for (const eb of existingBatches) {
        const key = `${eb.cnp}|${eb.batchNumber}|${eb.expirationDate.toISOString()}`;
        existingMap.set(key, { id: eb.id, riskStatus: eb.riskStatus });

        // Se não veio no Excel e não está marcado como RETURNED, foi vendido/removido de stock
        if (!incomingKeys.has(key) && eb.riskStatus !== BatchRiskStatus.RETURNED) {
          idsToDelete.push(eb.id);
        }
      }

      if (idsToDelete.length > 0) {
        await tx.medicationBatch.deleteMany({
          where: { id: { in: idsToDelete } },
        });
      }

      // 2. Criar novos ou atualizar os que já existem (mesmo CNP + Lote + Validade)
      let createdCount = 0;
      let updatedCount = 0;

      for (const b of processedBatches) {
        const key = `${b.cnp}|${b.batchNumber}|${b.expirationDate.toISOString()}`;
        const existing = existingMap.get(key);

        if (existing) {
          if (existing.riskStatus !== BatchRiskStatus.RETURNED) {
            await tx.medicationBatch.update({
              where: { id: existing.id },
              data: {
                uploadId: upload.id,
                name: b.name,
                quantity: b.quantity,
                unitCost: b.unitCost,
                totalCost: b.totalCost,
                supplier: b.supplier,
                riskStatus: b.riskStatus,
              },
            });
            updatedCount++;
          }
        } else {
          await tx.medicationBatch.create({
            data: {
              organizationId,
              uploadId: upload.id,
              cnp: b.cnp,
              name: b.name,
              batchNumber: b.batchNumber,
              expirationDate: b.expirationDate,
              quantity: b.quantity,
              unitCost: b.unitCost,
              totalCost: b.totalCost,
              supplier: b.supplier,
              riskStatus: b.riskStatus,
            },
          });
          createdCount++;
        }
      }

      return {
        uploadId: upload.id,
        totalItems: processedBatches.length,
        createdCount,
        updatedCount,
        deletedCount: idsToDelete.length,
        totalValueAtRisk: Number(totalValueAtRisk.toFixed(2)),
        criticalCount: processedBatches.filter((b) => b.riskStatus === BatchRiskStatus.CRITICAL).length,
        warningCount: processedBatches.filter((b) => b.riskStatus === BatchRiskStatus.WARNING).length,
        expiredCount: processedBatches.filter((b) => b.riskStatus === BatchRiskStatus.EXPIRED).length,
        healthyCount: processedBatches.filter((b) => b.riskStatus === BatchRiskStatus.HEALTHY).length,
      };
    });
  }

  /**
   * Limpa todos os lotes de inventário da farmácia ativa
   */
  async clearInventory(organizationId: string) {
    const result = await this.prisma.medicationBatch.deleteMany({
      where: { organizationId },
    });
    return { deletedCount: result.count };
  }

  /**
   * Retorna o resumo financeiro de risco para o dashboard
   */
  async getDashboardSummary(organizationId: string) {
    const batches = await this.prisma.medicationBatch.findMany({
      where: { organizationId },
    });

    let totalValueAtRisk = 0;
    let criticalValue = 0;
    let warningValue = 0;
    let expiredValue = 0;

    let criticalCount = 0;
    let warningCount = 0;
    let expiredCount = 0;
    let healthyCount = 0;

    for (const b of batches) {
      if (b.riskStatus === BatchRiskStatus.CRITICAL) {
        criticalCount++;
        criticalValue += b.totalCost;
        totalValueAtRisk += b.totalCost;
      } else if (b.riskStatus === BatchRiskStatus.WARNING) {
        warningCount++;
        warningValue += b.totalCost;
        totalValueAtRisk += b.totalCost;
      } else if (b.riskStatus === BatchRiskStatus.EXPIRED) {
        expiredCount++;
        expiredValue += b.totalCost;
        totalValueAtRisk += b.totalCost;
      } else {
        healthyCount++;
      }
    }

    return {
      totalBatches: batches.length,
      totalValueAtRisk: Number(totalValueAtRisk.toFixed(2)),
      breakdown: {
        critical: { count: criticalCount, value: Number(criticalValue.toFixed(2)) },
        warning: { count: warningCount, value: Number(warningValue.toFixed(2)) },
        expired: { count: expiredCount, value: Number(expiredValue.toFixed(2)) },
        healthy: { count: healthyCount },
      },
    };
  }

  /**
   * Atualiza as configurações e branding da farmácia (nome, logótipo, cores, NIF, alvará)
   */
  async updateOrganizationSettings(
    organizationId: string,
    data: { name?: string; logo?: string; primaryColor?: string; nif?: string; licenseNumber?: string },
  ) {
    const existing = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!existing) {
      throw new BadRequestException('Farmácia não encontrada.');
    }

    let metadataObj: Record<string, any> = {};
    if (existing.metadata) {
      try {
        metadataObj = JSON.parse(existing.metadata);
      } catch (e) {
        metadataObj = {};
      }
    }

    if (data.primaryColor) metadataObj.primaryColor = data.primaryColor;
    if (data.nif) metadataObj.nif = data.nif;
    if (data.licenseNumber) metadataObj.licenseNumber = data.licenseNumber;

    return await this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        name: data.name || existing.name,
        logo: data.logo !== undefined ? data.logo : existing.logo,
        metadata: JSON.stringify(metadataObj),
      },
    });
  }

  /**
   * Lista os lotes com paginação e filtro por status de risco
   */
  async listBatches(organizationId: string, riskStatus?: BatchRiskStatus, limit = 50, page = 1) {
    const where: any = { organizationId };
    if (riskStatus) where.riskStatus = riskStatus;

    const [items, total] = await Promise.all([
      this.prisma.medicationBatch.findMany({
        where,
        orderBy: { expirationDate: 'asc' }, // Mais urgentes primeiro
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.medicationBatch.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Cria um pedido de devolução para os lotes selecionados e marca-os como RETURNED
   */
  async createReturnRequest(organizationId: string, batchIds: string[]) {
    if (!batchIds || batchIds.length === 0) {
      throw new BadRequestException('Selecione pelo menos um lote para devolver.');
    }

    return await this.prisma.$transaction(async (tx) => {
      const batches = await tx.medicationBatch.findMany({
        where: {
          organizationId,
          id: { in: batchIds },
          riskStatus: { not: BatchRiskStatus.RETURNED },
        },
      });

      if (batches.length === 0) {
        throw new BadRequestException('Nenhum lote válido disponível para devolução.');
      }

      const suppliers = Array.from(new Set(batches.map((b) => b.supplier).filter(Boolean)));
      const wholesalerOrLab =
        suppliers.length === 1
          ? (suppliers[0] as string)
          : suppliers.length > 1
            ? suppliers.join(', ')
            : 'Armazenista / Laboratório';

      const totalItems = batches.reduce((sum, b) => sum + b.quantity, 0);
      const totalValue = Number(batches.reduce((sum, b) => sum + b.totalCost, 0).toFixed(2));

      const returnRequest = await tx.returnRequest.create({
        data: {
          organizationId,
          wholesalerOrLab,
          status: ReturnStatus.GENERATED,
          totalItems,
          totalValue,
        },
      });

      await tx.medicationBatch.updateMany({
        where: { id: { in: batches.map((b) => b.id) } },
        data: {
          riskStatus: BatchRiskStatus.RETURNED,
          returnRequestId: returnRequest.id,
        },
      });

      return {
        ...returnRequest,
        pdfUrl: `/api/v1/inventory/returns/${returnRequest.id}/pdf`,
        batches,
      };
    });
  }

  /**
   * Lista todas as guias de devolução geradas pela farmácia
   */
  async listReturnRequests(organizationId: string) {
    return await this.prisma.returnRequest.findMany({
      where: { organizationId },
      include: { batches: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Gera a Guia de Devolução oficial em PDF usando PDFKit
   */
  async generateReturnPdf(
    organizationId: string,
    returnId: string,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const returnReq = await this.prisma.returnRequest.findFirst({
      where: { id: returnId, organizationId },
      include: {
        organization: true,
        batches: { orderBy: { expirationDate: 'asc' } },
      },
    });

    if (!returnReq) {
      throw new NotFoundException('Guia de devolução não encontrada.');
    }

    let meta: Record<string, any> = {};
    if (returnReq.organization?.metadata) {
      try {
        meta = JSON.parse(returnReq.organization.metadata);
      } catch {
        meta = {};
      }
    }

    const pharmacyName = returnReq.organization?.name || 'Farmácia Central de Lisboa';
    const nif = meta.nif || '500123456';
    const license = meta.licenseNumber || 'ALV-1234-INFARMED';
    const guideRef = `DEV-${returnReq.id.slice(-8).toUpperCase()}`;
    const formattedDate = new Date(returnReq.createdAt).toLocaleDateString('pt-PT');

    const buffer = await new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 45 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const logoPath = path.join(process.cwd(), 'assets', 'logo.png');
      const hasLogo = fs.existsSync(logoPath);

      // Faixa superior verde institucional
      doc.rect(0, 0, 595.28, 8).fill('#059669');

      // Cabeçalho Institucional com Logótipo
      const headerY = 34;
      if (hasLogo) {
        doc.image(logoPath, 45, headerY, { height: 42 });
      }

      const titleX = hasLogo ? 105 : 45;
      doc
        .fillColor('#0f172a')
        .fontSize(14.5)
        .font('Helvetica-Bold')
        .text('PEDIDO DE DEVOLUÇÃO DE MEDICAMENTOS', titleX, headerY + 6, { width: 325 });

      doc
        .fontSize(8.5)
        .font('Helvetica')
        .fillColor('#64748b')
        .text('Minuta / Lista de Separação de Stock — PharmaWaste', titleX, doc.y + 3, { width: 325 });

      // Badge de Referência no canto superior direito
      doc
        .roundedRect(440, headerY + 2, 110, 38, 6)
        .fill('#f1f5f9')
        .strokeColor('#cbd5e1')
        .lineWidth(0.8)
        .stroke();

      doc.fillColor('#64748b').font('Helvetica-Bold').fontSize(7).text('REFERÊNCIA', 448, headerY + 9, { width: 94, align: 'right' });
      doc.fillColor('#047857').font('Helvetica-Bold').fontSize(10).text(guideRef, 448, headerY + 20, { width: 94, align: 'right' });

      // Cartões de Remetente e Destinatário
      const cardsY = 102;
      doc
        .roundedRect(45, cardsY, 245, 82, 8)
        .fill('#f8fafc')
        .strokeColor('#e2e8f0')
        .lineWidth(1)
        .stroke();

      doc
        .roundedRect(305, cardsY, 245, 82, 8)
        .fill('#f8fafc')
        .strokeColor('#e2e8f0')
        .lineWidth(1)
        .stroke();

      doc.fillColor('#059669').font('Helvetica-Bold').fontSize(7.5).text('ENTIDADE REMETENTE (FARMÁCIA)', 58, cardsY + 12);
      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(10.5).text(pharmacyName, 58, cardsY + 26, { width: 220, ellipsis: true });
      doc.font('Helvetica').fontSize(8.5).fillColor('#475569');
      doc.text(`NIF: ${nif}`, 58, cardsY + 45);
      doc.text(`Alvará INFARMED: ${license}`, 58, cardsY + 59);

      doc.fillColor('#059669').font('Helvetica-Bold').fontSize(7.5).text('DESTINATÁRIO / FORNECEDOR', 318, cardsY + 12);
      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(10.5).text(returnReq.wholesalerOrLab, 318, cardsY + 26, { width: 220, ellipsis: true });
      doc.font('Helvetica').fontSize(8.5).fillColor('#475569');
      doc.text(`Data de Emissão: ${formattedDate}`, 318, cardsY + 45);
      doc.text(`Motivo: Aproximação / Fim de Validade`, 318, cardsY + 59);

      // Cabeçalho da Tabela (colunas com largura ajustada para nunca partir linha)
      const tableTop = cardsY + 102;
      doc.roundedRect(45, tableTop, 505, 26, 4).fill('#0f172a');
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(7.8);
      doc.text('CNP', 53, tableTop + 9, { width: 48 });
      doc.text('MEDICAMENTO / DESIGNAÇÃO', 105, tableTop + 9, { width: 175 });
      doc.text('LOTE', 285, tableTop + 9, { width: 62 });
      doc.text('VALIDADE', 350, tableTop + 9, { width: 55 });
      doc.text('QTD', 408, tableTop + 9, { width: 32, align: 'right' });
      doc.text('CUSTO UN.', 444, tableTop + 9, { width: 52, align: 'right' });
      doc.text('TOTAL', 500, tableTop + 9, { width: 43, align: 'right' });

      let rowY = tableTop + 32;
      doc.font('Helvetica').fontSize(8.5);

      returnReq.batches.forEach((b, idx) => {
        if (rowY > 685) {
          doc.addPage();
          rowY = 50;
        }
        if (idx % 2 === 1) {
          doc.rect(45, rowY - 5, 505, 22).fill('#f8fafc');
        }
        const expStr = new Date(b.expirationDate).toLocaleDateString('pt-PT');
        doc.fillColor('#334155').font('Helvetica').text(b.cnp, 53, rowY, { width: 48 });
        doc.fillColor('#0f172a').font('Helvetica-Bold').text(b.name, 105, rowY, { width: 175, ellipsis: true });
        doc.fillColor('#475569').font('Helvetica').text(b.batchNumber, 285, rowY, { width: 62 });
        doc.text(expStr, 350, rowY, { width: 55 });
        doc.fillColor('#0f172a').text(`${b.quantity} un.`, 408, rowY, { width: 32, align: 'right' });
        doc.text(`${b.unitCost.toFixed(2)} €`, 444, rowY, { width: 52, align: 'right' });
        doc.fillColor('#047857').font('Helvetica-Bold').text(`${b.totalCost.toFixed(2)} €`, 500, rowY, { width: 43, align: 'right' });
        doc.font('Helvetica');

        // Linha divisória subtil entre linhas
        doc.moveTo(45, rowY + 17).lineTo(550, rowY + 17).strokeColor('#f1f5f9').lineWidth(0.8).stroke();
        rowY += 22;
      });

      // Resumo Financeiro e Observações
      rowY += 16;
      doc
        .roundedRect(45, rowY, 270, 56, 6)
        .fill('#f8fafc')
        .strokeColor('#e2e8f0')
        .lineWidth(0.8)
        .stroke();

      doc.fillColor('#475569').font('Helvetica-Bold').fontSize(7.5).text('OBSERVAÇÕES OPERACIONAIS', 57, rowY + 10);
      doc.font('Helvetica').fontSize(8).fillColor('#64748b').text(
        'As embalagens acima listadas encontram-se separadas na farmácia para recolha/crédito junto do fornecedor ou baixa no sistema Sifarma.',
        57,
        rowY + 23,
        { width: 246 },
      );

      doc
        .roundedRect(330, rowY, 220, 56, 6)
        .fill('#ecfdf5')
        .strokeColor('#6ee7b7')
        .lineWidth(1)
        .stroke();

      doc.fillColor('#065f46').font('Helvetica').fontSize(9).text(`Total de Embalagens: ${returnReq.totalItems} un.`, 344, rowY + 12);
      doc
        .font('Helvetica-Bold')
        .fontSize(12.5)
        .text(`Valor a Creditar: ${returnReq.totalValue.toFixed(2)} €`, 344, rowY + 30);

      // Bloco de Assinaturas
      const signY = Math.max(rowY + 95, 675);
      if (signY < 745) {
        doc.fillColor('#475569').font('Helvetica').fontSize(8.5);
        doc.moveTo(55, signY).lineTo(245, signY).strokeColor('#94a3b8').lineWidth(0.8).stroke();
        doc.text('Assinatura do Diretor Técnico / Carimbo', 55, signY + 6, { width: 190, align: 'center' });

        doc.moveTo(345, signY).lineTo(535, signY).strokeColor('#94a3b8').lineWidth(0.8).stroke();
        doc.text('Receção pelo Armazenista / Motorista', 345, signY + 6, { width: 190, align: 'center' });
      }

      // Nota Legal AT no rodapé da página
      doc
        .fillColor('#64748b')
        .font('Helvetica')
        .fontSize(7.5)
        .text(
          'Documento de controlo interno e pedido de devolução (RMA) emitido via PharmaWaste. Não substitui documento de transporte nem nota de devolução comunicada à Autoridade Tributária (AT).',
          45,
          772,
          { width: 505, align: 'center' },
        );

      doc.end();
    });

    return {
      buffer,
      filename: `${guideRef}.pdf`,
    };
  }
}
