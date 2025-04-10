// Set to > 0 if the DSP is polyphonic
const FAUST_DSP_VOICES = 0;

/**
 * @typedef {import("./faustwasm").FaustAudioWorkletNode} FaustAudioWorkletNode
 * @typedef {import("./faustwasm").FaustDspMeta} FaustDspMeta
 * @typedef {import("./faustwasm").FaustUIDescriptor} FaustUIDescriptor
 * @typedef {import("./faustwasm").FaustUIGroup} FaustUIGroup
 * @typedef {import("./faustwasm").FaustUIItem} FaustUIItem
 */

/**
 * Registers the service worker.
 */
if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("./service-worker.js")
            .then(reg => console.log("Service Worker registered", reg))
            .catch(err => console.log("Service Worker registration failed", err));
    });
}

/** @type {HTMLDivElement} */
const $divFaustUI = document.getElementById("div-faust-ui");

/** @type {typeof AudioContext} */
const AudioCtx = window.AudioContext || window.webkitAudioContext;
const audioContext = new AudioCtx({ latencyHint: 0.00001 });
audioContext.destination.channelInterpretation = "discrete";
audioContext.suspend();

// Declare faustNode as a global variable
let faustNode;

// Called at load time
(async () => {

    // Import the create-node module
    const { createFaustNode, createFaustUI } = await import("./create-node.js");

    // To test the ScriptProcessorNode mode
    // const result = await createFaustNode(audioContext, "sfCapture", FAUST_DSP_VOICES, true, 512);
    const result = await createFaustNode(audioContext, "sfCapture", FAUST_DSP_VOICES);
    faustNode = result.faustNode;  // Assign to the global variable
    if (!faustNode) throw new Error("Faust DSP not compiled");

    // Create the Faust UI
    await createFaustUI($divFaustUI, faustNode);

})();

// Synchronous function to resume AudioContext, to be called first in the synchronous event listener
function resumeAudioContext() {
    if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
            console.log('AudioContext resumed successfully');
        }).catch(error => {
            console.error('Error when resuming AudioContext:', error);
        });
    }
}

// Function to start MIDI
function startMIDI() {
    // Check if the browser supports the Web MIDI API
    if (navigator.requestMIDIAccess) {
        navigator.requestMIDIAccess().then(
            midiAccess => {
                console.log("MIDI Access obtained.");
                for (let input of midiAccess.inputs.values()) {
                    input.onmidimessage = (event) => faustNode.midiMessage(event.data);
                    console.log(`Connected to input: ${input.name}`);
                }
            },
            () => console.error("Failed to access MIDI devices.")
        );
    } else {
        console.log("Web MIDI API is not supported in this browser.");
    }
}

// Function to stop MIDI
function stopMIDI() {
    // Check if the browser supports the Web MIDI API
    if (navigator.requestMIDIAccess) {
        navigator.requestMIDIAccess().then(
            midiAccess => {
                console.log("MIDI Access obtained.");
                for (let input of midiAccess.inputs.values()) {
                    input.onmidimessage = null;
                    console.log(`Disconnected from input: ${input.name}`);
                }
            },
            () => console.error("Failed to access MIDI devices.")
        );
    } else {
        console.log("Web MIDI API is not supported in this browser.");
    }
}

// Flag to check if sensor handlers are bound
let sensorHandlersBound = false;
// Flag to check if MIDI handlers are bound
let midiHandlersBound = false;

// === Wake Lock Manager ===
const WakeLockManager = (() => {
    let wakeLock = null;
    let enabled = false;

    function request() {
        if (!('wakeLock' in navigator)) return;
        if (document.visibilityState !== 'visible') return;
        if (wakeLock === null) {
            navigator.wakeLock.request('screen')
                .then(lock => {
                    wakeLock = lock;
                    console.log('[WakeLockManager] Wake Lock acquired');
                    wakeLock.addEventListener('release', () => {
                        console.log('[WakeLockManager] Wake Lock was released');
                        wakeLock = null;
                        if (enabled && document.visibilityState === 'visible') {
                            request();
                        }
                    });
                })
                .catch(err => {
                    console.error('[WakeLockManager] Failed to acquire Wake Lock:', err);
                });
        }
    }

    function release() {
        if (wakeLock !== null) {
            wakeLock.release()
                .then(() => {
                    console.log('[WakeLockManager] Wake Lock manually released');
                    wakeLock = null;
                })
                .catch(err => {
                    console.error('[WakeLockManager] Failed to release Wake Lock:', err);
                });
        }
    }

    function enable() {
        enabled = true;
        request();
    }

    function disable() {
        enabled = false;
        release();
    }

    document.addEventListener('visibilitychange', () => {
        if (enabled && document.visibilityState === 'visible') {
            request();
        }
    });

    return {
        enable,
        disable,
        isActive: () => wakeLock !== null,
        isEnabled: () => enabled,
    };
})();

// Function to activate MIDI and Sensors on user interaction
async function activateMIDISensors() {

    // Import the create-node module
    const { connectToAudioInput, requestPermissions } = await import("./create-node.js");

    // Request permission for sensors
    await requestPermissions();

    // Activate sensor listeners
    if (!sensorHandlersBound) {
        await faustNode.startSensors();
        sensorHandlersBound = true;
    }

    // Initialize the MIDI setup
    if (!midiHandlersBound) {
        startMIDI();
        midiHandlersBound = true;
    }

    // Connect the Faust node to the audio output
    faustNode.connect(audioContext.destination);

    // Connect the Faust node to the audio input
    if (faustNode.numberOfInputs > 0) {
        await connectToAudioInput(audioContext, null, faustNode, null);
    }

    // Resume the AudioContext
    if (audioContext.state === 'suspended') {
        await audioContext.resume();
    }
}

// Function to suspend AudioContext, deactivate MIDI and Sensors on user interaction
async function deactivateAudioMIDISensors() {

    // Suspend the AudioContext
    if (audioContext.state === 'running') {
        await audioContext.suspend();
    }

    // Deactivate sensor listeners
    if (sensorHandlersBound) {
        faustNode.stopSensors();
        sensorHandlersBound = false;
    }

    // Deactivate the MIDI setup
    if (midiHandlersBound && FAUST_DSP_VOICES > 0) {
        stopMIDI();
        midiHandlersBound = false;
    }
}

// Event listener to handle user interaction
function handleUserInteraction() {

    WakeLockManager.enable();

    // Resume AudioContext synchronously
    resumeAudioContext();

    // Launch the activation of MIDI and Sensors
    activateMIDISensors().catch(error => {
        console.error('Error when activating audio, MIDI and sensors:', error);
    });
}

// Activate AudioContext, MIDI and Sensors on user interaction
window.addEventListener('click', handleUserInteraction);
window.addEventListener('touchstart', handleUserInteraction);

// Deactivate AudioContext, MIDI and Sensors on user interaction
window.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') {
        WakeLockManager.disable();
        deactivateAudioMIDISensors();
    }
});
