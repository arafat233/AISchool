import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";

type Browser = any;

/**
 * Shared Puppeteer browser pool for exam-service PDF generation.
 * See report-service/src/browser/browser-pool.service.ts for full rationale.
 */
@Injectable()
export class BrowserPoolService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BrowserPoolService.name);
  private browser: Browser | null = null;
  private launchPromise: Promise<Browser> | null = null;

  async onModuleInit() {
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      try {
        await this.getBrowser();
        this.logger.log("Puppeteer browser pool initialised");
      } catch (err) {
        this.logger.warn(`Browser pre-warm skipped: ${(err as Error).message}`);
      }
    }
  }

  async onModuleDestroy() {
    if (this.browser) {
      try {
        await this.browser.close();
        this.logger.log("Puppeteer browser closed");
      } catch { /* ignore */ }
      this.browser = null;
    }
  }

  async getBrowser(): Promise<Browser> {
    if (this.browser) {
      try {
        await this.browser.version();
        return this.browser;
      } catch {
        this.logger.warn("Browser crashed — relaunching");
        this.browser = null;
        this.launchPromise = null;
      }
    }

    if (!this.launchPromise) {
      this.launchPromise = this.launch().then((b) => {
        this.browser = b;
        this.launchPromise = null;
        return b;
      }).catch((err) => {
        this.launchPromise = null;
        throw err;
      });
    }

    return this.launchPromise;
  }

  private async launch(): Promise<Browser> {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const puppeteer = require("puppeteer-core");
    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH ?? "/usr/bin/chromium-browser";
    const browser = await puppeteer.launch({
      executablePath,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--no-zygote",
      ],
      headless: true,
    });

    browser.on("disconnected", () => {
      this.logger.warn("Browser disconnected — will relaunch on next request");
      this.browser = null;
    });

    return browser;
  }

  async renderPdf(html: string, options?: { margin?: { top?: string; bottom?: string; left?: string; right?: string } }): Promise<Buffer> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();
    try {
      await page.setContent(html, { waitUntil: "networkidle0" });
      const pdf = await page.pdf({
        format: "A4",
        printBackground: true,
        ...(options?.margin ? { margin: options.margin } : {}),
      });
      return Buffer.from(pdf);
    } finally {
      await page.close().catch(() => { /* ignore */ });
    }
  }
}
