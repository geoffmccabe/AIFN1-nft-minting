

/* Section 1 - GLOBAL SETUP AND INITIALIZATION */


// Declare variables globally
let provider, contract, signer, contractWithSigner;
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
let autoPositioned = new Array(20).fill(false);
let sampleData = Array(20).fill(null).map(() => []);
let preview, coordinates, directionEmojis, magnifyEmoji, enlargedPreview, generateButton, traitContainer, previewSamplesGrid, updatePreviewsButton;
const clickSound = new Audio('https://www.soundjay.com/buttons/button-3.mp3');
clickSound.volume = 0.25;

document.addEventListener('DOMContentLoaded', () => {
  provider = new ethers.providers.Web3Provider(window.ethereum);
  contract = new ethers.Contract(config.sepolia.contractAddress, config.abi, provider);
  signer = provider.getSigner();
  contractWithSigner = contract.connect(signer);

  preview = document.getElementById('preview');
  coordinates = document.getElementById('coordinates');
  directionEmojis = document.querySelectorAll('.direction-emoji');
  magnifyEmoji = document.querySelector('.magnify-emoji');
  enlargedPreview = document.getElementById('enlarged-preview');
  generateButton = document.getElementById('generate-background');
  traitContainer = document.getElementById('trait-container');
  previewSamplesGrid = document.getElementById('preview-samples-grid');
  updatePreviewsButton = document.getElementById('update-previews');

  // Initialize with 3 trait groups
  for (let i = 0; i < 3; i++) {
    traits.push({ name: '', variations: [], selected: 0, zIndex: 3 - i });
    addTrait(i, true);
  }
  updatePreviewSamples();

  // Event listeners for global controls
  updatePreviewsButton.addEventListener('click', () => updatePreviewSamples());
  generateButton.addEventListener('click', fetchBackground);

  // Set up drag-and-drop for direction emojis
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

  // Set up magnifying glass
  magnifyEmoji.addEventListener('click', () => {
    enlargedPreview.innerHTML = '';
    const maxWidth = window.innerWidth * 0.9;
    const maxHeight = window.innerHeight * 0.9;
    let scale = 1;
    if (maxWidth / maxHeight > 1) {
      enlargedPreview.style.height = `${maxHeight}px`;
      enlargedPreview.style.width = `${maxHeight}px`;
      scale = maxHeight / 600;
    } else {
      enlargedPreview.style.width = `${maxWidth}px`;
      enlargedPreview.style.height = `${maxWidth}px`;
      scale = maxWidth / 600;
    }

    traitImages.forEach(img => {
      if (img && img.style.display === 'block') {
        const clonedImg = img.cloneNode(true);
        clonedImg.style.display = 'block';
        clonedImg.style.width = `${img.width * scale}px`;
        clonedImg.style.height = `${img.height * scale}px`;
        clonedImg.style.left = `${parseFloat(img.style.left) * scale}px`;
        clonedImg.style.top = `${parseFloat(img.style.top) * scale}px`;
        clonedImg.style.zIndex = img.style.zIndex;
        enlargedPreview.appendChild(clonedImg);
      }
    });

    enlargedPreview.style.display = 'block';
    enlargedPreview.addEventListener('click', () => enlargedPreview.style.display = 'none', { once: true });
  });

  // Set up undo functionality
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
        updateSamplePositions(traitIndex, variationName, previousPosition);
        updateSubsequentTraits(traitIndex, variationName, previousPosition);
      }
    }
  });

  // Set up preview panel drag events
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
        updateZIndices();
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
        updateZIndices();
      }
    });
  }

  // Set up drag-and-drop for initial trait images
  traitImages.forEach((img, index) => {
    if (img) {
      console.log(`Setting up drag-and-drop for trait ${index + 1}, image:`, img);
      setupDragAndDrop(img, index);
    }
  });
});



/* Section 2 - TRAIT MANAGEMENT FUNCTIONS */


function addTrait(traitIndex, initial = false) {
  const traitSection = document.createElement('div');
  traitSection.id = `trait${traitIndex + 1}`;
  traitSection.className = 'trait-section';

  const traitHeader = document.createElement('div');
  traitHeader.className = 'trait-header';
  const title = document.createElement('h2');
  title.textContent = `Trait ${traitIndex + 1}${traits[traitIndex].name ? ` - ${traits[traitIndex].name}` : ''}`;
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

  const fileInputLabel = document.createElement('label');
  fileInputLabel.className = 'file-input-label';
  fileInputLabel.htmlFor = `trait${traitIndex + 1}-files`;
  fileInputLabel.textContent = 'Choose Files';

  const variantCountSpan = document.createElement('span');
  variantCountSpan.id = `trait${traitIndex + 1}-variant-count`;
  variantCountSpan.style.marginLeft = '10px';
  variantCountSpan.textContent = '[0 variants chosen]';

  const grid = document.createElement('div');
  grid.id = `trait${traitIndex + 1}-grid`;
  grid.className = 'trait-grid';

  traitSection.appendChild(traitHeader);
  traitSection.appendChild(nameInput);
  traitSection.appendChild(fileInput);
  traitSection.appendChild(fileInputLabel);
  traitSection.appendChild(variantCountSpan);
  traitSection.appendChild(grid);

  // Insert the trait section at the correct position
  const currentSection = traitContainer.querySelector(`#trait${traitIndex + 1}`);
  if (currentSection) {
    traitContainer.insertBefore(traitSection, currentSection);
  } else {
    traitContainer.appendChild(traitSection);
  }

  const newTraitImage = document.createElement('img');
  newTraitImage.id = `preview-trait${traitIndex + 1}`;
  newTraitImage.src = '';
  newTraitImage.alt = `Trait ${traitIndex + 1}`;
  newTraitImage.style.zIndex = (traits.length - traitIndex) * 100;
  if (preview) preview.appendChild(newTraitImage);
  traitImages[traitIndex] = newTraitImage;

  // Update z-indices after adding the trait
  for (let i = 0; i < traits.length; i++) {
    traits[i].zIndex = traits.length - i;
  }

  setupTraitListeners(traitIndex);
  // Defer drag-and-drop setup to ensure DOM is ready
  requestAnimationFrame(() => {
    console.log(`Setting up drag-and-drop for new trait ${traitIndex + 1}, image:`, newTraitImage);
    setupDragAndDrop(newTraitImage, traitIndex);
  });
  updateZIndices();
  updatePreviewSamples();
}

