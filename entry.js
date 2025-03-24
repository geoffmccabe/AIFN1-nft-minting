// entry.js

// Provide dummy globals to satisfy any leftover CommonJS calls:
globalThis.require = () => {
  console.warn("Dummy require called.");
  return {};
};
globalThis.exports = {};
globalThis.module = { exports: {} };

// Import Ethers.js (we use the UMD version loaded via index.html, so no need to import here)

// Import your application code:
import * as PSDModule from "https://cdn.jsdelivr.net/npm/psd.js/dist/psd.min.js";
window.PSD = PSDModule;
console.log("psd.js loaded:", window.PSD);

// Main code: Set up file input and UI
document.addEventListener('DOMContentLoaded', () => {
  console.log("DOM fully loaded. Setting up file input...");

  // (Optional) Update mint fee display; this is a placeholder:
  const mintFeeDisplay = document.getElementById('mintFeeDisplay');
  if (mintFeeDisplay) {
    mintFeeDisplay.innerText = "Mint Fee: 0.001 ETH";
  }

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

  const mintBtn = document.getElementById('mintButton');
  mintBtn.addEventListener('click', () => {
    console.log("Mint button clicked.");
    alert("Minting NFT... (placeholder functionality)");
  });
});
