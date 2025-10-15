// Set to > 0 if the DSP is polyphonic
const FAUST_DSP_VOICES = 0;

(async () => {

    const { FaustPWA } = await import("./faust-pwa.js");

    /** @type {HTMLDivElement} */
    const divFaustUI = document.getElementById("div-faust-ui");

    // Declare faustNode as a global variable
    const pwa = new FaustPWA({ dspName: "sfCapture", voices: FAUST_DSP_VOICES, uiContainer: divFaustUI });

    // Create PWA and UI
    await pwa.create();

    // Event listener to handle user interaction
    function handleUserInteraction() {

        // Resume AudioContext synchronously
        pwa.resumeAudioContext();

        // Activate MIDI and Sensors
        pwa.activateMIDISensors()
    }

    // Activate AudioContext, MIDI and Sensors on user interaction
    window.addEventListener('click', handleUserInteraction);
    window.addEventListener('touchstart', handleUserInteraction);

    // Deactivate AudioContext, MIDI and Sensors on user interaction
    window.addEventListener('visibilitychange', function () {
        if (window.visibilityState === 'hidden') {

            // Suspend AudioContext
            pwa.suspendAudioContext();

            // Deactivate MIDI and Sensors
            pwa.deactivateMIDISensors();
        }
    });

})();
