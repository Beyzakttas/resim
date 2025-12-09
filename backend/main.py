import base64
import io
import json
from collections import Counter
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from PIL import Image
import numpy as np

# --- FastAPI Uygulama Kurulumu ---
app = FastAPI(
    title="DrawMind AI Analysis Backend",
    description="Çizimi base64 verisi üzerinden analiz eder ve 20+ psikolojik durumu simüle eden rapor döndürür. Özel renk paleti analizi."
)

# CORS ayarlari
origins = ["*"] # Tüm kökenlerden erişime izin ver

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Veri Modelleri ---

class ImageRequest(BaseModel):
    image_data: str
    color_used: str | None = None
    line_thickness: int | None = None
    tool_history: int | None = None

class AnalysisResponse(BaseModel):
    emotion: str
    psychology: str
    colorAnalysis: str
    detail: str

# --- ÖZEL RENK PALETİ PSİKOLOJİSİ ---
COLOR_PSYCHOLOGY_TR = {
    # HEX kodlarına göre güncellendi. Metinler bold vurgusunu içerir.
    (0, 0, 0): ("Siyah", "**Güç, gizem ve otorite**. Bastırılmış duygular veya derin içsel düşünceleri temsil eder. Aşırı kullanımı içe kapanıklığa işaret edebilir."),
    (255, 0, 0): ("Kırmızı", "**Tutku, enerji ve aciliyet**. Güçlü duygusal tepkiler, öfke veya yoğun arzuları yansıtır. Dikkat çekici ve dominant bir renk."),
    (0, 0, 255): ("Mavi", "**Sakinlik, güven ve huzur**. İçsel denge, mantık ve derin düşünceyi temsil eder. Melankoliye yatkınlık gösterebilir."),
    (50, 200, 50): ("Yeşil", "**Büyüme, denge ve yenilenme**. Doğal iyileşme, umut ve istikrar arayışını simgeler. Değişime direnç gösterebilir."),
    (255, 215, 0): ("Altın Sarısı", "**Lüks, bilgelik ve başarı**. Yüksek değerler, yaratıcılık ve entelektüel merakı temsil eder. Gurur ve özgüven işareti."),
    (148, 0, 211): ("Mor", "**Ruhsallık, yaratıcılık ve gizem**. Hayal gücü, sezgi ve derin düşünceleri yansıtır. Melankoli ve içsel çatışmaları gösterebilir."),
    (255, 165, 79): ("Turuncu", "**Sosyallik, enerji ve coşku**. Dostane yaklaşım, yaratıcılık ve iletişim isteğini temsil eder. Dikkat dağınıklığına işaret edebilir."),
    (139, 69, 19): ("Kahverengi", "**Topraklanma, güvenlik ve sadelik**. Pratiklik, güvenilirlik ve istikrar arayışını yansıtır. Aşırı muhafazakarlık gösterebilir."),
    (255, 52, 179): ("Pembe", "**Sevgi, şefkat ve duyarlılık**. Hassasiyet, romantizm ve duygusal bağları temsil eder. Kırılganlık ve korunma ihtiyacı."),
    (139, 139, 122): ("Gri", "**Nötrlük, denge ve tarafsızlık**. İlgisizlik, çekingenlik ve duygusal mesafeyi yansıtır. Kararsızlık ve pasiflik."),
    (255, 255, 255): ("Beyaz", "**Saflık, boşluk ve potansiyel**. Temiz sayfa, yeni başlangıçlar ve açıklığı temsil eder. İçsel boşluk hissi."),
    (128, 128, 128): ("Orta Gri", "**Denge ve uyum**. Duygusal stabilite ve objektif bakış açısını yansıtır. İlgi eksikliği."),
    (255, 255, 0): ("Sarı", "**İyimserlik, zeka ve neşe**. Zihinsel uyanıklık, yaratıcılık ve enerjiyi temsil eder. Huzursuzluk ve kaygı."),
    (255, 192, 203): ("Açık Pembe", "**Nazik sevgi ve hassasiyet**. İncelik, gençlik ve masumiyeti yansıtır. Duygusal kırılganlık."),
    (106, 90, 205): ("Orta Mor", "**Ruhsal denge ve yaratıcılık**. Hayal gücü ve içsel huzur arası dengeyi temsil eder."),
    (34, 139, 34): ("Orman Yeşili", "**Doğal denge ve büyüme**. Derin köklenme, sabır ve organik gelişimi yansıtır.")
}

