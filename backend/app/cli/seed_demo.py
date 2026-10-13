"""Optional technical fixtures. Nothing is published automatically."""
import argparse
from app.repositories.store import rows, one, add, audit
from app.db.session import engine
from app.fuzzy.reference import exact_reference

CASES=[(0,0),(50,50),(90,90),(100,100),(0,90),(90,0),(25,25),(70,70),(40,60),(20,80)]
CONSEQUENTS=[["LOW","LOW","MEDIUM"],["LOW","MEDIUM","HIGH"],["MEDIUM","HIGH","HIGH"]]
PARAMETERS={"LOW":("TRAPEZOID",[0,0,20,40]),"MEDIUM":("TRIANGLE",[20,50,80,None]),"HIGH":("TRAPEZOID",[60,80,100,100])}
QUESTION_DATA={
"ES-01":[
("Apa keuntungan pemisahan bus instruksi dan data pada arsitektur Harvard?","Pengambilan instruksi dan akses data dapat berjalan bersamaan.","EEPROM menjadi tak terbatas.","Clock tidak diperlukan.","GPIO tidak memakai energi."),
("Apa fungsi resistor pull-up?","Menjaga input pada logika tinggi ketika tidak digerakkan.","Menambah flash.","Menghapus bouncing sepenuhnya.","Mengubah ADC menjadi DAC."),
("Apa fungsi ADC?","Mengubah sinyal analog menjadi representasi digital.","Mengubah IP menjadi MAC.","Mengalokasikan heap.","Mengenkripsi firmware."),
("Kapan interrupt berguna?","Untuk merespons kejadian tanpa polling terus-menerus.","Hanya setelah program selesai.","Untuk mengganti RAM.","Untuk menghapus firmware."),
("Apa ciri komunikasi I2C?","Menggunakan jalur SDA dan SCL.","Selalu memakai delapan jalur data.","Tidak mempunyai alamat perangkat.","Tidak memakai clock."),
("Apa yang berubah saat duty cycle PWM dinaikkan?","Proporsi waktu aktif dalam satu periode meningkat.","Frekuensi pasti nol.","Tegangan suplai otomatis naik.","RAM bertambah."),
("Apa peran watchdog timer?","Memicu pemulihan ketika program tidak merespons dalam batas waktu.","Menyimpan file.","Menggantikan regulator.","Menambah bandwidth."),
("Apa arti sistem real-time?","Kebenaran sistem juga bergantung pada batas waktu respons.","Sistem selalu online.","Sistem tanpa OS.","Sistem dengan clock tertinggi."),
("Apa fungsi decoupling capacitor dekat IC?","Membantu menstabilkan suplai lokal.","Menambah resolusi layar.","Mengubah SPI menjadi UART.","Menggantikan memori."),
("Mengapa akses variabel bersama pada ISR perlu diperhatikan?","Akses bersamaan dapat menimbulkan race condition.","ISR selalu memiliki RAM terpisah.","Semua optimasi compiler dilarang.","Semua variabel otomatis atomik.")],
"SC-02":[
("Apa tujuan pembagian data latih dan uji?","Menilai model pada data yang tidak dipakai untuk pelatihan.","Menduplikasi label.","Menjamin akurasi 100 persen.","Menghapus kebutuhan evaluasi."),
("Apa gejala overfitting?","Kinerja baik pada data latih tetapi turun pada data baru.","Kinerja selalu sama.","Model tidak memiliki parameter.","Semua fitur nol."),
("Apa tujuan normalisasi fitur?","Menyesuaikan skala fitur agar sebanding.","Membenarkan semua label.","Menghapus semua outlier.","Menghapus validasi."),
("Apa arti false positive?","Sampel negatif diprediksi positif.","Sampel positif diprediksi positif.","Sampel negatif diprediksi negatif.","Sampel positif dihapus."),
("Apa fungsi loss function?","Mengukur kesalahan prediksi untuk optimasi.","Menyimpan gambar.","Menggantikan label.","Menambah sampel otomatis."),
("Apa ciri supervised learning?","Menggunakan target/label saat pelatihan.","Tidak menggunakan data.","Selalu lebih akurat.","Hanya memproses teks."),
("Apa kegunaan confusion matrix?","Merangkum label aktual dan prediksi.","Mengubah CPU.","Mengenkripsi dataset.","Mengukur ukuran file."),
("Apa fungsi convolution pada CNN?","Mengekstraksi pola lokal melalui filter yang digeser.","Mengacak label.","Menghapus semua hubungan spasial.","Menyimpan metadata jaringan."),
("Apa tujuan cross-validation?","Mengevaluasi model melalui beberapa pembagian data.","Menggabungkan data uji tanpa evaluasi.","Mengganti fitur dengan indeks.","Menjamin model bebas bias."),
("Apa yang dimaksud data leakage?","Informasi yang seharusnya tidak tersedia saat prediksi masuk ke pelatihan.","Dataset tidak dikompresi.","Komputer tidak punya GPU.","Kelas lebih dari dua.")],
"JDF-03":[
("Apa fungsi DNS?","Memetakan nama domain ke informasi alamat.","Mengenkripsi semua lalu lintas.","Menggantikan MAC.","Menyimpan kata sandi."),
("Apa peran subnet mask?","Membedakan bagian jaringan dan host pada alamat IP.","Menentukan kata sandi Wi-Fi.","Menyimpan routing seluruh internet.","Menggantikan kabel."),
("Apa fungsi TCP sequence number?","Membantu pengurutan byte dan keandalan pengiriman.","Memilih warna UI.","Menyimpan DNS.","Menambah daya antena."),
("Apa prinsip least privilege?","Memberikan hak akses minimum yang diperlukan.","Semua akun mendapat akses admin.","Menonaktifkan autentikasi.","Satu kata sandi untuk semua layanan."),
("Mengapa hash dipakai pada bukti digital?","Membantu memeriksa integritas data.","Menjamin identitas pembuat tanpa informasi lain.","Mengembalikan semua file terhapus.","Mengenkripsi file otomatis."),
("Apa tujuan chain of custody?","Mendokumentasikan penguasaan dan penanganan barang bukti.","Mengganti isi bukti.","Mempercepat Wi-Fi.","Menyembunyikan perubahan."),
("Apa fungsi firewall?","Menyaring lalu lintas berdasarkan kebijakan.","Memperbaiki semua kerentanan.","Menghapus kebutuhan backup.","Menggantikan autentikasi."),
("Apa perbedaan utama HTTPS dan HTTP?","HTTPS memakai TLS untuk melindungi komunikasi.","HTTPS tidak memakai jaringan.","HTTP selalu lebih aman.","HTTPS tidak perlu sertifikat."),
("Mengapa forensik memakai salinan kerja?","Untuk menjaga bukti asli dan mengurangi risiko perubahan.","Mengubah semua timestamp.","Menghapus dokumentasi.","Mengganti hash asli."),
("Apa karakteristik phishing?","Menipu pengguna agar memberikan informasi atau menjalankan tindakan.","Protokol penemuan router.","Kompresi lossless.","Penjadwalan CPU.")]}

