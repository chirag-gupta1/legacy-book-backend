import express from "express";
import cors from "cors";
import interviewRoutes from "./routes/interview.routes";
import dotenv from "dotenv";
dotenv.config();


const app = express();

app.use(cors());
app.use(express.json());

app.use("/interview", interviewRoutes);

export default app;