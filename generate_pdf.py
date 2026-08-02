import sys
import os
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 9)
        self.setFillColor(colors.HexColor("#71717a"))
        
        # Header (pages > 1)
        if self._pageNumber > 1:
            self.drawString(54, 800, "PICK YOUR PHOTO — SaaS Selection Platform for Photographers")
            self.setStrokeColor(colors.HexColor("#e4e4e7"))
            self.setLineWidth(0.5)
            self.line(54, 792, 541, 792)
            
        # Footer (all pages)
        page_str = f"Halaman {self._pageNumber} dari {page_count}"
        self.drawRightString(541, 36, page_str)
        self.drawString(54, 36, "Dokumen Penawaran & Survei Validasi Pasar — Rahasia / Internal")
        self.setStrokeColor(colors.HexColor("#e4e4e7"))
        self.setLineWidth(0.5)
        self.line(54, 48, 541, 48)
        
        self.restoreState()

def create_saas_pdf(filename="Pick_Your_Photo_SaaS_Presentation_and_Survey.pdf"):
    doc = SimpleDocTemplate(
        filename,
        pagesize=A4,
        leftMargin=54,
        rightMargin=54,
        topMargin=64,
        bottomMargin=60
    )
    
    styles = getSampleStyleSheet()
    
    # Custom Palette
    PRIMARY = colors.HexColor("#4f46e5")    # Indigo
    SECONDARY = colors.HexColor("#0284c7")  # Sky Blue
    DARK_TEXT = colors.HexColor("#18181b")  # Dark Zinc
    MUTED_TEXT = colors.HexColor("#52525b") # Zinc 600
    BG_LIGHT = colors.HexColor("#f8fafc")   # Slate 50
    BORDER_COLOR = colors.HexColor("#cbd5e1")

    # Typography Styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=22,
        leading=26,
        textColor=PRIMARY,
        spaceAfter=6
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        leading=15,
        textColor=MUTED_TEXT,
        spaceAfter=15
    )

    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=PRIMARY,
        spaceBefore=14,
        spaceAfter=8,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'Heading2_Custom',
        parent=styles['Heading3'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=SECONDARY,
        spaceBefore=10,
        spaceAfter=6,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['BodyText'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        textColor=DARK_TEXT,
        spaceAfter=8
    )

    bullet_style = ParagraphStyle(
        'Bullet_Custom',
        parent=body_style,
        leftIndent=15,
        firstLineIndent=-10,
        spaceAfter=4
    )

    callout_style = ParagraphStyle(
        'CalloutText',
        parent=body_style,
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#1e293b")
    )

    story = []

    # -------------------------------------------------------------------------
    # COVER / HEADER BANNER
    # -------------------------------------------------------------------------
    story.append(Paragraph("PICK YOUR PHOTO", title_style))
    story.append(Paragraph("Platform SaaS Seleksi Foto Klien Otomatis untuk Fotografer & Studio Foto", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=2, color=PRIMARY, spaceBefore=0, spaceAfter=14))

    # Meta Banner Box
    meta_data = [
        [
            Paragraph("<b>Target Dokumen:</b> Proposal Produk & Draft Survey Vendor", body_style),
            Paragraph("<b>Tanggal:</b> Juli 2026", body_style),
            Paragraph("<b>Status:</b> Market Validation Phase", body_style)
        ]
    ]
    meta_table = Table(meta_data, colWidths=[200, 120, 167])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#eef2ff")),
        ('BORDER', (0,0), (-1,-1), 1, colors.HexColor("#c7d2fe")),
        ('PADDING', (0,0), (-1,-1), 8),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 14))

    # -------------------------------------------------------------------------
    # SECTION 1: RINGKASAN EKSEKUTIF & PERUNTUKAN (USE CASES)
    # -------------------------------------------------------------------------
    story.append(Paragraph("1. Ringkasan Eksekutif & Peruntukan Platform", h1_style))
    story.append(Paragraph(
        "<b>Pick Your Photo</b> adalah platform Web SaaS (Software as a Service) yang dirancang khusus untuk memodernisasi "
        "dan mengotomatisasi alur kerja (workflow) paska-produksi bagi vendor fotografi dan studio foto. Platform ini menjembatani "
        "proses antara pengiriman foto mentah (staging) hingga pemilihan foto final oleh klien sebelum masuk ke tahap editing/cetak album.",
        body_style
    ))
    
    story.append(Paragraph("Target Pengguna & Peruntukan (Use Cases):", h2_style))
    
    use_cases = [
        ("📸 <b>Fotografer Pernikahan (Wedding & Pre-wedding):</b>", "Mengelola ribuan foto mentah dengan ribuan calon pilihan klien tanpa perlu kirim flashdisk atau WhatsApp list manual."),
        ("🤱 <b>Studio Foto & Maternity / Newborn:</b>", "Mempermudah orang tua memilih foto terbaik keluarga dengan tampilan galeri estetik dan aman dari HP."),
        ("🎓 <b>Event & Wisuda (Graduation / Corporate):</b>", "Mengatur grup foto masal dan membatasi kuota pilihan sesuai paket yang dibeli klien."),
        ("🎥 <b>Photobooth & Commercial Photography:</b>", "Mempercepat seleksi produk / sampel gambar komersial secara real-time dan terstruktur.")
    ]
    
    for title, desc in use_cases:
        story.append(Paragraph(f"• {title} {desc}", bullet_style))
    
    story.append(Spacer(1, 10))

    # -------------------------------------------------------------------------
    # SECTION 2: MASALAH VENDOR & SOLUSI FITUR (PAIN POINTS & SOLUTIONS)
    # -------------------------------------------------------------------------
    story.append(Paragraph("2. Analisis Permasalahan Vendor & Solusi", h1_style))
    story.append(Paragraph(
        "Berdasarkan pengalaman fotografer di lapangan, alur seleksi foto tradisional memiliki banyak hambatan operasional "
        "yang memicu kerugian waktu dan biaya. Berikut adalah pemetaan masalah dan solusi yang ditawarkan Pick Your Photo:",
        body_style
    ))

    problems_data = [
        ["Masalah Alur Tradisional (Pain Points)", "Solusi Pick Your Photo (SaaS Feature)"],
        [
            Paragraph("<b>Klien Lambat Memilih Foto</b><br/>Proses lewat Google Drive / WhatsApp memakan waktu berminggu-minggu karena tidak ada batas waktu otomatis.", body_style),
            Paragraph("<b>Galeri Interaktif + Batas Waktu Expired</b><br/>Tampilan galeri modern dengan countdown timer expired dan batas maksimal kuota foto yang transparan.", body_style)
        ],
        [
            Paragraph("<b>Format Pilihan Klien Berantakan</b><br/>Klien sering mengirim screenshot HP atau list nomor file ketik manual yang rentan salah ketik.", body_style),
            Paragraph("<b>One-Click Selection & Rekap Otomatis</b><br/>Klien cukup klik icon favorit/pilih foto. Sistem merekap daftar nama file secara 100% presisi.", body_style)
        ],
        [
            Paragraph("<b>Upload Manual Berulang-ulang</b><br/>Fotografer harus upload foto berukuran gigabyte ke banyak platform terpisah.", body_style),
            Paragraph("<b>Integrasi Otomatis Google Drive Import</b><br/>Cukup masukkan link folder GDrive, sistem langsung mengimpor foto secara aman di background worker.", body_style)
        ],
        [
            Paragraph("<b>Keamanan & Privasi Terancam</b><br/>Link GDrive rawan disebar ke pihak ketiga tanpa izin vendor/klien.", body_style),
            Paragraph("<b>Proteksi Akses PIN & Kunci Seleksi</b><br/>Akses galeri dilindungi PIN opsional dan galeri langsung terkunci (read-only) begitu seleksi dikirim.", body_style)
        ],
        [
            Paragraph("<b>Biaya Storage Pembengkakan</b><br/>Kapasitas disk server membengkak akibat foto-foto lama yang ditinggal klien.", body_style),
            Paragraph("<b>Manajemen Storage & Kebijakan Auto-Delete</b><br/>Sistem mendukung pembersihan foto staging otomatis pasca-seleksi dan fleksibilitas kuota disk.", body_style)
        ]
    ]

    prob_table = Table(problems_data, colWidths=[240, 247])
    prob_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (1,0), PRIMARY),
        ('TEXTCOLOR', (0,0), (1,0), colors.white),
        ('FONTNAME', (0,0), (1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (1,0), 9.5),
        ('PADDING', (0,0), (-1,-1), 6),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BACKGROUND', (0,1), (0,-1), colors.HexColor("#f1f5f9")),
        ('BACKGROUND', (1,1), (1,-1), colors.HexColor("#ffffff")),
    ]))
    story.append(prob_table)
    story.append(Spacer(1, 14))

    # -------------------------------------------------------------------------
    # SECTION 3: KEUNTUNGAN UTAMA BAGI VENDOR (VALUE PROPOSITION)
    # -------------------------------------------------------------------------
    story.append(Paragraph("3. Keuntungan Utama Bagi Vendor (Value Proposition)", h1_style))

    values = [
        ("⚡ <b>Efisiensi Waktu Hingga 80%:</b>", "Proses seleksi yang biasa memakan waktu 2-4 minggu dapat diselesaikan klien dalam 1-3 hari karena UI galeri yang sangat intuitif di Smartphone."),
        ("🎨 <b>Professional Custom Branding:</b>", "Vendor dapat menampilkan nama brand, logo, warna identitas, dan link kontak sendiri pada setiap galeri klien, meningkatkan prestige brand."),
        ("🔒 <b>Keamanan & Proteksi Karya:</b>", "Foto dilindungi dari unduhan resolusi tinggi tanpa izin sebelum pembayaran/proses editing selesai, dilengkapi sistem PIN unik per project."),
        ("📊 <b>Kontrol Terpusat di Admin Console:</b>", "Vendor memiliki dashboard untuk memantau status semua project (Pending, In-Progress, Completed) serta kuota paket langganan secara realtime."),
        ("💰 <b>Skema Harga Terjangkau & Fleksibel:</b>", "Tersedia pilihan paket berbasis *Project Limit* maupun *Storage Capacity* sesuai dengan skala bisnis vendor (dari freelancer hingga studio besar).")
    ]

    for title, desc in values:
        story.append(Paragraph(f"• {title} {desc}", bullet_style))

    story.append(Spacer(1, 14))
    story.append(PageBreak()) # Clean transition to Survey section

    # -------------------------------------------------------------------------
    # SECTION 4: FRAMEWORK SURVEI URGENSI VENDOR (MARKET VALIDATION SURVEY)
    # -------------------------------------------------------------------------
    story.append(Paragraph("4. Rencana & Draft Survei Urgensi Pasar (Vendor Survey)", h1_style))
    story.append(Paragraph(
        "Dokumen survei ini dirancang untuk divalidasikan kepada target calon pengguna (Vendor Fotografi/Studio) "
        "guna mengukur seberapa mendesak kebutuhan aplikasi ini serta mengukur keberanian membayar (Willingness to Pay).",
        body_style
    ))
    story.append(Spacer(1, 6))

    # Survey Section A
    story.append(Paragraph("BAGIAN A: Profil & Volume Pekerjaan Vendor", h2_style))
    q_a = [
        "1. Apa jenis layanan fotografi utama bisnis Anda? <i>(Wedding / Studio / Event / Produk / Lainnya)</i>",
        "2. Rata-rata berapa banyak project/klien yang Anda tangani dalam kurun waktu 1 bulan?",
        "3. Berapa rata-rata jumlah foto mentah (staging) yang Anda serahkan ke klien untuk dipilih per project?"
    ]
    for q in q_a:
        story.append(Paragraph(f"• {q}", bullet_style))

    # Survey Section B
    story.append(Paragraph("BAGIAN B: Evaluasi Alur Seleksi Saat Ini (Pain Point Validation)", h2_style))
    q_b = [
        "4. Metode apa yang saat ini Anda gunakan untuk alur pemisahan/seleksi foto oleh klien?<br/>"
        "   [ ] Google Drive / Dropbox (klien ketik nama file manual)<br/>"
        "   [ ] Kirim screenshot via WhatsApp / Email<br/>"
        "   [ ] Klien datang langsung ke studio foto<br/>"
        "   [ ] Aplikasi penyeleksi foto lain",
        "5. Seberapa sering Anda mengalami masalah klien lambat memilih foto (> 2 minggu)?<br/>"
        "   [ ] Sangat Sering & Sangat Mengganggu | [ ] Kadang-kadang | [ ] Jarang",
        "6. Berapa lama rata-rata waktu yang terbuang oleh tim Anda hanya untuk mencocokkan nomor file pilihan klien?",
        "7. Seberapa besar skala masalah ini berdampak pada keterlambatan jadwal cetak album / editing Anda?<br/>"
        "   (Skala 1 - 5: 1 = Tidak Masalah, 5 = Sangat Menghambat Operasional)"
    ]
    for q in q_b:
        story.append(Paragraph(f"• {q}", bullet_style))

    # Survey Section C
    story.append(Paragraph("BAGIAN C: Validasi Fitur & Minat Penggunaan (Feature Urgency)", h2_style))
    story.append(Paragraph("Seberapa penting fitur-fitur berikut jika tersedia dalam 1 aplikasi web?", body_style))

    fitur_table_data = [
        ["Fitur Utama Pick Your Photo", "Tingkat Kepentingan bagi Vendor"],
        ["Import foto otomatis dari Google Drive Folder", "[ ] Sangat Penting | [ ] Cukup | [ ] Tidak"],
        ["Tampilan Galeri HP estetik khusus nama Brand Anda", "[ ] Sangat Penting | [ ] Cukup | [ ] Tidak"],
        ["Sistem Kunci Otomatis (klien tidak bisa ubah setelah submit)", "[ ] Sangat Penting | [ ] Cukup | [ ] Tidak"],
        ["Fitur Pengingat Expired otomatis bagi Klien", "[ ] Sangat Penting | [ ] Cukup | [ ] Tidak"],
        ["Proteksi PIN Galeri & Watermark Keamanan Foto", "[ ] Sangat Penting | [ ] Cukup | [ ] Tidak"]
    ]
    fitur_table = Table(fitur_table_data, colWidths=[260, 227])
    fitur_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (1,0), SECONDARY),
        ('TEXTCOLOR', (0,0), (1,0), colors.white),
        ('FONTNAME', (0,0), (1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (1,0), 9.5),
        ('PADDING', (0,0), (-1,-1), 6),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BACKGROUND', (0,1), (-1,-1), BG_LIGHT),
    ]))
    story.append(fitur_table)
    story.append(Spacer(1, 10))

    # Survey Section D
    story.append(Paragraph("BAGIAN D: Ekspektasi Harga & Willingness to Pay (WTP)", h2_style))
    q_d = [
        "8. Jika platform ini dapat menghemat waktu tim Anda hingga 80% dan membuat alur kerja tampak profesional, berapa anggaran bulanan yang wajar menurut Anda?<br/>"
        "   [ ] Rp 50.000 - Rp 100.000 / bulan (Paket Pemula)<br/>"
        "   [ ] Rp 100.000 - Rp 250.000 / bulan (Paket Pro / Studio)<br/>"
        "   [ ] > Rp 250.000 / bulan (Paket Unlimited Storage)<br/>"
        "   [ ] Lebih memilih skema bayar per-project (Pay-per-Project)",
        "9. Apakah Anda bersedia menjadi <b>Early Adopter (Uji Coba Gratis 14 Hari)</b> saat platform ini siap digunakan?<br/>"
        "   [ ] YA, Daftarkan saya | [ ] Ragu-ragu | [ ] Tidak Berminat",
        "10. Masukan atau fitur tambahan apa yang wajib ada menurut Anda agar platform ini sempurna?"
    ]
    for q in q_d:
        story.append(Paragraph(f"• {q}", bullet_style))

    story.append(Spacer(1, 14))

    # Callout Summary Box
    callout_data = [[
        Paragraph(
            "<b>💡 Catatan Pelaksanaan Survei:</b><br/>"
            "Gunakan draf survei di atas melalui format <i>Google Forms</i> atau wawancara langsung (1-on-1 interview) "
            "dengan minimal 10-20 vendor fotografi lokal untuk mendapatkan sampel validasi kebutuhan pasar sebelum peluncuran resmi.",
            callout_style
        )
    ]]
    callout_table = Table(callout_data, colWidths=[487])
    callout_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#fef3c7")),
        ('BORDER', (0,0), (-1,-1), 1, colors.HexColor("#fde68a")),
        ('PADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(callout_table)

    # Build Document
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"PDF successfully created: {filename}")

if __name__ == '__main__':
    create_saas_pdf()
