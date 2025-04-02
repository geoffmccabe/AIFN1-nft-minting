/* Section 1 ----------------------------------------- TRAIT MANAGER FRAMEWORK ------------------------------------------------*/

// Utility to generate unique IDs (simple incrementing counter starting at 1)
let idCounter = 1;
function generateId() {
  return `id-${idCounter++}`;
}

// TraitManager class to manage traits and variants
const TraitManager = {
  traits: [],

  // Initialize with 3 empty traits
  initialize() {
    this.traits = [];
    for (let i = 0; i < 3; i++) {
      this.addTrait(i + 1);
    }
  },

  // Add a new trait at the specified position
  addTrait(position) {
    const newTrait = {
      id: generateId(),
      position: position,
      name: '',
      variants: [],
      selected: 0,
      zIndex: this.traits.length + 1 - position, // Higher position = lower zIndex
      createdAt: Date.now()
    };

    // Shift existing traits with position >= new position
    this.traits.forEach(trait => {
      if (trait.position >= position) {
        trait.position++;
        trait.zIndex = this.traits.length + 1 - trait.position;
      }
    });

    // Add the new trait
    this.traits.push(newTrait);
    this.traits.sort((a, b) => a.position - b.position);
    return newTrait;
  },

  // Remove a trait by ID
  removeTrait(traitId) {
    const traitIndex = this.traits.findIndex(trait => trait.id === traitId);
    if (traitIndex === -1) return;

    const removedTrait = this.traits[traitIndex];
    const removedPosition = removedTrait.position;

    // Remove the trait
    this.traits.splice(traitIndex, 1);

    // Shift positions of remaining traits
    this.traits.forEach(trait => {
      if (trait.position > removedPosition) {
        trait.position--;
        trait.zIndex = this.traits.length + 1 - trait.position;
      }
    });
  },

  // Move a trait to a new position
  moveTrait(traitId, newPosition) {
    const trait = this.traits.find(t => t.id === traitId);
    if (!trait) return;

    const oldPosition = trait.position;

    // Adjust positions of other traits
    if (newPosition < oldPosition) {
      this.traits.forEach(t => {
        if (t.position >= newPosition && t.position < oldPosition) {
          t.position++;
        }
      });
    } else if (newPosition > oldPosition) {
      this.traits.forEach(t => {
        if (t.position > oldPosition && t.position <= newPosition) {
          t.position--;
        }
      });
    }

    // Update the trait's position
    trait.position = newPosition;

    // Sort traits by position and update zIndex
    this.traits.sort((a, b) => a.position - b.position);
    this.traits.forEach((t, idx) => {
      t.zIndex = this.traits.length - idx;
    });
  },

  // Add a variant to a trait
  addVariant(traitId, variantData) {
    const trait = this.traits.find(t => t.id === traitId);
    if (!trait) return;

    const newVariant = {
      id: generateId(),
      name: variantData.name,
      url: variantData.url,
      chance: variantData.chance || 0.5, // Default chance if not provided
      createdAt: Date.now()
    };

    trait.variants.push(newVariant);
    return newVariant;
  },

  // Remove a variant from a trait
  removeVariant(traitId, variantId) {
    const trait = this.traits.find(t => t.id === traitId);
    if (!trait) return;

    const variantIndex = trait.variants.findIndex(v => v.id === variantId);
    if (variantIndex === -1) return;

    trait.variants.splice(variantIndex, 1);

    // Adjust selected index if necessary
    if (trait.selected >= trait.variants.length) {
      trait.selected = Math.max(0, trait.variants.length - 1);
    }
  },

  // Update the chance of a variant
  updateVariantChance(traitId, variantId, chance) {
    const trait = this.traits.find(t => t.id === traitId);
    if (!trait) return;

    const variant = trait.variants.find(v => v.id === variantId);
    if (!variant) return;

    variant.chance = chance;
  },

  // Get a trait by ID
  getTrait(traitId) {
    return this.traits.find(t => t.id === traitId);
  },

  // Get all traits
  getAllTraits() {
    return [...this.traits];
  }
};

/* Section 2 ----------------------------------------- GLOBAL SETUP AND INITIALIZATION ------------------------------------------------*/

// Declare variables globally
let provider, contract, signer, contractWithSigner;
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
let sampleData = Array(16).fill(null).map(() => []);
let preview, coordinates, directionEmojis, magnifyEmoji, enlargedPreview, generateButton, traitContainer, previewSamplesGrid, updatePreviewsButton;
let timerDisplay, widthInput, heightInput;
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
  timerDisplay = document.getElementById('timer-display');
  widthInput = document.getElementById('width-input');
  heightInput = document.getElementById('height-input');

  // Clear localStorage to start fresh with the new framework
  localStorage.clear();
  variantHistories = {};

  // Only clear preview if it’s not already populated
  if (preview && !preview.hasChildNodes()) {
    preview.innerHTML = '';
  }

  // Initialize TraitManager with 3 traits
  TraitManager.initialize();

  // Render initial traits and select their variants
  TraitManager.getAllTraits().forEach(trait => {
    addTrait(trait);
    refreshTraitGrid(trait.id);
    if (trait.variants.length > 0) {
      selectVariation(trait.id, trait.variants[0].id);
    }
  });
  updatePreviewSamples();

  // Event listeners for global controls
  updatePreviewsButton.addEventListener('click', () => updatePreviewSamples());
  generateButton.addEventListener('click', fetchBackground);
  document.getElementById('gen-4x').addEventListener('click', () => fetchMultipleBackgrounds(4));

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
        if (traitIndex !== -1) {
          const trait = TraitManager.getAllTraits()[traitIndex];
          const variationName = trait.variants[trait.selected].name;
          savePosition(currentImage, trait.id, variationName);
        }
        isDragging = false;
        currentImage.style.cursor = 'grab';
        currentImage.classList.remove('dragging');
        updateZIndices();
      }
    });

    preview.addEventListener('mouseleave', () => {
      if (isDragging && currentImage) {
        const traitIndex = traitImages.indexOf(currentImage);
        if (traitIndex !== -1) {
          const trait = TraitManager.getAllTraits()[traitIndex];
          const variationName = trait.variants[trait.selected].name;
          savePosition(currentImage, trait.id, variationName);
        }
        isDragging = false;
        currentImage.style.cursor = 'grab';
        currentImage.classList.remove('dragging');
        updateZIndices();
      }
    });
  }

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
          const trait = TraitManager.getAllTraits()[traitIndex];
          const variationName = trait.variants[trait.selected].name;
          savePosition(currentImage, trait.id, variationName);
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
          const trait = TraitManager.getAllTraits()[traitIndex];
          const variationName = trait.variants[trait.selected].name;
          savePosition(currentImage, trait.id, variationName);
          currentImage.classList.remove('dragging');
        }
      }
    });
  });
});



