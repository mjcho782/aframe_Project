// A-Frame VR Project Entry Point
import 'aframe';

// Wait for the scene to be ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('A-Frame VR Project loaded successfully!');
    
    // You can add custom JavaScript logic here
    // For example, adding event listeners to A-Frame entities
    
    // Example: Add click event to the box
    const box = document.querySelector('a-box');
    if (box) {
        box.addEventListener('click', () => {
            console.log('Box clicked!');
            // Change box color on click
            box.setAttribute('color', '#FF6B6B');
        });
        // ll
    }
});
