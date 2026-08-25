import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import http from "node:http";

// local target so the smoke test never leaves the machine
const target = http.createServer((req, res) => {
  if (req.url === "/sse") {
    res.writeHead(200, { "Content-Type": "text/event-stream" });
    res.write("event: tick\ndata: one\n\n");
    setTimeout(() => { res.write("event: tick\ndata: two\n\n"); res.end(); }, 50);
    return;
  }
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ path: req.url, method: req.method, got: body ? JSON.parse(body) : null, token: req.headers.authorization ?? null }));
  });
});
await new Promise((r) => target.listen(4599, r));

const client = new Client({ name: "smoke", version: "1.0.0" });
await client.connect(new StdioClientTransport({ command: "node", args: ["dist/index.js"], cwd: process.argv[2] ?? process.cwd() }));

const tools = await client.listTools();
console.log("TOOLS:", tools.tools.map((t) => t.name).join(", "));

const curl = await client.callTool({ name: "bulky_curl_to_script", arguments: { curl: `curl -X POST 'http://localhost:4599/users' -H 'Content-Type: application/json' -d '{"a":1}'` } });
console.log("CURL:", curl.content[0].text);

const analyze = await client.callTool({ name: "bulky_analyze_script", arguments: { code: "const r = await api.get(`${env.baseUrl}/one`);\n// note: second hop\nconst s = await api.post(`${env.baseUrl}/two`, { x: 1 });", env: { baseUrl: "http://localhost:4599" } } });
console.log("ANALYZE:", analyze.content[0].text);

const run = await client.callTool({ name: "bulky_run_script", arguments: {
  code: `// note: first call
const r = await api.get('{{baseUrl}}/one');
console.log('status', r.status);
const s = await api.post(env.baseUrl + '/two', { x: 1 }, { auth: { type: 'bearer', token: 'abc' } });
env.extracted = String(s.data.method);
const stream = await api.sse(env.baseUrl + '/sse');`,
  env: { baseUrl: "http://localhost:4599" },
  timeoutMs: 5000,
} });
console.log("RUN:", run.content[0].text);

const http1 = await client.callTool({ name: "bulky_http_request", arguments: { method: "GET", url: "http://localhost:4599/ping" } });
console.log("HTTP:", http1.content[0].text);

const who = await client.callTool({ name: "bulky_whoami", arguments: {} });
console.log("WHOAMI:", who.content[0].text);

const limit = await client.callTool({ name: "bulky_run_script", arguments: { code: "for (let i=0;i<5;i++) { await api.get('http://localhost:4599/loop'); }", maxCalls: 2 } });
console.log("LIMIT:", limit.content[0].text.slice(0, 400));

const badState = await client.callTool({ name: "bulky_list_collections", arguments: {} });
console.log("STATE-ERR:", badState.isError, badState.content[0].text.slice(0, 200));

const res = await client.listResources();
console.log("RESOURCES:", JSON.stringify(res.resources));

await client.close();
target.close();
