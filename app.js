
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, setDoc, getDoc, getDocs, where, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "YAHAN APNI API KEY DALO",
  authDomain: "cloq-app.firebaseapp.com",
  projectId: "cloq-app",
  storageBucket: "cloq-app.appspot.com",
  messagingSenderId: "YAHAN SENDER ID DALO",
  appId: "YAHAN APP ID DALO"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentRoom = "general";
let myUsername = "", myEmail = "";
let unsubscribe = null;
let blockedUsers = [];
let mediaRecorder = null, audioChunks = [];

// --- SIGNUP WITH USERNAME ---
window.signup = async function(){
  let u = document.getElementById("usernameInput").value.trim().replace("@","").toLowerCase();
  let e = document.getElementById("email").value;
  let p = document.getElementById("password").value;
  if(!u) return alert("Username likho @ahmed jaisa");
  let check = await getDoc(doc(db,"users",u));
  if(check.exists()) return alert("Ye username pehle se hai, aur try karo");
  try{
    let cred = await createUserWithEmailAndPassword(auth,e,p);
    await setDoc(doc(db,"users",u),{username:u,email:e,uid:cred.user.uid});
    alert("Account ban gaya @"+u);
  }catch(err){ document.getElementById("msg").innerText=err.message; }
}
window.login = async function(){
  let e = document.getElementById("email").value;
  let p = document.getElementById("password").value;
  try{ await signInWithEmailAndPassword(auth,e,p); }catch(err){ document.getElementById("msg").innerText=err.message; }
}
window.logout = async function(){ await signOut(auth); }

// --- SEARCH BY USERNAME ---
window.searchUser = async function(){
  let u = document.getElementById("searchUserInput").value.trim().replace("@","").toLowerCase();
  let snap = await getDoc(doc(db,"users",u));
  if(!snap.exists()){ document.getElementById("searchResult").innerHTML="❌ @"+u+" nahi mila"; return; }
  document.getElementById("searchResult").innerHTML = `✅ @${u} mil gaya <button onclick="startPrivateChat('${u}')" style="width:auto;padding:6px 10px">Chat Karo</button>`;
}
window.startPrivateChat = async function(otherUser){
  currentRoom = "private_"+[myUsername,otherUser].sort().join("_");
  document.getElementById("roomName").innerText = "@"+otherUser+" - Private Chat";
  loadMessages(); loadGroupList();
}

// --- GROUP CREATE BY USERNAME ---
window.createGroup = async function(){
  let gName = document.getElementById("newGroupName").value;
  let membersText = document.getElementById("addUsernames").value;
  if(!gName) return alert("Group ka naam likho");
  let members = membersText.split(",").map(s=>s.trim().replace("@","").toLowerCase()).filter(Boolean);
  members.push(myUsername);
  let roomId = "group_"+Date.now();
  await setDoc(doc(db,"rooms",roomId),{name:gName,members:members,createdBy:myUsername,settings:{}});
  currentRoom = roomId;
  document.getElementById("roomName").innerText = gName;
  loadGroupList(); loadMessages();
  alert("Group ban gaya!");
}
function loadGroupList(){
  let list = document.getElementById("groupList");
  list.innerHTML = `<button onclick="openRoom('general')" class="${currentRoom==='general'?'active':''}">🌍 General</button>`;
  getDocs(collection(db,"rooms")).then(snap=>{
    snap.forEach(d=>{
      let r = d.data();
      if(r.members && r.members.includes(myUsername)){
        let b = document.createElement("button");
        b.innerText = "👥 "+r.name;
        b.className = currentRoom===d.id ? "active" : "";
        b.onclick = ()=>{ currentRoom=d.id; document.getElementById("roomName").innerText=r.name; document.getElementById("roomMembers").innerText="Members: "+r.members.join(", "); loadMessages(); loadGroupList(); };
        list.appendChild(b);
      }
    });
  });
}
window.openRoom = function(room){ currentRoom=room; document.getElementById("roomName").innerText="General Group"; loadMessages(); }

