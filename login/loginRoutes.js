const express = require("express");
const router = express.Router();
const User = require("./loginModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// LOGIN (Giriş Yap + Yoksa Kayıt)
router.post("/login", async (req, res) => {
    const { email, password } = req.body;

    try {
        let user = await User.findOne({ email });

        if (!user) {
            // Kullanıcı yoksa otomatik kayıt yap
            const hashedPassword = await bcrypt.hash(password, 10);
            user = await User.create({ email, password: hashedPassword });
            console.log("Yeni kullanıcı oluşturuldu:", email);
        } else {
            // Kullanıcı varsa şifreyi kontrol et
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) return res.json({ success: false, msg: "Şifre hatalı" });
        }

        // JWT token üret
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

        res.json({ success: true, msg: "Giriş başarılı", token });
    } catch (error) {
        res.json({ success: false, msg: "Giriş hatası", error });
    }
});

module.exports = router;
