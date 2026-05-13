import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import winston from "winston";

// Logger configuration
const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  ],
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Security & Logging
  app.use(helmet({ 
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    xFrameOptions: false
  }));
  app.use(cors());
  app.use(express.json({ limit: "10mb" }));
  
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: "Too many requests from this IP, please try again after 15 minutes",
  });
  app.use("/api/", apiLimiter);

  // Auth Middleware Skeleton
  const authMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // TODO: Verify session/JWT here
    const userRole = req.headers["x-user-role"]; 
    (req as any).user = { role: userRole };
    next();
  };

  const requireRole = (role: string) => (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if ((req as any).user?.role !== role) {
      return res.status(403).json({ error: "Forbidden: Insufficient permissions" });
    }
    next();
  };

  // API routes
  app.get("/api/health", (req, res) => {
    logger.info("Health check pinged");
    res.json({ status: "ok", school: "Mon Refugee Learning Centre - GED School" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Global Error Handler (Production Sanitize)
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error(err.stack);
    res.status(500).json({ error: "Internal Server Error" });
  });

  app.listen(PORT, "0.0.0.0", () => {
    logger.info(`Server running on port ${PORT}`);
    logger.info(`Mode: ${process.env.NODE_ENV || "development"}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
