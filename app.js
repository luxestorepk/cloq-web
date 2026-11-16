import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, setDoc, getDoc, getDocs, where, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyB7zPYGBy0sRrqqZ_WjxQikiEhGHESDHLM",
  authDomain: "cloq-ba2e7.firebaseapp.com",
  projectId: "cloq-ba2e7",
  storageBucket: "cloq-ba2e7.firebasestorage.app",
  messagingSenderId: "57829575029",
  appId: "1:57829575029:web:b9c1d99ab47eed63b56b3c",
  measurementId: "G-F7QCXTYBNM"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentRoom = "general", myUsername="", myEmail="", unsubscribe=null, blockedUsers=[], mediaRecorder=null, audioChunks=[], vanishMode=false, funMode=false, currentTab="all", currentSection="chats", favList=JSON.parse(localStorage.getItem("cloq_fav")||"[]"), contacts=JSON.parse(localStorage.getItem("cloq_contacts")||"[]");

// SPLASH + AGREEMENT
window.addEventListener("load", ()=>{
  setTimeout(()=>{ document.getElementById("splash").style.display="none"; if(!localStorage.getItem("cloq_agree")) document.getElementById("agreement").classList.remove("hidden"); }, 1400);
});
window.acceptAgreement = function(){
  if(!document.getElementById("agreeCheck").checked) return alert("Pehle checkbox tick karo");
  localStorage.setItem("cloq_agree","yes"); document.getElementById("agreement").classList.add("hidden");
};

// AUTH
window.signup = async function(){
  let u = document.getElementById("usernameInput").value.trim().replace("@","").toLowerCase();
  let e = document.getElementById("email").value.trim(); let p = document.getElementById("password").value.trim();
  let msg = document.getElementById("msg"); if(msg) msg.innerText="Account ban raha hai...";
  if(!u) return alert("Username likho"); if(!e.includes("@")) return alert("Sahi Email likho"); if(p.length<6) return alert("Password 6+ lafz ka likho");
  try{ let check = await getDoc(doc(db,"users",u)); if(check.exists()) return alert("Ye username pehle se hai");
    let cred = await createUserWithEmailAndPassword(auth,e,p); await setDoc(doc(db,"users",u),{username:u,email:e,uid:cred.user.uid});
    alert("Mubarak! Account ban gaya @"+u); if(msg) msg.innerText="";
  }catch(err){ if(msg) msg.innerText=err.code+" : "+err.message; alert(err.message); }
};
window.login = async function(){
  let e=document.getElementById("email").value.trim(); let p=document.getElementById("password").value.trim(); let msg=document.getElementById("msg");
  if(msg) msg.innerText="Login ho raha hai...";
  try{ await signInWithEmailAndPassword(auth,e,p); }catch(err){ if(msg) msg.innerText=err.message; alert(err.message); }
};
window.logout = async function(){ if(confirm("Logout kar dun?")) await signOut(auth); };

// NAVIGATION - WHATSAPP STYLE
window.showSection = function(sec, btn){
  currentSection=sec; document.querySelectorAll(".bottomNav button").forEach(b=>b.classList.remove("active")); if(btn) btn.classList.add("active");
  if(sec==="chats") renderChats(); if(sec==="status") renderStatus(); if(sec==="rooms") renderRooms(); if(sec==="calls") renderCalls();
  document.getElementById("fabBtn").innerText = sec==="rooms" ? "🏠" : sec==="status" ? "📸" : "＋";
  document.getElementById("fabBtn").onclick = sec==="rooms" ? openRoomModal : sec==="status" ? addStatus : openAddContact;
};
window.setTab = function(btn, tab){ currentTab=tab; document.querySelectorAll("#topTabs button").forEach(b=>b.classList.remove("active")); btn.classList.add("active"); renderChats(); };
window.openAddContact = function(){ document.getElementById("addContactModal").classList.remove("hidden"); };
window.closeAddContact = function(){ document.getElementById("addContactModal").classList.add("hidden"); };
window.openRoomModal = function(){ document.getElementById("roomModal").classList.remove("hidden"); };
window.closeRoomModal = function(){ document.getElementById("roomModal").classList.add("hidden"); };
window.openSearch = function(){ let q=prompt("Kya dhoondna hai? Username ya Room"); if(q) alert("Search: "+q+" - Chats list me dekho"); };
window.toggleMenuHome = function(){ if(confirm("Logout karna hai?")) logout(); };

