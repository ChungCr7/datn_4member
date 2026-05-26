import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

type HttpResponse = {
  status: (statusCode: number) => {
    send: (body: Record<string, unknown>) => void;
  };
};

type HttpRequest = {
  url?: string;
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    if (host.getType<'http' | 'graphql'>() === 'graphql') {
      throw exception;
    }

    const ctx = host.switchToHttp();
    const response = ctx.getResponse<HttpResponse>();
    const request = ctx.getRequest<HttpRequest>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    const message =
      status === Number(HttpStatus.TOO_MANY_REQUESTS)
        ? 'Ban thao tac qua nhanh. Vui long thu lai sau.'
        : typeof exceptionResponse === 'object' &&
            exceptionResponse !== null &&
            'message' in exceptionResponse
          ? (exceptionResponse as { message?: string | string[] }).message
          : exception instanceof Error
            ? exception.message
            : 'Internal server error';

    const retryAfter =
      typeof exceptionResponse === 'object' &&
      exceptionResponse !== null &&
      'retryAfter' in exceptionResponse
        ? Number((exceptionResponse as { retryAfter?: number }).retryAfter)
        : undefined;

    response.status(status).send({
      success: false,
      statusCode: status,
      message,
      ...(Number.isFinite(retryAfter) && retryAfter ? { retryAfter } : {}),
      path: request.url || '',
      timestamp: new Date().toISOString(),
    });
  }
}