/*---------------------------------------------------- Section 3 - GLOBAL EVENT LISTENERS ----------------------------------------------------*/




document.addEventListener('DOMContentLoaded', () => {
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
      if (img && img.src && img.style.visibility !== 'hidden') { // Check for src and visibility
        const clonedImg = img.cloneNode(true);
        clonedImg.style.width = `${img.width * scale}px`;
        clonedImg.style.height = `${img.height * scale}px`;
        clonedImg.style.left = `${parseFloat(img.style.left) * scale}px`;
        clonedImg.style.top = `${parseFloat(img.style.top) * scale}px`;
        clonedImg.style.zIndex = img.style.zIndex;
        clonedImg.style.visibility = 'visible'; // Ensure cloned image is visible
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
      const trait = TraitManager.getAllTraits()[traitIndex];
      const variationName = trait.variants[trait.selected].name;
      const key = `${trait.id}-${variationName}`;
      if (variantHistories[key] && variantHistories[key].length > 1) {
        variantHistories[key].pop();
        const previousPosition = variantHistories[key][variantHistories[key].length - 1];
        currentImage.style.left = `${previousPosition.left}px`;
        currentImage.style.top = `${previousPosition.top}px`;
        localStorage.setItem(`trait${trait.id}-${variationName}-position`, JSON.stringify(previousPosition));
        updateCoordinates(currentImage);
        updateSamplePositions(trait.id, trait.variants[trait.selected].id, previousPosition);
        updateSubsequentTraits(trait.id, variationName, previousPosition);
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
        const trait = TraitManager.getAllTraits()[traitIndex];
        const variationName = trait.variants[trait.selected].name;
        savePosition(currentImage, trait.id, variationName);
        isDragging = false;
        currentImage.style.cursor = 'grab';
        currentImage.classList.remove('dragging');
        updateZIndices();
      }
    });

    preview.addEventListener('mouseleave', () => {
      if (isDragging && currentImage) {
        const traitIndex = traitImages.indexOf(currentImage);
        const trait = TraitManager.getAllTraits()[traitIndex];
        const variationName = trait.variants[trait.selected].name;
        savePosition(currentImage, trait.id, variationName);
        isDragging = false;
        currentImage.style.cursor = 'grab';
        currentImage.classList.remove('dragging');
        updateZIndices();
      }
    });
  }
});

/* Section 4 ----------------------------------------- TRAIT MANAGEMENT FUNCTIONS (PART 1) ------------------------------------------------*/

