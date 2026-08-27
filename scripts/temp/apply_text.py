#!/usr/bin/env python
# Text-only revision of the EXISTING TechNova 2026 deck.
# 1) Remove every shape added in the previous (graphic) pass -> restore original template.
# 2) Replace placeholder text only. No graphics, no layout/colour/font changes.
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.enum.shapes import MSO_SHAPE_TYPE

SRC = "TechNova_2026_Review_template.pptx"
OUT = "TechNova_2026_Review_template.pptx"
NAVY = RGBColor(0x32, 0x3C, 0x71)

prs = Presentation(SRC)

# ---- 1) Delete previously-added shapes (restore original template) ----
KEEP = {
    0: {89, 90, 5, 6, 1026, 2},
    1: {96, 101, 11, 14, 12, 13},
    2: {96, 101, 11, 14, 12, 13},
    3: {96, 101, 11, 14, 12, 13},
    4: {96, 101, 11, 12, 13},
}
removed = 0
for i, slide in enumerate(prs.slides):
    keep = KEEP[i]
    to_remove = []
    for shp in slide.shapes:
        if shp.shape_type in (MSO_SHAPE_TYPE.AUTO_SHAPE, MSO_SHAPE_TYPE.TEXT_BOX):
            if shp.shape_id not in keep:
                to_remove.append(shp)
    for shp in to_remove:
        shp._element.getparent().remove(shp._element)
        removed += 1
print("Removed added shapes:", removed)

def by_id(slide, sid):
    for shp in slide.shapes:
        if shp.shape_id == sid:
            return shp
    return None

def set_text(shape, paras):
    tf = shape.text_frame
    tf.word_wrap = True
    tf.text = ""
    first = True
    for d in paras:
        p = tf.paragraphs[0] if first else tf.add_paragraph()
        first = False
        p.text = d.get("t", "")
        p.alignment = d.get("a", PP_ALIGN.LEFT)
        p.space_after = Pt(d.get("sa", 3))
        if p.runs:
            r = p.runs[0]
            r.font.size = Pt(d.get("s", 14))
            r.font.bold = d.get("b", False)
            r.font.color.rgb = d.get("c", NAVY)
            # font.name intentionally NOT set -> keep template font
    return shape

# =====================================================================
# SLIDE 1 — TITLE
# =====================================================================
s1 = prs.slides[0]
t1 = by_id(s1, 90)
if t1:
    t1.height = Inches(0.97)
    t1.top = Inches(3.42)
    set_text(t1, [
        {"t": "ParkTwin AI", "s": 30, "b": True, "a": PP_ALIGN.CENTER, "sa": 2},
        {"t": "An End-to-End AI-Powered Smart Parking Ecosystem", "s": 18, "b": True,
         "a": PP_ALIGN.CENTER, "sa": 0},
    ])
tm = by_id(s1, 5)
if tm:
    set_text(tm, [
        {"t": "Project Team:", "s": 18, "b": True, "sa": 2},
        {"t": "SRN_Name (Replace with your name)", "s": 16, "b": True, "sa": 1},
        {"t": "SRN_Name (Replace with your name)", "s": 16, "b": True, "sa": 1},
        {"t": "SRN_Name (Replace with your name)", "s": 16, "b": True, "sa": 0},
    ])

