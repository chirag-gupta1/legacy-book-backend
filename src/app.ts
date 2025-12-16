import express from "express";
import cors from "cors";
import interviewRoutes from "./routes/interview.routes";


const app = express();

app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.use(cors());
app.use(express.json());

app.use("/interview", interviewRoutes);

export default app;