function addTrait(trait) {
  const traitSection = document.createElement('div');
  traitSection.id = `trait${trait.id}`;
  traitSection.className = 'trait-section';

  const traitHeader = document.createElement('div');
  traitHeader.className = 'trait-header';
  const title = document.createElement('h2');
  title.textContent = `TRAIT ${traitContainer.children.length + 1}`; // Use DOM position for TRAIT [x]
  if (trait.name) {
    title.textContent += ` - ${trait.name}`;
  }
  const controls = document.createElement('div');
  controls.className = 'trait-controls';
  const upArrow = document.createElement('span');
  upArrow.className = 'up-arrow';
  upArrow.setAttribute('data-trait', trait.id);
  upArrow.setAttribute('data-tooltip', 'Swap Trait Order');
  upArrow.textContent = '⬆️';
  const downArrow = document.createElement('span');
  downArrow.className = 'down-arrow';
  downArrow.setAttribute('data-trait', trait.id);
  downArrow.setAttribute('data-tooltip', 'Swap Trait Order');
  downArrow.textContent = '⬇️';
  const addTraitBtn = document.createElement('span');
  addTraitBtn.className = 'add-trait';
  addTraitBtn.setAttribute('data-trait', trait.id);
  addTraitBtn.textContent = '➕';
  const removeTraitBtn = document.createElement('span');
  removeTraitBtn.className = 'remove-trait';
  removeTraitBtn.setAttribute('data-trait', trait.id);
  removeTraitBtn.textContent = '➖';
  controls.appendChild(upArrow);
  controls.appendChild(downArrow);
  controls.appendChild(addTraitBtn);
  controls.appendChild(removeTraitBtn);
  traitHeader.appendChild(title);
  traitHeader.appendChild(controls);

  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.id = `trait${trait.id}-name`;
  nameInput.placeholder = `Trait Name (e.g., ${traitContainer.children.length + 1 === 1 ? 'Eyes' : traitContainer.children.length + 1 === 2 ? 'Hair' : 'Accessories'})`;
  nameInput.value = trait.name || ''; // Restore the trait name

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.id = `trait${trait.id}-files`;
  fileInput.accept = 'image/png,image/webp';
  fileInput.multiple = true;

  const fileInputLabel = document.createElement('label');
  fileInputLabel.className = 'file-input-label';
  fileInputLabel.htmlFor = `trait${trait.id}-files`;
  fileInputLabel.textContent = 'Choose Files';

  const grid = document.createElement('div');
  grid.id = `trait${trait.id}-grid`;
  grid.className = 'trait-grid';

  traitSection.appendChild(traitHeader);
  traitSection.appendChild(nameInput);
  traitSection.appendChild(fileInput);
  traitSection.appendChild(fileInputLabel);
  traitSection.appendChild(grid);

  // Insert the trait section at the correct position
  const existingSections = traitContainer.querySelectorAll('.trait-section');
  let inserted = false;
  for (let i = 0; i < existingSections.length; i++) {
    const existingSection = existingSections[i];
    const existingTraitId = existingSection.id.replace('trait', '');
    const existingTrait = TraitManager.getTrait(existingTraitId);
    if (existingTrait && existingTrait.position > trait.position) {
      traitContainer.insertBefore(traitSection, existingSection);
      inserted = true;
      break;
    }
  }
  if (!inserted) {
    traitContainer.appendChild(traitSection);
  }

  // Create or update the preview image
  let traitImage = traitImages.find(img => img.id === `preview-trait${trait.id}`);
  if (!traitImage) {
    traitImage = document.createElement('img');
    traitImage.id = `preview-trait${trait.id}`;
    traitImage.src = '';
    traitImage.alt = '';
    traitImage.style.zIndex = TraitManager.getAllTraits().length - trait.position + 1;
    traitImage.style.visibility = 'hidden';
    traitImages.push(traitImage);
  }

  // Rebuild preview DOM in correct order
  if (preview) {
    preview.innerHTML = '';
    const sortedTraits = TraitManager.getAllTraits().sort((a, b) => a.position - b.position);
    traitImages = sortedTraits.map(trait => {
      let img = traitImages.find(i => i.id === `preview-trait${trait.id}`);
      if (!img) {
        img = document.createElement('img');
        img.id = `preview-trait${trait.id}`;
        img.src = '';
        img.alt = '';
        img.style.visibility = 'hidden';
      }
      img.style.zIndex = TraitManager.getAllTraits().length - trait.position + 1;
      preview.appendChild(img);
      return img;
    });
    console.log(`Added trait image ${traitImage.id} to preview, position: ${trait.position}, zIndex: ${traitImage.style.zIndex}`);
  }

  setupTraitListeners(trait.id);
  requestAnimationFrame(() => {
    console.log(`Setting up drag-and-drop for trait ${trait.id}, image:`, traitImage);
    setupDragAndDrop(traitImage, TraitManager.getAllTraits().findIndex(t => t.id === trait.id));
  });
  updateZIndices();
  updatePreviewSamples();
}

function removeTrait(traitId) {
  if (TraitManager.getAllTraits().length <= 1) return;

  const confirmationDialog = document.createElement('div');
  confirmationDialog.className = 'confirmation-dialog';
  const message = document.createElement('p');
  message.textContent = `Are you sure you want to delete Trait ${TraitManager.getTrait(traitId).position}?`;
  const buttonsDiv = document.createElement('div');
  buttonsDiv.className = 'buttons';
  const yesButton = document.createElement('button');
  yesButton.className = 'yes-button';
  yesButton.textContent = 'Y';
  const noButton = document.createElement('button');
  noButton.className = 'no-button';
  noButton.textContent = 'N';

  yesButton.addEventListener('click', () => {
    // Remove the trait from TraitManager
    TraitManager.removeTrait(traitId);

    // Remove the DOM element
    const traitSection = document.getElementById(`trait${traitId}`);
    if (traitSection) traitSection.remove();

    // Remove the preview image from traitImages and DOM
    const traitImageIndex = traitImages.findIndex(img => img.id === `preview-trait${traitId}`);
    if (traitImageIndex !== -1) traitImages.splice(traitImageIndex, 1);

    // Clear localStorage for the deleted trait
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(`trait${traitId}-`)) {
        localStorage.removeItem(key);
      }
    });

    // Re-render all traits
    traitContainer.innerHTML = '';
    if (preview) preview.innerHTML = '';
    traitImages = [];
    TraitManager.getAllTraits().forEach(trait => {
      addTrait(trait);
      refreshTraitGrid(trait.id);
      if (trait.variants.length > 0) {
        selectVariation(trait.id, trait.variants[trait.selected].id);
      }
    });

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




/* Section 5 ----------------------------------------- TRAIT MANAGEMENT FUNCTIONS (PART 2) ------------------------------------------------*/




