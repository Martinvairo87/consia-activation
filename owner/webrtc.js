const $ = (id) => document.getElementById(id);
const log = (...a) => { $("log").textContent += a.join(" ") + "\n"; };

let pc, localStream;

function setupPC(){
  pc = new RTCPeerConnection({
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:global.stun.twilio.com:3478?transport=udp" }
    ]
  });

  pc.onicecandidate = () => {
    $("localSdp").textContent = JSON.stringify(pc.localDescription, null, 2);
  };

  pc.onconnectionstatechange = () => log("state:", pc.connectionState);
  pc.oniceconnectionstatechange = () => log("ice:", pc.iceConnectionState);

  pc.ontrack = (e) => {
    $("remote").srcObject = e.streams[0];
    log("remote track");
  };
}

async function startCamMic(){
  if (!pc) setupPC();

  localStream = await navigator.mediaDevices.getUserMedia({ video:true, audio:true });
  $("local").srcObject = localStream;
  localStream.getTracks().forEach(t => pc.addTrack(t, localStream));
  log("cam/mic ready");
}

async function createOffer(){
  const offer = await pc.createOffer({ offerToReceiveAudio:true, offerToReceiveVideo:true });
  await pc.setLocalDescription(offer);
  $("localSdp").textContent = JSON.stringify(pc.localDescription, null, 2);
  log("offer created");
}

async function applyAnswer(){
  const s = JSON.parse($("remoteSdp").value);
  await pc.setRemoteDescription(s);
  log("answer applied");
}

async function applyOffer(){
  const s = JSON.parse($("remoteSdp").value);
  await pc.setRemoteDescription(s);
  log("offer applied");
}

async function createAnswer(){
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  $("localSdp").textContent = JSON.stringify(pc.localDescription, null, 2);
  log("answer created");
}

$("start").onclick = startCamMic;
$("create").onclick = createOffer;
$("applyAnswer").onclick = applyAnswer;
$("applyOffer").onclick = applyOffer;
$("createAnswer").onclick = createAnswer;