function removeTrait(traitIndex) {
  if (traits.length <= 1) return;

  const confirmationDialog = document.createElement('div');
  confirmationDialog.className = 'confirmation-dialog';
  const message = document.createElement('p');
  message.textContent = `Are you sure you want to delete Trait ${traitIndex + 1}${traits[traitIndex].name ? ` - ${traits[traitIndex].name}` : ''}?`;
  const buttonsDiv = document.createElement('div');
  buttonsDiv.className = 'buttons';
  const yesButton = document.createElement('button');
  yesButton.className = 'yes-button';
  yesButton.textContent = 'Y';
  const noButton = document.createElement('button');
  noButton.className = 'no-button';
  noButton.textContent = 'N';

  yesButton.addEventListener('click', () => {
    // Remove the trait from traits array
    traits.splice(traitIndex, 1);
    // Remove the DOM element
    document.getElementById(`trait${traitIndex + 1}`).remove();
    // Remove the preview image
    const traitImage = document.getElementById(`preview-trait${traitIndex + 1}`);
    if (traitImage) traitImage.remove();
    // Remove from traitImages
    traitImages.splice(traitIndex, 1);

    // Shift remaining traits' DOM elements and traitImages
    for (let i = traitIndex; i < traits.length; i++) {
      const section = document.getElementById(`trait${i + 2}`);
      if (section) {
        section.id = `trait${i + 1}`;
        section.querySelector('h2').textContent = `Trait ${i + 1}${traits[i].name ? ` - ${traits[i].name}` : ''}`;
        section.querySelector('input[type="text"]').id = `trait${i + 1}-name`;
        section.querySelector('input[type="file"]').id = `trait${i + 1}-files`;
        section.querySelector('.file-input-label').htmlFor = `trait${i + 1}-files`;
        section.querySelector('.trait-grid').id = `trait${i + 1}-grid`;
        section.querySelector('.up-arrow').setAttribute('data-trait', `${i + 1}`);
        section.querySelector('.down-arrow').setAttribute('data-trait', `${i + 1}`);
        section.querySelector('.add-trait').setAttribute('data-trait', `${i + 1}`);
        section.querySelector('.remove-trait').setAttribute('data-trait', `${i + 1}`);
      }
      if (traitImages[i]) {
        traitImages[i].id = `preview-trait${i + 1}`;
      }
    }

    // Update z-indices
    for (let i = 0; i < traits.length; i++) {
      traits[i].zIndex = traits.length - i;
    }

    // Update variantHistories
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

    // Clear localStorage for the deleted trait
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(`trait${traitIndex + 1}-`)) {
        localStorage.removeItem(key);
      }
    });

    // Shift localStorage keys for remaining traits
    for (let i = traitIndex; i < traits.length; i++) {
      const oldKeys = Object.keys(localStorage).filter(key => key.startsWith(`trait${i + 2}-`));
      oldKeys.forEach(oldKey => {
        const value = localStorage.getItem(oldKey);
        const newKey = oldKey.replace(`trait${i + 2}-`, `trait${i + 1}-`);
        localStorage.setItem(newKey, value);
        localStorage.removeItem(oldKey);
      });
    }

    // Remove any stale localStorage keys
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('trait')) {
        const index = parseInt(key.match(/trait(\d+)/)[1]);
        if (index > traits.length) {
          localStorage.removeItem(key);
        }
      }
    });

    // Update autoPositioned
    autoPositioned.splice(traitIndex, 1);
    if (autoPositioned.length < traits.length + 1) {
      autoPositioned.push(false);
    }

    updateZIndices();
    updatePreviewSamples();
    confirmationDialog.remove();
  });

  noButton.addEventListener('click', () => confirmationDialog.remove());

  buttonsDiv.appendChild(yesButton);
  buttonsDiv.appendChild(noButton);
  confirmationDialog.appendChild(message);
  confirmationDialog.appendChild(buttonsDiv);
  document.body.appendChild(confirmationDialog);
}

