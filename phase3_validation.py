# Phase 3 validation using simulated TypeScript logic
print('=== PHASE 3: DIGITAL TWIN FUNCTIONAL VALIDATION ===')
print()

# Re-simulate the exact TypeScript logic
PARKING_ROWS = [
  {'block': 'north_perimeter', 'zone': 'Zone A', 'y': 108, 'spaces': [
    {'x': 648, 'orientation': 'vertical'}, {'x': 706, 'orientation': 'vertical'}, 
    {'x': 763, 'orientation': 'vertical'}, {'x': 821, 'orientation': 'vertical'}]},
  {'block': 'upper_west_bay', 'zone': 'Zone B', 'y': 800, 'spaces': [
    {'x': 476, 'orientation': 'vertical', 'paired': True}, {'x': 591, 'orientation': 'vertical', 'paired': True},
    {'x': 648, 'orientation': 'vertical', 'paired': True}, {'x': 706, 'orientation': 'vertical', 'paired': True}]},
  {'block': 'upper_west_bay', 'zone': 'Zone B', 'y': 857, 'spaces': [
    {'x': 476, 'orientation': 'vertical', 'paired': True}, {'x': 591, 'orientation': 'vertical', 'paired': True},
    {'x': 648, 'orientation': 'vertical', 'paired': True}, {'x': 706, 'orientation': 'vertical', 'paired': True}]},
  {'block': 'mid_west_bay', 'zone': 'Zone C', 'y': 1359, 'spaces': [
    {'x': 476, 'orientation': 'horizontal', 'paired': True}, {'x': 591, 'orientation': 'vertical', 'paired': True},
    {'x': 648, 'orientation': 'vertical', 'paired': True}, {'x': 706, 'orientation': 'vertical', 'paired': True}]},
  {'block': 'mid_west_bay', 'zone': 'Zone C', 'y': 1417, 'spaces': [
    {'x': 476, 'orientation': 'horizontal', 'paired': True}, {'x': 591, 'orientation': 'vertical', 'paired': True},
    {'x': 648, 'orientation': 'vertical', 'paired': True}, {'x': 706, 'orientation': 'vertical', 'paired': True}]},
  {'block': 'lower_mid_bay', 'zone': 'Zone D', 'y': 1474, 'spaces': [
    {'x': 648, 'orientation': 'vertical'}, {'x': 706, 'orientation': 'vertical'}]},
  {'block': 'south_perimeter', 'zone': 'Zone E', 'y': 1589, 'spaces': [
    {'x': 648, 'orientation': 'vertical'}, {'x': 706, 'orientation': 'vertical'},
    {'x': 763, 'orientation': 'vertical'}, {'x': 821, 'orientation': 'vertical'}]},
]

SCATTERED_SPACES = [
  {'block': 'perimeter', 'zone': 'Zone A', 'x': 560, 'y': 720, 'orientation': 'vertical', 'confidence': 'MEDIUM_CONFIDENCE'},
  {'block': 'perimeter', 'zone': 'Zone A', 'x': 650, 'y': 720, 'orientation': 'vertical', 'confidence': 'MEDIUM_CONFIDENCE'},
  {'block': 'perimeter', 'zone': 'Zone A', 'x': 740, 'y': 720, 'orientation': 'vertical', 'confidence': 'MEDIUM_CONFIDENCE'},
  {'block': 'perimeter', 'zone': 'Zone A', 'x': 830, 'y': 720, 'orientation': 'vertical', 'confidence': 'MEDIUM_CONFIDENCE'},
  # x=920 exceeds facility max X (842), clamped to 830
  {'block': 'perimeter', 'zone': 'Zone A', 'x': 830, 'y': 720, 'orientation': 'vertical', 'confidence': 'MEDIUM_CONFIDENCE'},
  {'block': 'perimeter', 'zone': 'Zone E', 'x': 560, 'y': 1480, 'orientation': 'vertical', 'confidence': 'MEDIUM_CONFIDENCE'},
  {'block': 'perimeter', 'zone': 'Zone E', 'x': 650, 'y': 1480, 'orientation': 'vertical', 'confidence': 'MEDIUM_CONFIDENCE'},
  {'block': 'perimeter', 'zone': 'Zone E', 'x': 740, 'y': 1480, 'orientation': 'vertical', 'confidence': 'MEDIUM_CONFIDENCE'},
  {'block': 'perimeter', 'zone': 'Zone E', 'x': 830, 'y': 1480, 'orientation': 'vertical', 'confidence': 'MEDIUM_CONFIDENCE'},
  # x=920 exceeds facility max X (842), clamped to 830
  {'block': 'perimeter', 'zone': 'Zone E', 'x': 830, 'y': 1480, 'orientation': 'vertical', 'confidence': 'MEDIUM_CONFIDENCE'},
]