// RENDER - CHATS LIST (WHATSAPP JAISE)
async function renderChats(){
  let list=document.getElementById("mainList"); list.innerHTML="<p style='text-align:center;color:#8696a0;padding:20px'>Loading chats...</p>";
  let html="";
  // 1. General
  html+=`<div class="chatItem" onclick="openChat('general','General Group')"><div class="avatar">🌍</div><div style="flex:1"><h4>General Group <span>Abhi</span></h4><p>Sab se baat karo - CLOQ ka main group</p></div><div class="unread">3</div></div>`;
  // 2. Contacts
  contacts.forEach(c=>{ if(currentTab==="groups") return; html+=`<div class="chatItem" onclick="openChat('private_${[myUsername,c].sort().join('_')}','@${c}')"><div class="avatar">${c.charAt(0).toUpperCase()}</div><div style="flex:1"><h4>@${c} <span>•</span></h4><p>Tap karke chat karo • Private</p></div>${favList.includes(c)?"<span>⭐</span>":""}</div>`; });
  // 3. Groups from Firestore
  try{ let snap=await getDocs(collection(db,"rooms")); snap.forEach(d=>{ let r=d.data(); if(r.members && r.members.includes(myUsername)){ if(currentTab==="groups"||currentTab==="all") html+=`<div class="chatItem" onclick="openChat('${d.id}','${r.name}')"><div class="avatar">👥</div><div style="flex:1"><h4>${r.name}</h4><p>${r.members.length} members • Group</p></div></div>`; } }); }catch(e){}
  if(contacts.length===0 && currentTab==="all") html+=`<div style="padding:16px;text-align:center;color:#8696a0;font-size:13px">Koi chat nahi hai. Neeche <b>+</b> dabake naya contact add karo.</div>`;
  list.innerHTML=html;
}
function renderStatus(){
  let list=document.getElementById("mainList");
  list.innerHTML=`<div class="statusCard" onclick="addStatus()"><div class="avatar">＋</div><div><b>Mera Status</b><p style="color:#8696a0;font-size:12px">Tap karke Status lagao</p></div></div><p style="padding:0 14px;color:#8696a0;font-size:12px">RECENT UPDATES</p><div class="statusCard"><div class="avatar">C</div><div><b>@cloq_official</b><p style="color:#8696a0;font-size:12px">CLOQ 2.0 aa gaya! 🔥 • 2 min pehle</p></div></div><div class="statusCard"><div class="avatar">A</div><div><b>@ahmed</b><p style="color:#8696a0;font-size:12px">Cricket jeet gaye! 🏏 • 1 ghanta pehle</p></div></div>`;
}
window.addStatus = function(){ let s=prompt("Apna Status likho:"); if(s) alert("Status lag gaya: "+s+" (Dosto ko dikhega)"); renderStatus(); };
async function renderRooms(){
  let list=document.getElementById("mainList"); list.innerHTML="<p style='padding:14px;color:#8696a0'>Rooms loading...</p><div style='padding:0 14px'><input id='roomSearchInp' placeholder='Room dhoondo...' style='width:100%;background:#202c33;border:none;padding:12px;border-radius:12px;color:#fff' oninput='renderRooms()'></div><div id='roomListIn'></div>";
  try{ let snap=await getDocs(collection(db,"publicRooms")); let inner=""; snap.forEach(d=>{ let r=d.data(); let q=document.getElementById("roomSearchInp")?.value.toLowerCase()||""; if(q && !r.title.toLowerCase().includes(q)) return; inner+=`<div class="chatItem" onclick="openChat('${d.id}','🏠 ${r.title}')"><div class="avatar">🏠</div><div style="flex:1"><h4>${r.title} <span>${r.type==="public"?"🌍":"🔒"}</span></h4><p>${r.desc} • Owner @${r.owner} • ${r.membersCount||1} members</p></div><button style="background:#00a884;color:#fff;padding:8px 12px;border-radius:20px" onclick="event.stopPropagation();openChat('${d.id}','🏠 ${r.title}')">Join</button></div>`; }); document.getElementById("roomListIn").innerHTML=inner||"<p style='padding:14px;color:#8696a0'>Koi Room nahi. + dabake banao!</p>"; }catch(e){ document.getElementById("roomListIn").innerHTML="<p style='padding:14px'>Rooms load karne ke liye Firestore Rules open karo</p>"; }
}
function renderCalls(){
  let list=document.getElementById("mainList"); list.innerHTML=`<div class="chatItem"><div class="avatar">📞</div><div style="flex:1"><h4>Voice Call - @ahmed</h4><p>↙ Incoming • 2 min • Kal</p></div><span style="color:#00ff88">📞</span></div><div class="chatItem"><div class="avatar">📹</div><div style="flex:1"><h4>Video Call - @ali</h4><p>↗ Outgoing • 5 min • Aaj</p></div><span>📹</span></div><p style="text-align:center;color:#8696a0;padding:16px;font-size:12px">Calls abhi Audio pe hain, Video Play Store wale App me aayegi</p>`;
}

