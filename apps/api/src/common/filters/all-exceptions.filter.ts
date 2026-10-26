import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Terjadi kesalahan internal server';
    let errors: any = null;
    let code = 'INTERNAL_ERROR';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const res = exceptionResponse as any;
        message = res.message || exception.message;
        if (Array.isArray(message)) {
          message = message.join(', ');
        }
        errors = res.errors || null;
        code = res.code || exception.name;
      } else {
        message = exceptionResponse as string;
        code = exception.name;
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      // Handle Prisma errors
      status = HttpStatus.BAD_REQUEST;
      switch (exception.code) {
        case 'P2002':
          message = 'Data sudah ada (duplikat)';
          code = 'DUPLICATE_ENTRY';
          break;
        case 'P2025':
          message = 'Data tidak ditemukan';
          code = 'NOT_FOUND';
          break;
        case 'P2003':
          message = 'Referensi data tidak valid';
          code = 'FOREIGN_KEY_CONSTRAINT';
          break;
        default:
          message = 'Kesalahan database';
          code = 'DATABASE_ERROR';
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      code = exception.name;
    }

    // Log error
    this.logger.error(
      `${request.method} ${request.url} - ${status} - ${message}`,
      exception instanceof Error ? exception.stack : '',
    );

    // Send response
    response.status(status).json({
      success: false,
      error: {
        code,
        message,
        details: errors,
      },
    });
  }
}