# --- 20+ Duygusal Yoğunluk Profili ---
ANALYSIS_PROFILES = [
    # Metinlerdeki kalın vurgular (**) frontend'de doğru render edilmelidir.
    {"score_max": 5, "emotion": "**Derin İçsel Sessizlik**", "base_psychology": "Çizimde neredeyse hiç aktivite yok. **Derin meditasyon**, yoğun içe dönüklük veya duygusal enerjinin tamamen **tükenmişlik** halini yansıtıyor. Zihnin sakin sularında bir seyir.", "detail_score": "2/100"},
    {"score_max": 10, "emotion": "**İç Huzur ve Denge**", "base_psychology": "Minimal çizimlerde derin bir sükunet hakim. **İçsel barış** ve duygusal dengenin göstergesi. Zihin berrak, odaklanmış ve huzur dolu.", "detail_score": "7/100"},
    {"score_max": 15, "emotion": "**Hafif ve Özgür**", "base_psychology": "Çizimler hafif, akıcı ve özgür. **Yaratıcı keşif** ruhu ve hafif bir iyimserlik. Duygusal yüklerden arınmış, hafif bir varoluş.", "detail_score": "12/100"},
    {"score_max": 20, "emotion": "**İnce Duyarlılık**", "base_psychology": "Nazik ve duyarlı çizimler. **Empati** ve hassas algıların hakim olduğu bir dönem. Çevresel etkilere açık, korunmasız ama güzel bir farkındalık.", "detail_score": "17/100"},
    {"score_max": 25, "emotion": "**Dengeli ve Uyumlu**", "base_psychology": "İfadeler düzenli, uyumlu ve istikrarlı. **Zihinsel denge** ve mevcut duruma uyum sağlama becerisi. Duygusal olarak merkezlenmiş ve topraklanmış.", "detail_score": "22/100"},
    {"score_max": 30, "emotion": "**Merak ve Keşif**", "base_psychology": "Çizimlerde belirgin bir **öğrenme merakı** ve keşif isteği. Yeni fikirlere açıklık ve zihinsel canlılık. Entelektüel uyanışın başlangıcı.", "detail_score": "27/100"},
    {"score_max": 35, "emotion": "**Net Odaklanma**", "base_psychology": "Belirli bir hedefe veya düşünceye **yoğunlaşma**. Zihinsel berraklık ve niyet bütünlüğü. Duygusal enerji kontrollü ve yapıcı şekilde kanalize ediliyor.", "detail_score": "32/100"},
    {"score_max": 40, "emotion": "**Yaratıcı Akan**", "base_psychology": "Yaratıcı enerjinin doğal akışı. **İlham** ve hayal gücünün coşkuyla ifadesi. Duygular akıcı, spontane ve otantik.", "detail_score": "37/100"},
    {"score_max": 45, "emotion": "**Coşku ve Neşe**", "base_psychology": "Enerjik ve neşeli çizimler. **Yaşam sevinci** ve pozitif enerjinin dışavurumu. Duygusal olarak canlı, sosyal ve iletişime açık.", "detail_score": "42/100"},
    {"score_max": 50, "emotion": "**Tutku ve İstek**", "base_psychology": "Güçlü arzular ve tutkuların ifadesi. **Enerji patlamaları** ve hedef odaklılık. Duygusal yoğunluk yapıcı şekilde kullanılıyor.", "detail_score": "47/100"},
    {"score_max": 55, "emotion": "**Duygusal Derinlik**", "base_psychology": "Duyguların zengin ve derin ifadesi. **Empati** ve içsel farkındalıkta artış. Duygusal olarak hassas ama güçlü bir bağlantı içinde.", "detail_score": "52/100"},
    {"score_max": 60, "emotion": "**Enerji Dalgalanması**", "base_psychology": "Yüksek enerji ve zihinsel aktivite. **Üretkenlik** ve fikir zenginliği. Duygusal olarak canlı ama hafif bir huzursuzluk eşlik edebilir.", "detail_score": "57/100"},
    {"score_max": 65, "emotion": "**İçsel Direnç**", "base_psychology": "Zorluklara karşı **direnç** ve iç gücün ifadesi. Duygusal olarak dayanıklı ama yorgunluk belirtileri başlıyor. Mücadele ruhu ön planda.", "detail_score": "62/100"},
    {"score_max": 70, "emotion": "**Gergin Bekleyiş**", "base_psychology": "Artmış baskı ve **içsel gerilim**. Çözülmemiş küçük kaygılar yüzeye çıkıyor. Duygusal olarak tetikte ve hassas bir dönem.", "detail_score": "67/100"},
    {"score_max": 75, "emotion": "**İç Çatışma**", "base_psychology": "Zıt duygu ve düşüncelerin **iç savaşı**. Kararsızlık ve duygusal türbülans. İçsel dengenin sarsıldığı zorlu bir süreç.", "detail_score": "72/100"},
    {"score_max": 80, "emotion": "**Yoğun Baskı Hissi**", "base_psychology": "Duygusal yükün ağırlaştığı nokta. **Stres** ve baskı altında hissetme. İçsel kaynaklar zorlanıyor ama çöküş yok.", "detail_score": "77/100"},
    {"score_max": 85, "emotion": "**Duygusal Tükenme**", "base_psychology": "Enerji rezervlerinin azaldığı **tükenmişlik** hali. Duygusal olarak yorgun ve bitkin. İçsel dinlenme ihtiyacı ön planda.", "detail_score": "82/100"},
    {"score_max": 90, "emotion": "**Bunalmışlık ve Yalnızlık**", "base_psychology": "Duygusal yükün **taşınamaz** hale geldiği nokta. Derin yalnızlık ve kopukluk hissi. İçsel fırtınaların şiddetlendiği kritik evre.", "detail_score": "87/100"},
    {"score_max": 95, "emotion": "**Kaos ve Dağılma**", "base_psychology": "Zihinsel ve duygusal **kaos**un hakim olduğu durum. Kontrol kaybı ve dağınıklık hissi. İçsel dengenin tamamen bozulduğu acil durum.", "detail_score": "92/100"},
    {"score_max": 100, "emotion": "**Kritik Duygusal Kriz**", "base_psychology": "Maksimum yoğunluk ve duygusal **acil durum**. Duygusal olarak **tükenmiş, izole ve çaresiz** hissetme. Profesyonel destek gerektiren kritik psikolojik durum.", "detail_score": "98/100"},
]