// CHAT OPEN / CLOSE
window.openChat = function(roomId, title){
  currentRoom=roomId; document.getElementById("roomName").innerHTML=title+` <small>Online • Luxury</small>`; document.getElementById("chatAvatar").innerText=title.charAt(0).toUpperCase();
  document.getElementById("chatView").classList.remove("hidden"); loadMessages();
};
window.closeChat = function(){ document.getElementById("chatView").classList.add("hidden"); if(unsubscribe) unsubscribe(); renderChats(); };
window.searchUser = async function(){
  let u=document.getElementById("searchUserInput").value.trim().replace("@","").toLowerCase(); if(!u) return;
  let snap=await getDoc(doc(db,"users",u)); if(!snap.exists()){ document.getElementById("searchResult").innerHTML="❌ @"+u+" nahi mila"; return; }
  document.getElementById("searchResult").innerHTML=`✅ @${u} mil gaya <button onclick="startPrivateChat('${u}')" style="background:#00a884;color:#fff;padding:8px 14px;border-radius:20px;margin-top:6px">Chat Karo</button>`;
};
window.startPrivateChat = async function(otherUser){
  if(!contacts.includes(otherUser)){ contacts.push(otherUser); localStorage.setItem("cloq_contacts",JSON.stringify(contacts)); }
  closeAddContact(); openChat("private_"+[myUsername,otherUser].sort().join("_"), "@"+otherUser);
};
window.createGroup = async function(){
  let gName=document.getElementById("newGroupName").value; let membersText=document.getElementById("addUsernames").value; if(!gName) return alert("Group ka naam likho");
  let members=membersText.split(",").map(s=>s.trim().replace("@","").toLowerCase()).filter(Boolean); members.push(myUsername);
  let roomId="group_"+Date.now(); await setDoc(doc(db,"rooms",roomId),{name:gName,members:members,createdBy:myUsername,settings:{}}); alert("Group ban gaya!"); closeAddContact(); renderChats();
};

