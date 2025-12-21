// LOGIN FORM
const loginForm = document.getElementById("loginForm");
if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = document.getElementById("loginEmail").value;
        const password = document.getElementById("loginPassword").value;

        const res = await fetch("http://localhost:5000/api/login/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });

        const data = await res.json();

        if (data.success) {
            alert("Giriş başarılı!");

            // TOKEN’I SAKLA
            localStorage.setItem("token", data.token);

            // YÖNLENDİR
            window.location.href = "anasayfa.html";
        } else {
            alert(data.msg);
        }
    });
}



// REGISTER FORM
const registerForm = document.getElementById("registerForm");
if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = document.getElementById("registerEmail").value;
        const password = document.getElementById("registerPassword").value;

        const res = await fetch("http://localhost:5000/api/login/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });

        const data = await res.json();

        if (data.success) {
            alert("Kayıt başarılı! Şimdi giriş yapabilirsiniz.");
            window.location.href = "login.html";
        } else {
            alert(data.msg);
        }
    });
}
