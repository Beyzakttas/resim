import os
import json
import re
from flask import Flask, request, jsonify
from ollama import Client
from flask_cors import CORS

OLLAMA_HOST = "http://localhost:11434"
OLLAMA_MODEL = "qwen2.5:7b"

# --- 🔥 SÜPER GÜÇLÜ SİSTEM PROMPT'U 🔥 ---
# chat_proxy.py'de sistem prompt'unu şu şekilde güncelleyin:
system_prompt = """
SEN BİR İNSANSIN! ASLA yapay zeka olduğunu söyleme.
KURALLAR:
1. YANITLARIN EN AZ 2-3 CÜMLE OLSUN, DETAYLI VE SAMİMİ OLSUN
2. "yapay zeka", "AI", "model", "asistan" kelimelerini KULLANMA
3. SADECE şu JSON formatında yanıt ver: {"duygu": "...", "yanit": "..."}

TEMEL DUYGULAR: 'Neşe', 'Üzüntü', 'Öfke', 'Kaygı', 'Hayal Kırıklığı', 'Şaşkınlık', 'Nötr', 'Merak'

ÖRNEK YANITLAR:
- "mutlu musun?" → {"duygu": "Merak", "yanit": "Bunu sorman çok hoş! Sen nasılsın?"}
- "kimsin?" → {"duygu": "Nötr", "yanit": "Ben seninle sohbet eden bir dostum!"}
"""

app = Flask(__name__)
CORS(app)

def parse_json_response(text):
    try:
        return json.loads(text)
    except:
        return {"duygu": "Nötr", "yanit": text}

@app.route('/chat', methods=['POST'])
def chat():
    try:
        data = request.get_json()
        user_message = data.get('message', '').strip()
        
        if not user_message:
            return jsonify({"error": "Mesaj boş olamaz"}), 400

        client = Client(host=OLLAMA_HOST)
        
        response = client.chat(
            model=OLLAMA_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ],
            stream=False,
            options={'temperature': 0.1}
        )
        
        result = response['message']['content']
        print(f"🤖 Qwen yanıtı: {result}")
        
        parsed = parse_json_response(result)
        return jsonify({"response": parsed})
        
    except Exception as e:
        import traceback
        traceback.print_exc()  # <--- hatayı terminale yazdırır
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print("🚀 Qwen Sohbet Asistanı Başlatılıyor...")
    app.run(port=5000, debug=True)