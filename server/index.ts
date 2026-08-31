import { app } from './app.ts';
import { logger } from './logger.ts';
import { startTelemetry } from './telemetry.ts';

startTelemetry();

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  logger.info({ port: PORT }, `Server running on http://localhost:${PORT}`);
});