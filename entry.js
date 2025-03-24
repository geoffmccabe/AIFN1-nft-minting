// entry.js

// Dummy globals to satisfy CommonJS code
if (typeof require === 'undefined') {
  window.require = function() {
    console.warn("Dummy require called with arguments:", arguments);
    return {};
  };
}
if (typeof exports === 'undefined') {
  window.exports = {};
}
if (typeof module === 'undefined') {
  window.module = { exports: window.exports };
}

// Import Buffer polyfill from cdnjs (using ES module syntax)
import * as bufferModule from "https://cdn.jsdelivr.net/npm/buffer@6.0.3/index.min.js";
window.Buffer = bufferModule.Buffer;
console.log("Buffer polyfill loaded. TYPED_ARRAY_SUPPORT:", window.Buffer.TYPED_ARRAY_SUPPORT);

// Import Ethers.js from unpkg (we assume it attaches to window.ethers)
import "https://unpkg.com/ethers@5.7.2/dist/ethers.umd.min.js";
console.log("Ethers.js loaded:", typeof window.ethers);

// (Optional) Import your config file if needed; if config.js is a plain script, you might load it via a <script> tag in index.html instead
// import "./config.js"; // If config.js uses modules, otherwise load it via index.html

// Import psd.js from jsDelivr (using classic script style is problematic in a module bundle, so we import it as an ES module)
import * as PSDModule from "https://cdn.jsdelivr.net/npm/psd.js/dist/psd.min.js";
window.PSD = PSDModule;
console.log("psd.js loaded:", window.PSD);

// Main application code
document.addEventListener('DOMContentLoaded', () => {
  console.log("DOM fully loaded. Setting up file input...");

  // Update Mint Fee display (placeholder)
  const mintFeeDisplay = document.getElementById('mintFeeDisplay');
  if (mintFeeDisplay) {
    mintFeeDisplay.innerText = "Mint Fee: 0.001 ETH";
  }

  // Set up file input listener
  const fileInput = document.getElementById('psdFile');
  fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) {
      document.getElementById('status').innerText = "No file selected.";
      return;
    }
    console.log(`File selected: ${file.name}, size: ${file.size} bytes`);
    document.getElementById('status').innerText = `File chosen: ${file.name}`;

    const reader = new FileReader();

    reader.onprogress = (e) => {
      if (e.lengthComputable) {
        const loadedMB = (e.loaded / (1024 * 1024)).toFixed(2);
        const totalMB = (e.total / (1024 * 1024)).toFixed(2);
        console.log(`Reading file: ${loadedMB} / ${totalMB} MB`);
        document.getElementById('status').innerText = `Reading file: ${loadedMB} / ${totalMB} MB`;
      } else {
        console.log("onprogress fired, but length not computable.");
        document.getElementById('status').innerText = "Reading file (unknown size)...";
      }
    };

    reader.onloadstart = () => {
      console.log("File reading started.");
      document.getElementById('status').innerText = "Starting file read...";
    };

    reader.onerror = () => {
      console.error("Error reading file.");
      document.getElementById('status').innerText = "Error reading file.";
    };

    reader.onload = (e) => {
      console.log("File reading complete. Parsing PSD...");
      document.getElementById('status').innerText = "File read complete. Parsing PSD...";

      window.PSD.fromArrayBuffer(e.target.result).then(psd => {
        psd.parse();
        console.log("Parsed PSD Layers:", psd.tree().descendants());
        document.getElementById('status').innerText = "PSD parsed successfully. Ready to mint!";
        const mintBtn = document.getElementById('mintButton');
        mintBtn.disabled = false;
        mintBtn.style.backgroundColor = "#4CAF50";
      }).catch(error => {
        console.error("Error parsing PSD:", error);
        document.getElementById('status').innerText = "Error parsing PSD: " + error;
      });
    };

    console.log("Initiating file read as ArrayBuffer...");
    reader.readAsArrayBuffer(file);
  });

  // Mint button functionality (placeholder)
  const mintBtn = document.getElementById('mintButton');
  mintBtn.addEventListener('click', () => {
    console.log("Mint button clicked.");
    alert("Minting NFT... (placeholder functionality)");
  });
});