# --- Yardımcı Fonksiyonlar ---

def hex_to_rgb(hex_color):
    """HEX rengini RGB'ye çevir"""
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

def get_closest_psychological_color(r, g, b):
    """Bir RGB rengini, özel renk paletindeki en yakın renge yuvarlar."""
    min_distance = float('inf')
    closest_color = (0, 0, 0)
    
    r, g, b = float(r), float(g), float(b)
    
    for ref_color in COLOR_PSYCHOLOGY_TR.keys():
        ref_r, ref_g, ref_b = map(float, ref_color)
        distance = (r - ref_r)**2 + (g - ref_g)**2 + (b - ref_b)**2
        
        if distance < min_distance:
            min_distance = distance
            closest_color = tuple(map(int, (ref_r, ref_g, ref_b)))
    
    return closest_color


def analyze_canvas_usage(image_array):
    """Sayfanın hangi bölgelerinin daha fazla kullanıldığını analiz eder (5 bölge)."""
    height, width = image_array.shape[:2]
    
    h_third = height // 3
    w_third = width // 3
    
    # 9 bölge tanımlama (sadece 5'i main_regions'da kullanılacak)
    regions = {
        "sol_ust": image_array[0:h_third, 0:w_third],
        "ust_orta": image_array[0:h_third, w_third:2*w_third],
        "sag_ust": image_array[0:h_third, 2*w_third:width],
        "sol_orta": image_array[h_third:2*h_third, 0:w_third],
        "merkez": image_array[h_third:2*h_third, w_third:2*w_third],
        "sag_orta": image_array[h_third:2*h_third, 2*w_third:width],
        "sol_alt": image_array[2*h_third:height, 0:w_third],
        "alt_orta": image_array[2*h_third:height, w_third:2*w_third],
        "sag_alt": image_array[2*h_third:height, 2*w_third:width]
    }
    
    # 5 ana bölgeyi seçme
    main_regions = {
        "sol_ust": regions["sol_ust"],
        "sag_ust": regions["sag_ust"],
        "merkez": regions["merkez"],
        "sol_alt": regions["sol_alt"],
        "sag_alt": regions["sag_alt"]
    }
    
    region_density = {}
    for region_name, region_array in main_regions.items():
        # Çizilmiş pikselleri say (arka plan beyazdan farklı olan pikseller)
        drawn_pixels = np.sum(np.any(region_array < 250, axis=-1))
        total_pixels = region_array.shape[0] * region_array.shape[1]
        density = (drawn_pixels / total_pixels) * 100 if total_pixels > 0 else 0
        region_density[region_name] = density
    
    return region_density

