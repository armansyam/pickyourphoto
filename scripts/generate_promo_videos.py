#!/usr/bin/env python3
"""
Motion Graphics Generator for Pick Your Photo Promo Videos (Instagram Ready).
Renders 60 FPS crisp MP4 videos (H.264, 1080p, CRF 17, 30 Mbps).
Brand Palette: Warm Ivory (#FAF8F5), Brass Gold (#C5A059), Brass Dark (#8C6D23), Paper (#1C1917).
"""

import os
import sys
import math
import subprocess
import shutil
from PIL import Image, ImageDraw, ImageFont, ImageFilter

OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "videos_instagram")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# System fonts on macOS
FONT_SERIF_BOLD = '/System/Library/Fonts/Supplemental/Georgia Bold.ttf'
FONT_SERIF_ITALIC = '/System/Library/Fonts/Supplemental/Georgia Italic.ttf'
FONT_SANS_BOLD = '/System/Library/Fonts/Supplemental/Arial Bold.ttf'
FONT_SANS_REG = '/System/Library/Fonts/Supplemental/Arial.ttf'

def get_font(path, size):
    try:
        return ImageFont.truetype(path, size)
    except Exception:
        return ImageFont.load_default()

def lerp(a, b, t):
    return a + (b - a) * t

def ease_in_out(t):
    # Smooth Hermite interpolation (0 to 1)
    t = max(0.0, min(1.0, t))
    return t * t * (3.0 - 2.0 * t)

def ease_out_back(t):
    # Elastic overshoot
    t = max(0.0, min(1.0, t))
    c1 = 1.70158
    c3 = c1 + 1.0
    return 1.0 + c3 * math.pow(t - 1.0, 3) + c1 * math.pow(t - 1.0, 2)

def draw_cursor(draw, x, y, scale=1.0):
    # Modern sleek cursor
    pts = [
        (x, y),
        (x + 18 * scale, y + 42 * scale),
        (x + 26 * scale, y + 26 * scale),
        (x + 44 * scale, y + 20 * scale),
    ]
    # Shadow
    shadow_pts = [(px + 4 * scale, py + 6 * scale) for px, py in pts]
    draw.polygon(shadow_pts, fill=(0, 0, 0, 70))
    # Main cursor
    draw.polygon(pts, fill=(197, 160, 89, 255), outline=(255, 255, 255, 255), width=int(3 * scale))

def draw_rounded_rect(draw, bbox, radius, fill=None, outline=None, width=1):
    x0, y0, x1, y1 = bbox
    draw.rounded_rectangle([x0, y0, x1, y1], radius=radius, fill=fill, outline=outline, width=width)

def draw_star(draw, cx, cy, r, fill=(197, 160, 89, 255)):
    points = []
    for i in range(10):
        angle = i * math.pi / 5.0 - math.pi / 2.0
        current_r = r if i % 2 == 0 else r * 0.45
        points.append((cx + current_r * math.cos(angle), cy + current_r * math.sin(angle)))
    draw.polygon(points, fill=fill)

