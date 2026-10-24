import { Controller, Get, Header, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { AdminGuard } from "../../../identity/presentation/http/guards/admin.guard";
import { AuthGuard } from "../../../identity/presentation/http/guards/auth.guard";
import { ExportResponsesUseCase } from "../../application/use-cases/export-responses.use-case";
import { GetValidationReportUseCase } from "../../application/use-cases/get-validation-report.use-case";
import { ListResponsesUseCase } from "../../application/use-cases/list-responses.use-case";

@ApiTags("Admin — Inquérito")
@ApiBearerAuth()
@UseGuards(AuthGuard, AdminGuard)
@Controller("admin/surveys")
export class AdminSurveyController {
  constructor(
    private readonly list: ListResponsesUseCase,
    private readonly report: GetValidationReportUseCase,
    private readonly exportCsv: ExportResponsesUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: "Listar respostas (contactos visíveis só à equipa)" })
  responses() {
    return this.list.execute();
  }

  @Get("report")
  @ApiOperation({ summary: "Índice de validação, sinais e distribuições" })
  validationReport() {
    return this.report.execute();
  }

  @Get("export")
  @Header("Content-Type", "text/csv; charset=utf-8")
  @Header("Content-Disposition", 'attachment; filename="passa-inquerito.csv"')
  @ApiOperation({ summary: "Exportar respostas em CSV" })
  async csv() {
    const { csv } = await this.exportCsv.execute();
    return csv;
  }
}
