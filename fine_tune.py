import subprocess
import os
import time

print("🚀 DATASET + QWEN FINE-TUNING BAŞLIYOR...")
print("⏳ 1-2 saat sürebilir, sabırlı olun...")

current_dir = os.getcwd()
dataset_path = os.path.join(current_dir, 'duygu_dataset.jsonl')
modelfile_path = os.path.join(current_dir, 'Modelfile')

print(f"📁 Çalışma dizini: {current_dir}")

# Dosya kontrolleri
if not os.path.exists(dataset_path):
    print("❌ duygu_dataset.jsonl bulunamadı!")
    exit(1)

if not os.path.exists(modelfile_path):
    print("❌ Modelfile bulunamadı!")
    exit(1)

try:
    print("🔄 1. Adım: 'duygu-uzmani' modeli oluşturuluyor...")
    
    # Model oluştur
    result = subprocess.run([
        'ollama', 'create', 'duygu-uzmani', '-f', modelfile_path
    ], capture_output=True, text=True)
    
    if result.returncode == 0:
        print("✅ Model oluşturuldu!")
        print("🔄 2. Adım: Dataset yükleniyor...")
        
        # Dataset'i yükle
        result2 = subprocess.run([
            'ollama', 'run', 'duygu-uzmani', '--file', dataset_path
        ], capture_output=True, text=True)
        
        if result2.returncode == 0:
            print("🎉 FINE-TUNING BAŞARILI!")
            print("🤖 Yeni model: 'duygu-uzmani'")
            print("\n📋 Model listesi:")
            subprocess.run(['ollama', 'list'])
            
            print("\n🧪 Test komutu:")
            print('ollama run duygu-uzmani "mutlu musun?"')
            
            print("\n🚀 Flask'ta kullanmak için:")
            print('OLLAMA_MODEL = "duygu-uzmani"')
            
        else:
            print(f"❌ Dataset hatası: {result2.stderr}")
    else:
        print(f"❌ Model hatası: {result.stderr}")
        
except Exception as e:
    print(f"❌ Hata: {e}")

print("\n✨ İşlem tamamlandı!")