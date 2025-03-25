// entry.js

document.addEventListener('DOMContentLoaded', () => {
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const contract = new ethers.Contract(config.sepolia.contractAddress, config.abi, provider);
  const signer = provider.getSigner();
  const contractWithSigner = contract.connect(signer);

  let traits = [
    { name: '', variations: [], selected: 0 },
    { name: '', variations: [], selected: 0 },
    { name: '', variations: [], selected: 0 }
  ];
  let background = { url: '', metadata: '' };

  // Fetch initial background
  async function fetchBackground() {
    try {
      const response = await fetch('https://aifn-1-api.vercel.app/api/generate-background');
      const data = await response.json();
      background.url = data.imageUrl;
      background.metadata = data.metadata;
      document.getElementById('background-image').src = background.url;
      document.getElementById('preview-background').src = background.url;
      document.getElementById('background-metadata').innerText = background.metadata;
    } catch (error) {
      document.getElementById('status').innerText = `Error fetching background: ${error.message}`;
    }
  }
  fetchBackground();

  // Fetch mint fee
  async function fetchMintFee() {
    try {
      const fee = await contract.mintFee();
      document.getElementById('mintFeeDisplay').innerText = `Mint Fee: ${ethers.utils.formatEther(fee)} ETH`;
    } catch (error) {
      document.getElementById('mintFeeDisplay').innerText = `Mint Fee: Error - ${error.message}`;
    }
  }
  fetchMintFee();

  // Handle trait uploads
  for (let i = 1; i <= 3; i++) {
    const traitIndex = i - 1;
    const nameInput = document.getElementById(`trait${i}-name`);
    const fileInput = document.getElementById(`trait${i}-files`);
    const grid = document.getElementById(`trait${i}-grid`);

    fileInput.addEventListener('change', async (event) => {
      const files = Array.from(event.target.files).sort((a, b) => a.name.localeCompare(b.name));
      if (!files.length) return;

      const traitName = nameInput.value.trim() || `Trait ${i}`;
      traits[traitIndex].name = traitName;
      traits[traitIndex].variations = [];

      grid.innerHTML = '';
      for (const file of files) {
        const variationName = file.name.split('.').slice(0, -1).join('.');
        const url = URL.createObjectURL(file);
        traits[traitIndex].variations.push({ name: variationName, url });

        const img = document.createElement('img');
        img.src = url;
        img.alt = variationName;
        img.className = 'variation';
        img.style.width = '100px';
        img.style.height = '100px';
        img.style.objectFit = 'contain';
        img.addEventListener('click', () => selectVariation(traitIndex, variationName));
        grid.appendChild(img);
      }

      // Select the first variation by default
      if (traits[traitIndex].variations.length > 0) {
        selectVariation(traitIndex, traits[traitIndex].variations[0].name);
      }

      updateMintButton();
    });
  }

  function selectVariation(traitIndex, variationName) {
    const trait = traits[traitIndex];
    const variationIndex = trait.variations.findIndex(v => v.name === variationName);
    trait.selected = variationIndex;

    const grid = document.getElementById(`trait${traitIndex + 1}-grid`);
    Array.from(grid.children).forEach((child, idx) => {
      child.classList.toggle('selected', idx === variationIndex);
    });

    document.getElementById(`preview-trait${traitIndex + 1}`).src = trait.variations[variationIndex].url;
  }

  document.getElementById('test-background').addEventListener('click', fetchBackground);

  function updateMintButton() {
    const allTraitsSet = traits.every(trait => trait.name && trait.variations.length > 0);
    const mintBtn = document.getElementById('mintButton');
    mintBtn.disabled = !allTraitsSet;
  }

  window.mintNFT = async function() {
    const status = document.getElementById('status');
    try {
      await provider.send("eth_requestAccounts", []);
      const numTraitCategories = traits.length;
      const traitCategoryVariants = traits.map(trait => trait.variations.length);
      const traitIndices = traits.map(trait => trait.selected);
      const recipient = await signer.getAddress();

      // Upload selected trait images to Arweave
      status.innerText = "Uploading images to Arweave...";
      const formData = new FormData();
      for (let i = 0; i < traits.length; i++) {
        const trait = traits[i];
        const selectedVariation = trait.variations[trait.selected];
        const response = await fetch(selectedVariation.url);
        const blob = await response.blob();
        formData.append('images', blob, `${trait.name}-${selectedVariation.name}.png`);
      }

      const uploadResponse = await fetch('https://aifn-1-api.vercel.app/api/upload-to-arweave', {
        method: 'POST',
        body: formData
      });
      const uploadData = await uploadResponse.json();
      if (uploadData.error) throw new Error(uploadData.error);

      // Use Arweave URLs in the NFT metadata
      const arweaveUrls = uploadData.transactionIds.map(id => `https://arweave.net/${id}`);

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
});// entry.js

document.addEventListener('DOMContentLoaded', () => {
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const contract = new ethers.Contract(config.sepolia.contractAddress, config.abi, provider);
  const signer = provider.getSigner();
  const contractWithSigner = contract.connect(signer);

  let traits = [
    { name: '', variations: [], selected: 0 },
    { name: '', variations: [], selected: 0 },
    { name: '', variations: [], selected: 0 }
  ];
  let background = { url: '', metadata: '' };

  // Fetch initial background
  async function fetchBackground() {
    try {
      const response = await fetch('https://aifn-1-api.vercel.app/api/generate-background');
      const data = await response.json();
      background.url = data.imageUrl;
      background.metadata = data.metadata;
      document.getElementById('background-image').src = background.url;
      document.getElementById('preview-background').src = background.url;
      document.getElementById('background-metadata').innerText = background.metadata;
    } catch (error) {
      document.getElementById('status').innerText = `Error fetching background: ${error.message}`;
    }
  }
  fetchBackground();

  // Fetch mint fee
  async function fetchMintFee() {
    try {
      const fee = await contract.mintFee();
      document.getElementById('mintFeeDisplay').innerText = `Mint Fee: ${ethers.utils.formatEther(fee)} ETH`;
    } catch (error) {
      document.getElementById('mintFeeDisplay').innerText = `Mint Fee: Error - ${error.message}`;
    }
  }
  fetchMintFee();

  // Handle trait uploads
  for (let i = 1; i <= 3; i++) {
    const traitIndex = i - 1;
    const nameInput = document.getElementById(`trait${i}-name`);
    const fileInput = document.getElementById(`trait${i}-files`);
    const grid = document.getElementById(`trait${i}-grid`);

    fileInput.addEventListener('change', async (event) => {
      const files = Array.from(event.target.files).sort((a, b) => a.name.localeCompare(b.name));
      if (!files.length) return;

      const traitName = nameInput.value.trim() || `Trait ${i}`;
      traits[traitIndex].name = traitName;
      traits[traitIndex].variations = [];

      grid.innerHTML = '';
      for (const file of files) {
        const variationName = file.name.split('.').slice(0, -1).join('.');
        const url = URL.createObjectURL(file);
        traits[traitIndex].variations.push({ name: variationName, url });

        const img = document.createElement('img');
        img.src = url;
        img.alt = variationName;
        img.className = 'variation';
        img.style.width = '100px';
        img.style.height = '100px';
        img.style.objectFit = 'contain';
        img.addEventListener('click', () => selectVariation(traitIndex, variationName));
        grid.appendChild(img);
      }

      // Select the first variation by default
      if (traits[traitIndex].variations.length > 0) {
        selectVariation(traitIndex, traits[traitIndex].variations[0].name);
      }

      updateMintButton();
    });
  }

  function selectVariation(traitIndex, variationName) {
    const trait = traits[traitIndex];
    const variationIndex = trait.variations.findIndex(v => v.name === variationName);
    trait.selected = variationIndex;

    const grid = document.getElementById(`trait${traitIndex + 1}-grid`);
    Array.from(grid.children).forEach((child, idx) => {
      child.classList.toggle('selected', idx === variationIndex);
    });

    document.getElementById(`preview-trait${traitIndex + 1}`).src = trait.variations[variationIndex].url;
  }

  document.getElementById('test-background').addEventListener('click', fetchBackground);

  function updateMintButton() {
    const allTraitsSet = traits.every(trait => trait.name && trait.variations.length > 0);
    const mintBtn = document.getElementById('mintButton');
    mintBtn.disabled = !allTraitsSet;
  }

  window.mintNFT = async function() {
    const status = document.getElementById('status');
    try {
      await provider.send("eth_requestAccounts", []);
      const numTraitCategories = traits.length;
      const traitCategoryVariants = traits.map(trait => trait.variations.length);
      const traitIndices = traits.map(trait => trait.selected);
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