// 3 DOT MENU - LUXURY FEATURES
window.toggleMenu = function(){ document.getElementById("threeDotMenu").classList.toggle("hidden"); };
window.toggleVanish = function(){ vanishMode=!vanishMode; document.getElementById("vanishState").innerText=vanishMode?"ON":"OFF"; document.body.classList.toggle("vanish",vanishMode); alert(vanishMode?"👻 Vanish Mode ON - Messages dekhne ke baad gayab ho jayenge":"Vanish Mode OFF"); toggleMenu(); };
window.toggleFun = function(){ funMode=!funMode; document.getElementById("funState").innerText=funMode?"ON":"OFF"; document.body.classList.toggle("fun",funMode); alert(funMode?"🎉 Fun Mode ON - Rang badal gaye!":"Fun Mode OFF"); toggleMenu(); };
window.blockUser = function(){ let u=prompt("Kisko block karna hai? @username"); if(u){ blockedUsers.push(u.replace("@","").toLowerCase()); alert("@"+u+" block ho gaya"); loadMessages(); } toggleMenu(); };
window.reportUser = function(){ let r=prompt("Report ki wajah likho:"); if(r) alert("Report bhej di gayi. CLOQ Team dekhegi. Shukriya!"); toggleMenu(); };
window.setShortcut = function(){ let s=prompt("Is chat ka Nickname / Shortcut likho - jaise Meri Jaan"); if(s){ alert("Shortcut lag gaya: "+s); document.getElementById("roomName").innerHTML=s; } toggleMenu(); };
window.searchInChat = function(){ let q=prompt("Chat me kya dhoondna hai?"); if(!q) return; let msgs=[...document.querySelectorAll(".msgBubble")]; let f=msgs.find(m=>m.innerText.includes(q)); if(f){ f.style.border="2px solid #00ff88"; f.scrollIntoView(); } else alert("Nahi mila"); toggleMenu(); };
window.clearChat = function(){ if(confirm("Chat clear kar dun?")) document.getElementById("chatBox").innerHTML=""; toggleMenu(); };
window.openGroupSettings = function(){ toggleMenu(); document.getElementById("groupSettings").classList.remove("hidden"); };
window.closeGroupSettings = function(){ document.getElementById("groupSettings").classList.add("hidden"); };
window.saveGroupSettings = async function(){ let settings={onlyAdmin:document.getElementById("onlyAdminMsg").checked,noForward:document.getElementById("noForwardSetting").checked,vanish:document.getElementById("vanishSetting").checked,hideMembers:document.getElementById("hideMembers").checked}; if(currentRoom!=="general") await setDoc(doc(db,"rooms",currentRoom),{settings},{merge:true}); alert("Settings Save Ho Gayi!"); closeGroupSettings(); };

