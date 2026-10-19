/**
 * PARKTWIN AI — ACADEMIC PROJECT INTRODUCTION VIDEO RENDERER
 * ==========================================================
 * - Renders 10.00 seconds at 30 fps (300 frames)
 * - Resolution: 1920x1080 Full HD (16:9)
 * - Output:
 *   1. demo-recordings/parktwin-academic-intro-10s.mp4 (H.264 High Profile, CRF 16)
 *   2. demo-recordings/parktwin-academic-intro-10s.webm (VP9, 4 Mbps)
 *   3. Artifact keyframe exports for immediate verification
 */

const { spawn, execSync } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const FFMPEG_PATH = 'C:\\Users\\ASUS\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.1.1-full_build\\bin\\ffmpeg.exe';
const FFPROBE_PATH = 'C:\\Users\\ASUS\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.1.1-full_build\\bin\\ffprobe.exe';

const ROOT_DIR = 'C:\\Users\\ASUS\\Desktop\\parktwin';
const HTML_PATH = path.join(ROOT_DIR, 'scripts', 'academic-intro.html');
const FRAMES_DIR = path.join(ROOT_DIR, 'demo-recordings', 'intro-frames');
const MP4_OUT = path.join(ROOT_DIR, 'demo-recordings', 'parktwin-academic-intro-10s.mp4');
const WEBM_OUT = path.join(ROOT_DIR, 'demo-recordings', 'parktwin-academic-intro-10s.webm');
const ARTIFACT_DIR = 'C:\\Users\\ASUS\\.gemini\antigravity\\brain\\95d42e15-f049-445b-8a10-5d61a2c5487a';

const PORT = 9333;
const FPS = 30;
const DURATION = 10.0;
const TOTAL_FRAMES = Math.round(FPS * DURATION); // 300 frames

let reqId = 1;