def analyze_line_thickness(image_array):
    """Kalem kalınlığını analiz eder (kenar tespiti ile yaklaşık ölçüm)."""
    
    gray = np.mean(image_array, axis=2).astype(np.float32)
    
    gy, gx = np.gradient(gray)
    edges = np.hypot(gx, gy)
    
    if edges.size == 0:
        edge_density = 0
    else:
        thresh = max(1e-6, edges.mean() * 0.5)
        edge_density = np.mean(edges > thresh) * 1000
    
    # Kalınlık skoruna göre seviye atama (1: çok ince, 5: çok kalın)
    if edge_density < 1:
        return "çok ince", 1
    elif edge_density < 3:
        return "ince", 2
    elif edge_density < 6:
        return "orta", 3
    elif edge_density < 10:
        return "kalın", 4
    else:
        return "çok kalın", 5

def generate_region_analysis(region_density):
    """Sayfa bölgelerinin kullanımına göre psikolojik yorum oluşturur (5 bölge)."""
    max_region = max(region_density, key=region_density.get)
    max_density = region_density[max_region]
    
    if max_density < 5:
        return "Sayfa üzerinde belirgin bir odak noktası bulunmuyor. Dağınık veya minimal bir yaklaşım sergilenmiş."
    
    # Bölge anlamları da kalın vurgu içerir
    region_meanings = {
        "sol_ust": "**Geçmişe ve mantığa** odaklanma. Düşüncelerin ağır bastığı, planlı ve analitik bir yaklaşım.",
        "sag_ust": "**Gelecek ve hayal gücü** odaklılık. Yaratıcı fikirler, olasılıklar ve vizyoner düşünceler üzerine düşünme.",
        "merkez": "**Benlik ve öz farkındalık** odaklılık. Kendini merkeze alma, içsel denge arayışı ve kişisel odaklanma.",
        "sol_alt": "**Duygusal temeller ve güvenlik** arayışı. İçgüdüsel, duygusal ve güvenliğe yönelik yaklaşımlar.",
        "sag_alt": "**Pratiklik ve somut sonuçlar** odaklılık. Gerçekçi, uygulanabilir çözümler ve elle tutulur başarılar arayışı."
    }
    
    analysis = f"En yoğun kullanım {max_region.replace('_', ' ')} bölgesinde (%{max_density:.1f}). {region_meanings[max_region]}"
    
    # İkinci en yoğun bölgeyi de analize ekle
    sorted_regions = sorted(region_density.items(), key=lambda x: x[1], reverse=True)
    if len(sorted_regions) > 1 and sorted_regions[1][1] > max_density * 0.7:
        second_region = sorted_regions[1][0]
        region_meaning_short = region_meanings[second_region].split('.')[0].lower()
        analysis += f" İkincil odak {second_region.replace('_', ' ')} bölgesinde, bu da {region_meaning_short} eğilimini destekliyor."
    
    return analysis

def generate_thickness_analysis(thickness_level, thickness_score):
    """Kalem kalınlığına göre psikolojik yorum oluşturur."""
    # Kalınlık psikolojisi metinleri de kalın vurgu içerir
    thickness_psychology = {
        "çok ince": "Aşırı detaycı ve titiz bir yaklaşım. **Mükemmeliyetçilik** eğilimi ve ince detaylara takılma riski.",
        "ince": "Dikkatli ve ölçülü ifade. **Kontrolcü** bir yaklaşım ve duyguları filtreden geçirme eğilimi.",
        "orta": "Dengeli ve uyumlu ifade tarzı. **Doğal akış** ve kendini olduğu gibi ifade etme becerisi.",
        "kalın": "Güçlü ve kendinden emin ifade. **Kararlılık** ve net bir duruş sergileme.",
        "çok kalın": "Yoğun ve baskın ifade tarzı. **Güçlü vurgular** ve derin duygusal yük taşıma."
    }
    
    return thickness_psychology[thickness_level]

