// entry.js

document.addEventListener('DOMContentLoaded', () => {
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const contract = new ethers.Contract(config.sepolia.contractAddress, config.abi, provider);
  const signer = provider.getSigner();
  const contractWithSigner = contract.connect(signer);

  let traits = [];
  let background = { url: '', metadata: '' };
  let traitImages = [];
  let isDragging = false;
  let currentImage = null;
  let offsetX = 0;
  let offsetY = 0;
  let moveInterval = null;
  let variantHistories = {};
  let timerInterval = null;
  let lastUndoTime = 0;

  const preview = document.getElementById('preview');
  const coordinates = document.getElementById('coordinates');
  const directionEmojis = document.querySelectorAll('.direction-emoji');
  const generateButton = document.getElementById('generate-background');
  const traitContainer = document.getElementById('trait-container');
  const previewSamplesGrid = document.getElementById('preview-samples-grid');
  const updatePreviewsButton = document.getElementById('update-previews');

  const clickSound = new Audio('https://www.soundjay.com/buttons/button-3.mp3');
  clickSound.volume = 0.25;

  // Initialize with 3 trait groups, with Trait 1 on top (highest z-index)
  for (let i = 0; i < 3; i++) {
    traits.push({ name: '', variations: [], selected: 0, zIndex: 3 - i }); // Trait 1: z-index 3, Trait 2: z-index 2, Trait 3: z-index 1
    addTrait(i, true);
  }

  // Initialize preview samples
  updatePreviewSamples();

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
      const backgroundMetadata = document.getElementById('background-metadata');

      if (backgroundImage) backgroundImage.src = background.url;
      if (backgroundMetadata) backgroundMetadata.innerText = background.metadata;
    } catch (error) {
      console.error('Error fetching background:', error);
      const placeholder = 'https://github.com/geoffmccabe/AIFN1-nft-minting/raw/main/images/Preview_Panel_Bkgd_600px.webp';
      const backgroundImage = document.getElementById('background-image');
      const backgroundMetadata = document.getElementById('background-metadata');

      if (backgroundImage) backgroundImage.src = placeholder;
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
            if (previewImage && previewImage.src) {
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
            if (previewImage && previewImage.src) {
              previewImage.style.left = `${position.left}px`;
              previewImage.style.top = `${position.top}px`;
            }
          }
        }
      }
    }
  }

  function addTrait(traitIndex, initial = false) {
    const traitSection = document.createElement('div');
    traitSection.id = `trait${traitIndex + 1}`;
    traitSection.className = 'trait-section';

    const traitHeader = document.createElement('div');
    traitHeader.className = 'trait-header';
    const title = document.createElement('h2');
    title.textContent = `Trait ${traitIndex + 1}`;
    const controls = document.createElement('div');
    controls.className = 'trait-controls';
    const upArrow = document.createElement('span');
    upArrow.className = 'up-arrow';
    upArrow.setAttribute('data-trait', `${traitIndex + 1}`);
    upArrow.textContent = '⬆️';
    const downArrow = document.createElement('span');
    downArrow.className = 'down-arrow';
    downArrow.setAttribute('data-trait', `${traitIndex + 1}`);
    downArrow.textContent = '⬇️';
    const addTraitBtn = document.createElement('span');
    addTraitBtn.className = 'add-trait';
    addTraitBtn.setAttribute('data-trait', `${traitIndex + 1}`);
    addTraitBtn.textContent = '➕';
    const removeTraitBtn = document.createElement('span');
    removeTraitBtn.className = 'remove-trait';
    removeTraitBtn.setAttribute('data-trait', `${traitIndex + 1}`);
    removeTraitBtn.textContent = '➖';
    controls.appendChild(upArrow);
    controls.appendChild(downArrow);
    controls.appendChild(addTraitBtn);
    controls.appendChild(removeTraitBtn);
    traitHeader.appendChild(title);
    traitHeader.appendChild(controls);

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.id = `trait${traitIndex + 1}-name`;
    nameInput.placeholder = `Trait Name (e.g., ${traitIndex === 0 ? 'Eyes' : traitIndex === 1 ? 'Hair' : 'Accessories'})`;

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.id = `trait${traitIndex + 1}-files`;
    fileInput.accept = 'image/png,image/webp';
    fileInput.multiple = true;

    const grid = document.createElement('div');
    grid.id = `trait${traitIndex + 1}-grid`;
    grid.className = 'trait-grid';

    traitSection.appendChild(traitHeader);
    traitSection.appendChild(nameInput);
    traitSection.appendChild(fileInput);
    traitSection.appendChild(grid);
    traitContainer.appendChild(traitSection);

    const newTraitImage = document.createElement('img');
    newTraitImage.id = `preview-trait${traitIndex + 1}`;
    newTraitImage.src = '';
    newTraitImage.alt = `Trait ${traitIndex + 1}`;
    newTraitImage.style.zIndex = traits[traitIndex].zIndex;
    if (preview) {
      preview.appendChild(newTraitImage);
    }
    traitImages[traitIndex] = newTraitImage;

    setupTraitListeners(traitIndex);
    updateZIndices();
    updateMintButton();
    updatePreviewSamples(); // Update preview samples when a new trait is added
  }

  function removeTrait(traitIndex) {
    if (traits.length <= 1) return; // Minimum 1 trait

    const confirmationDialog = document.createElement('div');
    confirmationDialog.className = 'confirmation-dialog';
    const message = document.createElement('p');
    message.textContent = `Are you sure you want to delete Trait ${traitIndex + 1}?`;
    const buttonsDiv = document.createElement('div');
    buttonsDiv.className = 'buttons';
    const yesButton = document.createElement('button');
    yesButton.className = 'yes-button';
    yesButton.textContent = 'Y';
    const noButton = document.createElement('button');
    noButton.className = 'no-button';
    noButton.textContent = 'N';

    yesButton.addEventListener('click', () => {
      traits.splice(traitIndex, 1);
      const traitSection = document.getElementById(`trait${traitIndex + 1}`);
      if (traitSection) {
        traitSection.remove();
      }
      const traitImage = document.getElementById(`preview-trait${traitIndex + 1}`);
      if (traitImage) {
        traitImage.remove();
      }
      trai
