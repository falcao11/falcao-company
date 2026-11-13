import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Query,
  Param,
  Res,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Body,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { BatchRiskStatus } from '@prisma/client';
import {
  Session,
  UserSession,
  AllowAnonymous,
  RequireActiveOrg,
  OrgRoles,
} from '@thallesp/nestjs-better-auth';

@ApiTags('Inventory & Waste Prevention')
@ApiBearerAuth()
@Controller('api/v1/inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post('account-requests')
  @AllowAnonymous()
  @ApiOperation({
    summary: 'Submete um pedido de criação de conta / demonstração de farmácia (Público)',
  })
  async requestAccount(
    @Body()
    body: {
      pharmacyName: string;
      nif?: string;
      licenseNumber?: string;
      contactName: string;
      email: string;
      phone?: string;
      notes?: string;
    },
  ) {
    return await this.inventoryService.createAccountRequest(body);
  }

  @Get('context')
  @RequireActiveOrg()
  @ApiOperation({
    summary: 'Retorna o contexto do utilizador e da farmácia ativa (incluindo estado da conta demo)',
  })
  async getContext(@Session() session: UserSession) {
    const organizationId = session.session.activeOrganizationId!;
    const organization = await this.inventoryService.getOrganizationContext(organizationId);
    return {
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
      },
      organization,
    };
  }

  @Post('upload')
  @RequireActiveOrg()
  @OrgRoles(['admin', 'member', 'owner'])
  @ApiOperation({
    summary: 'Upload de ficheiro de inventário farmacêutico (.xlsx ou .csv)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary', description: 'Ficheiro Excel ou CSV' },
      },
      required: ['file'],
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadInventory(
    @UploadedFile() file: Express.Multer.File,
    @Session() session: UserSession,
  ) {
    if (!file) {
      throw new BadRequestException('Nenhum ficheiro enviado.');
    }

    const organizationId = session.session.activeOrganizationId!;
    await this.inventoryService.assertDemoNotExpired(organizationId);

    return await this.inventoryService.processInventoryFile(
      file.buffer,
      file.originalname,
      file.size,
      organizationId,
      session.user.id,
    );
  }

  @Get('summary')
  @RequireActiveOrg()
  @OrgRoles(['admin', 'member', 'owner'])
  @ApiOperation({
    summary: 'Resumo executivo do desperdício financeiro da farmácia ativa',
  })
  async getSummary(@Session() session: UserSession) {
    const organizationId = session.session.activeOrganizationId!;
    await this.inventoryService.assertDemoNotExpired(organizationId);
    return await this.inventoryService.getDashboardSummary(organizationId);
  }

  @Get('batches')
  @RequireActiveOrg()
  @OrgRoles(['admin', 'member', 'owner'])
  @ApiOperation({
    summary: 'Lista os lotes de medicamentos ordenados por expiração mais urgente',
  })
  @ApiQuery({ name: 'status', enum: BatchRiskStatus, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  @ApiQuery({ name: 'page', type: Number, required: false })
  async listBatches(
    @Session() session: UserSession,
    @Query('status') status?: BatchRiskStatus,
    @Query('limit') limit = 50,
    @Query('page') page = 1,
  ) {
    const organizationId = session.session.activeOrganizationId!;
    await this.inventoryService.assertDemoNotExpired(organizationId);
    return await this.inventoryService.listBatches(
      organizationId,
      status,
      Number(limit) || 50,
      Number(page) || 1,
    );
  }

  @Delete('batches')
  @RequireActiveOrg()
  @OrgRoles(['admin', 'owner'])
  @ApiOperation({
    summary: 'Limpa todos os lotes de inventário da farmácia ativa',
  })
  async clearBatches(@Session() session: UserSession) {
    const organizationId = session.session.activeOrganizationId!;
    await this.inventoryService.assertDemoNotExpired(organizationId);
    return await this.inventoryService.clearInventory(organizationId);
  }

  @Post('returns')
  @RequireActiveOrg()
  @OrgRoles(['admin', 'member', 'owner'])
  @ApiOperation({
    summary: 'Gera uma Guia de Devolução para os lotes selecionados e marca-os como devolvidos',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        batchIds: { type: 'array', items: { type: 'string' } },
      },
      required: ['batchIds'],
    },
  })
  async createReturn(
    @Body('batchIds') batchIds: string[],
    @Session() session: UserSession,
  ) {
    const organizationId = session.session.activeOrganizationId!;
    await this.inventoryService.assertDemoNotExpired(organizationId);
    return await this.inventoryService.createReturnRequest(organizationId, batchIds);
  }

  @Get('returns')
  @RequireActiveOrg()
  @OrgRoles(['admin', 'member', 'owner'])
  @ApiOperation({
    summary: 'Lista todas as guias de devolução geradas pela farmácia',
  })
  async listReturns(@Session() session: UserSession) {
    const organizationId = session.session.activeOrganizationId!;
    await this.inventoryService.assertDemoNotExpired(organizationId);
    return await this.inventoryService.listReturnRequests(organizationId);
  }

  @Get('returns/:id/pdf')
  @RequireActiveOrg()
  @OrgRoles(['admin', 'member', 'owner'])
  @ApiOperation({
    summary: 'Faz o download da Guia de Devolução oficial em formato PDF',
  })
  async downloadReturnPdf(
    @Param('id') id: string,
    @Res() res: Response,
    @Session() session: UserSession,
  ) {
    const organizationId = session.session.activeOrganizationId!;
    await this.inventoryService.assertDemoNotExpired(organizationId);
    const { buffer, filename } = await this.inventoryService.generateReturnPdf(organizationId, id);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Patch('settings')
  @RequireActiveOrg()
  @OrgRoles(['admin', 'owner'])
  @ApiOperation({
    summary: 'Atualiza definições e cores da farmácia (Acesso restrito ao Admin da Farmácia)',
  })
  async updatePharmacySettings(
    @Session() session: UserSession,
    @Body() body: { name?: string; logo?: string; primaryColor?: string; nif?: string; licenseNumber?: string },
  ) {
    const organizationId = session.session.activeOrganizationId!;
    await this.inventoryService.assertDemoNotExpired(organizationId);
    return await this.inventoryService.updateOrganizationSettings(organizationId, body);
  }
}
