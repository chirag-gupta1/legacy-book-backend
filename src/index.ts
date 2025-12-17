console.log("🚀 index.ts starting");

import app from "./app";

console.log("✅ app imported");

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
