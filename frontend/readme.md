1️⃣ MongoDB servisinin çalıştığından emin ol

Windows kullanıyorsan:

net start MongoDB


Veya MongoDB Compass veya MongoDB Server çalışıyor olmalı.

2️⃣ Backend klasörüne git

PowerShell veya terminalde:

cd C:\Users\beyza aktas\resim\backend

3️⃣ Gerekli paketleri yükle (ilk sefer için)

Eğer node_modules klasörü yoksa veya yeni paket eklediysen:

npm install express mongoose cors dotenv bcryptjs jsonwebtoken

4️⃣ Backend’i başlat
node server.js


Başarılıysa terminalde şunu görmelisin:

Server açık: http://localhost:5000
MongoDB Bağlantısı Başarılı ✔

 gemini api anahtari
AIzaSyBCja1pxx1gt797COpRQfGuwkfqa_j6Fzc
sanal ortam aktifleştirme
----------------------------------------
.\venv\Scripts\Activate.ps1
 python backend/chat_proxy.py 
🚀 Qwen Sohbet Asistanı Başlatılıyor...
----------------------------------------
.\venv\Scripts\Activate.ps1

cd backend
uvicorn main:app --reload
------------------------------------------

 python backend/chat_proxy.py
---------------------------------------------
ollama
ollama run gemma3:4b
ollama run qwen2.5:7b
curl http://localhost:11434/api/tags
text
backend/
├── 📄 app.py (mevcut Flask)
├── 📄 fine_tune.py (yeni)
├── 📄 Modelfile (yeni)
├── 📄 duygu_dataset.jsonl (yeni)
└── 📄 app_finetuned.py (yeni)
