import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, log } from "./vite";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

let server: any = null;

async function startServer() {
  try {
    if (server) {
      // Cleanup previous server instance
      await new Promise((resolve) => server.close(resolve));
    }

    // Register API routes first
    server = await registerRoutes(app);

    // Error handling middleware
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      console.error('Error:', err);
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
    });

    // Setup Vite dev server in development mode
    if (process.env.NODE_ENV === "development") {
      await setupVite(app, server);
    }

    // Start server with error handling
    const port = 5000;
    await new Promise((resolve, reject) => {
      server.listen(port, "0.0.0.0", async () => {
        log(`Server running on port ${port}`);
        resolve(null);
      }).on('error', async (error: any) => {
        if (error.code === 'EADDRINUSE') {
          console.error(`Port ${port} is already in use. Trying to free it...`);
          try {
            await execAsync(`lsof -i :${port} | grep LISTEN | awk '{print $2}' | xargs kill -9`);
            // Wait a moment and try again
            setTimeout(async () => {
              try {
                await startServer();
                resolve(null);
              } catch (retryError) {
                reject(retryError);
              }
            }, 1000);
          } catch (err) {
            console.error('Failed to free port:', err);
            reject(err);
          }
        } else {
          console.error('Server failed to start:', error);
          reject(error);
        }
      });
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();