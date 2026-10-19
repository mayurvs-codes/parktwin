/**
 * PARKTWIN AI — ACADEMIC INTRO PLAYWRIGHT MCP RECORDER
 * ====================================================
 * Records native 1920x1080 10-second academic project introduction video
 * and captures high-res artifact keyframes at each scene.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const MCP_PORT = 9998;
const BASE_URL = 'http://localhost:3000/academic-intro.html';
const DEMO_DIR = 'C:\\Users\\ASUS\\Desktop\\parktwin\\demo-recordings';
const RAW_VIDEO = path.join(DEMO_DIR, 'intro-raw.webm');
const FINAL_MP4 = path.join(DEMO_DIR, 'parktwin-academic-intro-10s.mp4');
const FINAL_WEBM = path.join(DEMO_DIR, 'parktwin-academic-intro-10s.webm');
const ARTIFACT_DIR = 'C:\\Users\\ASUS\\.gemini\\antigravity\\brain\\95d42e15-f049-445b-8a10-5d61a2c5487a';

const FFMPEG_PATH = 'C:\\Users\\ASUS\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.1.1-full_build\\bin\\ffmpeg.exe';
const FFPROBE_PATH = 'C:\\Users\\ASUS\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.1.1-full_build\\bin\\ffprobe.exe';

let sessionId = null;
let rid = 1;

function mcp(method, params) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ jsonrpc: '2.0', id: rid++, method, params: params || {} });
    const hdrs = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      'Content-Length': Buffer.byteLength(body),
    };
    if (sessionId) hdrs['mcp-session-id'] = sessionId;

    const req = http.request(
      { hostname: 'localhost', port: MCP_PORT, path: '/mcp', method: 'POST', headers: hdrs },
      (res) => {
        if (res.headers['mcp-session-id']) sessionId = res.headers['mcp-session-id'];
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => {
          const lines = d.split('\n').filter(l => l.startsWith('data:'));
          if (lines.length > 0) {
            const parsed = lines.map(l => { try { return JSON.parse(l.slice(5)); } catch { return null; } }).filter(Boolean);
            resolve(parsed[0] || null);
          } else {
            try { resolve(JSON.parse(d)); } catch { resolve(null); }
          }
        });
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function getText(r) {
  const c = (r?.result?.content || r?.content || []);
  return Array.isArray(c) ? c.map(x => x.text || '').join('\n') : String(c || '');
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function ev(fnStr) {
  const r = await mcp('tools/call', {
    name: 'browser_evaluate',
    arguments: { function: fnStr }
  });
  return getText(r);
}

async function takeScreenshot(outputPath) {
  const res = await mcp('tools/call', {
    name: 'browser_take_screenshot',
    arguments: { fullPage: false }
  });
  // If result has base64 image or saved file
  const contents = res?.result?.content || res?.content || [];
  for (const item of contents) {
    if (item.type === 'image' && item.data) {
      fs.writeFileSync(outputPath, Buffer.from(item.data, 'base64'));
      return true;
    }
  }
  return false;
}

async function main() {
  console.log('===========================================================');
  console.log('PARKTWIN AI — ACADEMIC INTRO PLAYWRIGHT MCP RECORDER');
  console.log('Target Duration: 10.00s | Native 1920x1080 Full HD (16:9)');
  console.log('===========================================================\n');

  // 1. Initialize MCP session
  console.log('Connecting to Playwright MCP on port 9998...');
  await mcp('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'parktwin-academic-intro', version: '1.0' },
  });
  await mcp('notifications/initialized', {});
  console.log(`MCP Session active: ${sessionId}`);

  // 2. Set viewport & Navigate
  console.log('Setting viewport to 1920x1080 and loading template...');
  await mcp('tools/call', {
    name: 'browser_resize',
    arguments: { width: 1920, height: 1080 }
  });

  await mcp('tools/call', {
    name: 'browser_navigate',
    arguments: { url: BASE_URL }
  });
  await sleep(1500); // Allow fonts to settle

  // 3. Capture pristine keyframes by setting exact timestamps
  console.log('\nCapturing crisp keyframes for artifact verification...');
  const keyframes = [
    { t: 1.0, file: 'intro_00_01.png', label: 'Scene 1: PARKTWIN AI (00:01.00)' },
    { t: 3.5, file: 'intro_00_03.png', label: 'Scene 2: PROJECT BY MAYUR VS (00:03.50)' },
    { t: 6.2, file: 'intro_00_06.png', label: 'Scene 3: PROJECT GUIDE SINDHU R PAI (00:06.20)' },
    { t: 8.8, file: 'intro_00_09.png', label: 'Scene 4: MASTER MENTOR DR. SHYLAJA S S (00:08.80)' },
    { t: 10.0, file: 'intro_00_10.png', label: 'End Frame: MASTER MENTOR HOLD (00:10.00)' }
  ];

  for (const kf of keyframes) {
    await ev(`() => { window.setFrameTime(${kf.t}); }`);
    await sleep(250);
    const dest = path.join(ARTIFACT_DIR, kf.file);
    const ok = await takeScreenshot(dest);
    console.log(`  ✓ Keyframe ${kf.label} -> ${ok ? 'SAVED' : 'FAILED'}`);
  }

  // 4. Start Native Video Recording
  console.log('\n▶ Starting native 1920x1080 video recording...');
  await ev("() => { window.setFrameTime(0); }");
  await sleep(300);

  if (fs.existsSync(RAW_VIDEO)) {
    try { fs.unlinkSync(RAW_VIDEO); } catch(e) {}
  }

  await mcp('tools/call', {
    name: 'browser_start_video',
    arguments: {
      filename: RAW_VIDEO,
      size: { width: 1920, height: 1080 }
    }
  });

  const recStart = Date.now();
  console.log('Starting smooth cinematic playback...');
  await ev("() => { window.startPlayback(); }");

  // Chapter markers for presentation structure
  await mcp('tools/call', { name: 'browser_video_chapter', arguments: { title: 'PARKTWIN AI', description: 'Smart Parking Digital Twin' } });
  await sleep(2000);
  await mcp('tools/call', { name: 'browser_video_chapter', arguments: { title: 'PROJECT BY', description: 'MAYUR VS · MECHANICAL ENGINEERING · PES UNIVERSITY' } });
  await sleep(3000);
  await mcp('tools/call', { name: 'browser_video_chapter', arguments: { title: 'PROJECT GUIDE', description: 'SINDHU R PAI · Assistant Professor' } });
  await sleep(2500);
  await mcp('tools/call', { name: 'browser_video_chapter', arguments: { title: 'MASTER MENTOR', description: 'DR. SHYLAJA S S · Chairperson · Director CCBD · CDSAML' } });

  // Hold remaining time until exactly 10.15s
  const elapsedNow = (Date.now() - recStart) / 1000;
  const remMs = Math.max(0, Math.round((10.15 - elapsedNow) * 1000));
  if (remMs > 0) await sleep(remMs);

  console.log(`\n■ Stopping video recording at ${((Date.now() - recStart) / 1000).toFixed(2)}s...`);
  await mcp('tools/call', { name: 'browser_stop_video', arguments: {} });
  await sleep(3000); // Allow file write flush

  // 5. Transcode with FFmpeg to exact 10.00s MP4 & WebM
  console.log('\nTranscoding to master 10.00s deliverables via FFmpeg...');
  
  // Cut to exact 10.00s with pristine H.264
  const mp4Cmd = `"${FFMPEG_PATH}" -y -ss 00:00:00 -i "${RAW_VIDEO}" -t 10.00 -c:v libx264 -preset slow -crf 16 -pix_fmt yuv420p -r 30 -movflags +faststart "${FINAL_MP4}"`;
  console.log('  Encoding MP4 (H.264, 1920x1080, 10.00s)...');
  execSync(mp4Cmd, { stdio: 'inherit' });

  // Cut to exact 10.00s WebM VP9
  const webmCmd = `"${FFMPEG_PATH}" -y -ss 00:00:00 -i "${RAW_VIDEO}" -t 10.00 -c:v libvpx-vp9 -b:v 4M -pix_fmt yuv420p -r 30 "${FINAL_WEBM}"`;
  console.log('  Encoding WebM (VP9, 1920x1080, 10.00s)...');
  execSync(webmCmd, { stdio: 'inherit' });

  // 6. Verify with FFprobe
  console.log('\nVerifying output deliverables with FFprobe...');
  const probeMp4 = execSync(`"${FFPROBE_PATH}" -v error -show_entries format=duration,size:stream=width,height,r_frame_rate,codec_name -of json "${FINAL_MP4}"`).toString();
  const probeWebm = execSync(`"${FFPROBE_PATH}" -v error -show_entries format=duration,size:stream=width,height,r_frame_rate,codec_name -of json "${FINAL_WEBM}"`).toString();

  console.log('MP4 Metadata:', probeMp4);
  console.log('WebM Metadata:', probeWebm);

  // 7. Generate stitched presentation (Intro + Main 3:18 Demo)
  const MAIN_DEMO_MP4 = path.join(DEMO_DIR, 'parktwin-final-professional-1080p-3m18s.mp4');
  const STITCHED_MP4 = path.join(DEMO_DIR, 'parktwin-complete-presentation-with-intro.mp4');

  if (fs.existsSync(MAIN_DEMO_MP4)) {
    console.log('\nStitching intro with master 3:18 demo video...');
    const concatList = path.join(DEMO_DIR, 'concat_list.txt');
    // We add a silent audio track to intro so concat filter or muxing merges seamlessly with the narrated main demo
    const INTRO_WITH_SILENT_AUDIO = path.join(DEMO_DIR, 'intro-with-silence.mp4');
    const addSilenceCmd = `"${FFMPEG_PATH}" -y -i "${FINAL_MP4}" -f lavfi -i anullsrc=channel_layout=mono:sample_rate=44100 -c:v copy -c:a aac -shortest "${INTRO_WITH_SILENT_AUDIO}"`;
    execSync(addSilenceCmd, { stdio: 'inherit' });

    fs.writeFileSync(concatList, `file '${INTRO_WITH_SILENT_AUDIO.replace(/\\/g, '/')}'\nfile '${MAIN_DEMO_MP4.replace(/\\/g, '/')}'\n`);
    const stitchCmd = `"${FFMPEG_PATH}" -y -f concat -safe 0 -i "${concatList}" -c:v libx264 -crf 17 -pix_fmt yuv420p -c:a aac -b:a 192k "${STITCHED_MP4}"`;
    execSync(stitchCmd, { stdio: 'inherit' });
    console.log(`✓ Stitched presentation created: ${STITCHED_MP4}`);
  }

  console.log('\n===========================================================');
  console.log('✓ ACADEMIC INTRO VIDEO SUCCESSFULLY CREATED');
  console.log(`MP4:      ${FINAL_MP4}`);
  console.log(`WebM:     ${FINAL_WEBM}`);
  console.log(`Stitched: ${STITCHED_MP4}`);
  console.log('===========================================================');
}

main().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