# NOTE: generate_color_modifier fonksiyonu artık kullanılmıyor, çünkü renk bilgisi
# ana rapor metnine doğrudan psikolojik anlamıyla birlikte entegre ediliyor.


def analyze_drawing_density(image_base64: str) -> dict:
    """Gelişmiş çizim analizi: renk, bölge kullanımı ve kalem kalınlığı analizi."""
    try:
        # Base64'ten PIL Image'e dönüştürme
        image_bytes = base64.b64decode(image_base64)
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        image_array = np.array(image)
    except Exception as e:
        return {
            "emotion": "Yetersiz Veri",
            "psychology": "Görüntü işlenemedi. Veri okunamadı.",
            "colorAnalysis": "Veri okunamadı.",
            "detail": f"Hata: {str(e)}"
        }

    # ... (Piksel analizi, skor hesaplamaları ve profil seçimi kısmı aynı kalır) ...
    total_pixels = image_array.shape[0] * image_array.shape[1]
    drawn_pixels = 0
    total_brightness = 0
    unique_colors_raw = set()
    psychological_color_counts = Counter()
    
    is_drawn_pixel = lambda pixel: any(c < 250 for c in pixel)

    for i in range(image_array.shape[0]):
        for j in range(image_array.shape[1]):
            pixel = tuple(image_array[i, j])
            if is_drawn_pixel(pixel):
                drawn_pixels += 1
                unique_colors_raw.add(pixel)
                
                brightness = (0.299 * pixel[0] + 0.587 * pixel[1] + 0.114 * pixel[2])
                total_brightness += brightness
                
                closest_color_tuple = get_closest_psychological_color(*pixel)
                psychological_color_counts[closest_color_tuple] += 1

    region_density = analyze_canvas_usage(image_array)
    thickness_level, thickness_score = analyze_line_thickness(image_array)
    
    density_percentage = (drawn_pixels / total_pixels) * 100

    if drawn_pixels > 0:
        avg_brightness = total_brightness / drawn_pixels
    else:
        avg_brightness = 255
        
    darkness_score = 100 - (avg_brightness / 255) * 100
    unique_color_count = len(unique_colors_raw)
    
    color_variety_influence = min(30, unique_color_count / 3.3)
    thickness_influence = thickness_score * 2
    
    emotional_intensity_score = (
        density_percentage * 0.30 + 
        darkness_score * 0.40 + 
        color_variety_influence * 0.15 +
        thickness_influence * 0.15
    )
    
    if emotional_intensity_score > 100:
        emotional_intensity_score = 100
        
    selected_profile = ANALYSIS_PROFILES[0]
    for profile in ANALYSIS_PROFILES:
        if emotional_intensity_score <= profile["score_max"]:
            selected_profile = profile
            break
            
    # --- SONUÇ BİRLEŞTİRME MANTIĞI ---
    
    emotion = selected_profile["emotion"]
    psychology_summary = selected_profile["base_psychology"]

    top_color_name, top_color_psychology = "Yok", "Minimal ifade."
    
    if psychological_color_counts:
        top_color_item = psychological_color_counts.most_common(1)[0]
        top_color_tuple = top_color_item[0]
        top_color_name, top_color_psychology = COLOR_PSYCHOLOGY_TR.get(top_color_tuple, ("Bilinmeyen Ton", "**Özel bir anlam çıkarılamadı**."))
        
    # --- 1. Temel Metin ve Renk Vurgularını Birleştirme ---
    
    color_summary = ""
    if top_color_name != "Yok":
        # Renk psikolojisinin kalın metin olmayan kısmını çekme
        color_info = top_color_psychology.split('.')[0]
        
        # COLOR_PSYCHOLOGY_TR'den alınan temel psikolojik çıkarım metnini psikoloji_summary'ye ekle
        psychology_summary += f" Özellikle baskın **{top_color_name}** kullanımı, {color_info.lower()} durumunu ön plana çıkarır."
    
        if unique_color_count > 40:
            color_summary += " Yüksek renk çeşitliliği, zihinsel karmaşıklık ve potansiyel aşırı uyarılmışlığı işaret eder."
        elif darkness_score > 60:
            color_summary += " Koyu tonların ağırlığı, derin bir duygusal yük veya baskı hissini yansıtmaktadır."
        else:
            color_summary += " Renk paleti, genel olarak dengeli bir duygusal ifadeyi desteklemektedir."
    else:
        color_summary = " Renk kullanımı minimal olduğu için renk bazlı analiz kısıtlıdır."

    # --- 2. Bölge ve Kalınlık Özetlemesi ---
    
    # Bölge analizi metninin kalın kısmını çekme (Örn: "Benlik ve öz farkındalık")
    region_analysis_text = generate_region_analysis(region_density)
    
    try:
        # ** kalın kısım ** metnini çekmek için bölme
        region_bold_part = region_analysis_text.split('**')[1].split('**')[0]
    except IndexError:
        region_bold_part = "Bilinmeyen Odak"

    max_region = max(region_density, key=region_density.get)
    region_focus = f" Çizimin en yoğun olduğu bölge ({max_region.replace('_', ' ')}) odak noktanızın **{region_bold_part}** olduğunu gösterir."
    
    # Kalınlık analizi metninin kalın kısmını çekme (Örn: "Güçlü vurgular")
    thickness_analysis_text = generate_thickness_analysis(thickness_level, thickness_score)
    try:
        thickness_bold_part = thickness_analysis_text.split('**')[1].split('**')[0]
    except IndexError:
        thickness_bold_part = "Belirsiz İfade"
        
    thickness_summary = f" Kullanılan {thickness_level} kalem kalınlığı, ifade tarzınızın **{thickness_bold_part}** olduğunu yansıtır."

    # Tüm parçaları birleştirerek yeni, akıcı paragrafı oluştur
    # NOTE: psychology_summary artık ana renk psikolojisi metnini zaten içeriyor.
    psychology = f"{psychology_summary}{color_summary}{region_focus}{thickness_summary}"

    # --- JSON ÇIKTISI (AnalysisResponse Modeline Uygun) ---
    colorAnalysis = f"**Baskın Renk:** {top_color_name}. **Benzersiz Renk Tonu Sayısı:** {unique_color_count} adet. **Koyu Ton Ağırlığı:** {darkness_score:.2f}%. **Kalem Kalınlığı:** {thickness_level}."
    
    region_details = ", ".join([f"{k}: %{v:.1f}" for k, v in sorted(region_density.items(), key=lambda x: x[1], reverse=True)])
    detail = f"Kompozit Duygusal Yoğunluk Skoru: {emotional_intensity_score:.2f}/100 ({selected_profile['detail_score']}). Çizim Yoğunluğu: {density_percentage:.2f}%. Bölge Yoğunlukları: {region_details}"

    return {
        "emotion": emotion,
        "psychology": psychology,
        "colorAnalysis": colorAnalysis,
        "detail": detail
    }
