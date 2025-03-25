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

  const preview = document.getElementById('preview');
  const traitImages = [
    document.getElementById('preview-trait1'),
    document.getElementById('preview-trait2'),
    document.getElementById('preview-trait3')
  ];
  const coordinates = document.getElementById('coordinates');
  const directionEmojis = document.querySelectorAll('.direction-emoji');

  let isDragging = false;
  let currentImage = null;
  let offsetX = 0;
  let offsetY = 0;
  let moveInterval = null;
  let positionHistory = []; // Stack to store position history for undo

  // Fetch background with user prompt
  async function fetchBackground() {
    try {
      const userPrompt = document.getElementById('user-prompt') ? document.getElementById('user-prompt').value.trim() : '';
      const url = `https://aifn-1-api-q1ni.vercel.app/api/generate-background${userPrompt ? `?prompt=${encodeURIComponent(userPrompt)}` : ''}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch background: ${response.statusText}`);
      }
      const data = await response.json();
      background.url = data.imageUrl;
      background.metadata = data.metadata;

      const backgroundImage = document.getElementById('background-image');
      const previewBackground = document.getElementById('preview-background');
      const backgroundMetadata = document.getElementById('background-metadata');

      if (backgroundImage) backgroundImage.src = background.url;
      if (previewBackground) previewBackground.src = background.url;
      if (backgroundMetadata) backgroundMetadata.innerText = background.metadata;
    } catch (error) {
      console.error('Error fetching background:', error);
      const placeholder = 'https://archive.org/download/placeholder-image/placeholder-image.jpg';
      const backgroundImage = document.getElementById('background-image');
      const previewBackground = document.getElementById('preview-background');
      const backgroundMetadata = document.getElementById('background-metadata');

      if (backgroundImage) backgroundImage.src = placeholder;
      if (previewBackground) previewBackground.src = placeholder;
      if (backgroundMetadata) backgroundMetadata.innerText = 'Failed to load background';
    }
  }

  // Mock the mint fee for now
  function fetchMintFee() {
    const mintFeeDisplay = document.getElementById('mintFeeDisplay');
    if (mintFeeDisplay) {
      mintFeeDisplay.innerText = `Mint Fee: 0.001 ETH (Mock)`;
    }
  }
  fetchMintFee();

  // Update coordinates display
  function updateCoordinates(img) {
    if (img && coordinates) {
      const left = parseFloat(img.style.left) || 0;
      const top = parseFloat(img.style.top) || 0;
      coordinates.innerHTML = `<strong>Coordinates:</strong> (${Math.round(left) + 1}, ${Math.round(top) + 1})`;
    }
  }

  // Save position to localStorage and update history
  function savePosition(img, traitIndex, variationName) {
    const previousPosition = {
      left: parseFloat(img.style.left) || 0,
      top: parseFloat(img.style.top) || 0
    };
    const position = {
      left: parseFloat(img.style.left) || 0,
      top: parseFloat(img.style.top) || 0
    };
    // Save to history for undo
    positionHistory.push({
      traitIndex,
      variationName,
      previousPosition,
      newPosition: position
    });
    // Save to localStorage
    localStorage.setItem(`trait${traitIndex + 1}-${variationName}-position`, JSON.stringify(position));
    localStorage.setItem(`trait${traitIndex + 1}-${variationName}-manuallyMoved`, 'true');
    // Update subsequent traits if they haven't been manually moved
    updateSubsequentTraits(traitIndex, variationName, position);
  }

  // Update subsequent traits with the same position if not manually moved
  function updateSubsequentTraits(currentTraitIndex, currentVariationName, position) {
    const currentTrait = traits[currentTraitIndex];
    const currentVariationIndex = currentTrait.variations.findIndex(v => v.name === currentVariationName);

    // Update positions for subsequent variants in the same trait
    if (currentTrait.variations.length > 1) { // Only if the trait has multiple variants
      for (let i = currentVariationIndex + 1; i < currentTrait.variations.length; i++) {
        const nextVariationName = currentTrait.variations[i].name;
        const manuallyMoved = localStorage.getItem(`trait${currentTraitIndex + 1}-${nextVariationName}-manuallyMoved`);
        if (!manuallyMoved) {
          localStorage.setItem(`trait${currentTraitIndex + 1}-${nextVariationName}-position`, JSON.stringify(position));
        } else {
          break; // Stop if a variant has been manually moved
        }
      }
    }

    // Update positions for subsequent traits
    for (let traitIndex = currentTraitIndex + 1; traitIndex < traits.length; traitIndex++) {
      const nextTrait = traits[traitIndex];
      if (nextTrait.variations.length === 0) continue; // Skip if no variations
      const nextVariationName = nextTrait.variations[nextTrait.selected].name;
      const manuallyMoved = localStorage.getItem(`trait${traitIndex + 1}-${nextVariationName}-manuallyMoved`);
      if (!manuallyMoved) {
        localStorage.setItem(`trait${traitIndex + 1}-${nextVariationName}-position`, JSON.stringify(position));
        // If the currently selected variant is being viewed, update its position
        const previewImage = document.getElementById(`preview-trait${traitIndex + 1}`);
        if (previewImage && !previewImage.src.includes('placeholder-image.jpg')) {
          previewImage.style.left = `${position.left}px`;
          previewImage.style.top = `${position.top}px`;
        }
      } else {
        break; // Stop if a variant has been manually moved
      }
    }
  }

  // Handle trait uploads
  for (let i = 1; i <= 3; i++) {
    const traitIndex = i - 1;
    const nameInput = document.getElementById(`trait${i}-name`);
    const fileInput = document.getElementById(`trait${i}-files`);
    const grid = document.getElementById(`trait${i}-grid`);

    if (fileInput && nameInput && grid) {
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
  }

  function selectVariation(traitIndex, variationName) {
    const trait = traits[traitIndex];
    const variationIndex = trait.variations.findIndex(v => v.name === variationName);
    trait.selected = variationIndex;

    const grid = document.getElementById(`trait${traitIndex + 1}-grid`);
    if (grid) {
      Array.from(grid.children).forEach((child, idx) => {
        child.classList.toggle('selected', idx === variationIndex);
      });
    }

    const previewImage = document.getElementById(`preview-trait${traitIndex + 1}`);
    if (previewImage) {
      previewImage.src = trait.variations[variationIndex].url;
      // Load the saved position for this specific variant
      const savedPosition = localStorage.getItem(`trait${traitIndex + 1}-${variationName}-position`);
      if (savedPosition) {
        const { left, top } = JSON.parse(savedPosition);
        previewImage.style.left = `${left}px`;
        previewImage.style.top = `${top}px`;
      } else {
        // Reset position if no saved position exists
        previewImage.style.left = '0px';
        previewImage.style.top = '0px';
      }
      updateCoordinates(previewImage);
    }
  }

  function updateMintButton() {
    const allTraitsSet = traits.every(trait => trait.name && trait.variations.length > 0);
    const mintBtn = document.getElementById('mintButton');
    if (mintBtn) {
      mintBtn.disabled = !allTraitsSet;
    }
  }

  // Drag-and-drop and directional movement functionality
  traitImages.forEach((img, index) => {
    if (img) {
      img.addEventListener('dragstart', (e) => e.preventDefault());

      img.addEventListener('mousedown', (e) => {
        if (img.src.includes('placeholder-image.jpg')) return;
        isDragging = true;
        currentImage = img;
        const rect = img.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
        img.style.cursor = 'grabbing';
        updateCoordinates(img);
      });

      img.addEventListener('mouseup', () => {
        if (isDragging && currentImage === img) {
          const traitIndex = traitImages.indexOf(currentImage);
          const variationName = traits[traitIndex].variations[traits[traitIndex].selected].name;
          savePosition(currentImage, traitIndex, variationName);
          isDragging = false;
          currentImage.style.cursor = 'grab';
          currentImage = null;
        }
      });
    }
  });

  if (preview) {
    preview.addEventListener('mousemove', (e) => {
      if (!isDragging || !currentImage) return;
      const rect = preview.getBoundingClientRect();
      let newLeft = e.clientX - rect.left - offsetX;
      let newTop = e.clientY - rect.top - offsetY;

      newLeft = Math.max(0, Math.min(newLeft, 600 - currentImage.width));
      newTop = Math.max(0, Math.min(newTop, 600 - currentImage.height));

      currentImage.style.left = `${newLeft}px`;
      currentImage.style.top = `${newTop}px`;
      updateCoordinates(currentImage);
    });

    preview.addEventListener('mouseup', () => {
      if (isDragging && currentImage) {
        const traitIndex = traitImages.indexOf(currentImage);
        const variationName = traits[traitIndex].variations[traits[traitIndex].selected].name;
        savePosition(currentImage, traitIndex, variationName);
        isDragging = false;
        currentImage.style.cursor = 'grab';
        currentImage = null;
      }
    });

    preview.addEventListener('mouseleave', () => {
      if (isDragging && currentImage) {
        const traitIndex = traitImages.indexOf(currentImage);
        const variationName = traits[traitIndex].variations[traits[traitIndex].selected].name;
        savePosition(currentImage, traitIndex, variationName);
        isDragging = false;
        currentImage.style.cursor = 'grab';
        currentImage = null;
      }
    });
  }

  // Directional emoji movement
  directionEmojis.forEach(emoji => {
    const direction = emoji.getAttribute('data-direction');

    emoji.addEventListener('mousedown', () => {
      if (!currentImage || currentImage.src.includes('placeholder-image.jpg')) return;
      moveInterval = setInterval(() => {
        let left = parseFloat(currentImage.style.left) || 0;
        let top = parseFloat(currentImage.style.top) || 0;

        if (direction === 'up') top -= 1;
        if (direction === 'down') top += 1;
        if (direction === 'left') left -= 1;
        if (direction === 'right') left += 1;

        left = Math.max(0, Math.min(left, 600 - currentImage.width));
        top = Math.max(0, Math.min(top, 600 - currentImage.height));

        currentImage.style.left = `${left}px`;
        currentImage.style.top = `${top}px`;
        updateCoordinates(currentImage);
      }, 50); // 20 pixels per second = 1 pixel every 50ms
    });

    emoji.addEventListener('mouseup', () => {
      if (moveInterval) {
        clearInterval(moveInterval);
        moveInterval = null;
        if (currentImage) {
          const traitIndex = traitImages.indexOf(currentImage);
          const variationName = traits[traitIndex].variations[traits[traitIndex].selected].name;
          savePosition(currentImage, traitIndex, variationName);
        }
      }
    });

    emoji.addEventListener('mouseleave', () => {
      if (moveInterval) {
        clearInterval(moveInterval);
        moveInterval = null;
        if (currentImage) {
          const traitIndex = traitImages.indexOf(currentImage);
          const variationName = traits[traitIndex].variations[traits[traitIndex].selected].name;
          savePosition(currentImage, traitIndex, variationName);
        }
      }
    });
  });

  // Update coordinates when selecting a new image
  traitImages.forEach(img => {
    if (img) {
      img.addEventListener('click', () => {
        if (!img.src.includes('placeholder-image.jpg')) {
          currentImage = img;
          updateCoordinates(img);
        }
      });
    }
  });

  // Add event listener for Ctrl-Z (PC) or Cmd-Z (Mac) to undo movement
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      e.preventDefault(); // Prevent browser undo behavior
      if (positionHistory.length > 0) {
        const lastMove = positionHistory[positionHistory.length - 1];
        const { traitIndex, variationName, previousPosition } = lastMove;
        const previewImage = document.getElementById(`preview-trait${traitIndex + 1}`);
        if (previewImage && traits[traitIndex].variations[traits[traitIndex].selected].name === variationName) {
          positionHistory.pop(); // Remove the last move from history
          previewImage.style.left = `${previousPosition.left}px`;
          previewImage.style.top = `${previousPosition.top}px`;
          updateCoordinates(previewImage);
          localStorage.setItem(`trait${traitIndex + 1}-${variationName}-position`, JSON.stringify(previousPosition));
          // Update subsequent traits if they haven't been manually moved
          updateSubsequentTraits(traitIndex, variationName, previousPosition);
        }
      }
    }
  });

  // Add event listener for Generate Bkgd button
  const generateBackgroundButton = document.getElementById('generate-background');
  if (generateBackgroundButton) {
    generateBackgroundButton.addEventListener('click', fetchBackground);
  }

  window.mintNFT = async function() {
    const status = document.getElementById('status');
    if (!status) return;

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

      const uploadResponse = await fetch('https://aifn-1-api-q1ni.vercel.app/api/upload-to-arweave', {
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
        { value: ethers.utils.parseEther(config.sepolia.mintFee) }
      );

      status.innerText = "Minting...";
      const tx = await contractWithSigner.mintNFT(
        recipient,
        initialHtmlUri,
        numTraitCategories,
        traitCategoryVariants,
        traitIndices,
        { value: ethers.utils.parseEther(config.sepolia.mintFee), gasLimit: gasLimit.add(50000) }
      );
      const receipt = await tx.wait();
      const tokenId = receipt.events.find(e => e.event === "Transfer").args.tokenId.toString();
      status.innerText = `Minted! Token ID: ${tokenId}`;
    } catch (error) {
      status.innerText = `Error: ${error.message}`;
    }
  };
});
