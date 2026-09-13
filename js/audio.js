/**
 * REXZA AI ROBOT - AUDIO & TTS COMPONENT
 * -------------------------------------------------------------
 * สังเคราะห์เสียง Siri Chime (Web Audio API) และเล่นเสียงพูดเดี่ยว
 * (Microsoft Edge Neural TTS: th-TH-PremwadeeNeural)
 */

let currentAudio = null;
let lastSpokenText = "";

function stopAudioPlayback() {
    if (currentAudio) {
        try {
            currentAudio.pause();
            currentAudio.currentTime = 0;
        } catch (e) {}
        currentAudio = null;
    }
    if ('speechSynthesis' in window) {
        try { window.speechSynthesis.cancel(); } catch (e) {}
    }
    if (typeof fetch === 'function') {
        fetch('/stop_audio').catch(() => {});
    }
    isSpeakingNow = false;
    stopSpeakingFaceAnimation();
}
window.stopAudioPlayback = stopAudioPlayback;

function playWakeChime(type = 'activate') {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const now = ctx.currentTime;

        if (type === 'activate') {
            const osc1 = ctx.createOscillator();
            const osc2 = ctx.createOscillator();
            const gain = ctx.createGain();

            osc1.type = 'sine';
            osc2.type = 'sine';
            osc1.frequency.setValueAtTime(523.25, now); // C5
            osc2.frequency.setValueAtTime(783.99, now + 0.08); // G5

            gain.gain.setValueAtTime(0.001, now);
            gain.gain.exponentialRampToValueAtTime(0.2, now + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.12, now + 0.08);
            gain.gain.exponentialRampToValueAtTime(0.25, now + 0.10);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(ctx.destination);

            osc1.start(now);
            osc1.stop(now + 0.09);
            osc2.start(now + 0.08);
            osc2.stop(now + 0.32);
        } else if (type === 'dismiss') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(659.25, now);
            osc.frequency.exponentialRampToValueAtTime(440.00, now + 0.18);

            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.20);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now);
            osc.stop(now + 0.20);
        }
    } catch (e) {}
}
const playSiriChime = playWakeChime; // alias for backwards compatibility

function speakAI(text, onComplete) {
    if (!text || text.trim() === '') {
        if (onComplete) onComplete();
        return;
    }

    lastSpokenText = text.trim();
    isSpeakingNow = true;
    if (window.pauseRecognition) window.pauseRecognition();
    logInfo("🗣️ AI VOICE", `"${text}"`, "#c084fc");

    if (currentAudio) {
        try { currentAudio.pause(); currentAudio.currentTime = 0; } catch (e) {}
        currentAudio = null;
    }
    if ('speechSynthesis' in window) {
        try { window.speechSynthesis.cancel(); } catch (e) {}
    }

    let completed = false;
    let finishTimeout = null;

    const finish = () => {
        if (completed) return;
        completed = true;
        if (finishTimeout) clearTimeout(finishTimeout);
        isSpeakingNow = false;
        stopSpeakingFaceAnimation();
        setTimeout(() => {
            if (window.resumeRecognition) window.resumeRecognition();
            if (onComplete) onComplete();
        }, 120);
    };

    const beginTalking = () => {
        if (completed) return;
        startSpeakingFaceAnimation();
    };

    const encoded = encodeURIComponent(text);
    const voiceParam = encodeURIComponent(ROBOT_VOICE);
    const audioUrl = `/tts?text=${encoded}&voice=${voiceParam}`;

    let serverFallbackCalled = false;
    const playViaServer = () => {
        if (serverFallbackCalled || completed) return;
        serverFallbackCalled = true;

        const estimatedDur = Math.max(2000, Math.min(8000, text.length * 150));
        finishTimeout = setTimeout(finish, estimatedDur + 3000);

        fetch(`/speak?text=${encoded}&voice=${voiceParam}`)
            .then(res => res.json())
            .then(data => {
                if (completed) return;
                if (finishTimeout) clearTimeout(finishTimeout);
                if (!data || data.status !== 'playing' || !data.duration_ms || data.duration_ms <= 0) {
                    throw new Error('server audio unavailable');
                }
                const dur = data.duration_ms;
                beginTalking();
                logInfo("🔊 AUDIO SERVER", `เล่นผ่านระบบเครื่อง (${(dur/1000).toFixed(1)} วินาที)`, "#10b981");
                finishTimeout = setTimeout(finish, dur + 100);
            })
            .catch(() => fallbackWebSpeech(text, finish, beginTalking));
    };

    const playDirectlyInBrowser = () => {
        try {
            const audio = new Audio(audioUrl);
            currentAudio = audio;
            audio.volume = 1.0;

            let talkStarted = false;
            const onAudioStarted = () => {
                if (!talkStarted && isSpeakingNow && !completed) {
                    talkStarted = true;
                    beginTalking();
                    logInfo("🔊 AUDIO DIRECT", "เล่นเสียงออกลำโพงแล้ว (เปรมวดี Neural)", "#10b981");
                }
            };

            audio.addEventListener('playing', onAudioStarted);
            audio.addEventListener('timeupdate', () => {
                if (audio.currentTime > 0.02) onAudioStarted();
            });

            audio.addEventListener('ended', () => {
                if (currentAudio === audio) currentAudio = null;
                finish();
            });

            audio.addEventListener('error', () => {
                if (currentAudio === audio) currentAudio = null;
                playViaServer();
            });

            const playPromise = audio.play();
            if (playPromise !== undefined) {
                playPromise.catch((err) => {
                    if (currentAudio === audio) currentAudio = null;
                    playViaServer();
                });
            }
        } catch (e) {
            playViaServer();
        }
    };

    playDirectlyInBrowser();
}

function fallbackWebSpeech(text, callback, onStart) {
    if ('speechSynthesis' in window) {
        try {
            window.speechSynthesis.cancel();
            window.speechSynthesis.resume();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'th-TH';
            utterance.rate = 1.0;
            utterance.volume = 1.0;

            let speechStarted = false;
            const startVoiceAnim = () => {
                if (!speechStarted) {
                    speechStarted = true;
                    if (onStart) onStart();
                }
            };

            utterance.onboundary = () => startVoiceAnim();
            utterance.onstart = () => setTimeout(startVoiceAnim, 300);
            utterance.onend = () => { if (callback) callback(); };
            utterance.onerror = () => { if (callback) callback(); };

            window.speechSynthesis.speak(utterance);
        } catch (e) {
            if (callback) callback();
        }
    } else {
        if (callback) callback();
    }
}

function stopAudioPlayback() {
    if (currentAudio) {
        try { currentAudio.pause(); currentAudio.currentTime = 0; } catch (e) {}
        currentAudio = null;
    }
    if ('speechSynthesis' in window) {
        try { window.speechSynthesis.cancel(); } catch (e) {}
    }
    isSpeakingNow = false;
    if (typeof stopSpeakingFaceAnimation === 'function') stopSpeakingFaceAnimation();
    if (window.resumeRecognition) window.resumeRecognition();
}
window.stopAudioPlayback = stopAudioPlayback;