function setupTraitListeners(traitIndex) {
  const nameInput = document.getElementById(`trait${traitIndex + 1}-name`);
  const fileInput = document.getElementById(`trait${traitIndex + 1}-files`);
  const fileInputLabel = document.querySelector(`label[for="trait${traitIndex + 1}-files"]`);
  const variantCountSpan = document.getElementById(`trait${traitIndex + 1}-variant-count`);
  const grid = document.getElementById(`trait${traitIndex + 1}-grid`);

  // Set the tooltip for up and down arrows based on position
  const upArrow = document.querySelector(`.up-arrow[data-trait="${traitIndex + 1}"]`);
  const downArrow = document.querySelector(`.down-arrow[data-trait="${traitIndex + 1}"]`);
  if (upArrow) {
    if (traitIndex === 0) {
      upArrow.setAttribute('data-tooltip', 'Swap this Trait with the Last One');
    } else {
      upArrow.setAttribute('data-tooltip', 'Swap this Trait with the one above');
    }
  }
  if (downArrow) {
    if (traitIndex === traits.length - 1) {
      downArrow.setAttribute('data-tooltip', 'Swap this Trait with Trait #1');
    } else {
      downArrow.setAttribute('data-tooltip', 'Swap this Trait with the one below');
    }
  }

  if (nameInput) {
    // Update title when the user types a name
    nameInput.addEventListener('input', () => {
      const traitName = nameInput.value.trim();
      // Ensure the name doesn't include the "Trait X - " prefix
      const prefix = `Trait ${traitIndex + 1} - `;
      if (traitName.startsWith(prefix)) {
        traits[traitIndex].name = traitName.substring(prefix.length);
      } else {
        traits[traitIndex].name = traitName;
      }
      const title = document.querySelector(`#trait${traitIndex + 1} h2`);
      if (title) {
        title.textContent = `Trait ${traitIndex + 1}${traits[traitIndex].name ? ` - ${traits[traitIndex].name}` : ''}`;
      }
    });
  }

  if (fileInput && nameInput && grid && fileInputLabel && variantCountSpan) {
    fileInput.addEventListener('change', async (event) => {
      const files = Array.from(event.target.files).sort((a, b) => a.name.localeCompare(b.name));
      if (!files.length) return;

      const traitName = nameInput.value.trim() || `Trait ${traitIndex + 1}`;
      // Ensure the name doesn't include the "Trait X - " prefix
      const prefix = `Trait ${traitIndex + 1} - `;
      if (traitName.startsWith(prefix)) {
        traits[traitIndex].name = traitName.substring(prefix.length);
      } else {
        traits[traitIndex].name = traitName;
      }
      traits[traitIndex].variations = [];

      grid.innerHTML = '';
      for (const file of files) {
        const variationName = file.name.split('.').slice(0, -1).join('.');
        const url = URL.createObjectURL(file);
        traits[traitIndex].variations.push({ name: variationName, url });

        const container = document.createElement('div');
        container.className = 'variation-container';
        container.dataset.traitIndex = traitIndex;
        container.dataset.variationName = variationName;

        const imageWrapper = document.createElement('div');
        imageWrapper.className = 'variation-image-wrapper';

        const img = document.createElement('img');
        img.src = url;
        img.alt = variationName;
        img.className = 'variation';

        const filename = document.createElement('div');
        filename.className = 'variation-filename';
        filename.textContent = file.name;

        imageWrapper.appendChild(img);
        container.appendChild(imageWrapper);
        container.appendChild(filename);
        container.addEventListener('click', () => {
          console.log(`Clicked variant: Trait ${traitIndex + 1}, Variation ${variationName}`);
          const allWrappers = grid.querySelectorAll('.variation-image-wrapper');
          allWrappers.forEach(w => w.classList.remove('selected'));
          imageWrapper.classList.add('selected');
          selectVariation(traitIndex, variationName);
        });

        grid.appendChild(container);

        const key = `${traitIndex}-${variationName}`;
        if (!variantHistories[key]) {
          variantHistories[key] = [{ left: 0, top: 0 }];
          localStorage.setItem(`trait${traitIndex + 1}-${variationName}-position`, JSON.stringify({ left: 0, top: 0 }));
          localStorage.removeItem(`trait${traitIndex + 1}-${variationName}-manuallyMoved`);
        }
      }

      if (traits[traitIndex].variations.length > 0) {
        selectVariation(traitIndex, traits[traitIndex].variations[0].name);
        const firstWrapper = grid.querySelector('.variation-image-wrapper');
        if (firstWrapper) firstWrapper.classList.add('selected');
        autoPositioned[traitIndex] = false;
        fileInputLabel.textContent = 'Choose New Files';
        variantCountSpan.textContent = `[${traits[traitIndex].variations.length} variants chosen]`;
      }

      updateMintButton();
      updatePreviewSamples();
    });
  }

  const upArrowBtn = document.querySelector(`.up-arrow[data-trait="${traitIndex + 1}"]`);
  const downArrowBtn = document.querySelector(`.down-arrow[data-trait="${traitIndex + 1}"]`);
  const addTraitBtn = document.querySelector(`.add-trait[data-trait="${traitIndex + 1}"]`);
  const removeTraitBtn = document.querySelector(`.remove-trait[data-trait="${traitIndex + 1}"]`);

  upArrowBtn.addEventListener('click', () => {
    if (traitIndex === 0) {
      const lastIndex = traits.length - 1;
      if (lastIndex === 0) return;
      const currentTrait = traits[traitIndex];
      const lastTrait = traits[lastIndex];
      const tempZIndex = currentTrait.zIndex;
      currentTrait.zIndex = lastTrait.zIndex;
      lastTrait.zIndex = tempZIndex;
      traits[traitIndex] = lastTrait;
      traits[lastIndex] = currentTrait;

      const currentSection = document.getElementById(`trait${traitIndex + 1}`);
      const lastSection = document.getElementById(`trait${lastIndex + 1}`);
      traitContainer.insertBefore(lastSection, currentSection);

      const tempImage = traitImages[traitIndex];
      traitImages[traitIndex] = traitImages[lastIndex];
      traitImages[lastIndex] = tempImage;

      const newVariantHistories = {};
      Object.keys(variantHistories).forEach(key => {
        const [oldIndex, variationName] = key.split('-');
        const oldIndexNum = parseInt(oldIndex);
        if (oldIndexNum === traitIndex) newVariantHistories[`${lastIndex}-${variationName}`] = variantHistories[key];
        else if (oldIndexNum === lastIndex) newVariantHistories[`${traitIndex}-${variationName}`] = variantHistories[key];
        else newVariantHistories[key] = variantHistories[key];
      });
      variantHistories = newVariantHistories;

      for (let i = 0; i < traits.length; i++) {
        const oldKeys = Object.keys(localStorage).filter(key => key.startsWith(`trait${i + 1}-`));
        oldKeys.forEach(oldKey => {
          const value = localStorage.getItem(oldKey);
          const newKey = oldKey.replace(`trait${i + 1}-`, `trait${i + 1}-temp-`);
          localStorage.setItem(newKey, value);
          localStorage.removeItem(oldKey);
        });
      }
      for (let i = 0; i < traits.length; i++) {
        const tempKeys = Object.keys(localStorage).filter(key => key.startsWith(`trait${i + 1}-temp-`));
        tempKeys.forEach(tempKey => {
          const value = localStorage.getItem(tempKey);
          const newKey = tempKey.replace(`trait${i + 1}-temp-`, `trait${i + 1}-`);
          localStorage.setItem(newKey, value);
          localStorage.removeItem(tempKey);
        });
      }
      const tempKeys = Object.keys(localStorage).filter(key => key.startsWith('trait') && key.includes('-temp-'));
      tempKeys.forEach(key => localStorage.removeItem(key));

      const tempAutoPositioned = autoPositioned[traitIndex];
      autoPositioned[traitIndex] = autoPositioned[lastIndex];
      autoPositioned[lastIndex] = tempAutoPositioned;

      renumberTraits();
      refreshTraitGrid(traitIndex);
      refreshTraitGrid(lastIndex);
    } else {
      const currentTrait = traits[traitIndex];
      const prevTrait = traits[traitIndex - 1];
      const tempZIndex = currentTrait.zIndex;
      currentTrait.zIndex = prevTrait.zIndex;
      prevTrait.zIndex = tempZIndex;
      traits[traitIndex] = prevTrait;
      traits[traitIndex - 1] = currentTrait;

      const currentSection = document.getElementById(`trait${traitIndex + 1}`);
      const prevSection = document.getElementById(`trait${traitIndex}`);
      traitContainer.insertBefore(currentSection, prevSection);

      const tempImage = traitImages[traitIndex];
      traitImages[traitIndex] = traitImages[traitIndex - 1];
      traitImages[traitIndex - 1] = tempImage;

      const newVariantHistories = {};
      Object.keys(variantHistories).forEach(key => {
        const [oldIndex, variationName] = key.split('-');
        const oldIndexNum = parseInt(oldIndex);
        if (oldIndexNum === traitIndex) newVariantHistories[`${traitIndex - 1}-${variationName}`] = variantHistories[key];
        else if (oldIndexNum === traitIndex - 1) newVariantHistories[`${traitIndex}-${variationName}`] = variantHistories[key];
        else newVariantHistories[key] = variantHistories[key];
      });
      variantHistories = newVariantHistories;

      for (let i = 0; i < traits.length; i++) {
        const oldKeys = Object.keys(localStorage).filter(key => key.startsWith(`trait${i + 1}-`));
        oldKeys.forEach(oldKey => {
          const value = localStorage.getItem(oldKey);
          const newKey = oldKey.replace(`trait${i + 1}-`, `trait${i + 1}-temp-`);
          localStorage.setItem(newKey, value);
          localStorage.removeItem(oldKey);
        });
      }
      for (let i = 0; i < traits.length; i++) {
        const tempKeys = Object.keys(localStorage).filter(key => key.startsWith(`trait${i + 1}-temp-`));
        tempKeys.forEach(tempKey => {
          const value = localStorage.getItem(tempKey);
          const newKey = tempKey.replace(`trait${i + 1}-temp-`, `trait${i + 1}-`);
          localStorage.setItem(newKey, value);
          localStorage.removeItem(tempKey);
        });
      }
      const tempKeys = Object.keys(localStorage).filter(key => key.startsWith('trait') && key.includes('-temp-'));
      tempKeys.forEach(key => localStorage.removeItem(key));

      const tempAutoPositioned = autoPositioned[traitIndex];
      autoPositioned[traitIndex] = autoPositioned[traitIndex - 1];
      autoPositioned[traitIndex - 1] = tempAutoPositioned;

      renumberTraits();
      refreshTraitGrid(traitIndex - 1);
      refreshTraitGrid(traitIndex);
    }
    updateZIndices();
    updatePreviewSamples();
  });

  downArrowBtn.addEventListener('click', () => {
    if (traitIndex === traits.length - 1) {
      const firstIndex = 0;
      if (traits.length === 1) return;
      const currentTrait = traits[traitIndex];
      const firstTrait = traits[firstIndex];
      const tempZIndex = currentTrait.zIndex;
      currentTrait.zIndex = firstTrait.zIndex;
      firstTrait.zIndex = tempZIndex;
      traits[traitIndex] = firstTrait;
      traits[firstIndex] = currentTrait;

      const currentSection = document.getElementById(`trait${traitIndex + 1}`);
      const firstSection = document.getElementById(`trait${firstIndex + 1}`);
      traitContainer.insertBefore(currentSection, firstSection);

      const tempImage = traitImages[traitIndex];
      traitImages[traitIndex] = traitImages[firstIndex];
      traitImages[firstIndex] = tempImage;

      const newVariantHistories = {};
      Object.keys(variantHistories).forEach(key => {
        const [oldIndex, variationName] = key.split('-');
        const oldIndexNum = parseInt(oldIndex);
        if (oldIndexNum === traitIndex) newVariantHistories[`${firstIndex}-${variationName}`] = variantHistories[key];
        else if (oldIndexNum === firstIndex) newVariantHistories[`${traitIndex}-${variationName}`] = variantHistories[key];
        else newVariantHistories[key] = variantHistories[key];
      });
      variantHistories = newVariantHistories;

      for (let i = 0; i < traits.length; i++) {
        const oldKeys = Object.keys(localStorage).filter(key => key.startsWith(`trait${i + 1}-`));
        oldKeys.forEach(oldKey => {
          const value = localStorage.getItem(oldKey);
          const newKey = oldKey.replace(`trait${i + 1}-`, `trait${i + 1}-temp-`);
          localStorage.setItem(newKey, value);
          localStorage.removeItem(oldKey);
        });
      }
      for (let i = 0; i < traits.length; i++) {
        const tempKeys = Object.keys(localStorage).filter(key => key.startsWith(`trait${i + 1}-temp-`));
        tempKeys.forEach(tempKey => {
          const value = localStorage.getItem(tempKey);
          const newKey = tempKey.replace(`trait${i + 1}-temp-`, `trait${i + 1}-`);
          localStorage.setItem(newKey, value);
          localStorage.removeItem(tempKey);
        });
      }
      const tempKeys = Object.keys(localStorage).filter(key => key.startsWith('trait') && key.includes('-temp-'));
      tempKeys.forEach(key => localStorage.removeItem(key));

      const tempAutoPositioned = autoPositioned[traitIndex];
      autoPositioned[traitIndex] = autoPositioned[firstIndex];
      autoPositioned[firstIndex] = tempAutoPositioned;

      renumberTraits();
      refreshTraitGrid(firstIndex);
      refreshTraitGrid(traitIndex);
    } else {
      const currentTrait = traits[traitIndex];
      const nextTrait = traits[traitIndex + 1];
      const tempZIndex = currentTrait.zIndex;
      currentTrait.zIndex = nextTrait.zIndex;
      nextTrait.zIndex = tempZIndex;
      traits[traitIndex] = nextTrait;
      traits[traitIndex + 1] = currentTrait;

      const currentSection = document.getElementById(`trait${traitIndex + 1}`);
      const nextSection = document.getElementById(`trait${traitIndex + 2}`);
      traitContainer.insertBefore(nextSection, currentSection);

      const tempImage = traitImages[traitIndex];
      traitImages[traitIndex] = traitImages[traitIndex + 1];
      traitImages[traitIndex + 1] = tempImage;

      const newVariantHistories = {};
      Object.keys(variantHistories).forEach(key => {
        const [oldIndex, variationName] = key.split('-');
        const oldIndexNum = parseInt(oldIndex);
        if (oldIndexNum === traitIndex) newVariantHistories[`${traitIndex + 1}-${variationName}`] = variantHistories[key];
        else if (oldIndexNum === traitIndex + 1) newVariantHistories[`${traitIndex}-${variationName}`] = variantHistories[key];
        else newVariantHistories[key] = variantHistories[key];
      });
      variantHistories = newVariantHistories;

      for (let i = 0; i < traits.length; i++) {
        const oldKeys = Object.keys(localStorage).filter(key => key.startsWith(`trait${i + 1}-`));
        oldKeys.forEach(oldKey => {
          const value = localStorage.getItem(oldKey);
          const newKey = oldKey.replace(`trait${i + 1}-`, `trait${i + 1}-temp-`);
          localStorage.setItem(newKey, value);
          localStorage.removeItem(oldKey);
        });
      }
      for (let i = 0; i < traits.length; i++) {
        const tempKeys = Object.keys(localStorage).filter(key => key.startsWith(`trait${i + 1}-temp-`));
        tempKeys.forEach(tempKey => {
          const value = localStorage.getItem(tempKey);
          const newKey = tempKey.replace(`trait${i + 1}-temp-`, `trait${i + 1}-`);
          localStorage.setItem(newKey, value);
          localStorage.removeItem(tempKey);
        });
      }
      const tempKeys = Object.keys(localStorage).filter(key => key.startsWith('trait') && key.includes('-temp-'));
      tempKeys.forEach(key => localStorage.removeItem(key));

      const tempAutoPositioned = autoPositioned[traitIndex];
      autoPositioned[traitIndex] = autoPositioned[traitIndex + 1];
      autoPositioned[traitIndex + 1] = tempAutoPositioned;

      renumberTraits();
      refreshTraitGrid(traitIndex);
      refreshTraitGrid(traitIndex + 1);
    }
    updateZIndices();
    updatePreviewSamples();
  });

  addTraitBtn.addEventListener('click', () => {
    if (traits.length < 20) {
      // Insert new trait at the current index, shifting others down
      traits.splice(traitIndex, 0, { name: '', variations: [], selected: 0, zIndex: 0 });
      traitImages.splice(traitIndex, 0, null);
      autoPositioned.splice(traitIndex, 0, false);

      // Shift variantHistories and localStorage keys
      const newVariantHistories = {};
      Object.keys(variantHistories).forEach(key => {
        const [oldIndex, variationName] = key.split('-');
        const oldIndexNum = parseInt(oldIndex);
        if (oldIndexNum >= traitIndex) {
          newVariantHistories[`${oldIndexNum + 1}-${variationName}`] = variantHistories[key];
        } else {
          newVariantHistories[key] = variantHistories[key];
        }
      });
      variantHistories = newVariantHistories;

      for (let i = traits.length - 1; i >= traitIndex; i--) {
        const oldKeys = Object.keys(localStorage).filter(key => key.startsWith(`trait${i}-`));
        oldKeys.forEach(oldKey => {
          const value = localStorage.getItem(oldKey);
          const newKey = oldKey.replace(`trait${i}-`, `trait${i + 1}-`);
          localStorage.setItem(newKey, value);
          localStorage.removeItem(oldKey);
        });
      }

      // Add the new trait at the correct position
      addTrait(traitIndex);
      renumberTraits();
      updateZIndices();
      updatePreviewSamples();
    }
  });

  removeTraitBtn.addEventListener('click', () => removeTrait(traitIndex));
}

