const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  gray: "\x1b[90m",
};

export const logger = {
  info: (msg: string) => {
    console.log(`${colors.cyan}[INFO]${colors.reset}       ${msg}`);
  },
  success: (msg: string) => {
    console.log(`${colors.green}[SUCCESS]${colors.reset}    ${msg}`);
  },
  warn: (msg: string) => {
    console.log(`${colors.yellow}[WARN]${colors.reset}       ${msg}`);
  },
  error: (msg: string) => {
    console.error(`${colors.red}[ERROR]${colors.reset}      ${msg}`);
  },
  log: (msg: string) => {
    console.log(msg);
  },
};