function setupTraitListeners(traitId) {
  const nameInput = document.getElementById(`trait${traitId}-name`);
  const fileInput = document.getElementById(`trait${traitId}-files`);
  const fileInputLabel = document.querySelector(`label[for="trait${traitId}-files"]`);
  const grid = document.getElementById(`trait${traitId}-grid`);

  if (fileInput && nameInput && grid && fileInputLabel) {
    nameInput.dataset.userEntered = 'false'; // Track if user has typed
    nameInput.addEventListener('input', () => {
      const trait = TraitManager.getTrait(traitId);
      const position = Array.from(traitContainer.children).indexOf(nameInput.parentElement) + 1;
      const placeholderPattern = `Trait Name (e.g., ${position === 1 ? 'Eyes' : position === 2 ? 'Hair' : 'Accessories'})`;
      if (nameInput.value.trim() && nameInput.value !== placeholderPattern) {
        nameInput.dataset.userEntered = 'true';
        trait.name = nameInput.value.trim();
      } else {
        nameInput.dataset.userEntered = 'false';
        trait.name = ''; // Reset to empty if it's just the placeholder
      }
      const title = nameInput.parentElement.querySelector('h2');
      title.textContent = `TRAIT ${position}${trait.name ? ` - ${trait.name}` : ''}`;
    });

    fileInput.addEventListener('change', async (event) => {
      const files = Array.from(event.target.files).sort((a, b) => a.name.localeCompare(b.name));
      if (!files.length) return;

      const trait = TraitManager.getTrait(traitId);
      const position = Array.from(traitContainer.children).indexOf(fileInput.parentElement) + 1;
      const placeholderPattern = `Trait Name (e.g., ${position === 1 ? 'Eyes' : position === 2 ? 'Hair' : 'Accessories'})`;
      trait.name = nameInput.dataset.userEntered === 'true' ? nameInput.value.trim() : '';
      if (!trait.name) nameInput.value = placeholderPattern; // Reset input to placeholder if no user-entered name

      TraitManager.getTrait(traitId).variants = [];

      grid.innerHTML = '';
      for (const file of files) {
        const variationName = file.name.split('.').slice(0, -1).join('.');
        const url = URL.createObjectURL(file);
        const variant = TraitManager.addVariant(traitId, { name: variationName, url });

        const container = document.createElement('div');
        container.className = 'variation-container';
        container.dataset.traitId = traitId;
        container.dataset.variationId = variant.id;

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
          console.log(`Clicked variant: Trait ${traitId}, Variation ${variationName}`);
          const allWrappers = grid.querySelectorAll('.variation-image-wrapper');
          allWrappers.forEach(w => w.classList.remove('selected'));
          imageWrapper.classList.add('selected');
          selectVariation(traitId, variant.id);
        });

        grid.appendChild(container);

        const key = `${traitId}-${variationName}`;
        if (!variantHistories[key]) {
          variantHistories[key] = [{ left: 0, top: 0 }];
          localStorage.setItem(`trait${traitId}-${variationName}-position`, JSON.stringify({ left: 0, top: 0 }));
          localStorage.removeItem(`trait${traitId}-${variationName}-manuallyMoved`);
        }
      }

      if (TraitManager.getTrait(traitId).variants.length > 0) {
        selectVariation(traitId, TraitManager.getTrait(traitId).variants[0].id);
        const firstWrapper = grid.querySelector('.variation-image-wrapper');
        if (firstWrapper) firstWrapper.classList.add('selected');
        autoPositioned[TraitManager.getAllTraits().findIndex(t => t.id === traitId)] = false;
        fileInputLabel.textContent = 'Choose New Files';
      }

      updateMintButton();
      updatePreviewSamples();
    });
  }

  const upArrow = document.querySelector(`.up-arrow[data-trait="${traitId}"]`);
  const downArrow = document.querySelector(`.down-arrow[data-trait="${traitId}"]`);
  const addTraitBtn = document.querySelector(`.add-trait[data-trait="${traitId}"]`);
  const removeTraitBtn = document.querySelector(`.remove-trait[data-trait="${traitId}"]`);

  upArrow.addEventListener('click', () => {
    const trait = TraitManager.getTrait(traitId);
    if (trait.position === 1) {
      const lastPosition = TraitManager.getAllTraits().length;
      TraitManager.moveTrait(traitId, lastPosition);
    } else {
      TraitManager.moveTrait(traitId, trait.position - 1);
    }

    // Re-render all traits and preview, preserving user-entered names
    traitContainer.innerHTML = '';
    if (preview) preview.innerHTML = '';
    traitImages = [];
    TraitManager.getAllTraits().forEach(trait => {
      addTrait(trait);
      const input = document.getElementById(`trait${trait.id}-name`);
      input.value = trait.name || input.placeholder; // Restore user-entered name or placeholder
      input.dataset.userEntered = trait.name ? 'true' : 'false';
      refreshTraitGrid(trait.id);
      if (trait.variants.length > 0) {
        selectVariation(trait.id, trait.variants[trait.selected].id);
      }
    });

    updateZIndices();
    updatePreviewSamples();
  });

  downArrow.addEventListener('click', () => {
    const trait = TraitManager.getTrait(traitId);
    const lastPosition = TraitManager.getAllTraits().length;
    if (trait.position === lastPosition) {
      TraitManager.moveTrait(traitId, 1);
    } else {
      TraitManager.moveTrait(traitId, trait.position + 1);
    }

    // Re-render all traits and preview, preserving user-entered names
    traitContainer.innerHTML = '';
    if (preview) preview.innerHTML = '';
    traitImages = [];
    TraitManager.getAllTraits().forEach(trait => {
      addTrait(trait);
      const input = document.getElementById(`trait${trait.id}-name`);
      input.value = trait.name || input.placeholder; // Restore user-entered name or placeholder
      input.dataset.userEntered = trait.name ? 'true' : 'false';
      refreshTraitGrid(trait.id);
      if (trait.variants.length > 0) {
        selectVariation(trait.id, trait.variants[trait.selected].id);
      }
    });

    updateZIndices();
    updatePreviewSamples();
  });

  addTraitBtn.addEventListener('click', () => {
    if (TraitManager.getAllTraits().length < 20) {
      const trait = TraitManager.getTrait(traitId);
      const newPosition = trait.position;
      TraitManager.addTrait(newPosition);

      // Re-render all traits
      traitContainer.innerHTML = '';
      if (preview) preview.innerHTML = '';
      traitImages = [];
      TraitManager.getAllTraits().forEach(trait => {
        addTrait(trait);
        const input = document.getElementById(`trait${trait.id}-name`);
        input.value = trait.name || input.placeholder; // Restore user-entered name or placeholder
        input.dataset.userEntered = trait.name ? 'true' : 'false';
        refreshTraitGrid(trait.id);
        if (trait.variants.length > 0) {
          selectVariation(trait.id, trait.variants[trait.selected].id);
        }
      });

      updateZIndices();
      updatePreviewSamples();
    }
  });

  removeTraitBtn.addEventListener('click', () => removeTrait(traitId));
}