function refreshTraitGrid(traitIndex) {
  const grid = document.getElementById(`trait${traitIndex + 1}-grid`);
  if (!grid) return;

  grid.innerHTML = '';
  const trait = traits[traitIndex];
  for (const variant of trait.variations) {
    const container = document.createElement('div');
    container.className = 'variation-container';
    container.dataset.traitIndex = traitIndex;
    container.dataset.variationName = variant.name;

    const imageWrapper = document.createElement('div');
    imageWrapper.className = 'variation-image-wrapper';

    const img = document.createElement('img');
    img.src = variant.url;
    img.alt = variant.name;
    img.className = 'variation';

    const filename = document.createElement('div');
    filename.className = 'variation-filename';
    filename.textContent = variant.name;

    imageWrapper.appendChild(img);
    container.appendChild(imageWrapper);
    container.appendChild(filename);
    container.addEventListener('click', () => {
      console.log(`Clicked variant: Trait ${traitIndex + 1}, Variation ${variant.name}`);
      const allWrappers = grid.querySelectorAll('.variation-image-wrapper');
      allWrappers.forEach(w => w.classList.remove('selected'));
      imageWrapper.classList.add('selected');
      selectVariation(traitIndex, variant.name);
    });

    grid.appendChild(container);
  }

  const selectedIndex = trait.selected;
  const selectedWrapper = grid.children[selectedIndex]?.querySelector('.variation-image-wrapper');
  if (selectedWrapper) selectedWrapper.classList.add('selected');

  const previewImage = document.getElementById(`preview-trait${traitIndex + 1}`);
  if (previewImage && previewImage.src && trait.variations[trait.selected]) {
    const key = `${traitIndex}-${trait.variations[trait.selected].name}`;
    const savedPosition = localStorage.getItem(`trait${traitIndex + 1}-${trait.variations[trait.selected].name}-position`);
    if (savedPosition) {
      const { left, top } = JSON.parse(savedPosition);
      previewImage.style.left = `${left}px`;
      previewImage.style.top = `${top}px`;
    }
  }
}

