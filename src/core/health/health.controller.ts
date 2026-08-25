import { Controller, Get } from '@nestjs/common';
import { HealthCheckService, HealthCheck, PrismaHealthIndicator } from '@nestjs/terminus';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../database/prisma.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private prismaHealth: PrismaHealthIndicator,
    private prisma: PrismaService,
  ) { }

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Health check (internal / load-balancer use)' })
  check() {
    return this.health.check([
      // () => this.prismaHealth.pingCheck('database', this.prisma),
      () => this.prismaHealth.pingCheck('database', this.prisma as any)
    ]);
  }
}
