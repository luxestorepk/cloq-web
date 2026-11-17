let isSignUpMode = false;
let isLoggedIn = false;
let pendingIdentity = "";
let generatedOtp = "7869"; // Simulated real-time OTP

// MOCK REGISTERED USERS DATABASE
let registeredUsers = {
    "+923001234567": "123456",
    "waqas@cloq.com": "secure123"
};

// SECURE NAVIGATION GUARD
function goScreen(num) {
    if (!isLoggedIn && num !== 1) {
        alert('🔒 Access Denied! Please Login or Sign Up first.');
        return;
    }
    document.querySelectorAll('.app-screen').forEach(s => s.classList.remove('active'));
    document.getElementById('screen-' + num).classList.add('active');
    
    document.querySelectorAll('.nav-pill').forEach(n => n.classList.remove('active'));
    const activeNav = document.getElementById('nav-' + num);
    if(activeNav) activeNav.classList.add('active');
    closeMenu();
}

// TOGGLE LOGIN / SIGNUP MODE
function toggleAuthMode() {
    isSignUpMode = !isSignUpMode;
    const title = document.getElementById('authTitle');
    const sub = document.getElementById('authSub');
    const btn = document.getElementById('authSubmitBtn');
    const switchTxt = document.getElementById('switchAuthMode');

    if (isSignUpMode) {
        title.innerText = "CLOQCHAT SIGN UP";
        sub.innerText = "Create Your Encrypted Account";
        btn.innerText = "Proceed to OTP Verification →";
        switchTxt.innerHTML = "Already have an account? <strong>Login</strong>";
    } else {
        title.innerText = "CLOQCHAT LOGIN";
        sub.innerText = "Military-Grade Privacy • Secure Access";
        btn.innerText = "Login to Dashboard →";
        switchTxt.innerHTML = "New to Cloq? <strong>Sign Up</strong>";
    }
}

// PASSWORD EYE TOGGLE
function togglePasswordVisibility() {
    const pinInput = document.getElementById('authPin');
    const eyeIcon = document.getElementById('eyeIcon');
    if (pinInput.type === "password") {
        pinInput.type = "text";
        eyeIcon.innerText = "👁️";
    } else {
        pinInput.type = "password";
        eyeIcon.innerText = "👁️‍🗨️";
    }
}

// SMART AUTH & REAL OTP TRIGGER
function handleAuthAction() {
    const identity = document.getElementById('authIdentity').value.trim();
    const pin = document.getElementById('authPin').value.trim();

    if (!identity || !pin) {
        alert('⚠️ Please enter your Phone/Email and Password.');
        return;
    }

    const userExists = registeredUsers.hasOwnProperty(identity);

    if (!isSignUpMode) {
        // LOGIN CHECK
        if (!userExists) {
            alert('❌ Account not found! You are not registered. Please switch to Sign Up.');
            return;
        }
        if (registeredUsers[identity] !== pin) {
            alert('❌ Incorrect Password or PIN!');
            return;
        }
    } else {
        // SIGNUP CHECK
        if (userExists) {
            alert('⚠️ This account is already registered! Please switch to Login.');
            return;
        }
    }

    pendingIdentity = identity;
    // Trigger Real-Time OTP Step
    document.getElementById('authFormArea').style.display = 'none';
    document.getElementById('authSwitchFooter').style.display = 'none';
    document.getElementById('otpBoxArea').style.display = 'block';
    document.getElementById('authTitle').innerText = "VERIFY OTP";
    document.getElementById('authSub').innerText = "Code sent to " + identity + " (Demo OTP: 7869)";
    alert('📲 Real-Time OTP sent successfully! Enter 7869 to verify.');
}

// VERIFY OTP & COMPLETE LOGIN/SIGNUP
function verifyOtpAndEnter() {
    const enteredOtp = document.getElementById('otpInput').value.trim();
    if (enteredOtp !== generatedOtp) {
        alert('❌ Invalid OTP! Please enter the correct code (7869).');
        return;
    }

    if (isSignUpMode) {
        const pin = document.getElementById('authPin').value.trim();
        registeredUsers[pendingIdentity] = pin;
        alert('🎉 Account registered and verified successfully!');
    } else {
        alert('✅ Login successful!');
    }

    isLoggedIn = true;
    document.getElementById('bottomNav').style.display = 'flex';
    goScreen(2);
}

