import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";

type Browser = any;

/**
 * Manages a single long-lived Puppeteer browser instance shared across all PDF
 * generation calls in this service.  Launching a browser takes ~2-3 s and
 * consumes ~150 MB — spawning one per request is the main bottleneck for
 * report-service under load.
 *
 * Strategy:
 *  - Lazy-launch on first request (not at startup, so CI without Chromium stays green)
 *  - Re-launch automatically if the browser crashes
 *  - Destroy cleanly on module shutdown
 *  - Each caller gets its own Page (tab) and closes it when done
 */
@Injectable()
export class BrowserPoolService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BrowserPoolService.name);
  private browser: Browser | null = null;
  private launchPromise: Promise<Browser> | null = null;

  async onModuleInit() {
    // Pre-warm only when Chromium path is configured (skips in CI/dev without Chrome)
    if (process.env.CHROMIUM_PATH) {
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
      } catch { /* ignore close errors on shutdown */ }
      this.browser = null;
    }
  }

  /**
   * Returns the shared browser, launching it if necessary.
   * Concurrent callers during launch share the same promise (no duplicate launches).
   */
  async getBrowser(): Promise<Browser> {
    // Fast path: browser is alive
    if (this.browser) {
      try {
        // Check the browser process is still running
        await this.browser.version();
        return this.browser;
      } catch {
        this.logger.warn("Browser crashed — relaunching");
        this.browser = null;
        this.launchPromise = null;
      }
    }

    // Coalesce concurrent launch requests into one promise
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
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const puppeteer = require("puppeteer-core");
    const executablePath = process.env.CHROMIUM_PATH ?? "/usr/bin/chromium-browser";
    const browser = await puppeteer.launch({
      executablePath,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",   // Prevents /dev/shm OOM in containers
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

  /**
   * Renders the given HTML string to a PDF Buffer.
   * Opens a new page (tab) in the shared browser, renders, then closes the page.
   */
  async renderPdf(html: string): Promise<Buffer> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();
    try {
      await page.setContent(html, { waitUntil: "networkidle0" });
      const pdf = await page.pdf({ format: "A4", printBackground: true });
      return Buffer.from(pdf);
    } finally {
      await page.close().catch(() => { /* ignore close errors */ });
    }
  }
}