function refreshTraitGrid(traitId) {
  const grid = document.getElementById(`trait${traitId}-grid`);
  if (!grid) return;

  grid.innerHTML = '';
  const trait = TraitManager.getTrait(traitId);
  for (const variant of trait.variants) {
    const container = document.createElement('div');
    container.className = 'variation-container';
    container.dataset.traitId = traitId;
    container.dataset.variationId = variant.id;

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
      console.log(`Clicked variant: Trait ${traitId}, Variation ${variant.name}`);
      const allWrappers = grid.querySelectorAll('.variation-image-wrapper');
      allWrappers.forEach(w => w.classList.remove('selected'));
      imageWrapper.classList.add('selected');
      selectVariation(traitId, variant.id);
    });

    grid.appendChild(container);
  }

  const selectedIndex = trait.selected;
  const selectedWrapper = grid.children[selectedIndex]?.querySelector('.variation-image-wrapper');
  if (selectedWrapper) selectedWrapper.classList.add('selected');

  const previewImage = traitImages.find(img => img.id === `preview-trait${traitId}`);
  if (previewImage && previewImage.src && trait.variants[trait.selected]) {
    const key = `${traitId}-${trait.variants[trait.selected].name}`;
    const savedPosition = localStorage.getItem(`trait${traitId}-${trait.variants[trait.selected].name}-position`);
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
    const traitId = section.id.replace('trait', '');
    const trait = TraitManager.getTrait(traitId);
    section.querySelector('h2').textContent = `TRAIT ${index + 1}${trait.name ? ` - ${trait.name}` : ''}`;
    section.querySelector('input[type="text"]').id = `trait${traitId}-name`;
    section.querySelector('input[type="file"]').id = `trait${traitId}-files`;
    section.querySelector('.file-input-label').htmlFor = `trait${traitId}-files`;
    section.querySelector('.trait-grid').id = `trait${traitId}-grid`;
    section.querySelector('.up-arrow').setAttribute('data-trait', traitId);
    section.querySelector('.down-arrow').setAttribute('data-trait', traitId);
    section.querySelector('.add-trait').setAttribute('data-trait', traitId);
    section.querySelector('.remove-trait').setAttribute('data-trait', traitId);
  });
}

function updateMintButton() {
  const allTraitsSet = TraitManager.getAllTraits().every(trait => trait.name && trait.variants.length > 0);
  const mintBtn = document.getElementById('mintButton');
  if (mintBtn) mintBtn.disabled = !allTraitsSet;
}




/* Section 6 ----------------------------------------- PREVIEW AND POSITION MANAGEMENT (PART 1) ------------------------------------------------*/




function updateZIndices() {
  const sortedTraits = TraitManager.getAllTraits().sort((a, b) => a.position - b.position);
  traitImages.forEach((img, index) => {
    if (img) {
      const trait = sortedTraits[index];
      img.style.zIndex = TraitManager.getAllTraits().length - trait.position + 1;
      console.log(`Setting zIndex for Trait ${trait.position} (ID: ${trait.id}): ${img.style.zIndex}`);
    }
  });
  // Force a reflow to ensure zIndex changes are applied
  if (preview) preview.offsetHeight;
}

function selectVariation(traitId, variationId) {
  const trait = TraitManager.getTrait(traitId);
  const variationIndex = trait.variants.findIndex(v => v.id === variationId);
  if (variationIndex === -1) {
    console.error(`Variation ${variationId} not found in Trait ${traitId}`);
    return;
  }
  trait.selected = variationIndex;

  const previewImage = traitImages.find(img => img.id === `preview-trait${traitId}`);
  if (previewImage) {
    previewImage.src = trait.variants[variationIndex].url;
    previewImage.style.visibility = 'visible';
    console.log(`Selected variation ${variationId} for trait ${traitId}, src: ${previewImage.src}, visibility: ${previewImage.style.visibility}`);
    const key = `${traitId}-${trait.variants[variationIndex].name}`;
    const savedPosition = localStorage.getItem(`trait${traitId}-${trait.variants[variationIndex].name}-position`);
    if (savedPosition) {
      const { left, top } = JSON.parse(savedPosition);
      previewImage.style.left = `${left}px`;
      previewImage.style.top = `${top}px`;
      if (!variantHistories[key]) variantHistories[key] = [{ left, top }];
    } else {
      let lastPosition = null;
      for (let i = 0; i < trait.variants.length; i++) {
        if (i === variationIndex) continue;
        const otherVariationName = trait.variants[i].name;
        const otherKey = `${traitId}-${otherVariationName}`;
        if (variantHistories[otherKey] && variantHistories[otherKey].length > 0) {
          lastPosition = variantHistories[otherKey][variantHistories[otherKey].length - 1];
        }
      }
      if (lastPosition) {
        previewImage.style.left = `${lastPosition.left}px`;
        previewImage.style.top = `${lastPosition.top}px`;
        variantHistories[key] = [{ left: lastPosition.left, top: lastPosition.top }];
        localStorage.setItem(`trait${traitId}-${trait.variants[variationIndex].name}-position`, JSON.stringify(lastPosition));
      } else {
        previewImage.style.left = '0px';
        previewImage.style.top = '0px';
        variantHistories[key] = [{ left: 0, top: 0 }];
        localStorage.setItem(`trait${traitId}-${trait.variants[variationIndex].name}-position`, JSON.stringify({ left: 0, top: 0 }));
      }
    }
    currentImage = previewImage;
    updateZIndices();
    updateCoordinates(previewImage);
  } else {
    console.error(`Preview image for trait ${traitId} not found in traitImages`);
  }
}