# =========================================================================
# VIDEO 1: PERKENALAN PLATFORM (0 Byte Storage & Auto Sortir)
# =========================================================================
def render_frame_video1(width, height, t, total_t=9.0):
    img = Image.new("RGBA", (width, height), (250, 248, 245, 255))
    draw = ImageDraw.Draw(img)

    # Ambient Gold Radial Glow
    is_vertical = height > width
    base_scale = height / 1920.0 if is_vertical else width / 1920.0
    
    # Subtly changing ambient glow
    glow_radius = int(width * 0.7)
    glow_img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow_img)
    glow_draw.ellipse([width//2 - glow_radius, -int(height*0.2), width//2 + glow_radius, int(height*0.6)], fill=(197, 160, 89, 28))
    glow_img = glow_img.filter(ImageFilter.GaussianBlur(int(80 * base_scale)))
    img.paste(glow_img, (0, 0), glow_img)

    # 3 Scenes: 0-3s (Problem), 3-6s (Solution), 6-9s (CTA)
    scene_idx = min(int(t / 3.0), 2)
    scene_p = (t - scene_idx * 3.0) / 3.0 # 0 to 1

    # Header Brand Pill (Always visible on top)
    header_y = int(80 * base_scale)
    draw_rounded_rect(draw, (int(60*base_scale), header_y, int(width - 60*base_scale), header_y + int(90*base_scale)), int(24*base_scale), fill=(255, 255, 255, 230), outline=(197, 160, 89, 100), width=int(2*base_scale))
    
    font_brand = get_font(FONT_SERIF_BOLD, int(34 * base_scale))
    font_badge = get_font(FONT_SANS_BOLD, int(22 * base_scale))
    draw.text((int(100*base_scale), header_y + int(24*base_scale)), "PICK YOUR PHOTO", fill=(28, 25, 23, 255), font=font_brand)
    
    badge_w = int(220 * base_scale)
    draw_rounded_rect(draw, (width - int(100*base_scale) - badge_w, header_y + int(18*base_scale), width - int(100*base_scale), header_y + int(72*base_scale)), int(16*base_scale), fill=(197, 160, 89, 45), outline=(197, 160, 89, 150), width=int(2*base_scale))
    draw.text((width - int(90*base_scale) - badge_w + int(20*base_scale), header_y + int(28*base_scale)), "FOTOGRAFER SAAS", fill=(140, 109, 35, 255), font=font_badge)

    # Content Area
    content_y = header_y + int(160 * base_scale)
    
    if scene_idx == 0:
        # SCENE 1: MASALAH GOOGLE DRIVE MANUAL
        font_tag = get_font(FONT_SANS_BOLD, int(26 * base_scale))
        font_h1 = get_font(FONT_SERIF_BOLD, int(64 * base_scale))
        font_italic = get_font(FONT_SERIF_ITALIC, int(64 * base_scale))
        font_sub = get_font(FONT_SANS_REG, int(32 * base_scale))

        # Tag
        draw_rounded_rect(draw, (int(60*base_scale), content_y, int(60*base_scale + 440*base_scale), content_y + int(56*base_scale)), int(18*base_scale), fill=(220, 38, 38, 30), outline=(220, 38, 38, 120), width=int(2*base_scale))
        draw.text((int(85*base_scale), content_y + int(12*base_scale)), "❌ STOP CARA MANUAL", fill=(185, 28, 28, 255), font=font_tag)

        # Headline
        h_y = content_y + int(85 * base_scale)
        draw.text((int(60*base_scale), h_y), "Klien Pusing Pilih", fill=(28, 25, 23, 255), font=font_h1)
        draw.text((int(60*base_scale), h_y + int(76*base_scale)), "Ribuan Foto di Drive?", fill=(140, 109, 35, 255), font=font_italic)
        
        # Subtitle
        sub_y = h_y + int(170 * base_scale)
        draw.text((int(60*base_scale), sub_y), "Kirim folder Drive bikin klien bingung catat", fill=(87, 83, 78, 255), font=font_sub)
        draw.text((int(60*base_scale), sub_y + int(45*base_scale)), "nomor file satu per satu di WhatsApp.", fill=(87, 83, 78, 255), font=font_sub)

        # Problem Mockup Card
        card_y = sub_y + int(120 * base_scale)
        card_w = width - int(120 * base_scale)
        card_h = int(580 * base_scale) if is_vertical else int(380 * base_scale)
        draw_rounded_rect(draw, (int(60*base_scale), card_y, int(60*base_scale + card_w), card_y + card_h), int(28*base_scale), fill=(255, 255, 255, 255), outline=(252, 165, 165, 200), width=int(2*base_scale))

        # Drive file items
        font_code = get_font(FONT_SANS_BOLD, int(30 * base_scale))
        files = ["IMG_0492.JPG  (Drive - 24 MB)", "IMG_0493.JPG  (Drive - 22 MB)", "IMG_0494.JPG  (Klien bingung yang mana?)"]
        for i, f_text in enumerate(files):
            fy = card_y + int((50 + i * 90) * base_scale)
            bg_col = (254, 242, 242, 255) if i == 2 else (250, 250, 250, 255)
            border_col = (248, 113, 113, 180) if i == 2 else (230, 230, 230, 255)
            draw_rounded_rect(draw, (int(100*base_scale), fy, int(60*base_scale + card_w - 40*base_scale), fy + int(70*base_scale)), int(14*base_scale), fill=bg_col, outline=border_col, width=int(2*base_scale))
            col = (185, 28, 28, 255) if i == 2 else (87, 83, 78, 255)
            draw.text((int(130*base_scale), fy + int(18*base_scale)), f_text, fill=col, font=font_code)

        # Warning Pill Bottom
        warn_y = card_y + card_h - int(120 * base_scale)
        draw_rounded_rect(draw, (int(100*base_scale), warn_y, int(60*base_scale + card_w - 40*base_scale), warn_y + int(80*base_scale)), int(18*base_scale), fill=(254, 242, 242, 255), outline=(239, 68, 68, 200), width=int(2*base_scale))
        draw.text((int(130*base_scale), warn_y + int(24*base_scale)), "⚠️ Butuh 3–5 hari hanya untuk sortir foto!", fill=(220, 38, 38, 255), font=font_tag)

        # Animated cursor hovering over IMG_0494
        cur_progress = ease_in_out(scene_p)
        cur_x = int(lerp(width * 0.8, width * 0.45, cur_progress))
        cur_y = int(lerp(height * 0.9, card_y + int(240 * base_scale), cur_progress))
        draw_cursor(draw, cur_x, cur_y, base_scale)

    elif scene_idx == 1:
        # SCENE 2: GALERI MEWAH 1-CLICK & AUTO SORTIR
        font_tag = get_font(FONT_SANS_BOLD, int(26 * base_scale))
        font_h1 = get_font(FONT_SERIF_BOLD, int(64 * base_scale))
        font_italic = get_font(FONT_SERIF_ITALIC, int(64 * base_scale))
        font_sub = get_font(FONT_SANS_REG, int(32 * base_scale))

        draw_rounded_rect(draw, (int(60*base_scale), content_y, int(60*base_scale + 480*base_scale), content_y + int(56*base_scale)), int(18*base_scale), fill=(197, 160, 89, 35), outline=(197, 160, 89, 150), width=int(2*base_scale))
        draw.text((int(85*base_scale), content_y + int(12*base_scale)), "✨ SOLUSI MODERN FOTOGRAFER", fill=(140, 109, 35, 255), font=font_tag)

        h_y = content_y + int(85 * base_scale)
        draw.text((int(60*base_scale), h_y), "Galeri Mewah 1-Click", fill=(28, 25, 23, 255), font=font_h1)
        draw.text((int(60*base_scale), h_y + int(76*base_scale)), "Magic Sortir Otomatis", fill=(140, 109, 35, 255), font=font_italic)

        sub_y = h_y + int(170 * base_scale)
        draw.text((int(60*base_scale), sub_y), "Klien buka di smartphone, klik bintang favorit,", fill=(87, 83, 78, 255), font=font_sub)
        draw.text((int(60*base_scale), sub_y + int(45*base_scale)), "nomor foto langsung terekam rapi seketika.", fill=(87, 83, 78, 255), font=font_sub)

        # Gallery Mockup Card
        card_y = sub_y + int(120 * base_scale)
        card_w = width - int(120 * base_scale)
        card_h = int(600 * base_scale) if is_vertical else int(380 * base_scale)
        draw_rounded_rect(draw, (int(60*base_scale), card_y, int(60*base_scale + card_w), card_y + card_h), int(28*base_scale), fill=(255, 255, 255, 255), outline=(197, 160, 89, 120), width=int(2*base_scale))

        # Top status
        font_m_title = get_font(FONT_SANS_BOLD, int(30 * base_scale))
        draw.text((int(100*base_scale), card_y + int(36*base_scale)), "Wedding Rama & Shinta", fill=(140, 109, 35, 255), font=font_m_title)
        
        # Selected Counter
        sel_count = "15/20 Dipilih" if scene_p > 0.4 else "14/20 Dipilih"
        draw_rounded_rect(draw, (int(60*base_scale + card_w - 230*base_scale), card_y + int(28*base_scale), int(60*base_scale + card_w - 30*base_scale), card_y + int(82*base_scale)), int(14*base_scale), fill=(21, 128, 61, 30), outline=(21, 128, 61, 120), width=int(2*base_scale))
        draw.text((int(60*base_scale + card_w - 210*base_scale), card_y + int(38*base_scale)), sel_count, fill=(21, 128, 61, 255), font=font_tag)

        # 3 Photo grid cards
        grid_y = card_y + int(110 * base_scale)
        col_w = int((card_w - 80*base_scale) / 3.0)
        
        for c in range(3):
            cx0 = int(60*base_scale + 25*base_scale + c * col_w)
            cx1 = cx0 + col_w - int(15*base_scale)
            cy0 = grid_y
            cy1 = cy0 + int(col_w - 15*base_scale)
            
            is_selected = (c < 2) or (c == 2 and scene_p > 0.4)
            card_bg = (245, 239, 235, 255) if not is_selected else (197, 160, 89, 45)
            card_border = (197, 160, 89, 80) if not is_selected else (140, 109, 35, 255)
            
            draw_rounded_rect(draw, (cx0, cy0, cx1, cy1), int(16*base_scale), fill=card_bg, outline=card_border, width=int(3*base_scale) if is_selected else int(2*base_scale))
            
            # Star icon
            star_col = (140, 109, 35, 255) if is_selected else (197, 160, 89, 120)
            draw_star(draw, (cx0 + cx1)//2, (cy0 + cy1)//2, int(35*base_scale), fill=star_col)
            
            if is_selected:
                draw_rounded_rect(draw, (cx0 + int(10*base_scale), cy1 - int(32*base_scale), cx1 - int(10*base_scale), cy1 - int(8*base_scale)), int(6*base_scale), fill=(140, 109, 35, 255))
                font_terpilih = get_font(FONT_SANS_BOLD, int(16 * base_scale))
                draw.text((cx0 + int(24*base_scale), cy1 - int(30*base_scale)), "TERPILIH", fill=(255, 255, 255, 255), font=font_terpilih)

        # Green storage banner
        banner_y = card_y + card_h - int(120 * base_scale)
        draw_rounded_rect(draw, (int(100*base_scale), banner_y, int(60*base_scale + card_w - 40*base_scale), banner_y + int(80*base_scale)), int(18*base_scale), fill=(240, 253, 244, 255), outline=(34, 197, 94, 200), width=int(2*base_scale))
        draw.text((int(130*base_scale), banner_y + int(24*base_scale)), "✓ 0 Byte VPS Storage — Sync Google Drive", fill=(21, 128, 61, 255), font=font_tag)

        # Cursor clicks 3rd photo card
        target_x = int(60*base_scale + 25*base_scale + 2 * col_w + col_w//2)
        target_y = grid_y + int(col_w//2)
        if scene_p < 0.4:
            t_cur = ease_in_out(scene_p / 0.4)
            cur_x = int(lerp(width * 0.1, target_x, t_cur))
            cur_y = int(lerp(height * 0.85, target_y, t_cur))
        else:
            cur_x = target_x
            cur_y = target_y
            # Click ripple pulse
            ripple_r = int((scene_p - 0.4) * 120 * base_scale)
            if ripple_r > 0:
                draw.ellipse([cur_x - ripple_r, cur_y - ripple_r, cur_x + ripple_r, cur_y + ripple_r], outline=(197, 160, 89, max(0, int(255 - (scene_p - 0.4)*400))), width=int(4*base_scale))

        draw_cursor(draw, cur_x, cur_y, base_scale)

    else:
        # SCENE 3: CTA PLATFORM
        font_tag = get_font(FONT_SANS_BOLD, int(26 * base_scale))
        font_h1 = get_font(FONT_SERIF_BOLD, int(64 * base_scale))
        font_italic = get_font(FONT_SERIF_ITALIC, int(64 * base_scale))
        font_sub = get_font(FONT_SANS_REG, int(32 * base_scale))

        draw_rounded_rect(draw, (int(60*base_scale), content_y, int(60*base_scale + 440*base_scale), content_y + int(56*base_scale)), int(18*base_scale), fill=(197, 160, 89, 35), outline=(197, 160, 89, 150), width=int(2*base_scale))
        draw.text((int(85*base_scale), content_y + int(12*base_scale)), "🚀 COBA SEKARANG GRATIS", fill=(140, 109, 35, 255), font=font_tag)

        h_y = content_y + int(85 * base_scale)
        draw.text((int(60*base_scale), h_y), "Tingkatkan Standar", fill=(28, 25, 23, 255), font=font_h1)
        draw.text((int(60*base_scale), h_y + int(76*base_scale)), "Studio Fotografi Anda", fill=(140, 109, 35, 255), font=font_italic)

        sub_y = h_y + int(170 * base_scale)
        draw.text((int(60*base_scale), sub_y), "Hemat biaya server hingga 90%, klien puas,", fill=(87, 83, 78, 255), font=font_sub)
        draw.text((int(60*base_scale), sub_y + int(45*base_scale)), "proses sortir foto jadi super cepat.", fill=(87, 83, 78, 255), font=font_sub)

        # Big CTA Box
        cta_y = sub_y + int(140 * base_scale)
        cta_w = width - int(120 * base_scale)
        cta_h = int(480 * base_scale) if is_vertical else int(340 * base_scale)
        draw_rounded_rect(draw, (int(60*base_scale), cta_y, int(60*base_scale + cta_w), cta_y + cta_h), int(32*base_scale), fill=(255, 255, 255, 255), outline=(197, 160, 89, 150), width=int(3*base_scale))

        # Brand Icon inside CTA
        icon_cx = width // 2
        icon_cy = cta_y + int(110 * base_scale)
        draw_rounded_rect(draw, (icon_cx - int(55*base_scale), icon_cy - int(55*base_scale), icon_cx + int(55*base_scale), icon_cy + int(55*base_scale)), int(22*base_scale), fill=(197, 160, 89, 255))
        draw_star(draw, icon_cx, icon_cy, int(35*base_scale), fill=(255, 255, 255, 255))

        font_pyp = get_font(FONT_SERIF_BOLD, int(46 * base_scale))
        draw.text((icon_cx - int(190*base_scale), icon_cy + int(75*base_scale)), "Pick Your Photo", fill=(28, 25, 23, 255), font=font_pyp)

        # Golden Action Button
        btn_y = cta_y + cta_h - int(150 * base_scale)
        btn_w = int(cta_w - 80*base_scale)
        draw_rounded_rect(draw, (int(100*base_scale), btn_y, int(100*base_scale + btn_w), btn_y + int(100*base_scale)), int(24*base_scale), fill=(140, 109, 35, 255), outline=(197, 160, 89, 255), width=int(3*base_scale))
        
        font_btn = get_font(FONT_SANS_BOLD, int(32 * base_scale))
        draw.text((int(100*base_scale + 40*base_scale), btn_y + int(30*base_scale)), "Coba Demo di pickyourphoto.com ↗", fill=(255, 255, 255, 255), font=font_btn)

        # Cursor clicks CTA Button
        cur_progress = ease_in_out(min(1.0, scene_p * 1.5))
        cur_x = int(lerp(width * 0.2, width * 0.6, cur_progress))
        cur_y = int(lerp(height * 0.9, btn_y + int(50*base_scale), cur_progress))
        draw_cursor(draw, cur_x, cur_y, base_scale)

    return img.convert("RGB")

# =========================================================================
# VIDEO 2: TRIAL INSTAN (Upload Sample & WA Share)
# =========================================================================
def render_frame_video2(width, height, t, total_t=8.0):
    img = Image.new("RGBA", (width, height), (250, 248, 245, 255))
    draw = ImageDraw.Draw(img)

    is_vertical = height > width
    base_scale = height / 1920.0 if is_vertical else width / 1920.0

    # Ambient Gold Radial Glow
    glow_radius = int(width * 0.7)
    glow_img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow_img)
    glow_draw.ellipse([width//2 - glow_radius, -int(height*0.2), width//2 + glow_radius, int(height*0.6)], fill=(197, 160, 89, 28))
    glow_img = glow_img.filter(ImageFilter.GaussianBlur(int(80 * base_scale)))
    img.paste(glow_img, (0, 0), glow_img)

    scene_idx = min(int(t / 4.0), 1)
    scene_p = (t - scene_idx * 4.0) / 4.0

    header_y = int(80 * base_scale)
    draw_rounded_rect(draw, (int(60*base_scale), header_y, int(width - 60*base_scale), header_y + int(90*base_scale)), int(24*base_scale), fill=(255, 255, 255, 230), outline=(197, 160, 89, 100), width=int(2*base_scale))
    font_brand = get_font(FONT_SERIF_BOLD, int(34 * base_scale))
    font_badge = get_font(FONT_SANS_BOLD, int(22 * base_scale))
    draw.text((int(100*base_scale), header_y + int(24*base_scale)), "PICK YOUR PHOTO", fill=(28, 25, 23, 255), font=font_brand)
    
    badge_w = int(240 * base_scale)
    draw_rounded_rect(draw, (width - int(100*base_scale) - badge_w, header_y + int(18*base_scale), width - int(100*base_scale), header_y + int(72*base_scale)), int(16*base_scale), fill=(21, 128, 61, 35), outline=(21, 128, 61, 150), width=int(2*base_scale))
    draw.text((width - int(90*base_scale) - badge_w + int(20*base_scale), header_y + int(28*base_scale)), "INSTANT TRIAL 1 MENIT", fill=(21, 128, 61, 255), font=font_badge)

    content_y = header_y + int(160 * base_scale)
    font_tag = get_font(FONT_SANS_BOLD, int(26 * base_scale))
    font_h1 = get_font(FONT_SERIF_BOLD, int(64 * base_scale))
    font_italic = get_font(FONT_SERIF_ITALIC, int(64 * base_scale))
    font_sub = get_font(FONT_SANS_REG, int(32 * base_scale))

    if scene_idx == 0:
        # SCENE 1: DRAG & DROP SAMPLE PHOTOS
        draw_rounded_rect(draw, (int(60*base_scale), content_y, int(60*base_scale + 480*base_scale), content_y + int(56*base_scale)), int(18*base_scale), fill=(197, 160, 89, 35), outline=(197, 160, 89, 150), width=int(2*base_scale))
        draw.text((int(85*base_scale), content_y + int(12*base_scale)), "⚡ COBA TANPA DAFTAR AKUN", fill=(140, 109, 35, 255), font=font_tag)

        h_y = content_y + int(85 * base_scale)
        draw.text((int(60*base_scale), h_y), "Coba Langsung 1 Menit", fill=(28, 25, 23, 255), font=font_h1)
        draw.text((int(60*base_scale), h_y + int(76*base_scale)), "Galeri Interaktif Jadi", fill=(140, 109, 35, 255), font=font_italic)

        sub_y = h_y + int(170 * base_scale)
        draw.text((int(60*base_scale), sub_y), "Tinggal upload beberapa foto sampel,", fill=(87, 83, 78, 255), font=font_sub)
        draw.text((int(60*base_scale), sub_y + int(45*base_scale)), "sistem otomatis buatkan halaman seleksi siap pakai.", fill=(87, 83, 78, 255), font=font_sub)

        # Upload Dropzone Box
        card_y = sub_y + int(120 * base_scale)
        card_w = width - int(120 * base_scale)
        card_h = int(580 * base_scale) if is_vertical else int(380 * base_scale)
        
        is_dropped = scene_p > 0.45
        bg_col = (255, 255, 255, 255) if not is_dropped else (240, 253, 244, 255)
        border_col = (197, 160, 89, 150) if not is_dropped else (34, 197, 94, 255)
        draw_rounded_rect(draw, (int(60*base_scale), card_y, int(60*base_scale + card_w), card_y + card_h), int(28*base_scale), fill=bg_col, outline=border_col, width=int(3*base_scale))

        # Cloud Upload Icon
        icon_cx = width // 2
        icon_cy = card_y + int(180 * base_scale)
        draw_star(draw, icon_cx, icon_cy, int(50*base_scale), fill=(140, 109, 35, 255) if not is_dropped else (21, 128, 61, 255))

        font_drop = get_font(FONT_SANS_BOLD, int(36 * base_scale))
        drop_text = "Drag & Drop 6 Foto Sampel Di Sini" if not is_dropped else "✓ 6 Foto Berhasil Dibuatkan Galeri!"
        draw.text((icon_cx - int(280*base_scale), icon_cy + int(90*base_scale)), drop_text, fill=(28, 25, 23, 255) if not is_dropped else (21, 128, 61, 255), font=font_drop)

        # Free Guarantee Badge
        guar_y = card_y + card_h - int(120 * base_scale)
        draw_rounded_rect(draw, (int(100*base_scale), guar_y, int(60*base_scale + card_w - 40*base_scale), guar_y + int(80*base_scale)), int(18*base_scale), fill=(240, 253, 244, 255), outline=(34, 197, 94, 200), width=int(2*base_scale))
        draw.text((int(130*base_scale), guar_y + int(24*base_scale)), "🚀 100% Gratis — Tanpa Kartu Kredit / Tanpa Daftar", fill=(21, 128, 61, 255), font=font_tag)

        # Cursor drag simulation
        cur_progress = ease_in_out(scene_p)
        cur_x = int(lerp(width * 0.15, icon_cx, cur_progress))
        cur_y = int(lerp(height * 0.85, icon_cy, cur_progress))
        draw_cursor(draw, cur_x, cur_y, base_scale)

    else:
        # SCENE 2: SHARE VIA WHATSAPP
        draw_rounded_rect(draw, (int(60*base_scale), content_y, int(60*base_scale + 520*base_scale), content_y + int(56*base_scale)), int(18*base_scale), fill=(37, 211, 102, 35), outline=(37, 211, 102, 150), width=int(2*base_scale))
        draw.text((int(85*base_scale), content_y + int(12*base_scale)), "📲 BAGIKAN LANGSUNG KE WHATSAPP", fill=(18, 140, 66, 255), font=font_tag)

        h_y = content_y + int(85 * base_scale)
        draw.text((int(60*base_scale), h_y), "Link Galeri Eksklusif", fill=(28, 25, 23, 255), font=font_h1)
        draw.text((int(60*base_scale), h_y + int(76*base_scale)), "Siap Dikirim ke Klien", fill=(140, 109, 35, 255), font=font_italic)

        sub_y = h_y + int(170 * base_scale)
        draw.text((int(60*base_scale), sub_y), "Klien langsung buka di HP tanpa perlu instal aplikasi.", fill=(87, 83, 78, 255), font=font_sub)
        draw.text((int(60*base_scale), sub_y + int(45*base_scale)), "Pesan template siap kirim dengan 1-klik salin.", fill=(87, 83, 78, 255), font=font_sub)

        card_y = sub_y + int(120 * base_scale)
        card_w = width - int(120 * base_scale)
        card_h = int(580 * base_scale) if is_vertical else int(380 * base_scale)
        draw_rounded_rect(draw, (int(60*base_scale), card_y, int(60*base_scale + card_w), card_y + card_h), int(28*base_scale), fill=(255, 255, 255, 255), outline=(197, 160, 89, 150), width=int(2*base_scale))

        # URL Box
        url_y = card_y + int(60 * base_scale)
        draw_rounded_rect(draw, (int(100*base_scale), url_y, int(60*base_scale + card_w - 40*base_scale), url_y + int(110*base_scale)), int(18*base_scale), fill=(245, 240, 232, 255), outline=(197, 160, 89, 120), width=int(2*base_scale))
        font_url_lbl = get_font(FONT_SANS_BOLD, int(20 * base_scale))
        font_url_val = get_font(FONT_SANS_BOLD, int(30 * base_scale))
        draw.text((int(130*base_scale), url_y + int(18*base_scale)), "LINK GALERI KLIEN:", fill=(87, 83, 78, 255), font=font_url_lbl)
        draw.text((int(130*base_scale), url_y + int(52*base_scale)), "pickyourphoto.com/trial/sample-wedding-77", fill=(140, 109, 35, 255), font=font_url_val)

        # WA Button
        is_copied = scene_p > 0.45
        wa_y = url_y + int(150 * base_scale)
        draw_rounded_rect(draw, (int(100*base_scale), wa_y, int(60*base_scale + card_w - 40*base_scale), wa_y + int(110*base_scale)), int(22*base_scale), fill=(37, 211, 102, 255) if not is_copied else (21, 128, 61, 255))
        font_wa = get_font(FONT_SANS_BOLD, int(32 * base_scale))
        wa_txt = "💬 Salin Pesan Otomatis WhatsApp" if not is_copied else "✓ Link & Pesan WhatsApp Tersalin!"
        draw.text((int(140*base_scale), wa_y + int(36*base_scale)), wa_txt, fill=(255, 255, 255, 255), font=font_wa)

        # Safety Notice
        safe_y = card_y + card_h - int(120 * base_scale)
        draw_rounded_rect(draw, (int(100*base_scale), safe_y, int(60*base_scale + card_w - 40*base_scale), safe_y + int(80*base_scale)), int(18*base_scale), fill=(240, 253, 244, 255), outline=(34, 197, 94, 200), width=int(2*base_scale))
        draw.text((int(130*base_scale), safe_y + int(24*base_scale)), "🔒 Link aktif 7 hari · Privasi data foto terlindungi", fill=(21, 128, 61, 255), font=font_tag)

        # Cursor clicks WA Button
        cur_progress = ease_in_out(scene_p)
        cur_x = int(lerp(width * 0.8, width * 0.5, cur_progress))
        cur_y = int(lerp(height * 0.9, wa_y + int(55*base_scale), cur_progress))
        draw_cursor(draw, cur_x, cur_y, base_scale)

    return img.convert("RGB")

# =========================================================================
# VIDEO 3: SIMULASI LENGKAP WORKFLOW (Dashboard & Magic Sort Klien)
# =========================================================================
def render_frame_video3(width, height, t, total_t=10.0):
    img = Image.new("RGBA", (width, height), (250, 248, 245, 255))
    draw = ImageDraw.Draw(img)

    is_vertical = height > width
    base_scale = height / 1920.0 if is_vertical else width / 1920.0

    glow_radius = int(width * 0.7)
    glow_img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow_img)
    glow_draw.ellipse([width//2 - glow_radius, -int(height*0.2), width//2 + glow_radius, int(height*0.6)], fill=(197, 160, 89, 28))
    glow_img = glow_img.filter(ImageFilter.GaussianBlur(int(80 * base_scale)))
    img.paste(glow_img, (0, 0), glow_img)

    scene_idx = min(int(t / 5.0), 1)
    scene_p = (t - scene_idx * 5.0) / 5.0

    header_y = int(80 * base_scale)
    draw_rounded_rect(draw, (int(60*base_scale), header_y, int(width - 60*base_scale), header_y + int(90*base_scale)), int(24*base_scale), fill=(255, 255, 255, 230), outline=(197, 160, 89, 100), width=int(2*base_scale))
    font_brand = get_font(FONT_SERIF_BOLD, int(34 * base_scale))
    font_badge = get_font(FONT_SANS_BOLD, int(22 * base_scale))
    draw.text((int(100*base_scale), header_y + int(24*base_scale)), "PICK YOUR PHOTO", fill=(28, 25, 23, 255), font=font_brand)
    
    badge_w = int(240 * base_scale)
    draw_rounded_rect(draw, (width - int(100*base_scale) - badge_w, header_y + int(18*base_scale), width - int(100*base_scale), header_y + int(72*base_scale)), int(16*base_scale), fill=(197, 160, 89, 35), outline=(197, 160, 89, 150), width=int(2*base_scale))
    draw.text((width - int(90*base_scale) - badge_w + int(20*base_scale), header_y + int(28*base_scale)), "SIMULASI LENGKAP", fill=(140, 109, 35, 255), font=font_badge)

    content_y = header_y + int(160 * base_scale)
    font_tag = get_font(FONT_SANS_BOLD, int(26 * base_scale))
    font_h1 = get_font(FONT_SERIF_BOLD, int(64 * base_scale))
    font_italic = get_font(FONT_SERIF_ITALIC, int(64 * base_scale))
    font_sub = get_font(FONT_SANS_REG, int(32 * base_scale))

    if scene_idx == 0:
        # SCENE 1: DASHBOARD FOTOGRAFER
        draw_rounded_rect(draw, (int(60*base_scale), content_y, int(60*base_scale + 480*base_scale), content_y + int(56*base_scale)), int(18*base_scale), fill=(197, 160, 89, 35), outline=(197, 160, 89, 150), width=int(2*base_scale))
        draw.text((int(85*base_scale), content_y + int(12*base_scale)), "🏢 DASHBOARD FOTOGRAFER", fill=(140, 109, 35, 255), font=font_tag)

        h_y = content_y + int(85 * base_scale)
        draw.text((int(60*base_scale), h_y), "Kelola Puluhan Project", fill=(28, 25, 23, 255), font=font_h1)
        draw.text((int(60*base_scale), h_y + int(76*base_scale)), "Dalam Satu Layar Rapi", fill=(140, 109, 35, 255), font=font_italic)

        sub_y = h_y + int(170 * base_scale)
        draw.text((int(60*base_scale), sub_y), "Pantau status seleksi setiap klien secara live,", fill=(87, 83, 78, 255), font=font_sub)
        draw.text((int(60*base_scale), sub_y + int(45*base_scale)), "terkoneksi langsung dengan folder Google Drive.", fill=(87, 83, 78, 255), font=font_sub)

        card_y = sub_y + int(120 * base_scale)
        card_w = width - int(120 * base_scale)
        card_h = int(600 * base_scale) if is_vertical else int(380 * base_scale)
        draw_rounded_rect(draw, (int(60*base_scale), card_y, int(60*base_scale + card_w), card_y + card_h), int(28*base_scale), fill=(255, 255, 255, 255), outline=(197, 160, 89, 150), width=int(2*base_scale))

        projects = [
            ("Prewedding Arya & Bella", "Drive Sync · 450 Foto", "SELESAI", (197, 160, 89, 255)),
            ("Wisuda UNHAS 2026", "18 Klien Aktif Memilih", "PROSES", (21, 128, 61, 255)),
            ("Graduation SMA PGRI", "Menunggu Upload Foto", "DRAFT", (140, 109, 35, 200)),
        ]

        font_pname = get_font(FONT_SANS_BOLD, int(30 * base_scale))
        font_psub = get_font(FONT_SANS_REG, int(22 * base_scale))
        font_pstatus = get_font(FONT_SANS_BOLD, int(22 * base_scale))

        for i, (pname, psub, pstat, pcol) in enumerate(projects):
            ry = card_y + int((50 + i * 140) * base_scale)
            draw_rounded_rect(draw, (int(100*base_scale), ry, int(60*base_scale + card_w - 40*base_scale), ry + int(110*base_scale)), int(18*base_scale), fill=(250, 248, 245, 255), outline=(197, 160, 89, 80), width=int(2*base_scale))
            draw.text((int(130*base_scale), ry + int(22*base_scale)), pname, fill=(28, 25, 23, 255), font=font_pname)
            draw.text((int(130*base_scale), ry + int(64*base_scale)), psub, fill=(87, 83, 78, 255), font=font_psub)

            # Badge status
            bw = int(140 * base_scale)
            bx0 = int(60*base_scale + card_w - 60*base_scale - bw)
            draw_rounded_rect(draw, (bx0, ry + int(32*base_scale), bx0 + bw, ry + int(78*base_scale)), int(12*base_scale), fill=pcol)
            draw.text((bx0 + int(24*base_scale), ry + int(42*base_scale)), pstat, fill=(255, 255, 255, 255), font=font_pstatus)

        # Cursor inspection
        cur_progress = ease_in_out(scene_p)
        cur_x = int(lerp(width * 0.2, width * 0.7, cur_progress))
        cur_y = int(lerp(card_y + int(100*base_scale), card_y + int(260*base_scale), cur_progress))
        draw_cursor(draw, cur_x, cur_y, base_scale)

    else:
        # SCENE 2: MAGIC SORT & INSTANT WA NOTIFICATION
        draw_rounded_rect(draw, (int(60*base_scale), content_y, int(60*base_scale + 480*base_scale), content_y + int(56*base_scale)), int(18*base_scale), fill=(197, 160, 89, 35), outline=(197, 160, 89, 150), width=int(2*base_scale))
        draw.text((int(85*base_scale), content_y + int(12*base_scale)), "✨ MAGIC SORT KLIEN", fill=(140, 109, 35, 255), font=font_tag)

        h_y = content_y + int(85 * base_scale)
        draw.text((int(60*base_scale), h_y), "Klien Pilih 1-Click", fill=(28, 25, 23, 255), font=font_h1)
        draw.text((int(60*base_scale), h_y + int(76*base_scale)), "Notifikasi Langsung Terkirim", fill=(140, 109, 35, 255), font=font_italic)

        sub_y = h_y + int(170 * base_scale)
        draw.text((int(60*base_scale), sub_y), "Setiap foto yang disukai klien langsung dikelompokkan", fill=(87, 83, 78, 255), font=font_sub)
        draw.text((int(60*base_scale), sub_y + int(45*base_scale)), "rapi dengan nama file asli tanpa tertukar.", fill=(87, 83, 78, 255), font=font_sub)

        card_y = sub_y + int(120 * base_scale)
        card_w = width - int(120 * base_scale)
        card_h = int(600 * base_scale) if is_vertical else int(380 * base_scale)
        draw_rounded_rect(draw, (int(60*base_scale), card_y, int(60*base_scale + card_w), card_y + card_h), int(28*base_scale), fill=(255, 255, 255, 255), outline=(197, 160, 89, 120), width=int(2*base_scale))

        # Counter up
        if scene_p < 0.35:
            c_text = "1/450 Dipilih"
        elif scene_p < 0.7:
            c_text = "2/450 Dipilih"
        else:
            c_text = "3/450 Dipilih"

        font_m_title = get_font(FONT_SANS_BOLD, int(30 * base_scale))
        draw.text((int(100*base_scale), card_y + int(36*base_scale)), "Prewedding Arya & Bella", fill=(140, 109, 35, 255), font=font_m_title)
        
        draw_rounded_rect(draw, (int(60*base_scale + card_w - 230*base_scale), card_y + int(28*base_scale), int(60*base_scale + card_w - 30*base_scale), card_y + int(82*base_scale)), int(14*base_scale), fill=(21, 128, 61, 30), outline=(21, 128, 61, 120), width=int(2*base_scale))
        draw.text((int(60*base_scale + card_w - 210*base_scale), card_y + int(38*base_scale)), c_text, fill=(21, 128, 61, 255), font=font_tag)

        # 3 photo cards sequentially chosen
        grid_y = card_y + int(110 * base_scale)
        col_w = int((card_w - 80*base_scale) / 3.0)
        
        for c in range(3):
            cx0 = int(60*base_scale + 25*base_scale + c * col_w)
            cx1 = cx0 + col_w - int(15*base_scale)
            cy0 = grid_y
            cy1 = cy0 + int(col_w - 15*base_scale)
            
            is_active = (c == 0 and scene_p >= 0.1) or (c == 1 and scene_p >= 0.4) or (c == 2 and scene_p >= 0.7)
            card_bg = (197, 160, 89, 45) if is_active else (245, 239, 235, 255)
            card_border = (140, 109, 35, 255) if is_active else (197, 160, 89, 80)
            
            draw_rounded_rect(draw, (cx0, cy0, cx1, cy1), int(16*base_scale), fill=card_bg, outline=card_border, width=int(3*base_scale) if is_active else int(2*base_scale))
            draw_star(draw, (cx0 + cx1)//2, (cy0 + cy1)//2, int(35*base_scale), fill=(140, 109, 35, 255) if is_active else (197, 160, 89, 120))
            
            if is_active:
                draw_rounded_rect(draw, (cx0 + int(10*base_scale), cy1 - int(32*base_scale), cx1 - int(10*base_scale), cy1 - int(8*base_scale)), int(6*base_scale), fill=(140, 109, 35, 255))
                font_terpilih = get_font(FONT_SANS_BOLD, int(16 * base_scale))
                draw.text((cx0 + int(24*base_scale), cy1 - int(30*base_scale)), "TERPILIH", fill=(255, 255, 255, 255), font=font_terpilih)

        # Notification Banner
        if scene_p >= 0.75:
            banner_y = card_y + card_h - int(120 * base_scale)
            draw_rounded_rect(draw, (int(100*base_scale), banner_y, int(60*base_scale + card_w - 40*base_scale), banner_y + int(80*base_scale)), int(18*base_scale), fill=(240, 253, 244, 255), outline=(34, 197, 94, 200), width=int(2*base_scale))
            draw.text((int(130*base_scale), banner_y + int(24*base_scale)), "✓ Notifikasi WA & Rekap Foto Terkirim ke Fotografer!", fill=(21, 128, 61, 255), font=font_tag)

        # Smooth cursor trajectory across cards
        cur_progress = ease_in_out(scene_p)
        cur_x = int(lerp(width * 0.2, width * 0.8, cur_progress))
        cur_y = int(grid_y + int(col_w // 2) + math.sin(scene_p * math.pi * 3) * 20 * base_scale)
        draw_cursor(draw, cur_x, cur_y, base_scale)

    return img.convert("RGB")

# =========================================================================
# VIDEO ENCODER PIPELINE VIA FFMPEG
# =========================================================================
def render_video_to_mp4(render_func, filename, width, height, duration_sec=8.0, fps=60):
    output_path = os.path.join(OUTPUT_DIR, filename)
    print(f"🎬 Rendering: {filename} ({width}x{height} @ {fps}fps, {duration_sec}s)...")

    cmd = [
        "/opt/homebrew/bin/ffmpeg",
        "-y",
        "-f", "rawvideo",
        "-vcodec", "rawvideo",
        "-s", f"{width}x{height}",
        "-pix_fmt", "rgb24",
        "-r", str(fps),
        "-i", "-",
        "-c:v", "libx264",
        "-preset", "medium",
        "-crf", "17",
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        output_path
    ]

    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stderr=subprocess.DEVNULL)

    total_frames = int(duration_sec * fps)
    for frame_idx in range(total_frames):
        t = (frame_idx / total_frames) * duration_sec
        img = render_func(width, height, t, duration_sec)
        proc.stdin.write(img.tobytes())

        if frame_idx % (fps * 2) == 0 or frame_idx == total_frames - 1:
            pct = int((frame_idx / total_frames) * 100)
            print(f"   [{filename}] Progress: {pct}% ({frame_idx}/{total_frames} frames)")

    proc.stdin.close()
    proc.wait()
    file_size_mb = os.path.getsize(output_path) / (1024 * 1024)
    print(f"✅ Selesai: {filename} ({file_size_mb:.2f} MB)")
    return output_path

def main():
    print("=========================================================")
    print("🚀 PICK YOUR PHOTO — INSTAGRAM PROMO VIDEO GENERATOR")
    print(f"📁 Output Directory: {OUTPUT_DIR}")
    print("=========================================================")

    # 1. Video 1: Perkenalan Platform
    render_video_to_mp4(render_frame_video1, "video_1_intro_story_9x16.mp4", 1080, 1920, duration_sec=9.0, fps=60)
    render_video_to_mp4(render_frame_video1, "video_1_intro_feeds_16x9.mp4", 1920, 1080, duration_sec=9.0, fps=60)

    # 2. Video 2: Demo Trial Instan
    render_video_to_mp4(render_frame_video2, "video_2_trial_story_9x16.mp4", 1080, 1920, duration_sec=8.0, fps=60)
    render_video_to_mp4(render_frame_video2, "video_2_trial_feeds_16x9.mp4", 1920, 1080, duration_sec=8.0, fps=60)

    # 3. Video 3: Simulasi Lengkap & Magic Sort
    render_video_to_mp4(render_frame_video3, "video_3_simulasi_story_9x16.mp4", 1080, 1920, duration_sec=10.0, fps=60)
    render_video_to_mp4(render_frame_video3, "video_3_simulasi_feeds_16x9.mp4", 1920, 1080, duration_sec=10.0, fps=60)

    print("\n🎉 SEMUA 6 VIDEO PROMOSI BERHASIL DIBUAT DENGAN KUALITAS TINGGI 60 FPS!")

if __name__ == "__main__":
    main()