function renumberTraits() {
  const sections = traitContainer.querySelectorAll('.trait-section');
  sections.forEach((section, index) => {
    section.id = `trait${index + 1}`;
    section.querySelector('h2').textContent = `Trait ${index + 1}${traits[index].name ? ` - ${traits[index].name}` : ''}`;
    section.querySelector('input[type="text"]').id = `trait${index + 1}-name`;
    section.querySelector('input[type="file"]').id = `trait${index + 1}-files`;
    section.querySelector('.file-input-label').htmlFor = `trait${index + 1}-files`;
    section.querySelector('.trait-grid').id = `trait${index + 1}-grid`;
    section.querySelector('.up-arrow').setAttribute('data-trait', `${index + 1}`);
    section.querySelector('.down-arrow').setAttribute('data-trait', `${index + 1}`);
    section.querySelector('.add-trait').setAttribute('data-trait', `${index + 1}`);
    section.querySelector('.remove-trait').setAttribute('data-trait', `${index + 1}`);

    // Update tooltips for up and down arrows after renumbering
    const upArrow = section.querySelector('.up-arrow');
    const downArrow = section.querySelector('.down-arrow');
    if (upArrow) {
      if (index === 0) {
        upArrow.setAttribute('data-tooltip', 'Swap this Trait with the Last One');
      } else {
        upArrow.setAttribute('data-tooltip', 'Swap this Trait with the one above');
      }
    }
    if (downArrow) {
      if (index === traits.length - 1) {
        downArrow.setAttribute('data-tooltip', 'Swap this Trait with Trait #1');
      } else {
        downArrow.setAttribute('data-tooltip', 'Swap this Trait with the one below');
      }
    }
  });
}

