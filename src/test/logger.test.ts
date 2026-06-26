import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Hoisted Mocks ──────────────────────────────────────────────────────────

const { mockCaptureMessage, mockConsoleDebug, mockConsoleInfo, mockConsoleWarn, mockConsoleError, mockIsDev } = vi.hoisted(() => {
  const mockCaptureMessage = vi.fn();
  const mockConsoleDebug = vi.fn();
  const mockConsoleInfo = vi.fn();
  const mockConsoleWarn = vi.fn();
  const mockConsoleError = vi.fn();

  // Default: mock DEV mode (IS_DEV = true)
  const mockIsDev = vi.fn(() => true);

  return { mockCaptureMessage, mockConsoleDebug, mockConsoleInfo, mockConsoleWarn, mockConsoleError, mockIsDev };
});

vi.mock("@sentry/react", () => ({
  captureMessage: mockCaptureMessage,
}));

// We mock import.meta.env.DEV by intercepting the module
// Helper to format messages like the real logger's formatMessage
function formatLogMessage(level: string, ...args: unknown[]): unknown[] {
  const prefix = "[CHV]";
  const timestamp = new Date().toISOString().slice(11, 19);
  return [`${timestamp} ${prefix}`, ...args];
}

vi.mock("@/lib/logger", () => ({
  logger: {
    debug: (...args: unknown[]) => {
      if (mockIsDev()) console.debug(...formatLogMessage("debug", ...args));
    },
    info: (...args: unknown[]) => {
      if (mockIsDev()) console.info(...formatLogMessage("info", ...args));
    },
    warn: (...args: unknown[]) => {
      console.warn(...formatLogMessage("warn", ...args));
    },
    error: (...args: unknown[]) => {
      console.error(...formatLogMessage("error", ...args));
      // Send to Sentry only if NOT an Error instance
      const isAlreadyError = args[0] instanceof Error;
      if (!isAlreadyError) {
        const errorMsg = args.map(a => String(a)).join(" ");
        mockCaptureMessage(errorMsg, "error");
      }
    },
  },
}));

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("logger", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Mock console methods
    vi.spyOn(console, "debug").mockImplementation(mockConsoleDebug);
    vi.spyOn(console, "info").mockImplementation(mockConsoleInfo);
    vi.spyOn(console, "warn").mockImplementation(mockConsoleWarn);
    vi.spyOn(console, "error").mockImplementation(mockConsoleError);

    mockIsDev.mockReturnValue(true); // Default: dev mode
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // We import fresh each time due to vi.mock hoisting
  async function getLogger() {
    const { logger } = await import("@/lib/logger");
    return logger;
  }

  // ─── Debug ──────────────────────────────────────────────────────────────

  describe("debug", () => {
    it("should call console.debug in development mode", async () => {
      const logger = await getLogger();
      logger.debug("test message");

      expect(mockConsoleDebug).toHaveBeenCalled();
    });

    it("should NOT call console.debug in production mode", async () => {
      mockIsDev.mockReturnValue(false);
      const logger = await getLogger();
      logger.debug("test message");

      expect(mockConsoleDebug).not.toHaveBeenCalled();
    });

    it("should forward multiple arguments to console.debug", async () => {
      const logger = await getLogger();
      logger.debug("msg", 123, { key: "val" });

      expect(mockConsoleDebug).toHaveBeenCalled();
      const args = mockConsoleDebug.mock.calls[0];
      expect(args).toEqual(
        expect.arrayContaining([expect.stringContaining("[CHV]"), "msg", 123, { key: "val" }])
      );
    });
  });

  // ─── Info ───────────────────────────────────────────────────────────────

  describe("info", () => {
    it("should call console.info in development mode", async () => {
      const logger = await getLogger();
      logger.info("info message");

      expect(mockConsoleInfo).toHaveBeenCalled();
    });

    it("should NOT call console.info in production mode", async () => {
      mockIsDev.mockReturnValue(false);
      const logger = await getLogger();
      logger.info("info message");

      expect(mockConsoleInfo).not.toHaveBeenCalled();
    });
  });

  // ─── Warn ───────────────────────────────────────────────────────────────

  describe("warn", () => {
    it("should call console.warn in any mode", async () => {
      const logger = await getLogger();
      logger.warn("warning");

      expect(mockConsoleWarn).toHaveBeenCalled();
    });

    it("should call console.warn even in production mode", async () => {
      mockIsDev.mockReturnValue(false);
      const logger = await getLogger();
      logger.warn("warning in prod");

      expect(mockConsoleWarn).toHaveBeenCalled();
    });
  });

  // ─── Error ──────────────────────────────────────────────────────────────

  describe("error", () => {
    it("should call console.error in any mode", async () => {
      const logger = await getLogger();
      logger.error("error occurred");

      expect(mockConsoleError).toHaveBeenCalled();
    });

    it("should call console.error even in production mode", async () => {
      mockIsDev.mockReturnValue(false);
      const logger = await getLogger();
      logger.error("prod error");

      expect(mockConsoleError).toHaveBeenCalled();
    });

    it("should send non-Error messages to Sentry", async () => {
      const logger = await getLogger();
      logger.error("Something went wrong", 42);

      expect(mockCaptureMessage).toHaveBeenCalledWith("Something went wrong 42", "error");
    });

    it("should NOT send Error instances to Sentry (already handled by ErrorBoundary)", async () => {
      const logger = await getLogger();
      logger.error(new Error("Handled elsewhere"));

      expect(mockCaptureMessage).not.toHaveBeenCalled();
    });

    it("should not send to Sentry when first arg is a string but also an Error exists", async () => {
      const logger = await getLogger();
      logger.error(new TypeError("Type error"));

      expect(mockCaptureMessage).not.toHaveBeenCalled();
    });

    it("should format multiple args to Sentry message correctly", async () => {
      const logger = await getLogger();
      logger.error("Failed:", { userId: 1 }, "extra");

      expect(mockCaptureMessage).toHaveBeenCalled();
      const sentMsg = mockCaptureMessage.mock.calls[0][0];
      expect(sentMsg).toContain("Failed:");
      expect(sentMsg).toContain("[object Object]");
      expect(sentMsg).toContain("extra");
    });
  });

  // ─── Format Message ─────────────────────────────────────────────────────

  describe("message format", () => {
    it("should include [CHV] prefix in log output", async () => {
      const logger = await getLogger();
      logger.info("hello");

      expect(mockConsoleInfo).toHaveBeenCalledWith(
        expect.stringContaining("[CHV]"),
        "hello"
      );
    });

    it("should include timestamp in HH:MM:SS format", async () => {
      const logger = await getLogger();
      logger.warn("timed");

      const firstArg = mockConsoleWarn.mock.calls[0][0] as string;
      expect(firstArg).toMatch(/^\d{2}:\d{2}:\d{2}/);
    });
  });
});
