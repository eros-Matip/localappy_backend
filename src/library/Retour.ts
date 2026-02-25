import chalk from "chalk";

type LogMeta = Record<string, any>;

const formatDate = () => new Date().toISOString(); // ISO mieux en prod

const safeStringify = (data: any) => {
  try {
    return JSON.stringify(data);
  } catch {
    return "[Unserializable object]";
  }
};

export default class Retour {
  public static log(message: any, meta?: LogMeta) {
    this.info(message, meta);
  }

  public static info(message: any, meta?: LogMeta) {
    console.log(
      chalk.blueBright(`[INFO RESPONSE] ${formatDate()}`),
      typeof message === "string"
        ? chalk.greenBright(message)
        : safeStringify(message),
      meta ? chalk.gray(safeStringify(meta)) : "",
    );
  }

  public static warn(message: any, meta?: LogMeta) {
    console.log(
      chalk.yellow(`[WARN RESPONSE] ${formatDate()}`),
      typeof message === "string"
        ? chalk.yellowBright(message)
        : safeStringify(message),
      meta ? chalk.gray(safeStringify(meta)) : "",
    );
  }

  public static error(message: any, meta?: LogMeta) {
    console.error(
      chalk.red(`[ERROR RESPONSE] ${formatDate()}`),
      typeof message === "string"
        ? chalk.redBright(message)
        : safeStringify(message),
      meta ? chalk.gray(safeStringify(meta)) : "",
    );
  }
}
