import asyncio

from ollama import AsyncClient


async def main():
    # 1. Kilit Değişiklik: Sistem İstemini Duygu Analizi İçin Ayarlama
    # Bu, modelin her zaman bu role sadık kalmasını sağlayacaktır.
    messages = [
        {
            'role': 'system',
            'content': (
                "Sen bir Duygu Analizi Uzmanısın. Kullanıcının her mesajındaki temel duyguyu (örneğin: 'Neşe', 'Üzüntü', 'Öfke', 'Kaygı', 'Hayal Kırıklığı', 'Şaşkınlık') analiz et ve ardından bu analizi yansıtan kısa, empatik bir yanıt ver. Yanıtın her zaman Türkçe olmalıdır."
            ),
        },
        # Önceden tanımlanmış sohbet geçmişini bu yeni role uygun olarak değiştiriyoruz
        {
            'role': 'user',
            'content': 'Bugün terfi aldım! Müthiş bir haber!',
        },
        {
            'role': 'assistant',
            'content': "Bu, büyük bir neşe ve gurur anı olmalı! Senin adına çok sevindim.",
        },
        {
            'role': 'user',
            'content': 'Geçen hafta sınav sonuçlarım geldi ama beklediğim gibi değildi.',
        },
        {
            'role': 'assistant',
            'content': 'Anlıyorum ki bu durum sende bir miktar hayal kırıklığı yaratmış. Bazen beklentilerimiz gerçekleşmeyebiliyor.',
        },
    ]

    client = AsyncClient()

    # Sohbet Geçmişini Saklamak İçin Boş Bir Dize
    assistant_full_reply = ""

    while True:
        user_input = input('\n\n Duygu Analizi İçin Mesajın: ')
        
        # Kullanıcı girdisini geçmişe ekle
        messages.append({'role': 'user', 'content': user_input})
        
        # Asistanın yanıtını sıfırla
        assistant_full_reply = ""
        
        # Stream'i başlat
        response = await client.chat('gemma3:4b', messages=messages, stream=True)
        
        print('\nAsistan (Duygu Analizi): ', end='', flush=True)

        async for chunk in response:
            assistant_reply_part = chunk['message']['content']
            assistant_full_reply += assistant_reply_part
            print(assistant_reply_part, end='', flush=True)
            
        # 2. Önemli Düzeltme: Yanıtın tamamını aldıktan sonra geçmişe ekle
        # Bu, asenkron akış sırasında mesajların bozulmasını önler.
        messages.append({'role': 'assistant', 'content': assistant_full_reply})
        
        # Yeni bir döngü için bekleme (print ile zaten yapılıyor)


if __name__ == '__main__':
    # Hata yakalama ekledim, eğer Ollama çalışmıyorsa bilgi verir
    try:
        asyncio.run(main())
    except Exception as e:
        print(f"\n[HATA] Kod çalıştırılamadı. Ollama'nın çalıştığından ve 'gemma3:4b' modelinin indiğinden emin olun.")
        print(f"Hata detayı: {e}")