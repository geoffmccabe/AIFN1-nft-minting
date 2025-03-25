// entry.js

// Provide dummy globals for any leftover CommonJS calls.
globalThis.require = () => {
  console.warn("Dummy require called.");
  return {};
};
globalThis.exports = {};
globalThis.module = { exports: {} };

// Main application code (assumes window.Buffer and window.PSD are already loaded)
document.addEventListener('DOMContentLoaded', () => {
  console.log("DOM fully loaded. Setting up file input...");

  // Check that Buffer and PSD are defined.
  if (typeof window.Buffer === 'undefined') {
    console.error("Buffer is not defined.");
    document.getElementById('status').innerText = "Error: Buffer polyfill did not load.";
    return;
  }
  if (typeof window.PSD === 'undefined') {
    console.error("PSD is not defined.");
    document.getElementById('status').innerText = "Error: PSD library did not load.";
    return;
  }
  console.log("Buffer and PSD are defined.");

  // Use settings from config.js
  const { sepolia } = config;
  const contractAddress = sepolia.contractAddress;
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const contract = new ethers.Contract(contractAddress, config.abi, provider);
  const signer = provider.getSigner();
  const contractWithSigner = contract.connect(signer);

  // Update Mint Fee display
  const mintFeeDisplay = document.getElementById('mintFeeDisplay');
  async function fetchMintFee() {
    try {
      const fee = await contract.mintFee();
      mintFeeDisplay.innerText = `Mint Fee: ${ethers.utils.formatEther(fee)} ETH`;
    } catch (error) {
      mintFeeDisplay.innerText = `Mint Fee: Error fetching fee - ${error.message}`;
    }
  }
  fetchMintFee();

  // Set up the file input listener.
  const fileInput = document.getElementById('psdFile');
  let traitData = null;
  let selectedVariants = [];

  fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) {
      document.getElementById('status').innerText = "No file selected.";
      return;
    }
    console.log(`File selected: ${file.name}, size: ${file.size} bytes`);
    document.getElementById('status').innerText = `File chosen: ${file.name}`;

    const reader = new FileReader();

    // Update progress (if available).
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
        traitData = processPsd(psd);
        displayTraitSelection(traitData);
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

  function processPsd(psd) {
    const traitCategories = [];
    const processGroup = (group, path = []) => {
      if (group.children()) {
        group.children().forEach(child => {
          if (child.children()) {
            processGroup(child, [...path, child.name()]);
          } else {
            const categoryName = path.length > 0 ? path[path.length - 1] : 'Default';
            let category = traitCategories.find(cat => cat.name === categoryName);
            if (!category) {
              category = { name: categoryName, variants: [], specialLayers: [] };
              traitCategories.push(category);
            }

            const separators = /[~\/\|\{\}\[\]]+/;
            const parts = child.name() ? child.name().split(separators).filter(part => part) : [''];
            const variantName = parts[0] || '';
            if (variantName && !category.specialLayers.includes(variantName)) {
              category.variants.push({
                name: variantName,
                png: child.layer.image ? child.layer.image.toBase64() : null
              });
            } else {
              category.specialLayers.push(child.name() || '');
            }
          }
        });
      }
    };
    processGroup(psd.tree());
    selectedVariants = traitCategories.map(cat => 0);
    return traitCategories;
  }

  function displayTraitSelection(traitData) {
    const container = document.getElementById('traitSelection');
    container.innerHTML = '';
    container.classList.remove('loading');
    traitData.forEach((category, catIndex) => {
      if (category.variants.length > 0) {
        const row = document.createElement('div');
        row.className = 'trait-row';
        row.innerHTML = `
          <span class="trait-name">${category.name}</span>
          <span class="variant-name" id="variant-${catIndex}">${category.variants[0].name}</span>
          <button onclick="changeVariant(${catIndex}, -1)">←</button>
          <button onclick="changeVariant(${catIndex}, 1)">→</button>
        `;
        container.appendChild(row);
      } else if (category.specialLayers.length > 0) {
        category.specialLayers.forEach(special => {
          const row = document.createElement('div');
          row.className = 'trait-row';
          row.innerHTML = `<span class="trait-name">Special Layer: ${special}</span>`;
          container.appendChild(row);
        });
      }
    });
  }

  window.changeVariant = function(catIndex, direction) {
    const category = traitData[catIndex];
    selectedVariants[catIndex] = (selectedVariants[catIndex] + direction + category.variants.length) % category.variants.length;
    document.getElementById(`variant-${catIndex}`).innerText = category.variants[selectedVariants[catIndex]].name;
  };

  // Mint button functionality
  const mintBtn = document.getElementById('mintButton');
  window.mintNFT = async function() {
    const status = document.getElementById('status');
    try {
      await provider.send("eth_requestAccounts", []);
      const numTraitCategories = traitData.length;
      const traitCategoryVariants = traitData.map(cat => cat.variants.length);
      const traitIndices = selectedVariants;
      const recipient = await signer.getAddress();

      status.innerText = "Estimating gas...";
      const gasLimit = await contractWithSigner.estimateGas.mintNFT(
        recipient,
        initialHtmlUri,
        numTraitCategories,
        traitCategoryVariants,
        traitIndices,
        { value: ethers.utils.parseEther(sepolia.mintFee) }
      );

      status.innerText = "Minting...";
      const tx = await contractWithSigner.mintNFT(
        recipient,
        initialHtmlUri,
        numTraitCategories,
        traitCategoryVariants,
        traitIndices,
        { value: ethers.utils.parseEther(sepolia.mintFee), gasLimit: gasLimit.add(50000) }
      );
      const receipt = await tx.wait();
      const tokenId = receipt.events.find(e => e.event === "Transfer").args.tokenId.toString();
      status.innerText = `Minted! Token ID: ${tokenId}`;
    } catch (error) {
      status.innerText = `Error: ${error.message}`;
    }
  };
});