function setupDragAndDrop(img, traitIndex) {
  if (img) {
    // Remove existing listeners to prevent duplicates
    img.removeEventListener('dragstart', preventDragStart);
    img.removeEventListener('mousedown', startDragging);
    img.removeEventListener('mouseup', stopDragging);
    img.removeEventListener('click', selectImage);

    function preventDragStart(e) {
      e.preventDefault();
    }

    function startDragging(e) {
      if (!img.src) return;

      // Get all elements under the click
      const elements = document.elementsFromPoint(e.clientX, e.clientY);
      const traitImgs = elements.filter(el => traitImages.some(ti => ti === el));

      // Find the first visible (non-transparent) image
      let selectedImage = null;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      for (const traitImg of traitImgs) {
        canvas.width = traitImg.width;
        canvas.height = traitImg.height;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(traitImg, 0, 0);
        const rect = traitImg.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const pixel = ctx.getImageData(x, y, 1, 1).data;
        if (pixel[3] > 0) { // Alpha > 0 means non-transparent
          selectedImage = traitImg;
          break;
        }
      }

      if (!selectedImage) return; // No visible image found

      currentImage = selectedImage;
      isDragging = true;
      const rect = currentImage.getBoundingClientRect();
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;
      currentImage.style.cursor = 'grabbing';
      currentImage.classList.add('dragging');
      updateCoordinates(currentImage);
    }

    function stopDragging() {
      if (isDragging && currentImage) {
        const traitIndex = traitImages.indexOf(currentImage);
        if (traitIndex === -1) {
          console.error('Current image not found in traitImages');
          return;
        }
        const trait = TraitManager.getAllTraits()[traitIndex];
        const variationName = trait.variants[trait.selected].name;
        savePosition(currentImage, trait.id, variationName);
        isDragging = false;
        currentImage.style.cursor = 'grab';
        currentImage.classList.remove('dragging');
        updateZIndices();
      }
    }

    function selectImage(e) {
      // No longer needed as startDragging handles selection
    }

    img.addEventListener('dragstart', preventDragStart);
    img.addEventListener('mousedown', startDragging);
    img.addEventListener('mouseup', stopDragging);
    // Remove click listener since mousedown handles it
  }
}

function updateCoordinates(img) {
  if (img && coordinates) {
    const left = parseFloat(img.style.left) || 0;
    const top = parseFloat(img.style.top) || 0;
    coordinates.innerHTML = `<strong>Coordinates:</strong> (${Math.round(left) + 1}, ${Math.round(top) + 1})`;
  }
}

function savePosition(img, traitId, variationName) {
  const position = { left: parseFloat(img.style.left) || 0, top: parseFloat(img.style.top) || 0 };
  const key = `${traitId}-${variationName}`;
  if (!variantHistories[key]) variantHistories[key] = [];
  variantHistories[key].push(position);
  localStorage.setItem(`trait${traitId}-${variationName}-position`, JSON.stringify(position));
  localStorage.setItem(`trait${traitId}-${variationName}-manuallyMoved`, 'true');

  const trait = TraitManager.getTrait(traitId);
  const traitIndex = TraitManager.getAllTraits().findIndex(t => t.id === traitId);
  const currentVariationIndex = trait.variants.findIndex(v => v.name === variationName);
  if (currentVariationIndex === 0 && !autoPositioned[traitIndex]) {
    for (let i = 1; i < trait.variants.length; i++) {
      const otherVariationName = trait.variants[i].name;
      const otherKey = `${traitId}-${otherVariationName}`;
      variantHistories[otherKey] = [{ left: position.left, top: position.top }];
      localStorage.setItem(`trait${traitId}-${otherVariationName}-position`, JSON.stringify(position));
      localStorage.removeItem(`trait${traitId}-${otherVariationName}-manuallyMoved`);
      if (trait.selected === i) {
        const previewImage = traitImages.find(img => img.id === `preview-trait${traitId}`);
        if (previewImage && previewImage.src) {
          previewImage.style.left = `${position.left}px`;
          previewImage.style.top = `${position.top}px`;
        }
      }
    }
    autoPositioned[traitIndex] = true;
  }

  updateSamplePositions(traitId, variationName, position);
  updateSubsequentTraits(traitId, variationName, position);
}




/*---------------------------------------------------- Section 7 - PREVIEW AND POSITION MANAGEMENT (PART 2) ----------------------------------------------------*/




