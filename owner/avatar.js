let API = "https://api.consia.world";
let pc = null;
let dc = null;
let localStream = null;

const $ = (id)=>document.getElementById(id);
const out = (x)=> $("out").textContent = typeof x === "string" ? x : JSON.stringify(x,null,2);

function apiBase(){
  return ($("apiInput").value || API).replace(/\/$/,"");
}

async function getSession() {
  const res = await fetch(`${apiBase()}/realtime/session`, {
    method:"POST",
    headers:{ "content-type":"application/json" },
    body: JSON.stringify({
      voice: "alloy",
      instructions: "You are CONSIA. Keep answers short. Owner-only actions require confirmation."
    })
  });
  return await res.json();
}

async function startMic(){
  if (localStream) return;
  localStream = await navigator.mediaDevices.getUserMedia({ audio:true, video:false });
  out({ ok:true, mic:"ON" });
}

async function connect(){
  out("Creating session...");
  const session = await getSession();
  if (!session?.client_secret?.value) return out({ ok:false, error:"no_client_secret", session });

  out("Starting WebRTC...");
  pc = new RTCPeerConnection();

  // mic
  if (!localStream) await startMic();
  for (const track of localStream.getTracks()) pc.addTrack(track, localStream);

  // data channel
  dc = pc.createDataChannel("oai-events");
  dc.onmessage = (e)=> {
    try { out(JSON.parse(e.data)); } catch { out(e.data); }
  };

  // remote audio
  pc.ontrack = (e)=> {
    const audio = document.createElement("audio");
    audio.autoplay = true;
    audio.srcObject = e.streams[0];
    document.body.appendChild(audio);
  };

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  const r = await fetch("https://api.openai.com/v1/realtime", {
    method:"POST",
    headers:{
      "authorization": `Bearer ${session.client_secret.value}`,
      "content-type":"application/sdp"
    },
    body: offer.sdp
  });

  const answerSdp = await r.text();
  await pc.setRemoteDescription({ type:"answer", sdp: answerSdp });

  out({ ok:true, realtime:"CONNECTED" });
}

function stop(){
  if (dc) { try{dc.close();}catch{} dc=null; }
  if (pc) { try{pc.close();}catch{} pc=null; }
  if (localStream) {
    localStream.getTracks().forEach(t=>t.stop());
    localStream=null;
  }
  out({ ok:true, realtime:"STOPPED" });
}

$("connectBtn").onclick = connect;
$("stopBtn").onclick = stop;
$("micBtn").onclick = startMic;
$("muteBtn").onclick = ()=> {
  if (!localStream) return;
  localStream.getAudioTracks().forEach(t=> t.enabled = !t.enabled);
  out({ ok:true, mic_enabled: localStream.getAudioTracks()[0]?.enabled });
};
