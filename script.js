// Lucide ikonlarını yükle
document.addEventListener('DOMContentLoaded', () => {
    // Lucide ikonlarının yüklenmesi (Eğer index.html'de varsa)
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    // NOT: Marked.js kütüphanesi HTML'de yüklü olmalıdır!
    initApp();
});

// --- Durum Yönetimi ---
let isLoggedIn = false; // Başlangıçta giriş yapılmadı
let currentMode = 'HOME'; // Başlangıç modu HOME
let isDrawing = false;
let color = '#000000';
let lineThickness = 5;
let tool = 'pen'; // 'pen' veya 'eraser'
let lastPoint = { x: 0, y: 0 };
let history = [];
let historyIndex = -1;
let analysisResult = null;
let error = null;

let chatHistory = [];
let isChatOpen = false;
let isChatLoading = false;

// --- DOM Elemanları (initApp'te atanacak) ---
let canvas, ctx;
let loadingOverlay, messagesContainer, chatInput, chatSendButton, chatWindow, drawingToolsDiv, resultCard, resultTitle;
let loginMessage, loginView, homeView;
let alertModal, alertContent, alertMessage; // UYARI MODALI DOM Elementleri

// --- Sabitler ---
const MAX_RETRIES = 3;
const INITIAL_DELAY_MS = 1000;
// API URL'leri (Sizin projeksiyonunuza göre ayarlanmıştır)
const CHAT_API_URL = 'http://localhost:5000/chat';
const BACKEND_API_URL = 'http://127.0.0.1:8000/analyze';

// --- Uygulama Başlatma ---
function initApp() {
    canvas = document.getElementById('drawingCanvas');

    // DOM Ref atamaları
    loadingOverlay = document.getElementById('loadingOverlay');
    messagesContainer = document.getElementById('messagesContainer');
    chatInput = document.getElementById('chatInput');
    chatSendButton = document.getElementById('chatSendButton');
    chatWindow = document.getElementById('chatWindow');
    drawingToolsDiv = document.getElementById('drawingTools');
    resultCard = document.getElementById('resultCard');
    resultTitle = document.getElementById('resultTitle');

    // DOM Ref atamaları
    loginMessage = document.getElementById('loginMessage');
    loginView = document.getElementById('loginView');
    homeView = document.getElementById('homeView');

    // UYARI MODALI DOM atamaları
    alertModal = document.getElementById('alertModal');
    alertContent = document.getElementById('alertContent');
    alertMessage = document.getElementById('alertMessage');


    if (canvas) {
        ctx = canvas.getContext('2d');
        ctx.strokeStyle = color;
        ctx.lineWidth = lineThickness;

        // Olay Dinleyicileri Ekle
        canvas.addEventListener('mousedown', handleStartDrawing);
        canvas.addEventListener('mousemove', handleDraw);
        canvas.addEventListener('mouseup', handleStopDrawing);
        canvas.addEventListener('mouseleave', handleStopDrawing);
        canvas.addEventListener('touchstart', handleStartDrawing);
        canvas.addEventListener('touchmove', handleDraw);
        canvas.addEventListener('touchend', handleStopDrawing);

        window.addEventListener('resize', () => {
            if (currentMode === 'DRAWING') initCanvas(false);
        });
    }

    // Chat için Enter tuşu dinleyicisi
    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendChatMessage();
            }
        });
        chatInput.addEventListener('input', updateUI);
    }

    // 🔥 YENİ: Modal Dışına Tıklama Dinleyicisi
    if (alertModal) {
        alertModal.addEventListener('click', (e) => {
            // Eğer tıklanan eleman, modalın kendisi (backdrop) ise kapat
            if (e.target === alertModal) {
                closeAlert();
            }
        });
    }
    // 🔥 SON

    // Uygulamayı başlat
    render('HOME'); // Uygulamayı HOME modunda başlat
}

// --- Giriş Yönetimi ---

window.handleLogin = function (event) {
    event.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    // Simülasyon: Boş olmayan herhangi bir giriş kabul edilir.
    if (username && password) {
        isLoggedIn = true;
        if (loginMessage) loginMessage.classList.add('hidden');
        render('HOME'); // Başarılı girişten sonra ana sayfaya geç
    } else {
        if (loginMessage) {
            loginMessage.textContent = "Lütfen kullanıcı adı ve şifre giriniz.";
            loginMessage.classList.remove('hidden');
        }
    }
}