// MESSAGES
window.sendMsg = async function(){
  let text=document.getElementById("msgInput").value; if(!text.trim()) return;
  try{ await addDoc(collection(db,"rooms",currentRoom,"messages"),{text:text,sender:myUsername,type:"text",time:serverTimestamp()}); document.getElementById("msgInput").value=""; if(vanishMode) setTimeout(()=>{ document.getElementById("chatBox").innerHTML=""; }, 8000); }catch(e){ alert("Message nahi gaya - Firestore Rules open karo. Error: "+e.message); }
};
window.uploadFile = async function(){
  let file=document.getElementById("fileInput").files[0]; if(!file) return; document.getElementById("uploadStatus").innerText="Upload ho raha hai...";
  let form=new FormData(); form.append("file",file); form.append("upload_preset","ml_default"); form.append("cloud_name","YAHAN APNA CLOUDINARY NAME DALO");
  try{ let res=await fetch("https://api.cloudinary.com/v1_1/YAHAN APNA CLOUDINARY NAME DALO/auto/upload",{method:"POST",body:form}); let data=await res.json(); await addDoc(collection(db,"rooms",currentRoom,"messages"),{text:"File bheji",fileUrl:data.secure_url,fileType:file.type,sender:myUsername,type:file.type.startsWith("image")?"image":"file",time:serverTimestamp()}); document.getElementById("uploadStatus").innerText="✅ File bhej di!"; }catch(e){ document.getElementById("uploadStatus").innerText="Cloudinary setup karo"; }
};
window.toggleVoice = async function(){
  if(!mediaRecorder){ try{ let stream=await navigator.mediaDevices.getUserMedia({audio:true}); mediaRecorder=new MediaRecorder(stream); mediaRecorder.ondataavailable=e=>audioChunks.push(e.data); mediaRecorder.onstop=async()=>{ let blob=new Blob(audioChunks,{type:"audio/webm"}); audioChunks=[]; let url=URL.createObjectURL(blob); await addDoc(collection(db,"rooms",currentRoom,"messages"),{text:"Voice Note",fileUrl:url,sender:myUsername,type:"voice",time:serverTimestamp()}); }; mediaRecorder.start(); document.getElementById("voiceBtn").innerText="⏹️"; alert("Recording shuru..."); }catch(e){ alert("Mic allow karo"); } } else { mediaRecorder.stop(); mediaRecorder=null; document.getElementById("voiceBtn").innerText="🎤"; }
};
window.startCall = async function(){ document.getElementById("callUI").classList.remove("hidden"); document.getElementById("callStatus").innerText="Call lag rahi hai..."; try{ await navigator.mediaDevices.getUserMedia({audio:true}); document.getElementById("callStatus").innerText="✅ Connected - Baat karo!"; }catch(e){ document.getElementById("callStatus").innerText="Mic allow karo"; } };
window.endCall = function(){ document.getElementById("callUI").classList.add("hidden"); };
window.createPublicRoom = async function(){
  let title=document.getElementById("roomTitle").value.trim(); let desc=document.getElementById("roomDesc").value.trim(); let type=document.getElementById("roomType").value; if(!title) return alert("Room ka naam likho");
  let roomId="room_"+Date.now(); await setDoc(doc(db,"publicRooms",roomId),{title,desc:desc||"Masti karo!",type,owner:myUsername,members:[myUsername],membersCount:1,createdAt:serverTimestamp()}); alert("Room ban gaya - "+title); closeRoomModal(); showSection("rooms"); renderRooms();
};
function loadMessages(){
  if(unsubscribe) unsubscribe(); const q=query(collection(db,"rooms",currentRoom,"messages"),orderBy("time","asc"));
  unsubscribe=onSnapshot(q,(snapshot)=>{ let box=document.getElementById("chatBox"); if(!box) return; box.innerHTML=""; snapshot.forEach(d=>{ let data=d.data(); if(blockedUsers.includes(data.sender)) return; let div=document.createElement("div"); div.className="msgBubble"+(data.sender===myUsername?" mine":""); let content=`<small>@${data.sender}</small>${data.text}`; if(data.type==="image") content+=`<br><img src="${data.fileUrl}">`; if(data.type==="file") content+=`<br><a href="${data.fileUrl}" target="_blank" style="color:#00ff88">📎 File Kholo</a>`; if(data.type==="voice") content+=`<br><audio controls src="${data.fileUrl}"></audio>`; div.innerHTML=content; box.appendChild(div); }); box.scrollTop=box.scrollHeight; }, (err)=>{ console.log("Msg error",err); });
}
onAuthStateChanged(auth, async(user)=>{
  if(user){ myEmail=user.email; let snap=await getDocs(query(collection(db,"users"),where("email","==",myEmail))); snap.forEach(d=>{ myUsername=d.data().username; }); if(!myUsername) myUsername=myEmail.split("@")[0];
    document.getElementById("myAvatar").innerText=myUsername.charAt(0).toUpperCase(); document.getElementById("loginPage").classList.add("hidden"); document.getElementById("homePage").classList.remove("hidden"); renderChats();
  } else { document.getElementById("loginPage").classList.remove("hidden"); document.getElementById("homePage").classList.add("hidden"); }
});
