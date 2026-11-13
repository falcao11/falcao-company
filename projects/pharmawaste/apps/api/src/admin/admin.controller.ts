import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '@thallesp/nestjs-better-auth';
import { AdminService } from './admin.service';
import {
  ApproveAccountRequestDto,
  CreatePharmacyDto,
  CreatePharmacyUserDto,
  CreatePlanDto,
  UpdateAccountRequestStatusDto,
  UpdatePharmacyDto,
  UpdatePharmacyUserDto,
  UpdatePlanDto,
  UpdateSubscriptionDto,
  UpsertSubscriptionDto,
} from './dto/admin.dto';

@ApiTags('Falcão Company Admin')
@ApiBearerAuth()
@Roles(['admin'])
@Controller('api/v1/admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Métricas SaaS, MRR, crescimento e pedidos pendentes' })
  getDashboard() {
    return this.adminService.getDashboard();
  }

  // --- Account Requests ---
  @Get('account-requests')
  @ApiOperation({ summary: 'Lista pedidos de conta submetidos pelas farmácias' })
  listAccountRequests(@Query('status') status?: string) {
    return this.adminService.listAccountRequests(status);
  }

  @Patch('account-requests/:id/status')
  @ApiOperation({ summary: 'Atualiza o estado de um pedido de conta' })
  updateAccountRequestStatus(
    @Param('id') id: string,
    @Body() dto: UpdateAccountRequestStatusDto,
  ) {
    return this.adminService.updateAccountRequestStatus(id, dto);
  }

  @Post('account-requests/:id/approve')
  @ApiOperation({
    summary: 'Aprova pedido de conta e cria a farmácia + utilizador owner',
  })
  approveAccountRequest(
    @Param('id') id: string,
    @Body() dto: ApproveAccountRequestDto,
  ) {
    return this.adminService.approveAccountRequest(id, dto);
  }

  // --- Pharmacies ---
  @Get('pharmacies')
  @ApiOperation({ summary: 'Lista todas as farmácias com membros e subscrição' })
  listPharmacies() {
    return this.adminService.listPharmacies();
  }

  @Get('pharmacies/:id')
  @ApiOperation({ summary: 'Detalhes de uma farmácia' })
  getPharmacy(@Param('id') id: string) {
    return this.adminService.getPharmacy(id);
  }

  @Post('pharmacies')
  @ApiOperation({ summary: 'Cria uma nova farmácia (e opcionalmente o owner)' })
  createPharmacy(@Body() dto: CreatePharmacyDto) {
    return this.adminService.createPharmacy(dto);
  }

  @Patch('pharmacies/:id')
  @ApiOperation({ summary: 'Edita dados ou estado demo de uma farmácia' })
  updatePharmacy(@Param('id') id: string, @Body() dto: UpdatePharmacyDto) {
    return this.adminService.updatePharmacy(id, dto);
  }

  @Delete('pharmacies/:id')
  @ApiOperation({ summary: 'Remove uma farmácia e os seus dados' })
  deletePharmacy(@Param('id') id: string) {
    return this.adminService.deletePharmacy(id);
  }

  // --- Pharmacy Users ---
  @Post('pharmacies/:id/users')
  @ApiOperation({ summary: 'Cria um novo utilizador associado a uma farmácia' })
  createPharmacyUser(
    @Param('id') pharmacyId: string,
    @Body() dto: CreatePharmacyUserDto,
  ) {
    return this.adminService.createPharmacyUser(pharmacyId, dto);
  }

  @Patch('pharmacies/:id/users/:userId')
  @ApiOperation({ summary: 'Edita utilizador ou cargo numa farmácia' })
  updatePharmacyUser(
    @Param('id') pharmacyId: string,
    @Param('userId') userId: string,
    @Body() dto: UpdatePharmacyUserDto,
  ) {
    return this.adminService.updatePharmacyUser(pharmacyId, userId, dto);
  }

  @Delete('pharmacies/:id/users/:userId')
  @ApiOperation({ summary: 'Remove um utilizador de uma farmácia' })
  removePharmacyUser(
    @Param('id') pharmacyId: string,
    @Param('userId') userId: string,
  ) {
    return this.adminService.removePharmacyUser(pharmacyId, userId);
  }

  // --- Subscription Plans ---
  @Get('plans')
  @ApiOperation({ summary: 'Lista planos de subscrição' })
  listPlans() {
    return this.adminService.listPlans();
  }

  @Post('plans')
  @ApiOperation({ summary: 'Cria um novo plano de subscrição' })
  createPlan(@Body() dto: CreatePlanDto) {
    return this.adminService.createPlan(dto);
  }

  @Patch('plans/:id')
  @ApiOperation({ summary: 'Edita um plano de subscrição' })
  updatePlan(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
    return this.adminService.updatePlan(id, dto);
  }

  @Delete('plans/:id')
  @ApiOperation({ summary: 'Remove um plano de subscrição sem subscrições ativas' })
  deletePlan(@Param('id') id: string) {
    return this.adminService.deletePlan(id);
  }

  // --- Pharmacy Subscriptions ---
  @Get('subscriptions')
  @ApiOperation({ summary: 'Lista todas as subscrições de farmácias' })
  listSubscriptions() {
    return this.adminService.listSubscriptions();
  }

  @Post('subscriptions')
  @ApiOperation({ summary: 'Atribui ou substitui a subscrição de uma farmácia' })
  upsertSubscription(@Body() dto: UpsertSubscriptionDto) {
    return this.adminService.upsertSubscription(dto);
  }

  @Patch('subscriptions/:id')
  @ApiOperation({ summary: 'Atualiza estado, plano ou valor de uma subscrição' })
  updateSubscription(
    @Param('id') id: string,
    @Body() dto: UpdateSubscriptionDto,
  ) {
    return this.adminService.updateSubscription(id, dto);
  }

  @Delete('subscriptions/:id')
  @ApiOperation({ summary: 'Remove uma subscrição de farmácia' })
  deleteSubscription(@Param('id') id: string) {
    return this.adminService.deleteSubscription(id);
  }
}