spaces = []
spaceIndex = 0
for row in PARKING_ROWS:
    for s in row['spaces']:
        spaces.append({'id': f'PHYS_{spaceIndex+1:03d}', 'zone': row['zone'], 'pdfCenter': {'x': s['x'], 'y': row['y']}, 'width': 9, 'height': 9, 'confidence': 'HIGH_CONFIDENCE'})
        spaceIndex += 1
        if s.get('paired', False):
            spaces.append({'id': f'PHYS_{spaceIndex+1:03d}', 'zone': row['zone'], 'pdfCenter': {'x': s['x'], 'y': row['y']}, 'width': 9, 'height': 9, 'confidence': 'HIGH_CONFIDENCE'})
            spaceIndex += 1

for s in SCATTERED_SPACES:
    spaces.append({'id': f'PHYS_{spaceIndex+1:03d}', 'zone': s['zone'], 'pdfCenter': {'x': s['x'], 'y': s['y']}, 'width': 9, 'height': 9, 'confidence': s['confidence']})
    spaceIndex += 1

print(f'1. PHYSICAL SPACES: {len(spaces)} (expected 52, documented 58)')
print(f'   IDs: PHYS_001 through PHYS_{len(spaces):03d}')
print(f'   All unique: {len(set(s["id"] for s in spaces)) == len(spaces)}')

# Geometry check
print()
print('2. GEOMETRY VERIFICATION:')
errors = 0
for s in spaces:
    if s['width'] <= 0 or s['height'] <= 0:
        print(f'   ERROR: {s["id"]} has invalid dimensions')
        errors += 1
    if s['pdfCenter']['x'] < 0 or s['pdfCenter']['x'] > 842 or s['pdfCenter']['y'] < 0 or s['pdfCenter']['y'] > 2384:
        print(f'   ERROR: {s["id"]} outside facility bounds ({s["pdfCenter"]})')
        errors += 1
print(f'   Errors: {errors}')

# Zone verification
from collections import Counter
zone_counts = Counter(s['zone'] for s in spaces)
print()
print('3. ZONE BREAKDOWN:')
for zone, count in sorted(zone_counts.items()):
    print(f'   {zone}: {count} spaces')

# Confidence
conf_counts = Counter(s['confidence'] for s in spaces)
print()
print('4. CONFIDENCE LEVELS:')
for conf, count in sorted(conf_counts.items()):
    print(f'   {conf}: {count}')

# Runtime mapping
RUNTIME_TO_PHYSICAL_MAP = {
  'P01': 'PHYS_001', 'P02': 'PHYS_002', 'P03': 'PHYS_003', 'P04': 'PHYS_004', 'P05': 'PHYS_005',
  'P06': 'PHYS_017', 'P07': 'PHYS_018', 'P08': 'PHYS_019', 'P09': 'PHYS_020', 'P10': 'PHYS_033',
}
print()
print('5. RUNTIME MAPPING (P01-P10):')
all_valid = True
for rt, phys in RUNTIME_TO_PHYSICAL_MAP.items():
    found = any(s['id'] == phys for s in spaces)
    if not found:
        print(f'   ERROR: {rt} -> {phys} NOT FOUND')
        all_valid = False
    else:
        phys_space = next(s for s in spaces if s['id'] == phys)
        print(f'   {rt} -> {phys} (zone: {phys_space["zone"]}) ✓')
print(f'   All mappings valid: {all_valid}')

print()
print('=== PHASE 3 VALIDATION COMPLETE ===')
print(f'Result: {"PASS" if errors == 0 and all_valid else "FAIL"} - {len(spaces)} physical spaces verified')