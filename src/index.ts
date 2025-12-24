import app from "./app";

const PORT = process.env.PORT;

if (!PORT) {
  throw new Error("PORT not defined");
}

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
