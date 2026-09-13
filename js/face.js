/**
 * REXZA AI ROBOT - OLED FACE & ANIMATION COMPONENT
 * -------------------------------------------------------------
 * ควบคุม SVG ดวงตา ปากขยับแบบ Lipsync และ Aura แสงนีออนรอบหน้าจอ
 */

const mouthRest  = "M 222,212 Q 258,222 294,212";
const mouthSmall = "M 225,208 Q 258,226 291,208";
const mouthMid   = "M 230,202 Q 258,235 286,202";
const mouthBig   = "M 234,196 Q 258,244 282,196";
const mouthO     = "M 242,204 Q 258,232 274,204";

const mouthShapes = [mouthSmall, mouthMid, mouthBig, mouthMid, mouthO, mouthSmall];
let mouthAnimTimer = null;
let currentShapeIdx = 0;

function startSpeakingFaceAnimation() {
    if (mouthAnimTimer) return;
    const mouth = document.getElementById('robotMouth');
    const leftEye = document.getElementById('leftEyeGroup');
    const rightEye = document.getElementById('rightEyeGroup');

    mouthAnimTimer = setInterval(() => {
        currentShapeIdx = (currentShapeIdx + 1) % mouthShapes.length;
        if (mouth) mouth.setAttribute('d', mouthShapes[currentShapeIdx]);

        const eyeJitter = (Math.random() * 0.08) + 0.96;
        if (leftEye) leftEye.style.transform = `rotate(6deg) scale(${eyeJitter})`;
        if (rightEye) rightEye.style.transform = `rotate(-8deg) scale(${eyeJitter})`;
    }, 110);
}

function stopSpeakingFaceAnimation() {
    if (mouthAnimTimer) {
        clearInterval(mouthAnimTimer);
        mouthAnimTimer = null;
    }
    const mouth = document.getElementById('robotMouth');
    const leftEye = document.getElementById('leftEyeGroup');
    const rightEye = document.getElementById('rightEyeGroup');

    if (mouth) mouth.setAttribute('d', mouthRest);
    if (leftEye) leftEye.style.transform = 'rotate(6deg) scale(1)';
    if (rightEye) rightEye.style.transform = 'rotate(-8deg) scale(1)';
}

function updateWakeVisual(awake, isQA = false) {
    const face = document.getElementById('robotFaceSvg');
    const screen = document.getElementById('robotScreen');
    if (face) {
        if (isQA) {
            face.style.filter = 'drop-shadow(0 0 35px rgba(168, 85, 247, 0.8)) drop-shadow(0 0 55px rgba(0, 240, 255, 0.6))';
        } else if (awake) {
            face.style.filter = 'drop-shadow(0 0 35px rgba(0, 240, 255, 0.7)) drop-shadow(0 0 50px rgba(168, 85, 247, 0.5))';
        } else {
            face.style.filter = 'drop-shadow(0 0 25px rgba(78, 229, 242, 0.3))';
        }
    }
    if (screen) {
        if (isQA) {
            screen.classList.remove('siri-active');
            screen.classList.remove('listening-active');
            screen.classList.add('qa-active');
        } else if (awake) {
            screen.classList.remove('qa-active');
            screen.classList.add('listening-active');
            screen.classList.add('siri-active');
        } else {
            screen.classList.remove('siri-active');
            screen.classList.remove('listening-active');
            screen.classList.remove('qa-active');
        }
    }
}