function sendCdp(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = reqId++;
    const handler = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.id === id) {
          ws.removeEventListener('message', handler);
          if (msg.error) {
            reject(new Error(msg.error.message || JSON.stringify(msg.error)));
          } else {
            resolve(msg.result);
          }
        }
      } catch (err) {
        // ignore other messages
      }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  console.log('===========================================================');
  console.log('PARKTWIN AI — ACADEMIC INTRO 10-SECOND HIGH-RES RENDERER');
  console.log(`Resolution: 1920x1080 | FPS: ${FPS} | Frames: ${TOTAL_FRAMES}`);
  console.log('===========================================================\n');

  // Prepare frames directory
  if (fs.existsSync(FRAMES_DIR)) {
    fs.rmSync(FRAMES_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(FRAMES_DIR, { recursive: true });

  const tempUserData = path.join(ROOT_DIR, 'demo-recordings', '.chrome-temp-user-data');
  if (fs.existsSync(tempUserData)) {
    try { fs.rmSync(tempUserData, { recursive: true, force: true }); } catch (e) {}
  }

  // 1. Launch Chrome Headless
  console.log('Launching Headless Chrome for deterministic frame rendering...');
  const chromeArgs = [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    '--window-size=1920,1080',
    '--hide-scrollbars',
    '--mute-audio',
    '--disable-background-networking',
    '--disable-default-apps',
    '--disable-extensions',
    '--disable-sync',
    '--no-first-run',
    `--user-data-dir=${tempUserData}`,
    'about:blank'
  ];

  const chromeProc = spawn(CHROME_PATH, chromeArgs, { stdio: 'ignore' });

  // 2. Wait for CDP port
  let targetWsUrl = null;
  for (let i = 0; i < 30; i++) {
    await sleep(300);
    try {
      const list = await fetchJson(`http://localhost:${PORT}/json/list`);
      if (list && list.length > 0 && list[0].webSocketDebuggerUrl) {
        targetWsUrl = list[0].webSocketDebuggerUrl;
        break;
      }
    } catch (e) {}
  }

  if (!targetWsUrl) {
    chromeProc.kill();
    throw new Error('Failed to connect to Headless Chrome CDP');
  }

  console.log('Connected to Chrome DevTools Protocol.');
  const ws = new WebSocket(targetWsUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve);
    ws.addEventListener('error', reject);
  });

  // 3. Set device metrics & navigate
  console.log('Setting viewport to native 1920x1080...');
  await sendCdp(ws, 'Page.enable');
  await sendCdp(ws, 'Runtime.enable');
  await sendCdp(ws, 'Emulation.setDeviceMetricsOverride', {
    width: 1920,
    height: 1080,
    deviceScaleFactor: 1,
    mobile: false
  });

  const fileUrl = 'file:///' + HTML_PATH.replace(/\\/g, '/');
  console.log(`Navigating to ${fileUrl}...`);
  await sendCdp(ws, 'Page.navigate', { url: fileUrl });

  // Wait for fonts & page ready
  console.log('Awaiting document & web fonts readiness...');
  for (let i = 0; i < 20; i++) {
    const ready = await sendCdp(ws, 'Runtime.evaluate', {
      expression: 'document.fonts ? document.fonts.status === "loaded" : true',
      returnByValue: true
    });
    if (ready?.result?.value) break;
    await sleep(250);
  }
  await sleep(1000); // safety buffer for initial paint

  // 4. Render frames loop
  console.log(`\nRendering ${TOTAL_FRAMES} frames deterministically at 30 FPS...`);
  const startTime = Date.now();

  for (let i = 0; i < TOTAL_FRAMES; i++) {
    const t = i / FPS;
    // Set exact timeline position
    await sendCdp(ws, 'Runtime.evaluate', {
      expression: `window.setFrameTime(${t.toFixed(4)})`,
      returnByValue: true
    });

    // Capture screenshot
    const shot = await sendCdp(ws, 'Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: false
    });

    const frameFile = path.join(FRAMES_DIR, `frame_${String(i).padStart(4, '0')}.png`);
    fs.writeFileSync(frameFile, Buffer.from(shot.data, 'base64'));

    if (i % 30 === 0 || i === TOTAL_FRAMES - 1) {
      const pct = Math.round(((i + 1) / TOTAL_FRAMES) * 100);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      process.stdout.write(`\r  Frame ${String(i).padStart(3, '0')}/${TOTAL_FRAMES} (${t.toFixed(2)}s) — ${pct}% [${elapsed}s]`);
    }
  }
  console.log(`\n✓ All ${TOTAL_FRAMES} frames captured in ${((Date.now() - startTime) / 1000).toFixed(1)}s.`);

  // Clean close Chrome
  ws.close();
  chromeProc.kill();
  try { fs.rmSync(tempUserData, { recursive: true, force: true }); } catch (e) {}

  // 5. Copy keyframes to Artifacts Directory
  console.log('\nExporting verification keyframes to brain artifacts...');
  const keyframes = [
    { frame: 30, name: 'intro_00_01.png', label: 'Scene 1: ParkTwin AI (00:01.00)' },
    { frame: 105, name: 'intro_00_03.png', label: 'Scene 2: Project by Mayur VS (00:03.50)' },
    { frame: 186, name: 'intro_00_06.png', label: 'Scene 3: Project Guide Sindhu R Pai (00:06.20)' },
    { frame: 270, name: 'intro_00_09.png', label: 'Scene 4: Master Mentor Dr. Shylaja S S (00:09.00)' },
    { frame: 299, name: 'intro_00_10.png', label: 'End Frame: Master Mentor Hold (00:10.00)' }
  ];

  for (const kf of keyframes) {
    const src = path.join(FRAMES_DIR, `frame_${String(kf.frame).padStart(4, '0')}.png`);
    const dest = path.join(ARTIFACT_DIR, kf.name);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
      console.log(`  ✓ Saved ${kf.label} -> ${dest}`);
    }
  }

  // 6. Encode Master Deliverables with FFmpeg
  console.log('\nEncoding master video deliverables with FFmpeg...');

  // MP4 (H.264 High Profile, CRF 16, 30fps)
  const mp4Cmd = `"${FFMPEG_PATH}" -y -framerate ${FPS} -i "${path.join(FRAMES_DIR, 'frame_%04d.png')}" -c:v libx264 -preset slow -crf 16 -pix_fmt yuv420p -movflags +faststart "${MP4_OUT}"`;
  console.log('  Encoding MP4 (H.264)...');
  execSync(mp4Cmd, { stdio: 'inherit' });

  // WebM (VP9, 4M, 30fps)
  const webmCmd = `"${FFMPEG_PATH}" -y -framerate ${FPS} -i "${path.join(FRAMES_DIR, 'frame_%04d.png')}" -c:v libvpx-vp9 -b:v 4M -pix_fmt yuv420p "${WEBM_OUT}"`;
  console.log('  Encoding WebM (VP9)...');
  execSync(webmCmd, { stdio: 'inherit' });

  // 7. Verify deliverables with FFprobe
  console.log('\nVerifying output deliverables with FFprobe...');
  const probeMp4 = execSync(`"${FFPROBE_PATH}" -v error -show_entries format=duration,size:stream=width,height,r_frame_rate,codec_name -of json "${MP4_OUT}"`).toString();
  const probeWebm = execSync(`"${FFPROBE_PATH}" -v error -show_entries format=duration,size:stream=width,height,r_frame_rate,codec_name -of json "${WEBM_OUT}"`).toString();

  console.log('MP4 Metadata:', probeMp4);
  console.log('WebM Metadata:', probeWebm);

  console.log('\n===========================================================');
  console.log('✓ RENDERING & ENCODING SUCCESSFULLY COMPLETED');
  console.log(`MP4:  ${MP4_OUT}`);
  console.log(`WebM: ${WEBM_OUT}`);
  console.log('===========================================================');
}

main().catch(err => {
  console.error('Fatal error during video render:', err);
  process.exit(1);
});
