const WebSocket = require("ws");

const TOKEN = process.argv[2];
const PROJECT_ID = 1;
const START_SCRIPT = parseInt(process.argv[3] || "1");
const END_SCRIPT = parseInt(process.argv[4] || "10");

function runStoryboard(scriptId) {
  return new Promise((resolve) => {
    const ws = new WebSocket(
      `ws://localhost:60000/storyboard/chatStoryboard?projectId=${PROJECT_ID}&scriptId=${scriptId}&token=${TOKEN}`
    );

    let timeout;
    let segments = [];
    let shots = [];
    let phase = 0; // 0=init, 1=segments done, 2=shots partial, 3=done

    function sendShotRequest() {
      const coveredSegs = new Set(shots.map(s => s.segmentId));
      const remaining = segments.filter((_, i) => !coveredSegs.has(i + 1));
      if (remaining.length === 0) {
        console.log(`  [Ep${scriptId}] All ${segments.length} segments have shots`);
        return false;
      }
      const nextBatch = remaining.slice(0, 3).map((_, i) => {
        const allIndices = segments.map((_, j) => j + 1);
        return allIndices.filter(idx => !coveredSegs.has(idx))[i];
      }).filter(Boolean);

      console.log(`  [Ep${scriptId}] Requesting shots for segments: ${nextBatch.join(",")}`);
      ws.send(JSON.stringify({
        type: "msg",
        data: {
          type: "user",
          data: `请调用分镜师(shotAgent)为片段 ${nextBatch.join(",")} 生成镜头提示词。片段师已完成，不需要再调用。直接调用shotAgent即可。`,
        },
      }));
      return true;
    }

    ws.on("message", (data) => {
      try {
        const p = JSON.parse(data.toString());
        switch (p.type) {
          case "init":
            ws.send(JSON.stringify({
              type: "msg",
              data: {
                type: "user",
                data: "请完成两步：1.调用片段师拆解剧本为片段 2.调用分镜师为前3个片段生成镜头提示词。",
              },
            }));
            break;
          case "toolCall":
            if (["addShots", "updateSegments"].includes(p.data.name)) {
              console.log(`  [Ep${scriptId}] TOOL: ${p.data.name}`);
            }
            break;
          case "segmentsUpdated":
            segments = p.data || [];
            console.log(`  [Ep${scriptId}] Segments: ${segments.length}`);
            break;
          case "shotsUpdated":
            shots = p.data || [];
            break;
          case "response_end":
            console.log(`  [Ep${scriptId}] Response. Seg:${segments.length} Shots:${shots.length}/${segments.length}`);
            // Check if we need more shots
            const coveredSegs = new Set(shots.map(s => s.segmentId));
            const missing = segments.filter((_, i) => !coveredSegs.has(i + 1));
            if (missing.length > 0 && segments.length > 0) {
              setTimeout(() => sendShotRequest(), 1000);
            }
            break;
          case "error":
            console.log(`  [Ep${scriptId}] ERR: ${JSON.stringify(p.data).substring(0, 150)}`);
            break;
        }
      } catch (e) {}

      clearTimeout(timeout);
      timeout = setTimeout(() => {
        const coveredSegs = new Set(shots.map(s => s.segmentId));
        const allCovered = segments.length > 0 && segments.every((_, i) => coveredSegs.has(i + 1));

        if (!allCovered && segments.length > 0) {
          // Try to get remaining shots
          if (sendShotRequest()) {
            return; // Don't resolve yet
          }
        }

        const totalCells = shots.reduce((a, s) => a + (s.cells ? s.cells.length : 0), 0);
        console.log(`  [Ep${scriptId}] FINAL: ${segments.length} segments, ${shots.length} shots, ${totalCells} cells`);
        ws.close();
        resolve({ scriptId, segments: segments.length, shots: shots.length, cells: totalCells, data: shots });
      }, 35000);
    });

    ws.on("error", (e) => resolve({ scriptId, segments: 0, shots: 0, cells: 0, error: e.message }));
    setTimeout(() => { ws.close(); resolve({ scriptId, segments: segments.length, shots: shots.length, cells: shots.reduce((a, s) => a + s.cells.length, 0) }); }, 600000);
  });
}

async function main() {
  console.log(`=== Storyboard generation: Episodes ${START_SCRIPT}-${END_SCRIPT} ===\n`);

  const results = [];
  for (let i = START_SCRIPT; i <= END_SCRIPT; i++) {
    console.log(`--- Episode ${i} ---`);

    // Clear chat history for this project
    const Database = require("better-sqlite3");
    const db = new Database("./db.sqlite");
    db.prepare("DELETE FROM t_chatHistory WHERE projectId = ?").run(PROJECT_ID);
    db.close();

    const result = await runStoryboard(i);
    results.push(result);
    console.log("");
  }

  console.log("=== SUMMARY ===");
  let totalSegs = 0, totalShots = 0, totalCells = 0;
  results.forEach(r => {
    totalSegs += r.segments;
    totalShots += r.shots;
    totalCells += r.cells;
    console.log(`Ep${r.scriptId}: ${r.segments} segs, ${r.shots} shots, ${r.cells} cells`);
  });
  console.log(`TOTAL: ${totalSegs} segments, ${totalShots} shots, ${totalCells} cells`);
}

main().catch(console.error);