function updateSubsequentTraits(currentTraitId, currentVariationName, position) {
  const currentTrait = TraitManager.getTrait(currentTraitId);
  const currentTraitIndex = TraitManager.getAllTraits().findIndex(t => t.id === currentTraitId);
  const currentVariationIndex = currentTrait.variants.findIndex(v => v.name === currentVariationName);

  if (currentTrait.variants.length > 1) {
    for (let i = currentVariationIndex + 1; i < currentTrait.variants.length; i++) {
      const nextVariationName = currentTrait.variants[i].name;
      const key = `${currentTraitId}-${nextVariationName}`;
      const manuallyMoved = localStorage.getItem(`trait${currentTraitId}-${nextVariationName}-manuallyMoved`);
      if (!manuallyMoved && !variantHistories[key]) {
        variantHistories[key] = [{ left: position.left, top: position.top }];
        localStorage.setItem(`trait${currentTraitId}-${nextVariationName}-position`, JSON.stringify(position));
        if (currentTrait.selected === i) {
          const previewImage = document.getElementById(`preview-trait${currentTraitId}`);
          if (previewImage && previewImage.src) {
            previewImage.style.left = `${position.left}px`;
            previewImage.style.top = `${position.top}px`;
          }
        }
      }
    }
  }

  for (let traitIndex = currentTraitIndex + 1; traitIndex < TraitManager.getAllTraits().length; traitIndex++) {
    const nextTrait = TraitManager.getAllTraits()[traitIndex];
    if (nextTrait.variants.length === 0) continue;
    for (let i = 0; i < nextTrait.variants.length; i++) {
      const nextVariationName = nextTrait.variants[i].name;
      const key = `${nextTrait.id}-${nextVariationName}`;
      const manuallyMoved = localStorage.getItem(`trait${nextTrait.id}-${nextVariationName}-manuallyMoved`);
      if (!manuallyMoved && !variantHistories[key]) {
        variantHistories[key] = [{ left: position.left, top: position.top }];
        localStorage.setItem(`trait${nextTrait.id}-${nextVariationName}-position`, JSON.stringify(position));
        if (nextTrait.selected === i) {
          const previewImage = document.getElementById(`preview-trait${nextTrait.id}`);
          if (previewImage && previewImage.src) {
            previewImage.style.left = `${position.left}px`;
            previewImage.style.top = `${position.top}px`;
          }
        }
      }
    }
  }
}

function updateSamplePositions(traitId, variationId, position) {
  for (let i = 0; i < 16; i++) {
    const sample = sampleData[i];
    for (let j = 0; j < sample.length; j++) {
      if (sample[j].traitId === traitId && sample[j].variantId === variationId) {
        sample[j].position = position;
      }
    }
  }
  updatePreviewSamples();
}

function updatePreviewSamples() {
  previewSamplesGrid.innerHTML = '';
  sampleData = Array(16).fill(null).map(() => []);

  for (let i = 0; i < 16; i++) {
    const sampleContainer = document.createElement('div');
    sampleContainer.className = 'sample-container';

    // Render traits in reverse order (highest position first) to ensure correct stacking
    const traits = TraitManager.getAllTraits().slice().reverse();
    for (let j = 0; j < traits.length; j++) {
      const trait = traits[j];
      if (trait.variants.length === 0) continue;

      const randomIndex = Math.floor(Math.random() * trait.variants.length);
      const variant = trait.variants[randomIndex];

      const img = document.createElement('img');
      img.src = variant.url;
      img.alt = `Sample ${i + 1} - Trait ${trait.position}`;
      img.style.zIndex = trait.zIndex;

      const key = `${trait.id}-${variant.name}`;
      const savedPosition = localStorage.getItem(`trait${trait.id}-${variant.name}-position`);
      let position;
      if (savedPosition) {
        position = JSON.parse(savedPosition);
        const scale = 140 / 600;
        img.style.left = `${position.left * scale}px`;
        img.style.top = `${position.top * scale}px`;
        if (!variantHistories[key]) variantHistories[key] = [{ left: position.left, top: position.top }];
      } else {
        let lastPosition = null;
        for (let k = 0; k < trait.variants.length; k++) {
          if (k === randomIndex) continue;
          const otherVariationName = trait.variants[k].name;
          const otherKey = `${trait.id}-${otherVariationName}`;
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
          localStorage.setItem(`trait${trait.id}-${variant.name}-position`, JSON.stringify(lastPosition));
        } else {
          position = { left: 0, top: 0 };
          img.style.left = '0px';
          img.style.top = '0px';
          variantHistories[key] = [{ left: 0, top: 0 }];
          localStorage.setItem(`trait${trait.id}-${variant.name}-position`, JSON.stringify({ left: 0, top: 0 }));
        }
      }

      sampleData[i].push({ traitId: trait.id, variantId: variant.id, position });
      sampleContainer.appendChild(img);
    }

    // Add click event listener to update Preview Panel and select variants
    sampleContainer.addEventListener('click', () => {
      // Update Preview Panel with the variants from this sample
      sampleData[i].forEach(sample => {
        const traitId = sample.traitId;
        const variantId = sample.variantId;
        selectVariation(traitId, variantId);
      });

      // Update selected variants on the left side
      sampleData[i].forEach(sample => {
        const traitId = sample.traitId;
        const variantId = sample.variantId;
        const grid = document.getElementById(`trait${traitId}-grid`);
        if (grid) {
          const allWrappers = grid.querySelectorAll('.variation-image-wrapper');
          allWrappers.forEach(w => w.classList.remove('selected'));
          const container = grid.querySelector(`[data-variation-id="${variantId}"]`);
          if (container) {
            const imageWrapper = container.querySelector('.variation-image-wrapper');
            if (imageWrapper) imageWrapper.classList.add('selected');
          }
        }
      });
    });

    previewSamplesGrid.appendChild(sampleContainer);
  }
}