def seed(db,user):
    if one(db,"fuzzy_model_versions",version_code="DEMO-EXAMPLE-001"):
        raise ValueError("Seed DEMO sudah ada; tidak ditimpa.")
    identifier=add(db,"fuzzy_model_versions",version_code="DEMO-EXAMPLE-001",method="MAMDANI",defuzzification="CENTROID",sampling_step=0.1,status="DRAFT",created_by=user["id"])
    specs=rows(db,"specializations",is_active=True)
    for index,spec in enumerate(specs,1):
        code="DEMO-MK-"+str(index)
        course=one(db,"courses",code=code)
        course_id=course["id"] if course else add(db,"courses",code=code,name="[CONTOH] Pengantar "+spec["name"],semester=1,credits=3,is_active=True)
        for target in specs:
            add(db,"course_weights",model_version_id=identifier,course_id=course_id,specialization_id=target["id"],weight=1 if target["id"]==spec["id"] else 0.2,is_required=True)
    for letter,points in [("A",4),("B",3),("C",2),("D",1),("E",0)]:
        add(db,"grade_conversions",model_version_id=identifier,letter_grade=letter,grade_points=points,normalized_score=points*25)
    set_ids={}
    for code in ["ACADEMIC","COMPETENCY","SUITABILITY"]:
        variable=add(db,"fuzzy_variables",model_version_id=identifier,code=code,direction="OUTPUT" if code=="SUITABILITY" else "INPUT",domain_min=0,domain_max=100)
        for label,(shape,points) in PARAMETERS.items():
            set_ids[(code,label)]=add(db,"fuzzy_sets",variable_id=variable,code=label,shape=shape,**dict(zip(["point_a","point_b","point_c","point_d"],points)))
    for spec in specs:
        for i,a in enumerate(["LOW","MEDIUM","HIGH"]):
            for j,c in enumerate(["LOW","MEDIUM","HIGH"]):
                add(db,"fuzzy_rules",model_version_id=identifier,specialization_id=spec["id"],rule_code="R"+str(i*3+j+1),
                    academic_set_id=set_ids[("ACADEMIC",a)],competency_set_id=set_ids[("COMPETENCY",c)],
                    output_set_id=set_ids[("SUITABILITY",CONSEQUENTS[i][j])],operator="AND",rule_weight=1)
        for n,(a,c) in enumerate(CASES,1):
            expected=exact_reference(a,c)
            add(db,"fuzzy_validation_cases",model_version_id=identifier,specialization_id=spec["id"],case_code="TECH-S"+str(n).zfill(2),
                academic_input=a,competency_input=c,expected_min=max(0,expected-0.002),expected_max=min(100,expected+0.002))
        for index,data in enumerate(QUESTION_DATA[spec["code"]],1):
            q=add(db,"questions",specialization_id=spec["id"],code="DEMO-"+spec["code"]+"-"+str(index).zfill(2),revision=1,
                  prompt="[CONTOH TEKNIS] "+data[0],explanation="Kunci contoh teknis; wajib ditinjau dosen sebelum penggunaan akademik.",status="DRAFT")
            for option_index,text in enumerate(data[1:]):
                add(db,"question_options",question_id=q,label="ABCD"[option_index],option_text=text,is_correct=option_index==0)
    audit(db,user,"SEED_DEMO","fuzzy_model_versions",identifier,after={"status":"DRAFT","purpose":"TECHNICAL_EXAMPLE"})
    return identifier

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--admin-email",required=True)
    args=parser.parse_args()
    with engine.begin() as db:
        user=one(db,"admin_users",email=args.admin_email.lower(),is_active=True)
        if not user:
            raise SystemExit("Admin aktif tidak ditemukan.")
        try:
            identifier=seed(db,user)
        except ValueError as exc:
            raise SystemExit(str(exc))
    print("Model DRAFT",identifier,"dan 30 soal DRAFT dibuat. Tidak ada publikasi otomatis.")
    print("Rentang ekspektasi teknis bukan bukti validasi akademik.")

if __name__=="__main__":
    main()
