import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreatePharmacyDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  nif?: string;

  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @IsOptional()
  @IsBoolean()
  isDemo?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  demoDays?: number;

  @IsOptional()
  @IsString()
  planId?: string;

  // Optional initial owner user
  @IsOptional()
  @IsString()
  ownerName?: string;

  @IsOptional()
  @IsEmail()
  ownerEmail?: string;

  @IsOptional()
  @IsString()
  ownerUsername?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  ownerPassword?: string;
}

export class UpdatePharmacyDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  nif?: string;

  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @IsOptional()
  @IsBoolean()
  isDemo?: boolean;

  @IsOptional()
  @IsString()
  demoExpiresAt?: string | null;
}

export class CreatePharmacyUserDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  username?: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsIn(['owner', 'admin', 'member'])
  role!: 'owner' | 'admin' | 'member';
}

export class UpdatePharmacyUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  username?: string;

  @IsOptional()
  @IsIn(['owner', 'admin', 'member'])
  role?: 'owner' | 'admin' | 'member';

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;
}

export class CreatePlanDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(0)
  monthlyPrice!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxUsers?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxBatches?: number | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdatePlanDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlyPrice?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxUsers?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxBatches?: number | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpsertSubscriptionDto {
  @IsString()
  organizationId!: string;

  @IsString()
  planId!: string;

  @IsIn(['ACTIVE', 'TRIAL', 'PAST_DUE', 'CANCELED'])
  status!: 'ACTIVE' | 'TRIAL' | 'PAST_DUE' | 'CANCELED';

  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlyPrice?: number;

  @IsOptional()
  @IsString()
  currentPeriodEnd?: string | null;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateSubscriptionDto {
  @IsOptional()
  @IsString()
  planId?: string;

  @IsOptional()
  @IsIn(['ACTIVE', 'TRIAL', 'PAST_DUE', 'CANCELED'])
  status?: 'ACTIVE' | 'TRIAL' | 'PAST_DUE' | 'CANCELED';

  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlyPrice?: number;

  @IsOptional()
  @IsString()
  currentPeriodEnd?: string | null;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ApproveAccountRequestDto {
  @IsOptional()
  @IsString()
  pharmacyName?: string;

  @IsOptional()
  @IsString()
  nif?: string;

  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @IsString()
  @MinLength(2)
  ownerName!: string;

  @IsEmail()
  ownerEmail!: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  ownerUsername?: string;

  @IsString()
  @MinLength(6)
  ownerPassword!: string;

  @IsOptional()
  @IsBoolean()
  isDemo?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  demoDays?: number;

  @IsOptional()
  @IsString()
  planId?: string;
}

export class UpdateAccountRequestStatusDto {
  @IsIn(['PENDING', 'APPROVED', 'REJECTED'])
  status!: 'PENDING' | 'APPROVED' | 'REJECTED';
}