# =====================================================================
# SLIDE 2 — PROBLEM STATEMENT
# =====================================================================
s2 = prs.slides[1]
set_text(by_id(s2, 11), [{"t": "Problem Statement", "s": 32, "b": True, "sa": 0}])
set_text(by_id(s2, 14), [
    {"t": "As urban areas continue to grow, managing parking facilities has become increasingly "
          "challenging. Conventional parking systems rely heavily on manual monitoring and disconnected "
          "solutions, resulting in inefficient parking operations and poor user experience.", "s": 14, "sa": 8},
    {"t": "Key challenges include:", "s": 14, "b": True, "sa": 4},
    {"t": "•  Difficulty locating available parking spaces.", "s": 14, "sa": 3},
    {"t": "•  Manual monitoring of parking occupancy.", "s": 14, "sa": 3},
    {"t": "•  Inefficient utilization of parking infrastructure.", "s": 14, "sa": 3},
    {"t": "•  Lack of centralized parking management.", "s": 14, "sa": 3},
    {"t": "•  Limited real-time visibility of parking status.", "s": 14, "sa": 3},
    {"t": "•  Difficulty tracking vehicle movement.", "s": 14, "sa": 3},
    {"t": "•  Lack of operational analytics for decision making.", "s": 14, "sa": 3},
    {"t": "•  Poor scalability for large parking facilities.", "s": 14, "sa": 8},
    {"t": "Project Objective", "s": 14, "b": True, "sa": 4},
    {"t": "Develop ParkTwin AI, an AI-powered Smart Parking Ecosystem capable of automating vehicle "
          "recognition, parking occupancy monitoring, vehicle tracking, parking intelligence, analytics, "
          "and visualization through a unified platform.", "s": 14, "sa": 0},
])

# =====================================================================
# SLIDE 3 — METHODOLOGY  (dense -> 9pt body / 10pt headings to fit one slide)
# =====================================================================
s3 = prs.slides[2]
set_text(by_id(s3, 11), [{"t": "Methodology", "s": 32, "b": True, "sa": 0}])
set_text(by_id(s3, 14), [
    {"t": "ParkTwin AI follows a modular architecture consisting of four major layers.", "s": 9, "sa": 5},
    {"t": "Input Layer", "s": 10, "b": True, "sa": 2},
    {"t": "•  CCTV Cameras", "s": 9, "sa": 1},
    {"t": "•  IP Cameras", "s": 9, "sa": 1},
    {"t": "•  Recorded Parking Videos", "s": 9, "sa": 3},
    {"t": "AI Perception Layer", "s": 10, "b": True, "sa": 2},
    {"t": "•  Vehicle Detection", "s": 9, "sa": 1},
    {"t": "•  Multi-Object Tracking", "s": 9, "sa": 1},
    {"t": "•  License Plate Detection", "s": 9, "sa": 1},
    {"t": "•  Automatic Number Plate Recognition (ANPR)", "s": 9, "sa": 3},
    {"t": "Parking Intelligence Layer", "s": 10, "b": True, "sa": 2},
    {"t": "•  Parking Slot Occupancy Detection", "s": 9, "sa": 1},
    {"t": "•  Vehicle-to-Slot Association", "s": 9, "sa": 1},
    {"t": "•  Entry and Exit Detection", "s": 9, "sa": 1},
    {"t": "•  Parking Duration Monitoring", "s": 9, "sa": 3},
    {"t": "Smart Parking Platform", "s": 10, "b": True, "sa": 2},
    {"t": "•  Dashboard", "s": 9, "sa": 1},
    {"t": "•  Parking Visualization", "s": 9, "sa": 1},
    {"t": "•  Vehicle Intelligence", "s": 9, "sa": 1},
    {"t": "•  Analytics", "s": 9, "sa": 1},
    {"t": "•  Reports", "s": 9, "sa": 1},
    {"t": "•  Demo Mode", "s": 9, "sa": 3},
    {"t": "Technology Stack", "s": 10, "b": True, "sa": 2},
    {"t": "Frontend: React, Next.js, TypeScript", "s": 9, "sa": 1},
    {"t": "Backend: Python, FastAPI", "s": 9, "sa": 1},
    {"t": "AI Models: YOLO, ByteTrack, PaddleOCR", "s": 9, "sa": 1},
    {"t": "Deployment: Docker", "s": 9, "sa": 0},
])

