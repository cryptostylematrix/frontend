import axios, {
  type AxiosAdapter,
  type AxiosError,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";
import { TonClient } from "@ton/ton";
import { appConfig } from "../config";

const MAX_REQUESTS_PER_WINDOW = 10;
const RATE_WINDOW_MS = 1_000;
const RETRY_DELAYS_MS = [2_000, 4_000, 8_000, 16_000, 32_000] as const;

type QueuedRequest<T> = {
  execute: () => Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
};

class TonRequestLimiter {
  private readonly queue: QueuedRequest<unknown>[] = [];
  private readonly requestStarts: number[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;

  schedule<T>(execute: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        execute,
        resolve: resolve as (value: unknown) => void,
        reject,
      });
      this.drain();
    });
  }

  private drain() {
    if (this.timer) return;

    const now = Date.now();
    while (
      this.requestStarts.length > 0 &&
      now - this.requestStarts[0] >= RATE_WINDOW_MS
    ) {
      this.requestStarts.shift();
    }

    while (
      this.queue.length > 0 &&
      this.requestStarts.length < MAX_REQUESTS_PER_WINDOW
    ) {
      const request = this.queue.shift()!;
      this.requestStarts.push(Date.now());
      void request.execute().then(request.resolve, request.reject);
    }

    if (this.queue.length === 0) return;

    const waitMs = Math.max(
      1,
      RATE_WINDOW_MS - (Date.now() - this.requestStarts[0]),
    );
    this.timer = setTimeout(() => {
      this.timer = null;
      this.drain();
    }, waitMs);
  }
}

const limiter = new TonRequestLimiter();
const defaultAdapter = axios.getAdapter(axios.defaults.adapter);

const delay = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

function isRetryableNetworkError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return error instanceof TypeError;

  const axiosError = error as AxiosError;
  const status = axiosError.response?.status;
  if (status === undefined) return true;

  return status === 408 || status === 425 || status === 429 || status >= 500;
}

async function executeWithRetries<T>(request: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await limiter.schedule(request);
    } catch (error) {
      const retryDelay = RETRY_DELAYS_MS[attempt];
      if (retryDelay === undefined || !isRetryableNetworkError(error)) {
        throw error;
      }
      await delay(retryDelay);
    }
  }
}

const rateLimitedAdapter: AxiosAdapter = (
  config: InternalAxiosRequestConfig,
): Promise<AxiosResponse> => executeWithRetries(() => defaultAdapter(config));

let sharedClient: TonClient | null = null;

export function getTonClient(): TonClient {
  if (!sharedClient) {
    sharedClient = new TonClient({
      endpoint: appConfig.ton.endpoint,
      apiKey: appConfig.ton.apiKey || undefined,
      httpAdapter: rateLimitedAdapter,
    });
  }

  return sharedClient;
}
