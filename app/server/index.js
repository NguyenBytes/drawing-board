import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import coordinateRoutes from "./routes/coordinates.js";

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cors());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.get("/", (req, res) => {
	res.sendFile(path.join(__dirname, "src", "index.html"));
});

app.use(express.static(path.join(__dirname, "src")));

app.use("/api/coordinates", coordinateRoutes);

app.listen(PORT, () => {
	console.log(`Server running at http://localhost:${PORT}`);
});