/**
 * Analiz Başlatma Düğmesi Tıklaması
 * Giriş yapılmadıysa SADECE uyarı modalını gösterir.
 */
window.handleStartAnalysis = function () {
    if (isLoggedIn) {
        render('DRAWING');
    } else {
        // Yönlendirme yok, sadece uyarı modalını göster
        showAlert("Çizim analizine başlamak için lütfen önce **Giriş Yapın**.");
    }
}

/**
 * UYARI MODALI: Açma Fonksiyonu
 * @param {string} message - Modal içinde gösterilecek mesaj
 */
function showAlert(message) {
    if (!alertModal || !alertContent || !alertMessage) return;

    // renderBoldOnly kullanarak uyarı metnini formatla
    alertMessage.innerHTML = renderBoldOnly(message);
    alertModal.classList.remove('hidden');

    // Animasyon sınıflarını ekle (Tailwind transition)
    setTimeout(() => {
        alertContent.classList.remove('opacity-0', 'scale-95');
        alertContent.classList.add('opacity-100', 'scale-100');
    }, 10);
}

/**
 * UYARI MODALI: Kapatma Fonksiyonu
 */
window.closeAlert = function () {
    if (!alertModal || !alertContent) return;

    // Animasyon sınıflarını kaldır
    alertContent.classList.remove('opacity-100', 'scale-100');
    alertContent.classList.add('opacity-0', 'scale-95');

    // Animasyon tamamlandıktan sonra modalı gizle
    setTimeout(() => {
        alertModal.classList.add('hidden');
    }, 300); // Tailwind transition duration (300ms) ile senkronize
}


// --- Helper Fonksiyonlar ---

