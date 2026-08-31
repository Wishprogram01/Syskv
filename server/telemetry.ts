import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { logger } from './logger.ts';

const COLLECTOR_URL = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318';

const resource = resourceFromAttributes({
  [ATTR_SERVICE_NAME]: 'syskv-api',
  [ATTR_SERVICE_VERSION]: '1.0.0',
});

const traceExporter = new OTLPTraceExporter({
  url: `${COLLECTOR_URL}/v1/traces`,
});

const sdk = new NodeSDK({
  resource,
  traceExporter,
  instrumentations: [
    new HttpInstrumentation(),
  ],
});

export function startTelemetry() {
  try {
    sdk.start();
    logger.info({ endpoint: COLLECTOR_URL }, 'OpenTelemetry tracing started');
  } catch (err) {
    logger.error({ err }, 'Failed to start OpenTelemetry');
  }

  const shutdown = async () => {
    try {
      await sdk.shutdown();
      logger.info('OpenTelemetry shut down');
    } catch (err) {
      logger.error({ err }, 'Error shutting down OpenTelemetry');
    }
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
