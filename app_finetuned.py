import os
import json
import re
from flask import Flask, request, jsonify
from ollama import Client
from flask_cors import CORS

# --- Ollama Ayarları ---
OLLAMA_HOST = os.environ.get("OLLAMA_HOST", "http://localhost:11434")
OLLAMA_MODEL = "duygu-uzmani"  # 🎯 Fine-tune edilmiş model

# --- Basit Sistem Prompt'u (Fine-tuning zaten öğretti) ---
system_prompt = "Sen sıcak ve empatik bir dostsun. Her zaman JSON formatında yanıt ver."

# --- Flask Uygulaması ---
app = Flask(__name__)
CORS(app)

def parse_json_response(text):
    """Model yanıtını JSON'a çevir"""
    try:
        return json.loads(text)
    except:
        # JSON içinde JSON ara
        json_match = re.search(r'\{[^}]+\}', text)
        if json_match:
            try:
                return json.loads(json_match.group())
            except:
                pass
    
    # Fallback
    return {
        "duygu": "Şaşkınlık",
        "yanit": "Sanırım bir karışıklık oldu! Seninle sohbet etmek istiyorum."
    }

@app.route('/chat', methods=['POST'])
def chat_endpoint():
    try:
        data = request.get_json()
        user_message = data.get('message', '').strip()

        if not user_message:
            return jsonify({"error": "Mesaj alanı boş olamaz"}), 400

        # Her seferinde temiz başla
        temp_messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message}
        ]

        client = Client(host=OLLAMA_HOST)
        
        response = client.chat(
            model=OLLAMA_MODEL,
            messages=temp_messages,
            stream=False,
            options={'temperature': 0.3}
        )
        
        assistant_response = response['message']['content'].strip()
        print(f"[DEBUG] Duygu Uzmanı yanıtı: {assistant_response}")

        # JSON'a çevir
        parsed_response = parse_json_response(assistant_response)

        return jsonify({
            "response": parsed_response,
            "source": "FineTuned_Duygu_Asistani"
        })

    except Exception as e:
        print(f"[HATA] {e}")
        return jsonify({
            "error": f"Sunucu hatası: {e}"
        }), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Sağlık kontrolü"""
    try:
        client = Client(host=OLLAMA_HOST)
        models = client.list()
        return jsonify({
            "status": "healthy",
            "model": OLLAMA_MODEL,
            "ollama_host": OLLAMA_HOST
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    print(f"🚀 Fine-Tuned Duygu Asistanı Başlatılıyor...")
    print(f"🤖 Model: {OLLAMA_MODEL}")
    print(f"🌐 URL: http://localhost:5000")
    print(f"❤️ Health check: http://localhost:5000/health")
    app.run(debug=True, port=5000, host='0.0.0.0', use_reloader=False)