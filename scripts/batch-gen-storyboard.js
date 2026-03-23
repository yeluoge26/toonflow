const WebSocket = require("ws");
const http = require("http");

const TOKEN = process.argv[2];
const PROJECT_ID = 1;
const TOTAL_SCRIPTS = 10;

function generateStoryboard(scriptId) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(
      `ws://localhost:60000/storyboard/chatStoryboard?projectId=${PROJECT_ID}&scriptId=${scriptId}&token=${TOKEN}`
    );

    let timeout;
    let segments = [];
    let shots = [];
    let toolCalls = [];
    let errors = [];

    ws.on("open", () => {
      console.log(`  [Script ${scriptId}] WS connected`);
    });

    ws.on("message", (data) => {
      const msg = data.toString();
      try {
        const parsed = JSON.parse(msg);
        switch (parsed.type) {
          case "init":
            console.log(`  [Script ${scriptId}] Init OK, sending request...`);
            ws.send(
              JSON.stringify({
                type: "msg",
                data: {
                  type: "user",
                  data: "请为这集剧本生成完整分镜。先调用片段师拆解剧本为片段，再调用分镜师为每个片段生成镜头提示词。",
                },
              })
            );
            break;
          case "toolCall":
            toolCalls.push(parsed.data.name);
            break;
          case "segmentsUpdated":
            segments = parsed.data || [];
            console.log(`  [Script ${scriptId}] Segments: ${segments.length}`);
            break;
          case "shotsUpdated":
            shots = parsed.data || [];
            break;
          case "error":
            const errMsg = typeof parsed.data === "string" ? parsed.data : JSON.stringify(parsed.data).substring(0, 200);
            errors.push(errMsg);
            console.log(`  [Script ${scriptId}] ERROR: ${errMsg}`);
            break;
          case "response_end":
            console.log(`  [Script ${scriptId}] Response end. Segments: ${segments.length}, Shots: ${shots.length}`);
            break;
        }
      } catch (e) {}

      clearTimeout(timeout);
      timeout = setTimeout(() => {
        console.log(`  [Script ${scriptId}] Idle 30s. Final: ${segments.length} segments, ${shots.length} shots`);
        // Save storyboard data via API before closing
        saveStoryboardData(scriptId, segments, shots).then(() => {
          ws.close();
          resolve({ scriptId, segments: segments.length, shots: shots.length, tools: toolCalls, errors });
        });
      }, 30000);
    });

    ws.on("error", (err) => {
      console.error(`  [Script ${scriptId}] WS Error:`, err.message);
      resolve({ scriptId, segments: 0, shots: 0, errors: [err.message] });
    });

    ws.on("close", () => {});

    // Hard timeout 5 min per script
    setTimeout(() => {
      console.log(`  [Script ${scriptId}] Hard timeout 5min`);
      ws.close();
      resolve({ scriptId, segments: segments.length, shots: shots.length, tools: toolCalls, errors: ["timeout"] });
    }, 300000);
  });
}

async function saveStoryboardData(scriptId, segments, shots) {
  if (!shots.length) return;

  // Save each shot as a storyboard asset
  for (const shot of shots) {
    for (const cell of shot.cells || []) {
      try {
        const body = JSON.stringify({
          projectId: PROJECT_ID,
          scriptId: scriptId,
          segmentId: shot.segmentId,
          shotIndex: shot.id,
          prompt: cell.prompt,
          type: "分镜",
          name: `第${scriptId}集-片段${shot.segmentId}-镜头`,
        });

        await new Promise((resolve) => {
          // Insert directly into t_assets
          const req = http.request("http://localhost:60000/assets/addAssets", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer " + TOKEN,
            },
            timeout: 10000,
          }, (res) => {
            let data = "";
            res.on("data", (c) => (data += c));
            res.on("end", () => resolve(data));
          });
          req.on("error", () => resolve(null));
          req.write(body);
          req.end();
        });
      } catch (e) {}
    }
  }
  console.log(`  [Script ${scriptId}] Saved ${shots.length} shots to DB`);
}

async function main() {
  console.log(`=== Generating storyboards for ${TOTAL_SCRIPTS} episodes ===\n`);

  for (let i = 1; i <= TOTAL_SCRIPTS; i++) {
    console.log(`--- Episode ${i}/${TOTAL_SCRIPTS} ---`);
    const result = await generateStoryboard(i);
    console.log(
      `  Result: ${result.segments} segments, ${result.shots} shots, tools: [${result.tools.join(",")}]`
    );
    if (result.errors.length) console.log(`  Errors: ${result.errors.join("; ")}`);
    console.log("");
  }

  console.log("=== ALL DONE ===");
}

main().catch(console.error);
