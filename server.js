const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// MONGO BAĞLANTI
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB Bağlantısı Başarılı ✔"))
    .catch(err => console.log("MongoDB Hatası ❌", err));

// ROUTES
app.use("/api/login", require("./login/loginRoutes"));

app.get("/", (req, res) => {
    res.send("Backend çalışıyor ✔");
});

app.listen(process.env.PORT || 5000, () => {
    console.log("Server açık: http://localhost:" + (process.env.PORT || 5000));
});
