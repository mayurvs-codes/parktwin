import os
import sys
import glob
import datetime
from PIL import Image, ImageDraw, ImageFont, ImageEnhance
import subprocess

# Output directory
output_dir = r"c:\Users\ASUS\Desktop\parktwin\videos"
os.makedirs(output_dir, exist_ok=True)

brain_dir = r"C:\Users\ASUS\.gemini\antigravity\brain\e39043b3-3aef-48ab-8041-45cdf29eca92"
img_files = sorted(glob.glob(os.path.join(brain_dir, "parking_lot_ai_view*.jpg")))

print("Found AI images:", img_files)

if len(img_files) < 3:
    print("Error: Need 3 AI generated images")
    sys.exit(1)

# Resolution setup
WIDTH, HEIGHT = 1280, 720
FPS = 30

def get_font(size):
    try:
        return ImageFont.truetype("arial.ttf", size)
    except:
        return ImageFont.load_default()

font_large = get_font(24)
font_medium = get_font(18)
font_small = get_font(14)

def process_frame(img, frame_num, total_frames, mode="entrance"):
    # Create zoom/pan effect
    t = frame_num / float(total_frames)
    
    # Zoom scale from 1.0 to 1.12
    scale = 1.0 + 0.12 * (t if mode != "exit" else (1 - t))
    
    orig_w, orig_h = img.size
    crop_w = int(orig_w / scale)
    crop_h = int(orig_h / scale)
    
    # Pan across image slightly
    max_dx = orig_w - crop_w
    max_dy = orig_h - crop_h
    
    offset_x = int(max_dx * (0.5 + 0.3 * t))
    offset_y = int(max_dy * 0.5)
    
    cropped = img.crop((offset_x, offset_y, offset_x + crop_w, offset_y + crop_h))
    frame = cropped.resize((WIDTH, HEIGHT), Image.Resampling.LANCZOS)
    
    draw = ImageDraw.Draw(frame)
    
    # Overlay HUD graphics for CCTV / AI Digital Twin
    # Top banner bar
    draw.rectangle([(0, 0), (WIDTH, 45)], fill=(10, 15, 25, 200))
    
    # Current timestamp
    now = datetime.datetime.now() + datetime.timedelta(seconds=frame_num / 30.0)
    time_str = now.strftime("%Y-%m-%d %H:%M:%S") + f".{int((frame_num % 30) * 33):03d}"
    
    if mode == "entrance":
        cam_title = "CAM 01 - MAIN ENTRANCE GATE [LIVE]"
    elif mode == "zoom":
        cam_title = "CAM 02 - ANPR BARRIER SCANNER [LIVE]"
    else:
        cam_title = "CAM 03 - PARKING GARAGE EXIT [LIVE]"
        
    draw.text((15, 12), cam_title, fill=(0, 255, 180), font=font_medium)
    draw.text((WIDTH - 260, 12), time_str, fill=(255, 255, 255), font=font_medium)
    
    # Bottom telemetry bar
    draw.rectangle([(0, HEIGHT - 40), (WIDTH, HEIGHT)], fill=(10, 15, 25, 200))
    
    # Rec dot
    if (frame_num // 15) % 2 == 0:
        draw.ellipse([(15, HEIGHT - 27), (27, HEIGHT - 15)], fill=(255, 40, 40))
        draw.text((35, HEIGHT - 28), "REC", fill=(255, 50, 50), font=font_medium)
    else:
        draw.text((35, HEIGHT - 28), "REC", fill=(150, 150, 150), font=font_medium)
        
    draw.text((120, HEIGHT - 27), "|  PARK TWIN AI V2.4  |  FPS: 30.0  |  RES: 1080p", fill=(200, 200, 200), font=font_small)
    
    # Dynamic AI Bounding Boxes & OCR Overlays
    if mode == "entrance":
        # Vehicle 1 Entering Bounding Box
        bx1, by1, bx2, by2 = int(350 + t * 40), int(280 + t * 20), int(780 + t * 50), int(550 + t * 30)
        draw.rectangle([(bx1, by1), (bx2, by2)], outline=(0, 255, 120), width=3)
        draw.rectangle([(bx1, by1 - 25), (bx1 + 220, by1)], fill=(0, 255, 120))
        draw.text((bx1 + 8, by1 - 22), "VEHICLE ENTERING [98.7%]", fill=(0, 0, 0), font=font_small)
        
        # Barrier Status
        draw.rectangle([(WIDTH - 250, 60), (WIDTH - 15, 110)], fill=(0, 40, 30), outline=(0, 255, 180), width=2)
        barrier_status = "BARRIER: OPENING" if t < 0.6 else "BARRIER: OPEN"
        draw.text((WIDTH - 235, 75), barrier_status, fill=(0, 255, 200), font=font_medium)
        
    elif mode == "zoom":
        # ANPR License Plate Scanner Box
        lx1, ly1, lx2, ly2 = 420, 320, 860, 580
        draw.rectangle([(lx1, ly1), (lx2, ly2)], outline=(0, 180, 255), width=3)
        draw.rectangle([(lx1, ly1 - 25), (lx1 + 250, ly1)], fill=(0, 180, 255))
        draw.text((lx1 + 8, ly1 - 22), "ANPR SCANNER ACTIVE", fill=(0, 0, 0), font=font_small)
        
        # License Plate Readout Box
        draw.rectangle([(20, 60), (320, 140)], fill=(15, 20, 35), outline=(0, 180, 255), width=2)
        draw.text((30, 70), "PLATE RECOGNITION:", fill=(180, 220, 255), font=font_small)
        plate_str = "KA-01-MJ-8821" if t > 0.3 else "SCANNING..."
        draw.text((30, 95), plate_str, fill=(255, 255, 0) if t > 0.3 else (200, 200, 200), font=font_large)
        
    elif mode == "exit":
        # Vehicle Exiting Box
        ex1, ey1, ex2, ey2 = int(400 - t * 30), int(260 + t * 15), int(820 - t * 40), int(540 + t * 25)
        draw.rectangle([(ex1, ey1), (ex2, ey2)], outline=(255, 180, 0), width=3)
        draw.rectangle([(ex1, ey1 - 25), (ex1 + 220, ey1)], fill=(255, 180, 0))
        draw.text((ex1 + 8, ey1 - 22), "VEHICLE EXITING [99.1%]", fill=(0, 0, 0), font=font_small)
        
        # Gate Payment & Exit Cleared Box
        draw.rectangle([(20, 60), (340, 130)], fill=(15, 30, 20), outline=(0, 255, 100), width=2)
        draw.text((30, 70), "STATUS: EXIT AUTHORIZED", fill=(0, 255, 120), font=font_small)
        draw.text((30, 93), "FEE PAID: $5.00 | SLOT FREED", fill=(255, 255, 255), font=font_small)

    return frame

# Render function using ffmpeg stdin rawvideo
def build_mp4(images_with_modes, output_path, duration_per_img=5.0):
    cmd = [
        "ffmpeg", "-y",
        "-f", "rawvideo",
        "-vcodec", "rawvideo",
        "-s", f"{WIDTH}x{HEIGHT}",
        "-pix_fmt", "rgb24",
        "-r", str(FPS),
        "-i", "-",
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-preset", "fast",
        "-crf", "20",
        output_path
    ]
    
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    
    for img_path, mode in images_with_modes:
        img = Image.open(img_path).convert("RGB")
        total_frames = int(FPS * duration_per_img)
        for f in range(total_frames):
            frame = process_frame(img, f, total_frames, mode=mode)
            proc.stdin.write(frame.tobytes())
            
    proc.stdin.close()
    proc.wait()
    print(f"Generated video: {output_path}")

# Load images
img1 = img_files[0] # entrance view
img2 = img_files[1] # zoom / ANPR view
img3 = img_files[2] # exit view

# 1. Create Car Entering Video (Video 1)
build_mp4([(img1, "entrance")], os.path.join(output_dir, "car_entering_parking.mp4"), duration_per_img=6.0)

# 2. Create Car Exiting Video (Video 2)
build_mp4([(img3, "exit")], os.path.join(output_dir, "car_exiting_parking.mp4"), duration_per_img=6.0)

# 3. Create Complete AI Generated Parking Lot Video (Video 3)
build_mp4([
    (img1, "entrance"),
    (img2, "zoom"),
    (img3, "exit")
], os.path.join(output_dir, "ai_generated_parking_lot.mp4"), duration_per_img=5.0)

print("All 3 parking videos successfully generated in", output_dir)
