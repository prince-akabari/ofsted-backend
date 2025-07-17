import morgan from "morgan";
import chalk from "chalk";
import express from "express";

morgan.token("timestamp", () => chalk.gray(new Date().toISOString()));
morgan.token("method", (req) => chalk.cyan(req.method));
morgan.token("url", (req) =>
  chalk.yellow((req as express.Request).originalUrl)
);
morgan.token("status", (_req, res) => {
  const status = res.statusCode;
  if (status >= 500) return chalk.red(status.toString());
  if (status >= 400) return chalk.magenta(status.toString());
  if (status >= 300) return chalk.blue(status.toString());
  return chalk.green(status.toString());
});
morgan.token("ip", (req) => chalk.gray((req as express.Request).ip));

export const loggerMiddleware = morgan(
  ":timestamp :method :url :status - :response-time ms - :ip",
  {
    skip: (req) => req.url === "/favicon.ico",
  }
);
