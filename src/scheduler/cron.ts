import cron from "node-cron";

interface LoggerLike {
  info(payload: unknown, message?: string): void;
  error(payload: unknown, message?: string): void;
}

export function startScheduler(options: {
  cronSchedule: string;
  timezone: string;
  job: () => Promise<void>;
  logger: LoggerLike;
}): void {
  validateSchedulerConfig(options.cronSchedule, options.timezone);

  cron.schedule(
    options.cronSchedule,
    async () => {
      try {
        await options.job();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown job failure";
        options.logger.error({ error: message }, "Scheduled job failed");
      }
    },
    {
      timezone: options.timezone
    }
  );

  options.logger.info(
    {
      cronSchedule: options.cronSchedule,
      timezone: options.timezone
    },
    "Scheduler started"
  );
}

export function validateSchedulerConfig(cronSchedule: string, timezone: string): void {
  if (!cron.validate(cronSchedule)) {
    throw new Error(`Invalid CRON_SCHEDULE: ${cronSchedule}`);
  }

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date());
  } catch {
    throw new Error(`Invalid TIMEZONE: ${timezone}`);
  }
}