async function retryFetch(url, options) {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            const response = await fetch(url, options);
            if (response.ok) return response;

            if (response.status >= 400) {
                const errorText = await response.text();
                // Hata mesajını keserek konsol çıktısını kısalt
                throw new Error(`HTTP Hata ${response.status}: ${errorText.substring(0, 100)}...`);
            }

            throw new Error(`HTTP Hatası: ${response.status}`);
        } catch (error) {
            if (attempt === MAX_RETRIES - 1) throw new Error(`API bağlantısı başarısız oldu. Sunucuyu kontrol edin. Detay: ${error.message}`);

            // 403 gibi yetkilendirme hatalarında yeniden denemeyi atla
            if (error.message.includes("403")) {
                console.warn("403 Yetkilendirme Hatası: Yeniden deneme atlandı.");
                throw error;
            }

            const delay = INITIAL_DELAY_MS * Math.pow(2, attempt);
            console.log(`API isteği başarısız oldu, yeniden deneniyor... (${attempt + 1}/${MAX_RETRIES}, Gecikme: ${delay}ms)`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

function focusWithPolling() {
    // Chat input'unun odaklanmasını garantilemek için döngüsel odaklanma
    let attempts = 0;
    const maxAttempts = 10;
    const interval = 50;

    const tryFocus = () => {
        if (chatInput && !chatInput.disabled) {
            chatInput.focus();
            if (document.activeElement === chatInput) return;
        }
        if (attempts < maxAttempts) {
            attempts++;
            setTimeout(tryFocus, interval);
        }
    };
    tryFocus();
}

/**
 * Uygulama Görünümünü Yöneten Ana Fonksiyon
 * @param {string} mode - 'LOGIN', 'HOME', 'DRAWING', 'RESULT'
 */
function render(mode) {
    const previousMode = currentMode;
    currentMode = mode;

    // Tüm ana görünümleri gizle
    if (loginView) loginView.classList.add('hidden');
    if (homeView) homeView.classList.add('hidden');
    document.getElementById('drawingView').classList.add('hidden');
    document.getElementById('resultView').classList.add('hidden');

    switch (mode) {
        case 'LOGIN':
            if (loginView) loginView.classList.remove('hidden');
            break;
        case 'HOME':
            if (homeView) homeView.classList.remove('hidden');
            break;
        case 'DRAWING':
            if (!isLoggedIn) {
                // Giriş yapılmadıysa login ekranına geri dön
                render('LOGIN');
                return;
            }
            document.getElementById('drawingView').classList.remove('hidden');

            if (previousMode !== 'DRAWING') {
                handleClearCanvas();
            }

            setTimeout(() => initCanvas(false), 0);
            break;
        case 'RESULT':
            document.getElementById('resultView').classList.remove('hidden');
            break;
    }
    updateUI();
}

function setLoading(isLoading) {
    loadingOverlay.classList.toggle('hidden', !isLoading);
    document.getElementById('canvasContainer').classList.toggle('opacity-50', isLoading);
}

function updateUI() {
    if (chatInput && chatSendButton) {
        chatInput.disabled = isChatLoading;
        chatSendButton.disabled = isChatLoading || chatInput.value.trim() === '';
    }

    const undoButton = document.getElementById('undoButton');
    const redoButton = document.getElementById('redoButton');

    const updateButtonState = (button, isDisabled) => {
        if (!button) return;
        button.disabled = isDisabled;

        // Tailwind sınıflarını yönetme
        const activeClasses = ['bg-green-100', 'text-green-700', 'hover:bg-green-200', 'cursor-pointer'];
        const disabledClasses = ['bg-gray-400', 'text-gray-600', 'cursor-not-allowed'];

        if (isDisabled) {
            button.classList.remove(...activeClasses);
            button.classList.add(...disabledClasses);
        } else {
            button.classList.remove(...disabledClasses);
            button.classList.add(...activeClasses);
        }
    };

    // Geri Al (Undo) butonu durumu
    updateButtonState(undoButton, historyIndex <= 0);
    // Yinele (Redo) butonu durumu
    updateButtonState(redoButton, historyIndex === history.length - 1);
}

// --- Çizim ve Geçmiş Yönetimi ---

function initCanvas(forceClear = false) {
    if (!canvas || !ctx) return;

    // Canvas boyutlarını kapsayıcıya göre ayarla (Responsive)
    const container = canvas.parentElement.parentElement;
    canvas.width = Math.min(800, container.clientWidth * 0.9);
    canvas.height = Math.min(450, window.innerHeight * 0.55);

    // Tuvali beyazla doldur (temizle)
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Canvas'ı en son global renk/kalınlıkla senkronize et
    ctx.strokeStyle = color;
    ctx.lineWidth = lineThickness;

    if (historyIndex > -1 && history[historyIndex]) {
        loadHistoryImage(history[historyIndex]);
    } else if (history.length === 0 || forceClear) {
        // Eğer geçmiş yoksa veya zorla temizleme varsa, yeni bir geçmiş kaydet
        saveHistory();
    }

    ctx.globalCompositeOperation = 'source-over';
    updateToolsUI();
}

function drawLine(x1, y1, x2, y2) {
    ctx.beginPath();
    ctx.lineCap = 'round';
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
}

function getCanvasPoint(e) {
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if (e.touches) {
        e.preventDefault();
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }

    const relativeX = clientX - rect.left;
    const relativeY = clientY - rect.top;

    // Yüksek DPI veya ölçekli ekranlar için ölçeklendirme
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = relativeX * scaleX;
    const y = relativeY * scaleY;

    return { x, y };
}

function handleStartDrawing(e) {
    if (currentMode !== 'DRAWING' || !ctx) return;
    isDrawing = true;

    const { x, y } = getCanvasPoint(e);
    lastPoint = { x, y };

    // Silgi için hedefi dışarı çıkarma modunu kullan
    if (tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
    } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = color;
    }

    // Kalınlık senkronizasyonu
    ctx.lineWidth = lineThickness;

    // Tek nokta çizimi için küçük bir çizgi çek
    drawLine(x, y, x + 0.5, y + 0.5);
}

function handleDraw(e) {
    if (!isDrawing || !ctx) return;
    const { x, y } = getCanvasPoint(e);
    drawLine(lastPoint.x, lastPoint.y, x, y);
    lastPoint = { x, y };
}

function handleStopDrawing() {
    if (isDrawing && ctx) {
        isDrawing = false;
        ctx.globalCompositeOperation = 'source-over'; // Çizim bitti, normal moda dön
        saveHistory();
        updateUI();
    }
}

function loadHistoryImage(dataUrl) {
    if (!canvas || !ctx) return;
    const img = new Image();

    img.onload = () => {
        // Yeniden yüklerken tuvali temizle ve beyazla doldur
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Geçmişteki resmi çiz
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        ctx.globalCompositeOperation = 'source-over';
    };
    img.src = dataUrl;
}

function saveHistory(trimRedo = true) {
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');

    if (trimRedo) {
        // Yeni bir çizim yapıldığında ileri (redo) geçmişini sil
        history = history.slice(0, historyIndex + 1);
    }

    history.push(dataUrl);

    const maxHistory = 20;
    if (history.length > maxHistory) {
        history = history.slice(1);
    }

    historyIndex = history.length - 1;
    updateUI();
}

window.handleUndo = function () {
    if (historyIndex > 0) {
        historyIndex--;
        loadHistoryImage(history[historyIndex]);
        updateUI();
    }
}

window.handleRedo = function () {
    if (historyIndex < history.length - 1) {
        historyIndex++;
        loadHistoryImage(history[historyIndex]);
        updateUI();
    }
}

window.handleClearCanvas = function () {
    if (!canvas || !ctx) return;

    // Tuvali temizle ve beyazla doldur
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Silgi seçiliyse otomatik olarak kaleme geç (Daha iyi kullanıcı deneyimi)
    if (tool === 'eraser') setTool('pen');

    // Geçmişi temizle
    history = [];
    historyIndex = -1;
    saveHistory(false); // Temizlenmiş tuvali ilk geçmiş olarak kaydet
}

window.setTool = function (newTool) {
    tool = newTool;
    updateToolsUI();
}

window.setColorTool = function (newColor) {
    if (tool === 'eraser') {
        tool = 'pen'; // Renk seçimi otomatik olarak kaleme geçer
    }
    color = newColor;
    if (ctx) ctx.strokeStyle = newColor; // ANINDA GÜNCELLEME
    updateToolsUI();
}

window.setThickness = function (newThickness) {
    lineThickness = parseInt(newThickness);
    if (ctx) ctx.lineWidth = lineThickness; // ANINDA GÜNCELLEME
    updateToolsUI();
}

// --- Analiz ve Backend Fonksiyonları ---

window.analyzeDrawing = async function () {
    if (!canvas) return;
    if (!isLoggedIn) {
        window.handleStartAnalysis(); // Giriş kontrolünü tekrar çağır
        return;
    }

    render('RESULT');
    setLoading(true);
    error = null;

    // Canvas verisini Base64 olarak al ve başlık kısmını ayır
    const drawingData = canvas.toDataURL('image/png').split(',')[1];

    try {
        const response = await retryFetch(BACKEND_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                image_data: drawingData,
                color_used: color,
                line_thickness: lineThickness,
                tool_history: history.length,
            }),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.detail || 'Bilinmeyen Hata');
        }

        analysisResult = result;
        error = null;

    } catch (err) {
        console.error('Analiz hatası:', err.message);
        error = `Analiz API'si (${BACKEND_API_URL}) ile bağlantı kurulamadı veya sunucu bir hata döndürdü. Detay: ${err.message}`;
        analysisResult = null;
    } finally {
        setLoading(false);
        displayResult();
    }
}