# =====================================================================
# SLIDE 4 — RESULTS  (23 lines -> 11pt body / 12pt headings fits one slide)
# =====================================================================
s4 = prs.slides[3]
set_text(by_id(s4, 11), [{"t": "Results", "s": 32, "b": True, "sa": 0}])
set_text(by_id(s4, 14), [
    {"t": "Successfully Implemented Modules", "s": 12, "b": True, "sa": 2},
    {"t": "•  Vehicle Detection", "s": 11, "sa": 1},
    {"t": "•  Vehicle Tracking", "s": 11, "sa": 1},
    {"t": "•  Automatic Number Plate Recognition", "s": 11, "sa": 1},
    {"t": "•  Parking Slot Occupancy Monitoring", "s": 11, "sa": 1},
    {"t": "•  Parking Intelligence Engine", "s": 11, "sa": 1},
    {"t": "•  Vehicle Intelligence Dashboard", "s": 11, "sa": 1},
    {"t": "•  Analytics Dashboard", "s": 11, "sa": 1},
    {"t": "•  Event Timeline", "s": 11, "sa": 1},
    {"t": "•  Demo Mode", "s": 11, "sa": 5},
    {"t": "Key Outcomes", "s": 12, "b": True, "sa": 2},
    {"t": "•  Built an end-to-end Smart Parking Ecosystem.", "s": 11, "sa": 1},
    {"t": "•  Developed a modular and scalable architecture.", "s": 11, "sa": 1},
    {"t": "•  Automated vehicle recognition and parking monitoring.", "s": 11, "sa": 1},
    {"t": "•  Integrated AI-powered parking intelligence.", "s": 11, "sa": 1},
    {"t": "•  Created an interactive dashboard for monitoring and analytics.", "s": 11, "sa": 1},
    {"t": "•  Designed a presentation-ready demonstration platform.", "s": 11, "sa": 5},
    {"t": "Future Scope", "s": 12, "b": True, "sa": 2},
    {"t": "•  Live CCTV Integration", "s": 11, "sa": 1},
    {"t": "•  Multi-Camera Support", "s": 11, "sa": 1},
    {"t": "•  Cloud Deployment", "s": 11, "sa": 1},
    {"t": "•  Predictive Parking Analytics", "s": 11, "sa": 1},
    {"t": "•  Digital Twin Integration", "s": 11, "sa": 0},
])

# =====================================================================
# SLIDE 5 — CONCLUSION
# =====================================================================
s5 = prs.slides[4]
set_text(by_id(s5, 11), [{"t": "Conclusion", "s": 40, "b": True, "a": PP_ALIGN.CENTER, "sa": 0}])
set_text(by_id(s5, 96), [
    {"t": "", "sa": 0}, {"t": "", "sa": 0}, {"t": "", "sa": 0},
    {"t": "ParkTwin AI demonstrates how Artificial Intelligence, Computer Vision, and modern web "
          "technologies can be integrated to build an end-to-end Smart Parking Ecosystem.", "s": 14, "sa": 8},
    {"t": "The platform combines vehicle detection, vehicle tracking, automatic license plate "
          "recognition, parking intelligence, and interactive visualization into a unified solution "
          "capable of supporting future smart parking infrastructure.", "s": 14, "sa": 8},
    {"t": "Key Takeaways", "s": 14, "b": True, "sa": 4},
    {"t": "•  End-to-End Smart Parking Ecosystem", "s": 14, "sa": 3},
    {"t": "•  AI-Powered Parking Automation", "s": 14, "sa": 3},
    {"t": "•  Modular and Scalable Architecture", "s": 14, "sa": 3},
    {"t": "•  Interactive Monitoring Platform", "s": 14, "sa": 3},
    {"t": "•  Future-Ready Design", "s": 14, "sa": 10},
    {"t": "THANK YOU", "s": 22, "b": True, "a": PP_ALIGN.CENTER, "sa": 2},
    {"t": "Questions?", "s": 16, "a": PP_ALIGN.CENTER, "sa": 0},
])

prs.save(OUT)
print("Saved:", OUT, "| slides:", len(prs.slides))
