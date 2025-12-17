import app from "./app";

const PORT = process.env.PORT;

if (!PORT) {
  throw new Error("PORT not defined");
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