# ... (Yardımcı fonksiyonların sonu)

# --- API Endpoint ---

@app.post("/analyze", response_model=AnalysisResponse)
async def analyze_drawing(request: ImageRequest):
    """Kullanıcının çizim verisini alır ve simüle edilmiş psikolojik analiz döndürür."""
    if not request.image_data:
        raise HTTPException(status_code=400, detail="Çizim verisi (image_data) boş olamaz.")
    
    analysis_data = analyze_drawing_density(request.image_data)
    
    # Eğer analyze_drawing_density hata döndürürse, HTTP hatası fırlat
    if "Yetersiz Veri" in analysis_data["emotion"]:
        raise HTTPException(status_code=500, detail=analysis_data["detail"])
        
    return analysis_data

# --- Kök Endpoint ---
@app.get("/")
async def root():
    return {
        "message": "DrawMind AI Analysis Backend çalışıyor! 🚀",
        "version": "3.0", 
        "features": "Özel renk paleti analizi, 20+ duygu profili, 5 bölge tespiti",
        "supported_colors": ["Siyah (#000000)", "Kırmızı (#FF0000)", "Mavi (#0000FF)", "Yeşil ('#32C832')", 
                            "Altın Sarısı (#FFD700)", "Mor (#9400D3)", "Turuncu (#ffa54f)", 
                            "Kahverengi (#8b4513)", "Pembe (#ff34b3)", "Gri (#8b8b7a)"]
    }

# Uygulamayı çalıştırmak için terminalde: uvicorn app_adı:app --reload