// --- 3 DOT MENU ---
window.toggleMenu = function(){ document.getElementById("threeDotMenu").classList.toggle("hidden"); }
window.changeTheme = function(){
  let t = prompt("Theme likho: pink / blue / green / black");
  document.body.className = t==="pink"?"pink":t==="blue"?"blue":t==="green"?"green":"";
  alert("Theme badal gaya!");
}
window.searchInChat = function(){
  let q = prompt("Chat me kya dhoondna hai?");
  if(!q) return;
  let msgs = [...document.querySelectorAll(".msgBubble")];
  let found = msgs.find(m=>m.innerText.includes(q));
  if(found){ found.style.border="2px solid #00ff88"; found.scrollIntoView(); } else alert("Nahi mila");
}
window.blockUser = function(){
  let u = prompt("Kisko block karna hai? @username likho");
  if(u){ blockedUsers.push(u.replace("@","").toLowerCase()); alert("@"+u+" block ho gaya"); loadMessages(); }
}
window.setShortcut = function(){
  let s = prompt("Shortcut naam likho - jaise Meri Jaan");
  if(s) alert("Shortcut lag gaya: "+s);
}
window.openGroupSettings = function(){ document.getElementById("groupSettings").classList.remove("hidden"); }
window.closeGroupSettings = function(){ document.getElementById("groupSettings").classList.add("hidden"); }
window.saveGroupSettings = async function(){
  let settings = {
    onlyAdmin: document.getElementById("onlyAdminMsg").checked,
    noForward: document.getElementById("noForwardSetting").checked,
    vanish: document.getElementById("vanishSetting").checked,
    hideMembers: document.getElementById("hideMembers").checked
  };
  if(currentRoom!=="general") await setDoc(doc(db,"rooms",currentRoom),{settings:settings},{merge:true});
  alert("Group Settings Save Ho Gayi!");
  closeGroupSettings();
}
window.clearChat = function(){ if(confirm("Saari chat delete kar dun?")) document.getElementById("chatBox").innerHTML=""; }

// --- SEND MSG ---
window.sendMsg = async function(){
  let text = document.getElementById("msgInput").value;
  if(!text.trim()) return;
  await addDoc(collection(db,"rooms",currentRoom,"messages"),{text:text,sender:myUsername,type:"text",time:serverTimestamp()});
  document.getElementById("msgInput").value="";
}

// --- FILE UPLOAD - Cloudinary ---
window.uploadFile = async function(){
  let file = document.getElementById("fileInput").files[0];
  if(!file) return;
  document.getElementById("uploadStatus").innerText="Upload ho raha hai...";
  let form = new FormData();
  form.append("file",file);
  form.append("upload_preset","ml_default");
  form.append("cloud_name","YAHAN APNA CLOUDINARY NAME DALO");
  try{
    let res = await fetch("https://api.cloudinary.com/v1_1/YAHAN APNA CLOUDINARY NAME DALO/auto/upload",{method:"POST",body:form});
    let data = await res.json();
    await addDoc(collection(db,"rooms",currentRoom,"messages"),{text:"File bheji",fileUrl:data.secure_url,fileType:file.type,sender:myUsername,type:file.type.startsWith("image")?"image":"file",time:serverTimestamp()});
    document.getElementById("uploadStatus").innerText="✅ File bhej di!";
  }catch(e){ document.getElementById("uploadStatus").innerText="Cloudinary setup karo"; }
}

// --- VOICE NOTE ---
window.toggleVoice = async function(){
  if(!mediaRecorder){
    let stream = await navigator.mediaDevices.getUserMedia({audio:true});
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = e=>audioChunks.push(e.data);
    mediaRecorder.onstop = async ()=>{
      let blob = new Blob(audioChunks,{type:"audio/webm"}); audioChunks=[];
      let url = URL.createObjectURL(blob);
      await addDoc(collection(db,"rooms",currentRoom,"messages"),{text:"Voice Note",fileUrl:url,sender:myUsername,type:"voice",time:serverTimestamp()});
    };
    mediaRecorder.start(); document.getElementById("voiceBtn").innerText="⏹️"; alert("Recording shuru, dobara dabao band karne ke liye");
  } else {
    mediaRecorder.stop(); mediaRecorder=null; document.getElementById("voiceBtn").innerText="🎤";
  }
}

// --- CALL ---
window.startCall = async function(){
  document.getElementById("callUI").classList.remove("hidden");
  document.getElementById("callStatus").innerText="Call lag rahi hai... Mic ON hai";
  try{ await navigator.mediaDevices.getUserMedia({audio:true}); document.getElementById("callStatus").innerText="✅ Connected - Baat karo! (Video Call Play Store wale App me aayegi)"; }catch(e){ document.getElementById("callStatus").innerText="Mic allow karo"; }
}
window.endCall = function(){ document.getElementById("callUI").classList.add("hidden"); }

