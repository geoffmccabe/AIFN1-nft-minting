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
  const generateButton = document.getElementById('generate-background');

  let isDragging = false;
  let currentImage = null;
  let offsetX = 0;
  let offsetY = 0;
  let moveInterval = null;
  let variantHistories = {}; // History registry: { "traitIndex-variationName": [{left, top}, ...] }
  let timerInterval = null;
  let lastUndoTime = 0;

  const clickSound = new Audio('https://www.soundjay.com/buttons/button-3.mp3');
  clickSound.volume = 0.25;

  async function fetchBackground() {
    try {
      clickSound.play().catch(error => console.error('Error playing click sound:', error));
      let seconds = 0;
      generateButton.disabled = true;
      generateButton.innerText = `Processing ${seconds}...`;
      timerInterval = setInterval(() => {
        seconds++;
        console.log(`Timer update: ${seconds} seconds`);
        generateButton.innerText = `Processing ${seconds}...`;
      }, 1000);

      const userPrompt = document.getElementById('user-prompt') ? document.getElementById('user-prompt').value.trim() : '';
      const url = `https://aifn-1-api-q1ni.vercel.app/api/generate-background${userPrompt ? `?prompt=${encodeURIComponent(userPrompt)}` : ''}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch background: ${response.statusText}`);
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
      if (backgroundMetadata) backgroundMetadata.innerText = 'Failed to load background: ' + error.message;
    } finally {
      clearInterval(timerInterval);
      generateButton.innerText = 'Generate Bkgd';
      generateButton.disabled = false;
    }
  }

  function fetchMintFee() {
    const mintFeeDisplay = document.getElementById('mintFeeDisplay');
    if (mintFeeDisplay) {
      mintFeeDisplay.innerText = `Mint Fee: 0.001 ETH (Mock)`;
    }
  }
  fetchMintFee();

  function updateCoordinates(img) {
    if (img && coordinates) {
      const left = parseFloat(img.style.left) || 0;
      const top = parseFloat(img.style.top) || 0;
      coordinates.innerHTML = `<strong>Coordinates:</strong> (${Math.round(left) + 1}, ${Math.round(top) + 1})`;
    }
  }

  function savePosition(img, traitIndex, variationName) {
    const position = {
      left: parseFloat(img.style.left) || 0,
      top: parseFloat(img.style.top) || 0
    };
    const key = `${traitIndex}-${variationName}`;
    if (!variantHistories[key]) {
      variantHistories[key] = [];
    }
    variantHistories[key].push(position);
    localStorage.setItem(`trait${traitIndex + 1}-${variationName}-position`, JSON.stringify(position));
    localStorage.setItem(`trait${traitIndex + 1}-${variationName}-manuallyMoved`, 'true');
    updateSubsequentTraits(traitIndex, variationName, position);
  }

  function updateSubsequentTraits(currentTraitIndex, currentVariationName, position) {
    const currentTrait = traits[currentTraitIndex];
    const currentVariationIndex = currentTrait.variations.findIndex(v => v.name === currentVariationName);

    if (currentTrait.variations.length > 1) {
      for (let i = currentVariationIndex + 1; i < currentTrait.variations.length; i++) {
        const nextVariationName = currentTrait.variations[i].name;
        const key = `${currentTraitIndex}-${nextVariationName}`;
        const manuallyMoved = localStorage.getItem(`trait${currentTraitIndex + 1}-${nextVariationName}-manuallyMoved`);
        if (!manuallyMoved && !variantHistories[key]) {
          variantHistories[key] = [{ left: position.left, top: position.top }];
          localStorage.setItem(`trait${currentTraitIndex + 1}-${nextVariationName}-position`, JSON.stringify(position));
          if (traits[currentTraitIndex].selected === i) {
            const previewImage = document.getElementById(`preview-trait${currentTraitIndex + 1}`);
            if (previewImage && !previewImage.src.includes('placeholder-image.jpg')) {
              previewImage.style.left = `${position.left}px`;
              previewImage.style.top = `${position.top}px`;
            }
          }
        }
      }
    }

    for (let traitIndex = currentTraitIndex + 1; traitIndex < traits.length; traitIndex++) {
      const nextTrait = traits[traitIndex];
      if (nextTrait.variations.length === 0) continue;
      for (let i = 0; i < nextTrait.variations.length; i++) {
        const nextVariationName = nextTrait.variations[i].name;
        const key = `${traitIndex}-${nextVariationName}`;
        const manuallyMoved = localStorage.getItem(`trait${traitIndex + 1}-${nextVariationName}-manuallyMoved`);
        if (!manuallyMoved && !variantHistories[key]) {
          variantHistories[key] = [{ left: position.left, top: position.top }];
          localStorage.setItem(`trait${traitIndex + 1}-${nextVariationName}-position`, JSON.stringify(position));
          if (traits[traitIndex].selected === i) {
            const previewImage = document.getElementById(`preview-trait${traitIndex + 1}`);
            if (previewImage && !previewImage.src.includes('placeholder-image.jpg')) {
              previewImage.style.left = `${position.left}px`;
              previewImage.style.top = `${position.top}px`;
            }
          }
        }
      }
    }
  }

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
      const key = `${traitIndex}-${variationName}`;
      const savedPosition = localStorage.getItem(`trait${traitIndex + 1}-${variationName}-position`);
      if (savedPosition) {
        const { left, top } = JSON.parse(savedPosition);
        previewImage.style.left = `${left}px`;
        previewImage.style.top = `${top}px`;
        if (!variantHistories[key]) {
          variantHistories[key] = [{ left, top }];
        }
      } else {
        // Find the last position from another variant in the same trait group
        let lastPosition = null;
        for (let i = 0; i < trait.variations.length; i++) {
          if (i === variationIndex) continue;
          const otherVariationName = trait.variations[i].name;
          const otherKey = `${traitIndex}-${otherVariationName}`;
          if (variantHistories[otherKey] && variantHistories[otherKey].length > 0) {
            lastPosition = variantHistories[otherKey][variantHistories[otherKey].length - 1];
          }
        }
        if (lastPosition) {
          previewImage.style.left = `${lastPosition.left}px`;
          previewImage.style.top = `${lastPosition.top}px`;
          variantHistories[key] = [{ left: lastPosition.left, top: lastPosition.top }];
          localStorage.setItem(`trait${traitIndex + 1}-${variationName}-position`, JSON.stringify(lastPosition));
        } else {
          previewImage.style.left = '0px';
          previewImage.style.top = '0px';
          variantHistories[key] = [{ left: 0, top: 0 }];
          localStorage.setItem(`trait${traitIndex + 1}-${variationName}-position`, JSON.stringify({ left: 0, top: 0 }));
        }
      }
      currentImage = previewImage;
      traitImages.forEach(img => {
        if (img === previewImage) {
          img.style.zIndex = traitIndex === 0 ? 2 : traitIndex === 1 ? 3 : 4;
        } else if (!img.src.includes('placeholder-image.jpg')) {
          const otherIndex = traitImages.indexOf(img);
          img.style.zIndex = otherIndex === 0 ? 2 : otherIndex === 1 ? 3 : 4;
        }
      });
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

  traitImages.forEach((img, index) => {
    if (img) {
      img.addEventListener('dragstart', (e) => e.preventDefault());

      img.addEventListener('mousedown', (e) => {
        if (img.src.includes('placeholder-image.jpg')) return;
        if (img !== currentImage) return;
        isDragging = true;
        currentImage = img;
        const rect = img.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
        img.style.cursor = 'grabbing';
        img.classList.add('dragging');
        updateCoordinates(img);
      });

      img.addEventListener('mouseup', () => {
        if (isDragging && currentImage === img) {
          const traitIndex = traitImages.indexOf(currentImage);
          const variationName = traits[traitIndex].variations[traits[traitIndex].selected].name;
          savePosition(currentImage, traitIndex, variationName);
          isDragging = false;
          currentImage.style.cursor = 'grab';
          currentImage.classList.remove('dragging');
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
        currentImage.classList.remove('dragging');
      }
    });

    preview.addEventListener('mouseleave', () => {
      if (isDragging && currentImage) {
        const traitIndex = traitImages.indexOf(currentImage);
        const variationName = traits[traitIndex].variations[traits[traitIndex].selected].name;
        savePosition(currentImage, traitIndex, variationName);
        isDragging = false;
        currentImage.style.cursor = 'grab';
        currentImage.classList.remove('dragging');
      }
    });
  }

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
        currentImage.classList.add('dragging');
        updateCoordinates(currentImage);
      }, 50);
    });

    emoji.addEventListener('mouseup', () => {
      if (moveInterval) {
        clearInterval(moveInterval);
        moveInterval = null;
        if (currentImage) {
          const traitIndex = traitImages.indexOf(currentImage);
          const variationName = traits[traitIndex].variations[traits[traitIndex].selected].name;
          savePosition(currentImage, traitIndex, variationName);
          currentImage.classList.remove('dragging');
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
          currentImage.classList.remove('dragging');
        }
      }
    });
  });

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

  document.addEventListener('keydown', (e) => {
    const now = Date.now();
    if (now - lastUndoTime < 300) return;
    lastUndoTime = now;

    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      e.preventDefault();
      if (!currentImage) return;
      const traitIndex = traitImages.indexOf(currentImage);
      const variationName = traits[traitIndex].variations[traits[traitIndex].selected].name;
      const key = `${traitIndex}-${variationName}`;
      if (variantHistories[key] && variantHistories[key].length > 1) {
        variantHistories[key].pop(); // Remove the current position
        const previousPosition = variantHistories[key][variantHistories[key].length - 1];
        currentImage.style.left = `${previousPosition.left}px`;
        currentImage.style.top = `${previousPosition.top}px`;
        localStorage.setItem(`trait${traitIndex + 1}-${variationName}-position`, JSON.stringify(previousPosition));
        updateCoordinates(currentImage);
        updateSubsequentTraits(traitIndex, variationName, previousPosition);
      }
    }
  });

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
