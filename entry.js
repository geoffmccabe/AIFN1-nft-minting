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
      traitImages.splice(traitIndex, 1);

      // Renumber remaining traits
      for (let i = traitIndex; i < traits.length; i++) {
        const section = document.getElementById(`trait${i + 2}`);
        if (section) {
          section.id = `trait${i + 1}`;
          const title = section.querySelector('h2');
          title.textContent = `Trait ${i + 1}`;
          const nameInput = section.querySelector(`input[type="text"]`);
          nameInput.id = `trait${i + 1}-name`;
          const fileInput = section.querySelector(`input[type="file"]`);
          fileInput.id = `trait${i + 1}-files`;
          const grid = section.querySelector('.trait-grid');
          grid.id = `trait${i + 1}-grid`;
          const upArrow = section.querySelector('.up-arrow');
          upArrow.setAttribute('data-trait', `${i + 1}`);
          const downArrow = section.querySelector('.down-arrow');
          downArrow.setAttribute('data-trait', `${i + 1}`);
          const addTraitBtn = section.querySelector('.add-trait');
          addTraitBtn.setAttribute('data-trait', `${i + 1}`);
          const removeTraitBtn = section.querySelector('.remove-trait');
          removeTraitBtn.setAttribute('data-trait', `${i + 1}`);
        }
        const oldTraitImage = document.getElementById(`preview-trait${i + 2}`);
        if (oldTraitImage) {
          oldTraitImage.id = `preview-trait${i + 1}`;
          traitImages[i] = oldTraitImage;
        }
      }

      // Update z-indices for remaining traits
      for (let i = 0; i < traits.length; i++) {
        traits[i].zIndex = traits.length + 1 - i; // Trait 1: highest z-index, Trait 2: second highest, etc.
      }

      // Update variantHistories keys
      const newVariantHistories = {};
      Object.keys(variantHistories).forEach(key => {
        const [oldIndex, variationName] = key.split('-');
        const oldIndexNum = parseInt(oldIndex);
        if (oldIndexNum > traitIndex) {
          newVariantHistories[`${oldIndexNum - 1}-${variationName}`] = variantHistories[key];
        } else if (oldIndexNum < traitIndex) {
          newVariantHistories[key] = variantHistories[key];
        }
      });
      variantHistories = newVariantHistories;

      // Update localStorage keys
      for (let i = 0; i <= traits.length; i++) {
        const oldKeys = Object.keys(localStorage).filter(key => key.startsWith(`trait${i + 1}-`));
        oldKeys.forEach(oldKey => {
          const value = localStorage.getItem(oldKey);
          const newKey = oldKey.replace(/trait\d+-/, `trait${i + 1}-`);
          if (oldKey !== newKey) {
            localStorage.setItem(newKey, value);
            localStorage.removeItem(oldKey);
          }
        });
      }

      // Remove any leftover localStorage keys
      const maxIndex = traits.length + 1;
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('trait')) {
          const index = parseInt(key.match(/trait(\d+)/)[1]);
          if (index > traits.length) {
            localStorage.removeItem(key);
          }
        }
      });

      updateZIndices();
      updateMintButton();
      updatePreviewSamples(); // Update preview samples when a trait is removed
      confirmationDialog.remove();
    });

    noButton.addEventListener('click', () => {
      confirmationDialog.remove();
    });

    buttonsDiv.appendChild(yesButton);
    buttonsDiv.appendChild(noButton);
    confirmationDialog.appendChild(message);
    confirmationDialog.appendChild(buttonsDiv);
    document.body.appendChild(confirmationDialog);
  }

  function setupTraitListeners(traitIndex) {
    const nameInput = document.getElementById(`trait${traitIndex + 1}-name`);
    const fileInput = document.getElementById(`trait${traitIndex + 1}-files`);
    const grid = document.getElementById(`trait${traitIndex + 1}-grid`);

    if (fileInput && nameInput && grid) {
      fileInput.addEventListener('change', async (event) => {
        const files = Array.from(event.target.files).sort((a, b) => a.name.localeCompare(b.name));
        if (!files.length) return;

        const traitName = nameInput.value.trim() || `Trait ${traitIndex + 1}`;
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
        updatePreviewSamples(); // Update preview samples when new variants are added
      });
    }

    const upArrow = document.querySelector(`.up-arrow[data-trait="${traitIndex + 1}"]`);
    const downArrow = document.querySelector(`.down-arrow[data-trait="${traitIndex + 1}"]`);
    const addTraitBtn = document.querySelector(`.add-trait[data-trait="${traitIndex + 1}"]`);
    const removeTraitBtn = document.querySelector(`.remove-trait[data-trait="${traitIndex + 1}"]`);

    upArrow.addEventListener('click', () => {
      if (traitIndex === 0) return; // Already at the top (Trait 1)
      const currentTrait = traits[traitIndex];
      const prevTrait = traits[traitIndex - 1];
      const tempZIndex = currentTrait.zIndex;
      currentTrait.zIndex = prevTrait.zIndex;
      prevTrait.zIndex = tempZIndex;
      traits[traitIndex] = prevTrait;
      traits[traitIndex - 1] = currentTrait;

      // Swap DOM elements
      const currentSection = document.getElementById(`trait${traitIndex + 1}`);
      const prevSection = document.getElementById(`trait${traitIndex}`);
      traitContainer.insertBefore(currentSection, prevSection);

      // Renumber sections
      renumberTraits();

      // Swap trait images
      const tempImage = traitImages[traitIndex];
      traitImages[traitIndex] = traitImages[traitIndex - 1];
      traitImages[traitIndex - 1] = tempImage;
      traitImages[traitIndex].id = `preview-trait${traitIndex + 1}`;
      traitImages[traitIndex - 1].id = `preview-trait${traitIndex}`;

      // Update variantHistories keys
      const newVariantHistories = {};
      Object.keys(variantHistories).forEach(key => {
        const [oldIndex, variationName] = key.split('-');
        const oldIndexNum = parseInt(oldIndex);
        if (oldIndexNum === traitIndex) {
          newVariantHistories[`${traitIndex - 1}-${variationName}`] = variantHistories[key];
        } else if (oldIndexNum === traitIndex - 1) {
          newVariantHistories[`${traitIndex}-${variationName}`] = variantHistories[key];
        } else {
          newVariantHistories[key] = variantHistories[key];
        }
      });
      variantHistories = newVariantHistories;

      // Update localStorage keys
      for (let i = 0; i < traits.length; i++) {
        const oldKeys = Object.keys(localStorage).filter(key => key.startsWith(`trait${i + 1}-`));
        oldKeys.forEach(oldKey => {
          const value = localStorage.getItem(oldKey);
          const newKey = oldKey.replace(/trait\d+-/, `trait${i + 1}-`);
          if (oldKey !== newKey) {
            localStorage.setItem(newKey, value);
            localStorage.removeItem(oldKey);
          }
        });
      }

      updateZIndices();
      updateMintButton();
      updatePreviewSamples(); // Update preview samples when trait order changes
    });

    downArrow.addEventListener('click', () => {
      if (traitIndex === traits.length - 1) return; // Already at the bottom
      const currentTrait = traits[traitIndex];
      const nextTrait = traits[traitIndex + 1];
      const tempZIndex = currentTrait.zIndex;
      currentTrait.zIndex = nextTrait.zIndex;
      nextTrait.zIndex = tempZIndex;
      traits[traitIndex] = nextTrait;
      traits[traitIndex + 1] = currentTrait;

      // Swap DOM elements
      const currentSection = document.getElementById(`trait${traitIndex + 1}`);
      const nextSection = document.getElementById(`trait${traitIndex + 2}`);
      traitContainer.insertBefore(nextSection, currentSection);

      // Renumber sections
      renumberTraits();

      // Swap trait images
      const tempImage = traitImages[traitIndex];
      traitImages[traitIndex] = traitImages[traitIndex + 1];
      traitImages[traitIndex + 1] = tempImage;
      traitImages[traitIndex].id = `preview-trait${traitIndex + 1}`;
      traitImages[traitIndex + 1].id = `preview-trait${traitIndex + 2}`;

      // Update variantHistories keys
      const newVariantHistories = {};
      Object.keys(variantHistories).forEach(key => {
        const [oldIndex, variationName] = key.split('-');
        const oldIndexNum = parseInt(oldIndex);
        if (oldIndexNum === traitIndex) {
          newVariantHistories[`${traitIndex + 1}-${variationName}`] = variantHistories[key];
        } else if (oldIndexNum === traitIndex + 1) {
          newVariantHistories[`${traitIndex}-${variationName}`] = variantHistories[key];
        } else {
          newVariantHistories[key] = variantHistories[key];
        }
      });
      variantHistories = newVariantHistories;

      // Update localStorage keys
      for (let i = 0; i < traits.length; i++) {
        const oldKeys = Object.keys(localStorage).filter(key => key.startsWith(`trait${i + 1}-`));
        oldKeys.forEach(oldKey => {
          const value = localStorage.getItem(oldKey);
          const newKey = oldKey.replace(/trait\d+-/, `trait${i + 1}-`);
          if (oldKey !== newKey) {
            localStorage.setItem(newKey, value);
            localStorage.removeItem(oldKey);
          }
        });
      }

      updateZIndices();
      updateMintButton();
      updatePreviewSamples(); // Update preview samples when trait order changes
    });

    addTraitBtn.addEventListener('click', () => {
      if (traits.length < 20) {
        traits.push({ name: '', variations: [], selected: 0, zIndex: 2 }); // New trait at the bottom (lowest z-index)
        // Update z-indices for all traits
        for (let i = 0; i < traits.length; i++) {
          traits[i].zIndex = traits.length + 1 - i;
        }
        addTrait(traits.length - 1);
      }
    });

    removeTraitBtn.addEventListener('click', () => {
      removeTrait(traitIndex);
    });
  }

  function renumberTraits() {
    const sections = traitContainer.querySelectorAll('.trait-section');
    sections.forEach((section, index) => {
      section.id = `trait${index + 1}`;
      const title = section.querySelector('h2');
      title.textContent = `Trait ${index + 1}`;
      const nameInput = section.querySelector(`input[type="text"]`);
      nameInput.id = `trait${index + 1}-name`;
      const fileInput = section.querySelector(`input[type="file"]`);
      fileInput.id = `trait${index + 1}-files`;
      const grid = section.querySelector('.trait-grid');
      grid.id = `trait${index + 1}-grid`;
      const upArrow = section.querySelector('.up-arrow');
      upArrow.setAttribute('data-trait', `${index + 1}`);
      const downArrow = section.querySelector('.down-arrow');
      downArrow.setAttribute('data-trait', `${index + 1}`);
      const addTraitBtn = section.querySelector('.add-trait');
      addTraitBtn.setAttribute('data-trait', `${index + 1}`);
      const removeTraitBtn = section.querySelector('.remove-trait');
      removeTraitBtn.setAttribute('data-trait', `${index + 1}`);
    });
  }

  function updateZIndices() {
    traitImages.forEach((img, index) => {
      if (img) {
        img.style.zIndex = traits[index].zIndex;
      }
    });
  }

  function selectVariation(traitIndex, variationName) {
    const trait = traits[traitIndex];
    const variationIndex = trait.variations.findIndex(v => v.name === variationName);
    trait.selected = variationIndex;

    // Update the selected class for the grid
    const grid = document.getElementById(`trait${traitIndex + 1}-grid`);
    if (grid) {
      Array.from(grid.children).forEach((child, idx) => {
        child.classList.toggle('selected', idx === variationIndex);
      });
    }

    const previewImage = document.getElementById(`preview-trait${traitIndex + 1}`);
    if (previewImage) {
      previewImage.src = trait.variations[variationIndex].url;
      previewImage.style.display = 'block'; // Show the image when a variant is selected
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
          img.style.zIndex = traits[traitIndex].zIndex;
        }
      });
      updateCoordinates(previewImage);
    }
  }

  function updatePreviewSamples() {
    previewSamplesGrid.innerHTML = ''; // Clear existing samples

    // Generate 20 random combinations (5 rows x 4 columns)
    for (let i = 0; i < 20; i++) {
      const sampleContainer = document.createElement('div');
      sampleContainer.className = 'sample-container';

      // For each trait, select a random variant
      for (let j = 0; j < traits.length; j++) {
        const trait = traits[j];
        if (trait.variations.length === 0) continue; // Skip if no variants

        const randomIndex = Math.floor(Math.random() * trait.variations.length);
        const variant = trait.variations[randomIndex];

        const img = document.createElement('img');
        img.src = variant.url;
        img.alt = `Sample ${i + 1} - Trait ${j + 1}`;
        img.style.zIndex = traits[j].zIndex;

        // Apply the same positioning as in the main preview panel, scaled down
        const key = `${j}-${variant.name}`;
        const savedPosition = localStorage.getItem(`trait${j + 1}-${variant.name}-position`);
        if (savedPosition) {
          const { left, top } = JSON.parse(savedPosition);
          const scale = 140 / 600; // Scale factor from 600px to 140px
          img.style.left = `${left * scale}px`;
          img.style.top = `${top * scale}px`;
        } else {
          img.style.left = '0px';
          img.style.top = '0px';
        }

        sampleContainer.appendChild(img);
      }

      previewSamplesGrid.appendChild(sampleContainer);
    }
  }

  updatePreviewsButton.addEventListener('click', () => {
    updatePreviewSamples();
  });

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
        if (img.src === '') return;
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
      if (!currentImage || currentImage.src === '') return;
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
        if (img.src !== '') {
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
        variantHistories[key].pop();
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