// Markdown çevirisi için helper fonksiyonlar
function cleanTitle(text) {
    if (typeof text !== 'string') return '';
    // Başlangıç ve sondaki çift yıldızları kaldır
    return text.replace(/^\*\*|\*\*$/g, '');
}

const renderBoldOnly = (text) => {
    // Sadece çift yıldız içindeki metni <strong> etiketiyle değiştir
    return (text || '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
};


function displayResult() {
    let content = '';
    let bgColor, borderColor;

    if (error) {
        resultTitle.textContent = 'Analiz Hatası ❌';
        bgColor = 'bg-red-50';
        borderColor = 'border-red-300';
        content = `<p class="text-red-700 font-medium">${error}</p>`;
    } else if (analysisResult) {

        const cleanEmotionTitle = cleanTitle(analysisResult.emotion);
        resultTitle.textContent = 'AI Analiz Raporu 🧠';

        // Markdown'dan HTML'e çeviri
        const renderedPsychology = renderBoldOnly(analysisResult.psychology);

        const isInsufficient = analysisResult.emotion.includes('Yetersiz Veri');
        bgColor = isInsufficient ? 'bg-yellow-50' : 'bg-gray-50';
        borderColor = isInsufficient ? 'border-yellow-300' : 'border-indigo-300';

        // Sonuç içeriğini oluştur
        content = `
            <h3 class="text-3xl font-bold mb-3 text-indigo-700">${cleanEmotionTitle}</h3>
            
            <div class="space-y-4 text-gray-700">
                <div class="p-4 bg-white rounded-lg shadow-inner">
                    <strong class="font-semibold text-gray-900">Psikolojik Eğilim:</strong> 
                    <p class="mt-1 leading-relaxed">${renderedPsychology}</p>
                </div>
            </div>
        `;
    }

    if (resultCard) {
        // Tailwind sınıflarını dinamik olarak ayarla
        resultCard.className = `border-2 rounded-xl shadow-2xl p-6 mb-8 ${bgColor} ${borderColor}`;
        resultCard.innerHTML = content;
    }
}

// Global fonksiyonlar
window.resetApp = function () {
    analysisResult = null;
    error = null;

    // Oturum kapatma simülasyonu. Giriş durumunu sıfırla ve LOGIN ekranına dön
    isLoggedIn = false;
    render('LOGIN');
}

// --- Chatbot Fonksiyonları ---
window.toggleChat = function () {
    isChatOpen = !isChatOpen;

    if (chatWindow) {
        chatWindow.classList.toggle('hidden', !isChatOpen);
    }

    if (isChatOpen) {
        renderChatHistory();
        focusWithPolling();
    }

    const chatButton = document.getElementById('chatToggleButton');
    if (chatButton) {
        chatButton.title = isChatOpen ? 'Sohbeti Kapat' : 'Sohbeti Aç';
    }
}

window.clearChatHistory = function () {
    chatHistory = [];
    renderChatHistory();
}

function renderChatHistory() {
    if (!messagesContainer) return;
    messagesContainer.innerHTML = '';

    // İlk mesaj veya boşluk durumu
    if (chatHistory.length === 0 && !isChatLoading) {
        messagesContainer.innerHTML = `
            <div class="text-center text-gray-500 mt-10">
                <i class="lucide-sparkles w-8 h-8 mx-auto mb-2 text-indigo-400"></i>
                <p class="text-sm">Analiz hakkında sorularınız için buradayım!</p>
            </div>
        `;
    } else {
        chatHistory.forEach((message) => {
            const isUser = message.role === 'user';
            const messageEl = document.createElement('div');
            messageEl.className = `flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`;
            messageEl.innerHTML = `
                <div class="max-w-[80%] p-3 rounded-lg shadow-md ${isUser
                    ? 'bg-indigo-600 text-white rounded-br-none'
                    : 'bg-gray-200 text-gray-800 rounded-tl-none border border-gray-200'
                }">
                    <p class="whitespace-pre-wrap">${message.parts[0].text}</p>
                </div>
            `;
            messagesContainer.appendChild(messageEl);
        });
    }

    // Yükleniyor animasyonu
    if (isChatLoading) {
        const loadingEl = document.createElement('div');
        loadingEl.className = 'flex justify-start mb-3';
        loadingEl.innerHTML = `
             <div class="max-w-[80%] p-3 rounded-lg shadow-md bg-gray-200 text-gray-800 rounded-tl-none border border-gray-200">
                 <div class="flex items-center space-x-2">
                     <div class="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
                     <div class="w-2 h-2 bg-indigo-500 rounded-full rounded-full animate-pulse" style="animation-delay: 0.15s;"></div>
                     <div class="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" style="animation-delay: 0.3s;"></div>
                 </div>
             </div>
          `;
        messagesContainer.appendChild(loadingEl);
    }

    // Otomatik olarak en alta kaydır
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    updateUI();
}

window.sendChatMessage = async function () {
    if (!chatInput) return;
    const userMessage = chatInput.value.trim();
    if (userMessage === '' || isChatLoading) return;

    chatHistory.push({ role: 'user', parts: [{ text: userMessage }] });
    chatInput.value = '';
    isChatLoading = true;
    renderChatHistory();

    try {
        const response = await retryFetch(CHAT_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: userMessage })
        });

        const result = await response.json();

        if (response.ok && result.response) {
            // API'den gelen yanıtı al
            const modelResponse = result.response.yanit || result.response;
            chatHistory.push({ role: 'model', parts: [{ text: modelResponse }] });
        } else {
            const errorDetail = result.detail ? result.detail.message : result.error || 'Geçersiz API yanıtı.';
            throw new Error(errorDetail);
        }
    } catch (error) {
        console.error('Chat API hatası:', error.message);
        let errorMessage = `Sohbet bağlantısı başarısız oldu. Lütfen tekrar deneyin.`;
        if (error.message.includes("Failed to connect")) {
            errorMessage = "Sohbet sunucusuna bağlanılamıyor. Lütfen Flask sunucusunun çalıştığından emin olun. 💡";
        } else {
            errorMessage = `Sohbet sunucusu hata döndürdü. Detay: ${error.message}. ❌`;
        }
        chatHistory.push({ role: 'model', parts: [{ text: errorMessage }] });
    } finally {
        isChatLoading = false;
        renderChatHistory();
        focusWithPolling();
    }
}
// --- Çizim Araçları UI Oluşturma ---
function updateToolsUI() {
    if (!drawingToolsDiv) return;

    const colorButtons = ['#000000', '#FF0000', '#0000FF', '#32C832', '#FFD700', '#9400D3', '#ffa54f', '#8b4513', '#ff34b3', '#8b8b7a'].map(c => `
        <button 
            onclick="setColorTool('${c}')"
            class="w-8 h-8 rounded-full border-4 transition-all duration-150 ${color === c ? 'border-indigo-600 shadow-md' : 'border-gray-200 hover:border-gray-400'}"
            title="${c}"
            style="background-color: ${c};"
        ></button>
    `).join('');

    const thicknessOptions = [2, 5, 10, 15, 20, 30, 40].map(t => `
        <option value="${t}" ${lineThickness === t ? 'selected' : ''}>${t}px</option>
    `).join('');

    // Lucide ikonlarının SVG içerikleri
    const undoIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 7h11c1.87 0 2.804 0 3.5.402A3 3 0 0 1 19.598 8.5C20 9.196 20 10.13 20 12s0 2.804-.402 3.5a3 3 0 0 1-1.098 1.098C17.804 17 16.87 17 15 17H8M4 7l3-3M4 7l3 3"/></svg>';
    const redoIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7H9c-1.87 0-2.804 0-3.5.402A3 3 0 0 0 4.402 8.5C4 9.196 4 10.13 4 12s0 2.804.402 3.5a3 3 0 0 0 1.098 1.098C6.196 17 7.13 17 9 17h7m4-10l-3-3m3 3l-3 3"/></svg>';

    // Sınıflandırma ve ikon kullanımında iyileştirmeler
    drawingToolsDiv.innerHTML = `
        <button
            onclick="setTool('pen')"
            class="p-2 rounded-lg shadow-sm transition flex items-center ${tool === 'pen' ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}"
            title="Kalem Aracını Seç"
        >
            <i class="lucide-pen-tool mr-1"></i> Kalem
        </button>
        <button
            onclick="setTool('eraser')"
            class="p-2 rounded-lg shadow-sm transition flex items-center ${tool === 'eraser' ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}"
            title="Silgi Aracını Seç"
        >
            <i class="lucide-eraser mr-1"></i> Silgi
        </button>

        <button
            id="undoButton"
            onclick="handleUndo()"
            class="p-2.5 rounded-lg shadow-sm transition flex items-center justify-center bg-green-100 text-green-700 hover:bg-green-200"
            title="Geri Al (Undo)"
        >
            ${undoIcon}
        </button>
        <button
            id="redoButton"
            onclick="handleRedo()"
            class="p-2.5 rounded-lg shadow-sm transition flex items-center justify-center bg-green-100 text-green-700 hover:bg-green-200"
            title="Yinele (Redo)"
        >
            ${redoIcon}
        </button>
        
        <div class="flex space-x-1.5 ml-2">
            ${colorButtons}
        </div>

        <select
            onchange="setThickness(this.value)"
            class="p-2 border border-gray-300 rounded-lg shadow-inner text-sm focus:ring-indigo-500 focus:border-indigo-500"
            title="Çizgi Kalınlığı"
        >
            ${thicknessOptions}
        </select>
        
        <button 
            onclick="handleClearCanvas()"
            class="p-2 rounded-lg shadow-sm transition flex items-center bg-red-100 text-red-700 hover:bg-red-200"
            title="Tüm tuvali beyaz ile temizle"
        >
            <i class="lucide-trash-2 mr-1"></i> Tam Temizle
        </button>

        <button 
            onclick="analyzeDrawing()"
            class="p-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg shadow-md transition font-semibold flex items-center"
            title="Çizimi Analiz Et"
        >
            <i class="lucide-brain mr-1"></i> Analiz Et
        </button>
    `;

    // Yeni eklenen Lucide ikonlarını tekrar oluştur
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    // Butonların durumunu güncelle (disabled/enabled)
    updateUI();
}