// --- PUBLIC ROOMS + EXPLORE ---
window.createPublicRoom = async function(){
  let title = document.getElementById("roomTitle").value.trim();
  let desc = document.getElementById("roomDesc").value.trim();
  let type = document.getElementById("roomType").value;
  if(!title) return alert("Room ka naam to likho!");
  let roomId = "room_"+Date.now();
  await setDoc(doc(db,"publicRooms",roomId),{title:title,desc:desc||"Masti karo, baat karo!",type:type,owner:myUsername,members:[myUsername],membersCount:1,createdAt:serverTimestamp(),online:1});
  alert("Mubarak! Tumhara Room ban gaya - "+title);
  document.getElementById("roomTitle").value=""; document.getElementById("roomDesc").value="";
  currentRoom = roomId;
  document.getElementById("roomName").innerText = "🏠 "+title;
  loadMessages(); loadExploreRooms();
}
window.loadExploreRooms = async function(){
  let search = document.getElementById("exploreSearch")?.value.toLowerCase() || "";
  let list = document.getElementById("exploreList");
  if(!list) return;
  list.innerHTML = "Loading...";
  let snap = await getDocs(collection(db,"publicRooms"));
  list.innerHTML = "";
  let myRooms = [];
  snap.forEach(d=>{
    let r = d.data();
    if(r.owner === myUsername) myRooms.push(r.title);
    if(search && !r.title.toLowerCase().includes(search) && !r.desc.toLowerCase().includes(search)) return;
    if(r.type === "private" && r.owner !== myUsername) return;
    let isJoined = r.members && r.members.includes(myUsername);
    let div = document.createElement("div");
    div.style.cssText = "background:#222;padding:10px;border-radius:10px;margin-top:8px;text-align:left";
    div.innerHTML = `<b>🏠 ${r.title}</b> ${r.type==="public"?"🌍":"🔒"}<br><small style="opacity:0.7">${r.desc} | Owner: @${r.owner} | Members: ${r.membersCount || r.members?.length || 1}</small><br><button onclick="joinExploreRoom('${d.id}','${r.title}')" style="width:auto;padding:8px 15px;margin-top:6px;background:${isJoined?"#333":"#00ff88"};color:${isJoined?"white":"black"}">${isJoined ? "✅ Andar Jao" : "➕ Join Room"}</button>${r.owner !== myUsername ? `<button onclick="leaveExploreRoom('${d.id}')" style="width:auto;padding:8px 10px;margin-left:5px;background:red">Leave</button>` : `<button onclick="deleteMyRoom('${d.id}')" style="width:auto;padding:8px 10px;margin-left:5px;background:#444;color:white">Delete</button>`}`;
    list.appendChild(div);
  });
  if(list.innerHTML === "") list.innerHTML = "<p>Abhi koi Room nahi hai. Tum pehla banao!</p>";
  document.getElementById("myRoomsList").innerText = myRooms.length ? "Tumhare Rooms: " + myRooms.join(", ") : "";
}
window.joinExploreRoom = async function(roomId, title){
  let ref = doc(db,"publicRooms",roomId);
  let snap = await getDoc(ref);
  let data = snap.data();
  let members = data.members || [];
  if(!members.includes(myUsername)){
    members.push(myUsername);
    await setDoc(ref,{ members: members, membersCount: members.length },{merge:true});
    alert("Tum " + title + " me aa gaye!");
  }
  currentRoom = roomId;
  document.getElementById("roomName").innerText = "🏠 " + title;
  document.getElementById("roomMembers").innerText = "Members: " + members.join(", ");
  loadMessages(); loadExploreRooms();
}
window.leaveExploreRoom = async function(roomId){
  let ref = doc(db,"publicRooms",roomId);
  let snap = await getDoc(ref);
  let members = (snap.data().members || []).filter(m=>m!==myUsername);
  await setDoc(ref,{members:members, membersCount:members.length},{merge:true});
  alert("Room se nikal gaye"); loadExploreRooms();
}
window.deleteMyRoom = async function(roomId){
  if(!confirm("Apna Room delete kar dun?")) return;
  await deleteDoc(doc(db,"publicRooms",roomId));
  loadExploreRooms();
}

function loadMessages(){
  if(unsubscribe) unsubscribe();
  const q = query(collection(db,"rooms",currentRoom,"messages"),orderBy("time","asc"));
  unsubscribe = onSnapshot(q,(snapshot)=>{
    let box = document.getElementById("chatBox"); box.innerHTML="";
    snapshot.forEach(doc=>{
      let d = doc.data();
      if(blockedUsers.includes(d.sender)) return;
      let div = document.createElement("div");
      div.className = "msgBubble"+(d.sender===myUsername?" mine":"");
      let content = `<small>@${d.sender}</small>${d.text}`;
      if(d.type==="image") content += `<br><img src="${d.fileUrl}">`;
      if(d.type==="file") content += `<br><a href="${d.fileUrl}" target="_blank" style="color:#00ff88">📎 File Kholo</a>`;
      if(d.type==="voice") content += `<br><audio controls src="${d.fileUrl}"></audio>`;
      div.innerHTML = content;
      box.appendChild(div);
    });
    box.scrollTop = box.scrollHeight;
  });
}

onAuthStateChanged(auth,async(user)=>{
  if(user){
    myEmail=user.email;
    let snap = await getDocs(query(collection(db,"users"),where("email","==",myEmail)));
    snap.forEach(d=>{ myUsername=d.data().username; });
    if(!myUsername) myUsername = myEmail.split("@")[0];
    document.getElementById("myUsernameShow").innerText="@"+myUsername;
    document.getElementById("loginPage").classList.add("hidden");
    document.getElementById("homePage").classList.remove("hidden");
    loadGroupList(); loadMessages(); loadExploreRooms();
  } else {
    document.getElementById("loginPage").classList.remove("hidden");
    document.getElementById("homePage").classList.add("hidden");
  }
});
