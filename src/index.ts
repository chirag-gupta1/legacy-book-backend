import app from "./app";
import cors from "cors";

const PORT = process.env.PORT;

if (!PORT) {
  throw new Error("PORT not defined");
}

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://legacy-book.vercel.app", // future
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// IMPORTANT
app.options("*", cors());

const requiredEnv = [
  "DATABASE_URL",
  "OPENAI_API_KEY",
  "CLERK_JWKS_URL",
  "CLERK_ISSUER",
];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing env var: ${key}`);
  }
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