function updateMintButton() {
  const allTraitsSet = traits.every(trait => trait.name && trait.variations.length > 0);
  const mintBtn = document.getElementById('mintButton');
  if (mintBtn) mintBtn.disabled = !allTraitsSet;
}



/* Section 3 - PREVIEW AND POSITION MANAGEMENT */


function updateZIndices() {
  traitImages.forEach((img, index) => {
    if (img) {
      const baseZIndex = (traits.length - index) * 100; // Scale z-indices (e.g., 300, 200, 100)
      if (img.classList.contains('dragging')) {
        img.style.zIndex = baseZIndex + 10; // Dragging: just above its own trait (e.g., 110 for Trait 2)
      } else if (img === currentImage) {
        img.style.zIndex = baseZIndex + 5; // Selected: slightly above its own trait (e.g., 105 for Trait 2)
      } else {
        img.style.zIndex = baseZIndex; // Normal: base z-index (e.g., 100 for Trait 2)
      }
    }
  });
}

function selectVariation(traitIndex, variationName) {
  const trait = traits[traitIndex];
  const variationIndex = trait.variations.findIndex(v => v.name === variationName);
  if (variationIndex === -1) {
    console.error(`Variation ${variationName} not found in Trait ${traitIndex + 1}`);
    return;
  }
  trait.selected = variationIndex;

  const previewImage = document.getElementById(`preview-trait${traitIndex + 1}`);
  if (previewImage) {
    previewImage.src = trait.variations[variationIndex].url;
    previewImage.style.display = 'block';
    const key = `${traitIndex}-${variationName}`;
    const savedPosition = localStorage.getItem(`trait${traitIndex + 1}-${variationName}-position`);
    if (savedPosition) {
      const { left, top } = JSON.parse(savedPosition);
      previewImage.style.left = `${left}px`;
      previewImage.style.top = `${top}px`;
      if (!variantHistories[key]) variantHistories[key] = [{ left, top }];
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
    updateZIndices();
    updateCoordinates(previewImage);
  }
}

function setupDragAndDrop(img, traitIndex) {
  if (img) {
    img.addEventListener('dragstart', (e) => {
      e.preventDefault();
      console.log(`Dragstart prevented for Trait ${traitIndex + 1}`);
    });

    img.addEventListener('click', () => {
      if (img.src !== '') {
        currentImage = img;
        updateCoordinates(img);
        console.log(`Set currentImage to Trait ${traitIndex + 1}`);
      }
    });

    img.addEventListener('mousedown', (e) => {
      if (img.src === '' || img !== currentImage) {
        console.log(`Cannot drag: Image src is empty or not currentImage for Trait ${traitIndex + 1}`);
        return;
      }
      e.preventDefault(); // Prevent any default behavior
      isDragging = true;
      const rect = img.getBoundingClientRect();
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;
      img.style.cursor = 'grabbing';
      img.classList.add('dragging');
      updateZIndices();
      updateCoordinates(img);
      console.log(`Started dragging Trait ${traitIndex + 1}`);
    });

    img.addEventListener('mouseup', () => {
      if (isDragging && currentImage === img) {
        const traitIndex = traitImages.indexOf(currentImage);
        const variationName = traits[traitIndex].variations[traits[traitIndex].selected].name;
        savePosition(currentImage, traitIndex, variationName);
        isDragging = false;
        currentImage.style.cursor = 'grab';
        currentImage.classList.remove('dragging');
        updateZIndices();
        console.log(`Stopped dragging Trait ${traitIndex + 1}`);
      }
    });
  }
}

function updateCoordinates(img) {
  if (img && coordinates) {
    const left = parseFloat(img.style.left) || 0;
    const top = parseFloat(img.style.top) || 0;
    coordinates.innerHTML = `<strong>Coordinates:</strong> (${Math.round(left) + 1}, ${Math.round(top) + 1})`;
  }
}

function savePosition(img, traitIndex, variationName) {
  const position = { left: parseFloat(img.style.left) || 0, top: parseFloat(img.style.top) || 0 };
  const key = `${traitIndex}-${variationName}`;
  if (!variantHistories[key]) variantHistories[key] = [];
  variantHistories[key].push(position);
  localStorage.setItem(`trait${traitIndex + 1}-${variationName}-position`, JSON.stringify(position));
  localStorage.setItem(`trait${traitIndex + 1}-${variationName}-manuallyMoved`, 'true');

  const trait = traits[traitIndex];
  const currentVariationIndex = trait.variations.findIndex(v => v.name === variationName);
  if (currentVariationIndex === 0 && !autoPositioned[traitIndex]) {
    for (let i = 1; i < trait.variations.length; i++) {
      const otherVariationName = trait.variations[i].name;
      const otherKey = `${traitIndex}-${otherVariationName}`;
      variantHistories[otherKey] = [{ left: position.left, top: position.top }];
      localStorage.setItem(`trait${traitIndex + 1}-${otherVariationName}-position`, JSON.stringify(position));
      localStorage.removeItem(`trait${traitIndex + 1}-${otherVariationName}-manuallyMoved`);
      if (trait.selected === i) {
        const previewImage = document.getElementById(`preview-trait${traitIndex + 1}`);
        if (previewImage && previewImage.src) {
          previewImage.style.left = `${position.left}px`;
          previewImage.style.top = `${position.top}px`;
        }
      }
    }
    autoPositioned[traitIndex] = true;
  }

  updateSamplePositions(traitIndex, variationName, position);
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

function updateSamplePositions(traitIndex, variationName, position) {
  for (let i = 0; i < 20; i++) {
    const sample = sampleData[i];
    for (let j = 0; j < sample.length; j++) {
      if (sample[j].traitIndex === traitIndex && sample[j].variationName === variationName) {
        sample[j].position = position;
      }
    }
  }
  updatePreviewSamples();
}

function updatePreviewSamples() {
  previewSamplesGrid.innerHTML = '';
  sampleData = Array(20).fill(null).map(() => []);

  for (let i = 0; i < 20; i++) {
    const sampleContainer = document.createElement('div');
    sampleContainer.className = 'sample-container';

    for (let j = 0; j < traits.length; j++) {
      const trait = traits[j];
      if (trait.variations.length === 0) continue;

      const randomIndex = Math.floor(Math.random() * trait.variations.length);
      const variant = trait.variations[randomIndex];

      const img = document.createElement('img');
      img.src = variant.url;
      img.alt = `Sample ${i + 1} - Trait ${j + 1}`;
      img.style.zIndex = (traits.length - j) * 100;

      const key = `${j}-${variant.name}`;
      const savedPosition = localStorage.getItem(`trait${j + 1}-${variant.name}-position`);
      let position;
      if (savedPosition) {
        position = JSON.parse(savedPosition);
        const scale = 140 / 600;
        img.style.left = `${position.left * scale}px`;
        img.style.top = `${position.top * scale}px`;
        if (!variantHistories[key]) variantHistories[key] = [{ left: position.left, top: position.top }];
      } else {
        let lastPosition = null;
        for (let k = 0; k < trait.variations.length; k++) {
          if (k === randomIndex) continue;
          const otherVariationName = trait.variations[k].name;
          const otherKey = `${j}-${otherVariationName}`;
          if (variantHistories[otherKey] && variantHistories[otherKey].length > 0) {
            lastPosition = variantHistories[otherKey][variantHistories[otherKey].length - 1];
          }
        }
        const scale = 140 / 600;
        if (lastPosition) {
          position = lastPosition;
          img.style.left = `${lastPosition.left * scale}px`;
          img.style.top = `${lastPosition.top * scale}px`;
          variantHistories[key] = [{ left: lastPosition.left, top: lastPosition.top }];
          localStorage.setItem(`trait${j + 1}-${variant.name}-position`, JSON.stringify(lastPosition));
        } else {
          position = { left: 0, top: 0 };
          img.style.left = '0px';
          img.style.top = '0px';
          variantHistories[key] = [{ left: 0, top: 0 }];
          localStorage.setItem(`trait${j + 1}-${variant.name}-position`, JSON.stringify({ left: 0, top: 0 }));
        }
      }

      sampleData[i].push({ traitIndex: j, variationName: variant.name, position });
      sampleContainer.appendChild(img);
    }
    previewSamplesGrid.appendChild(sampleContainer);
  }
}



/* Section 4 - BACKGROUND GENERATION */


async function fetchBackground() {
  const userPrompt = document.getElementById('user-prompt').value;
  const basePrompt = document.getElementById('base-prompt').value;
  const fullPrompt = userPrompt ? `${basePrompt}, ${userPrompt}` : basePrompt;
  const backgroundImage = document.getElementById('background-image');
  const backgroundMetadata = document.getElementById('background-metadata');
  backgroundMetadata.textContent = 'Generating...';

  try {
    const response = await fetch('https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.huggingFaceApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: fullPrompt,
        parameters: {
          num_inference_steps: 50,
          guidance_scale: 7.5
        }
      })
    });

    if (!response.ok) throw new Error('Failed to generate background');

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    backgroundImage.src = url;
    background.url = url;
    background.metadata = fullPrompt;
    backgroundMetadata.textContent = fullPrompt;
  } catch (error) {
    console.error('Error generating background:', error);
    backgroundMetadata.textContent = 'Error generating background';
  }
}