function logoutApp() {
    isLoggedIn = false;
    document.getElementById('bottomNav').style.display = 'none';
    document.getElementById('otpBoxArea').style.display = 'none';
    document.getElementById('authFormArea').style.display = 'block';
    document.getElementById('authSwitchFooter').style.display = 'flex';
    document.getElementById('authIdentity').value = '';
    document.getElementById('authPin').value = '';
    goScreen(1);
    closeMenu();
    alert('🔒 Logged out securely.');
}

// WHATSAPP 3-DOT MENU
function toggleMenu(event) {
    event.stopPropagation();
    document.getElementById('whatsappMenu').classList.toggle('show');
}
function closeMenu() {
    const m = document.getElementById('whatsappMenu');
    if (m) m.classList.remove('show');
}

// CHAT ENGINE
function openChat(name, badge) {
    document.getElementById('activeChatName').innerText = name + ' ' + badge;
    goScreen(3);
}

let themeIndex = 0;
function toggleChatTheme() {
    const bg = document.getElementById('chatBg');
    bg.classList.remove('rose-theme', 'emerald-theme');
    themeIndex = (themeIndex + 1) % 3;
    if(themeIndex === 1) bg.classList.add('rose-theme');
    if(themeIndex === 2) bg.classList.add('emerald-theme');
}

function triggerScreenshotAlert() {
    const feed = document.getElementById('chatFeed');
    const div = document.createElement('div');
    div.className = 'msg-alert';
    div.innerHTML = '⚠️ <strong>SECURITY BREACH:</strong> Screenshot captured by recipient!';
    feed.appendChild(div);
    feed.scrollTop = feed.scrollHeight;
}

function sendFirebaseMsg() {
    const inp = document.getElementById('chatInput');
    if(!inp.value.trim()) return;
    const feed = document.getElementById('chatFeed');
    const div = document.createElement('div');
    div.className = 'msg-bubble msg-out';
    div.innerHTML = `${inp.value}<div class="msg-actions">Just now ✓✓ <span class="unsend-link" onclick="this.closest('.msg-bubble').remove()">Unsend</span></div>`;
    feed.appendChild(div);
    inp.value = '';
    feed.scrollTop = feed.scrollHeight;
}

function sendVoiceNote() { alert('🎤 Voice note recorded & encrypted'); }
function sendMedia() { alert('📁 Media file selected'); }

// CALCULATOR VAULT (PIN: 1234=)
let cStr = '';
function cAdd(ch) { cStr += ch; document.getElementById('cDisp').innerText = cStr; }
function cClear() { cStr = ''; document.getElementById('cDisp').innerText = '0'; document.getElementById('cHist').innerText = ''; }
function cBack() { cStr = cStr.slice(0, -1); document.getElementById('cDisp').innerText = cStr || '0'; }
function cEval() {
    if (cStr === '1234') {
        cClear();
        document.getElementById('vaultBox').classList.add('open');
        return;
    }
    try {
        document.getElementById('cHist').innerText = cStr;
        cStr = String(Function('"use strict";return (' + cStr + ')')());
        document.getElementById('cDisp').innerText = cStr;
    } catch { document.getElementById('cDisp').innerText = 'Error'; cStr = ''; }
}

let currentStorageMB = 100;
function watchAdForStorage() {
    alert('📺 Ad playing...');
    setTimeout(() => {
        currentStorageMB += 50;
        document.getElementById('storageText').innerText = currentStorageMB + ' MB / Free Limit';
        document.getElementById('storageBar').style.width = Math.min(currentStorageMB, 100) + '%';
        alert('🎉 +50MB added to cloud vault.');
    }, 1000);
}

function switchSub(idx, el) {
    document.querySelectorAll('.s-tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    document.querySelectorAll('.sub-view').forEach(v => v.classList.remove('active'));
    document.getElementById('sub-' + idx).classList.add('active');
}

function sendVanish() {
    const inp = document.getElementById('vInp');
    if (!inp.value.trim()) return;
    const list = document.getElementById('vList');
    const b = document.createElement('div');
    b.className = 'v-bubble';
    b.style.cssText = 'align-self:flex-end; background:#6b21a8; color:#fff; padding:8px 12px; border-radius:14px; font-size:12px; margin-bottom:6px;';
    b.innerText = inp.value + ' (5s)';
    list.appendChild(b);
    inp.value = '';
    setTimeout(() => { b.style.opacity = '0'; setTimeout(() => b.remove(), 500); }, 5000);
}

function toggleDlBtn() {
    const on = document.getElementById('dlSwitch').checked;
    if (on) alert('✅ Status download allowed');
    else alert('🚫 Status download blocked');
}

function openStory(name) { alert('🎥 Opening ' + name + ' Live Story'); }
function openCameraModal() { alert('📸 Opening secure camera'); }
        
