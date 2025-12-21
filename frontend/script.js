// Hamburger Menü İşlevi
function toggleMobileMenu() {
    const menu = document.getElementById('mobileMenu');
    const iconElement = document.getElementById('menuIcon');

    // 1. Kayma durumunu değiştir: CSS'te tanımlı olan #mobileMenu.open sınıfını ekle/kaldır.
    menu.classList.toggle('open');

    // 2. İkonu değiştir
    const isMenuOpen = menu.classList.contains('open');

    if (isMenuOpen) {
        // Menü açıksa, kapatma ikonu (X) göster
        iconElement.setAttribute('data-lucide', 'x');
    } else {
        // Menü kapalıysa, menü ikonu göster
        iconElement.setAttribute('data-lucide', 'menu');
    }
    // İkon değişikliğini yansıtmak için Lucide'ı çalıştır
    lucide.createIcons();
}


// Login kontrolü
function logout() {
    localStorage.removeItem('drawMindIsLoggedIn');
    window.location.href = 'login.html';
}

// Analiz Sayfasına Git
function startAnalysis() {
    window.location.href = "analysis.html";
}


// Typewriter Animasyon
document.addEventListener('DOMContentLoaded', function () {
    const text = "Çizim Psikolojisi Analiz Projesi";
    let index = 0;
    const target = document.getElementById('typewriter-text');
    const cursor = document.getElementById('cursor');

    function type() {
        if (index < text.length) {
            target.innerHTML += text[index++];
            setTimeout(type, 100);
        } else {
            cursor.style.display = 'none';
        }
    }
    type();

    // Chat input için Enter tuşu desteği
    const chatInput = document.getElementById("chatInput");
    chatInput.addEventListener("keydown", e => {
        if (e.key === "Enter") {
            e.preventDefault();
            sendChatMessage();
        }
    });

    // File input için event listener
    const fileInput = document.getElementById("fileInput");
    fileInput.addEventListener("change", handleFileUpload);

    // Başlangıçta ikonları yükle
    lucide.createIcons();
});

// Chat Aç/Kapat
function toggleChat() {
    const w = document.getElementById('chatWindow');
    w.classList.toggle('opacity-0');
    w.classList.toggle('pointer-events-none');
    w.classList.toggle('scale-95');

    // Chat açıldığında input'a focus ol
    if (!w.classList.contains('opacity-0')) {
        setTimeout(() => {
            document.getElementById('chatInput').focus();
        }, 300);
    }
}

// Dosya yükleme işlemi
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const container = document.getElementById('messagesContainer');
    const filePreviewContainer = document.getElementById('filePreviewContainer');

    // Kullanıcı mesajı (sağda)
    const userMsg = document.createElement('div');
    userMsg.className = "user-message message-bubble";
    userMsg.innerHTML = `
        <div class="flex items-center gap-2">
            <i class="lucide-file w-4 h-4"></i>
            <span>${file.name}</span>
        </div>
    `;
    container.appendChild(userMsg);

    // Dosya önizlemesini göster
    filePreviewContainer.classList.remove('hidden');
    filePreviewContainer.innerHTML = `
        <div class="file-preview">
            <div class="file-info">
                <i class="lucide-file-text w-5 h-5 text-indigo-500"></i>
                <span class="file-name">${file.name}</span>
                <span class="text-xs text-gray-500">(${(file.size / 1024).toFixed(1)} KB)</span>
            </div>
            <button class="file-remove" onclick="removeFile()">
                <i class="lucide-x w-4 h-4"></i>
            </button>
        </div>
    `;

    container.scrollTop = container.scrollHeight;

    // AI yanıtı (solda) - simülasyon
    setTimeout(() => {
        const botMsg = document.createElement('div');
        botMsg.className = "bot-message message-bubble";
        botMsg.innerHTML = `
            Dosyanız alındı! "${file.name}" dosyasını analiz etmemi ister misiniz? Veya başka bir sorunuz var mı?
        `;
        container.appendChild(botMsg);
        container.scrollTop = container.scrollHeight;
    }, 1000);
}

// Dosyayı kaldır
function removeFile() {
    const filePreviewContainer = document.getElementById('filePreviewContainer');
    const fileInput = document.getElementById('fileInput');

    filePreviewContainer.classList.add('hidden');
    filePreviewContainer.innerHTML = '';
    fileInput.value = '';
}

// FRONTEND → BACKEND Sohbet Bağlantısı (Yükleniyor göstergesi eklendi)
async function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const msg = input.value.trim();
    if (!msg) return;

    const container = document.getElementById('messagesContainer');

    // 1. Kullanıcı mesajı (sağda)
    const userMsg = document.createElement('div');
    userMsg.className = "user-message message-bubble";
    userMsg.innerHTML = `<div>${msg}</div>`;
    container.appendChild(userMsg);

    input.value = "";
    container.scrollTop = container.scrollHeight;

    // 2. Yükleniyor göstergesi ekle (solda)
    const typingIndicator = document.createElement('div');
    typingIndicator.id = 'typingIndicator';
    typingIndicator.className = 'typing-indicator';
    typingIndicator.innerHTML = `
        <div class="dot"></div>
        <div class="dot"></div>
        <div class="dot"></div>
    `;
    container.appendChild(typingIndicator);
    container.scrollTop = container.scrollHeight;

    try {
        // Burası simülasyondur, gerçek backend'e bağlanmayı dener.
        const res = await fetch("http://localhost:5000/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: msg })
        });

        const data = await res.json();

        // 3. Yükleniyor göstergesini kaldır
        if (typingIndicator) {
            container.removeChild(typingIndicator);
        }

        // 4. Gerçek AI yanıtını ekle
        const botMsg = document.createElement('div');
        botMsg.className = "bot-message message-bubble";
        botMsg.innerHTML = `<div>${data.response.yanit || data.response}</div>`;

        container.appendChild(botMsg);
        container.scrollTop = container.scrollHeight;

    } catch (err) {
        console.error("Chat hatası:", err);

        // Hata durumunda yükleniyor göstergesini kaldır
        if (typingIndicator) {
            container.removeChild(typingIndicator);
        }

        // Hata mesajı (solda)
        const errMsg = document.createElement('div');
        errMsg.className = "bot-message message-bubble";
        errMsg.innerHTML = `
            <div class="text-red-600">
                <i class="lucide-alert-circle w-4 h-4 inline mr-1"></i>
                Sunucuya bağlanılamadı! (http://localhost:5000/chat) Lütfen arka uç sunucunuzun çalıştığından emin olun.
            </div>
        `;
        container.appendChild(errMsg);
        container.scrollTop = container.scrollHeight;
    }
}