/* Section 5 - MINTING FUNCTION */


async function mintNFT() {
  const allTraitsSet = traits.every(trait => trait.name && trait.variations.length > 0);
  if (!allTraitsSet) {
    alert('Please set all trait names and upload at least one variant for each trait.');
    return;
  }

  const mintFeeDisplay = document.getElementById('mintFeeDisplay');
  const mintButton = document.getElementById('mintButton');
  mintButton.disabled = true;
  mintFeeDisplay.textContent = 'Minting...';

  try {
    const mintFee = await contract.mintFee();
    const overrides = { value: mintFee };
    const traitNames = traits.map(trait => trait.name);
    const traitUrls = traits.map(trait => trait.variations[trait.selected].url);
    const positions = traits.map((_, index) => {
      const variationName = traits[index].variations[traits[index].selected].name;
      const position = JSON.parse(localStorage.getItem(`trait${index + 1}-${variationName}-position`)) || { left: 0, top: 0 };
      return [position.left, position.top];
    });
    const backgroundUrl = background.url || '';
    const backgroundMetadata = background.metadata || '';

    const tx = await contractWithSigner.mintNFT(traitNames, traitUrls, positions, backgroundUrl, backgroundMetadata, overrides);
    await tx.wait();
    mintFeeDisplay.textContent = `Minted! Tx: ${tx.hash}`;
  } catch (error) {
    console.error('Error minting NFT:', error);
    mintFeeDisplay.textContent = 'Error minting NFT';
    mintButton.disabled = false;
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const mintFee = await contract.mintFee();
    const mintFeeDisplay = document.getElementById('mintFeeDisplay');
    mintFeeDisplay.textContent = `Mint Fee: ${ethers.utils.formatEther(mintFee)} ETH`;
    document.getElementById('mintButton').addEventListener('click', mintNFT);
  } catch (error) {
    console.error('Error fetching mint fee:', error);
    const mintFeeDisplay = document.getElementById('mintFeeDisplay');
    mintFeeDisplay.textContent = 'Error fetching mint fee. Please ensure the contract is deployed on the correct network (Sepolia) and your wallet is connected.';
    // Still attach the mint button listener to allow minting attempts
    document.getElementById('mintButton').addEventListener('click', mintNFT);
  }
});
