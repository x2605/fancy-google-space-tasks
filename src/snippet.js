// snippet.js - DevTools console testing utilities
// Copy and paste these functions into the browser console for testing

/**
 * Simulate click on div elements with coordinate-based mouse events
 * Same implementation as CoreDOMUtils.simulateClick()
 *
 * Usage:
 *   fgtTestClick(document.querySelector('.some-selector'))
 *
 * @param {HTMLElement} element - Target element
 */
function fgtTestClick(element) {
    if (!element) {
        console.log('❌ Element is null or undefined');
        return;
    }

    console.log('🖱️ Simulating click on:', element);

    const rect = element.getBoundingClientRect();
    const clientX = rect.left + (rect.width / 2);
    const clientY = rect.top + (rect.height / 2);

    const mousedownEvent = new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
        view: window,
        detail: 1,
        screenX: clientX,
        screenY: clientY,
        clientX: clientX,
        clientY: clientY,
        button: 0
    });

    const mouseupEvent = new MouseEvent('mouseup', {
        bubbles: true,
        cancelable: true,
        view: window,
        detail: 1,
        screenX: clientX,
        screenY: clientY,
        clientX: clientX,
        clientY: clientY,
        button: 0
    });

    element.dispatchEvent(mousedownEvent);
    element.dispatchEvent(mouseupEvent);

    console.log('✅ Click events dispatched');
}
