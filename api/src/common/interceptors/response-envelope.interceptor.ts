import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { map, Observable } from 'rxjs';

export const RESPONSE_MESSAGE_KEY = 'response_message';

export const ResponseMessage = (message: string) =>
  SetMetadata(RESPONSE_MESSAGE_KEY, message);

export interface ApiEnvelope<T> {
  success: true;
  data: T;
  message: string | null;
  error: null;
}

@Injectable()
export class ResponseEnvelopeInterceptor<T> implements NestInterceptor<
  T,
  ApiEnvelope<T>
> {
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiEnvelope<T>> {
    const message =
      this.reflector.get<string>(RESPONSE_MESSAGE_KEY, context.getHandler()) ??
      null;

    return next.handle().pipe(
      map((data) => ({
        success: true as const,
        data: (data ?? null) as T, // void/empty handlers become data: null
        message,
        error: null,
      })),
    );
  }
}