/*---------------------------------------------------- Section 8 - BACKGROUND GENERATION AND MINTING ----------------------------------------------------*/

async function fetchBackground() {
  try {
    clickSound.play().catch(error => console.error('Error playing click sound:', error));
    let seconds = 0;
    generateButton.disabled = true;
    generateButton.innerText = `Processing ${seconds}...`;
    timerInterval = setInterval(() => {
      seconds++;
      timerDisplay.innerText = `Processing: ${seconds}s`;
      generateButton.innerText = `Processing ${seconds}...`;
    }, 1000);

    const basePrompt = document.getElementById('base-prompt').value.trim();
    const userPrompt = document.getElementById('user-prompt').value.trim();
    const url = `https://aifn-1-api-q1ni.vercel.app/api/generate-background?prompt=${encodeURIComponent(basePrompt + (userPrompt ? ', ' + userPrompt : ''))}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch background: ${response.status} ${response.statusText}`);
    const data = await response.json();
    background.url = data.imageUrl;
    background.metadata = data.metadata;

    const backgroundImage = document.getElementById('background-image');
    const backgroundMetadata = document.getElementById('background-metadata');

    if (backgroundImage) backgroundImage.src = background.url;
    if (backgroundMetadata) backgroundMetadata.innerText = background.metadata;
  } catch (error) {
    console.error('Error fetching background:', error);
    const placeholder = 'https://raw.githubusercontent.com/geoffmccabe/AIFN1-nft-minting/main/images/Preview_Panel_Bkgd_600px.webp';
    const backgroundImage = document.getElementById('background-image');
    const backgroundMetadata = document.getElementById('background-metadata');

    if (backgroundImage) backgroundImage.src = placeholder;
    if (backgroundMetadata) backgroundMetadata.innerText = 'Failed to load background: ' + error.message;
  } finally {
    clearInterval(timerInterval);
    generateButton.innerText = 'Generate Bkgd';
    timerDisplay.innerText = 'Processing: 0s';
    generateButton.disabled = false;
  }
}

async function fetchMultipleBackgrounds(count) {
  const backgroundDetails = document.getElementById('background-details');
  backgroundDetails.innerHTML = ''; // Clear existing content

  // Create a 2x2 grid for 4 images
  const grid = document.createElement('div');
  grid.id = 'gen-grid';
  backgroundDetails.appendChild(grid);

  const basePrompt = document.getElementById('base-prompt').value.trim();
  const userPrompt = document.getElementById('user-prompt').value.trim();
  const prompt = basePrompt + (userPrompt ? ', ' + userPrompt : '');

  // Array to store generated image URLs
  const imageUrls = [];

  // Generate images one by one
  for (let i = 0; i < count; i++) {
    try {
      const url = `https://aifn-1-api-q1ni.vercel.app/api/generate-background?prompt=${encodeURIComponent(prompt)}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch background: ${response.status} ${response.statusText}`);
      const data = await response.json();
      imageUrls.push(data.imageUrl);
    } catch (error) {
      console.error(`Error fetching background ${i + 1}:`, error);
      imageUrls.push('https://raw.githubusercontent.com/geoffmccabe/AIFN1-nft-minting/main/images/Preview_Panel_Bkgd_600px.webp');
    }
  }

  // Display the 4 images in the grid
  imageUrls.forEach((imageUrl, index) => {
    const container = document.createElement('div');
    container.className = 'gen-image-container';
    container.dataset.index = index;

    const img = document.createElement('img');
    img.src = imageUrl;
    container.appendChild(img);

    grid.appendChild(container);

    // Add click event to enlarge the image
    container.addEventListener('click', () => {
      // Remove selected class from all containers
      document.querySelectorAll('.gen-image-container').forEach(c => c.classList.remove('selected'));
      // Add selected class to the clicked container
      container.classList.add('selected');

      // Enlarge the image
      backgroundDetails.innerHTML = '';
      const fullImg = document.createElement('img');
      fullImg.className = 'gen-image-full';
      fullImg.src = imageUrl;
      backgroundDetails.appendChild(fullImg);

      // Add click event to remove the enlarged image and revert to grid
      fullImg.addEventListener('click', () => {
        backgroundDetails.innerHTML = '';
        backgroundDetails.appendChild(grid);
      });
    });
  });

  // Update metadata
  const backgroundMetadata = document.getElementById('background-metadata');
  if (backgroundMetadata) backgroundMetadata.innerText = `Generated ${count} images with prompt: ${prompt}`;
}

function fetchMintFee() {
  const mintFeeDisplay = document.getElementById('mintFeeDisplay');
  if (mintFeeDisplay) mintFeeDisplay.innerText = `Mint Fee: 0.001 ETH (Mock)`;
}
fetchMintFee();

window.mintNFT = async function() {
  const status = document.getElementById('status');
  if (!status) return;

  try {
    await provider.send("eth_requestAccounts", []);
    const numTraitCategories = TraitManager.getAllTraits().length;
    const traitCategoryVariants = TraitManager.getAllTraits().map(trait => trait.variants.length);
    const traitIndices = TraitManager.getAllTraits().map(trait => trait.selected);
    const recipient = await signer.getAddress();

    status.innerText = "Uploading images to Arweave...";
    const formData = new FormData();
    for (let i = 0; i < TraitManager.getAllTraits().length; i++) {
      const trait = TraitManager.getAllTraits()[i];
      const selectedVariation = trait.variants[trait.selected];
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
