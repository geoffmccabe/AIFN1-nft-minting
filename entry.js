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
    for (let i = 0; i < 3; i++) { // Start with 3 traits
      this.addTrait(i + 1);
    }
    const traitsPanel = document.querySelector('.traits-panel .panel-content');
    if (traitsPanel) {
      traitsPanel.style.maxHeight = '400px'; // Initial height
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
    
    // Dynamic panel height adjustment
    if (this.traits.length > 3) {
      const traitsPanel = document.querySelector('.traits-panel .panel-content');
      if (traitsPanel) {
        traitsPanel.style.maxHeight = 'max(70vh, 2400px)';
      }
    }
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
let currentGridState = { count: 1, imageUrls: [], deleted: [] }; // Track the current grid state and deleted images
let chosenImages = []; // Track chosen images
const clickSound = new Audio('https://www.soundjay.com/buttons/button-3.mp3');
clickSound.volume = 0.25;




/* Section 3 ----------------------------------------- GLOBAL EVENT LISTENERS ------------------------------------------------*/

document.addEventListener('DOMContentLoaded', async () => {
  let randomizeInterval = null;
  let currentSpeed = 1000; // Start at 1000ms

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

  // Ensure DOM elements are available
  if (!traitContainer || !previewSamplesGrid) {
    console.error('Critical DOM elements missing:', { traitContainer, previewSamplesGrid });
    return;
  }

  variantHistories = {};

  if (preview && !preview.hasChildNodes()) {
    preview.innerHTML = '';
  }

  // Initialize TraitManager with 3 empty traits
  TraitManager.initialize();
  traitContainer.innerHTML = '';
  TraitManager.getAllTraits().slice(0, 3).forEach(trait => {
    addTrait(trait);
    refreshTraitGrid(trait.id);
  });
  updatePreviewSamples();

  // IndexedDB Setup
  const openDB = () => new Promise((resolve, reject) => {
    const request = indexedDB.open('NFTProjectDB', 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('projects')) {
        db.createObjectStore('projects', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('images')) {
        db.createObjectStore('images', { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  // Save Project
  async function saveProject() {
    const db = await openDB();
    const tx = db.transaction(['projects', 'images'], 'readwrite');
    
    // Clear existing images first
    const imageStore = tx.objectStore('images');
    const clearRequest = imageStore.clear();
    await new Promise((resolve, reject) => {
      clearRequest.onsuccess = () => {
        console.log('Cleared existing images');
        resolve();
      };
      clearRequest.onerror = () => reject(clearRequest.error);
    });

    // Sort traits and set zIndex before saving
    TraitManager.traits.sort((a, b) => a.position - b.position);
    TraitManager.traits.forEach((t, idx) => {
      t.zIndex = TraitManager.traits.length - idx; // Higher position = lower zIndex
    });

    // Save traits data
    const traitsToSave = TraitManager.getAllTraits().map(trait => ({
      id: trait.id,
      position: trait.position,
      name: trait.name,
      selected: trait.selected,
      zIndex: trait.zIndex,
      variants: trait.variants.map(variant => ({
        id: variant.id,
        name: variant.name,
        chance: variant.chance,
        createdAt: variant.createdAt
      }))
    }));

    // Save project data
    const projectStore = tx.objectStore('projects');
    const projectData = {
      id: 'current',
      name: document.getElementById('project-name').value || 'Unnamed',
      size: document.getElementById('project-size').value,
      description: document.getElementById('project-description').value,
      traits: traitsToSave
    };
    
    await new Promise((resolve, reject) => {
      const request = projectStore.put(projectData);
      request.onsuccess = () => {
        console.log('Saved project metadata');
        resolve();
      };
      request.onerror = () => reject(request.error);
    });

    // Save images
    for (const trait of TraitManager.getAllTraits()) {
      for (const variant of trait.variants) {
        if (variant.url) {
          try {
            const response = await fetch(variant.url);
            if (!response.ok) throw new Error(`Fetch failed for ${variant.url}: ${response.status}`);
            const blob = await response.blob();
            const arrayBuffer = await blob.arrayBuffer();
            await new Promise((resolve, reject) => {
              const request = imageStore.put({ id: `${trait.id}_${variant.id}`, data: arrayBuffer });
              request.onsuccess = () => {
                console.log(`Saved image for ${trait.id}_${variant.id}, size: ${arrayBuffer.byteLength} bytes`);
                resolve();
              };
              request.onerror = () => reject(request.error);
            });
          } catch (error) {
            console.error('Error saving image:', error);
          }
        }
      }
    }

    console.log('Saved project:', projectData);
    alert('Project saved successfully!');
  }

  // Load Project
  async function loadProject() {
    const db = await openDB();
    const tx = db.transaction(['projects', 'images'], 'readonly');
    const project = await new Promise((resolve) => {
      tx.objectStore('projects').get('current').onsuccess = e => resolve(e.target.result);
    });

    if (!project) {
      alert('No saved project found');
      return;
    }

    // Clear existing traits
    TraitManager.traits = [];
    traitContainer.innerHTML = '';
    preview.innerHTML = '';
    traitImages = [];

    // Load project data
    document.getElementById('project-name').value = project.name;
    document.getElementById('project-size').value = project.size || '600x600';
    document.getElementById('project-description').value = project.description || '';

    // Load traits
    const imageStore = tx.objectStore('images');
    for (const savedTrait of project.traits) {
      const newTrait = TraitManager.addTrait(savedTrait.position);
      Object.assign(newTrait, {
        name: savedTrait.name,
        selected: savedTrait.selected,
        zIndex: savedTrait.zIndex,
        variants: []
      });

      // Load variants
      for (const savedVariant of savedTrait.variants) {
        const imageData = await new Promise((resolve) => {
          imageStore.get(`${savedTrait.id}_${savedVariant.id}`).onsuccess = e => resolve(e.target.result);
        });

        const variantData = {
          ...savedVariant,
          url: imageData?.data ? URL.createObjectURL(new Blob([imageData.data], { type: 'image/webp' })) : ''
        };
        
        newTrait.variants.push(variantData);
        console.log(`Loaded variant ${variantData.id} for trait ${savedTrait.id}:`, variantData.url ? 'Image present' : 'No image');
      }

      addTrait(newTrait);
      refreshTraitGrid(newTrait.id);
      if (newTrait.variants.length > 0) {
        selectVariation(newTrait.id, newTrait.variants[newTrait.selected].id);
      }
    }

    // Ensure all traits are rendered with correct zIndex
    TraitManager.traits.sort((a, b) => a.position - b.position);
    TraitManager.traits.forEach((t, idx) => {
      t.zIndex = TraitManager.traits.length - idx; // Reapply zIndex
      const traitElement = document.querySelector(`#trait-${t.id}`);
      if (traitElement) {
        const img = traitImages.find(i => i.id === `preview-trait${t.id}`);
        if (img) img.style.zIndex = t.zIndex;
      }
    });

    updatePreviewSamples();
    console.log('Loaded project:', project);
    alert(`Project "${project.name}" loaded successfully!`);
  }

  // Event listeners for global controls
  updatePreviewsButton.addEventListener('click', () => updatePreviewSamples());
  generateButton.addEventListener('click', () => fetchMultipleBackgrounds(1));
  document.getElementById('gen-4x').addEventListener('click', () => fetchMultipleBackgrounds(4));
  document.getElementById('gen-16x').addEventListener('click', () => fetchMultipleBackgrounds(16));

  // Scroll Controls
  const scrollTrait = (direction) => {
    const traits = [...traitContainer.querySelectorAll('.trait-section')];
    if (traits.length === 0) return;
    const visibleTraits = traits.filter(t =>
      t.offsetTop + t.offsetHeight > traitContainer.scrollTop &&
      t.offsetTop < traitContainer.scrollTop + traitContainer.clientHeight
    );
    const target = direction === 'up'
      ? visibleTraits[0]?.previousElementSibling ?? traits[0]
      : visibleTraits[visibleTraits.length - 1]?.nextElementSibling ?? traits[traits.length - 1];
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };
  document.querySelector('.up-scroll').onclick = () => scrollTrait('up');
  document.querySelector('.down-scroll').onclick = () => scrollTrait('down');

  // Project Size Handling
  const projectSizeSelect = document.getElementById('project-size');
  const customSizeGroup = document.getElementById('custom-size-group');
  projectSizeSelect.onchange = () => {
    customSizeGroup.style.display = projectSizeSelect.value === 'custom' ? 'block' : 'none';
    document.getElementById('width-input').value = '600';
    document.getElementById('height-input').value = '600';
    saveProject();
  };
  document.getElementById('custom-width').onchange = () => saveProject();
  document.getElementById('custom-height').onchange = () => saveProject();
  document.getElementById('project-name').oninput = () => saveProject();
  document.getElementById('project-description').oninput = () => saveProject();

  // Save/Load Buttons
  document.getElementById('save-project').addEventListener('click', async () => {
    try {
      await saveProject();
    } catch (err) {
      console.error('Save failed:', err);
      alert('Failed to save project');
    }
  });
  document.getElementById('load-project').addEventListener('click', async () => {
    try {
      await loadProject();
    } catch (err) {
      console.error('Load failed:', err);
      alert('Failed to load project');
    }
  });

  // Info Tooltip Activation
  const infoTooltip = document.querySelector('.info-tooltip');
  if (infoTooltip) {
    infoTooltip.addEventListener('click', (e) => {
      e.preventDefault();
      const tooltipText = infoTooltip.getAttribute('title');
      alert(tooltipText);
    });
  }

  // Set up magnifying glass with isolated preview
  magnifyEmoji.addEventListener('click', () => {
    enlargedPreview.style.display = 'block';
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

    const controls = document.getElementById('enlarged-preview-controls');
    controls.style.display = 'flex';

    const magnifiedState = TraitManager.getAllTraits()
      .map(trait => ({
        id: trait.id,
        variants: [...trait.variants],
        selected: trait.selected,
        position: trait.position,
        zIndex: trait.zIndex
      }))
      .sort((a, b) => a.position - b.position); // Sort by position ascending

    const updateEnlargedPreview = () => {
      enlargedPreview.innerHTML = '';
      magnifiedState.forEach(trait => {
        const variant = trait.variants[trait.selected];
        if (variant && variant.url) {
          const img = document.createElement('img');
          img.src = variant.url;
          const baseImg = traitImages.find(i => i.id === `preview-trait${trait.id}`);
          img.style.width = `${parseFloat(baseImg.style.width || '600') * scale}px`;
          img.style.height = `${parseFloat(baseImg.style.height || '600') * scale}px`;
          img.style.left = `${parseFloat(baseImg.style.left || '0') * scale}px`;
          img.style.top = `${parseFloat(baseImg.style.top || '0') * scale}px`;
          img.style.zIndex = trait.zIndex; // Use saved zIndex
          img.style.position = 'absolute';
          img.style.visibility = 'visible';
          enlargedPreview.appendChild(img);
        }
      });
    };
    updateEnlargedPreview();

    const playEmoji = document.getElementById('play-emoji');
    const pauseEmoji = document.getElementById('pause-emoji');

    playEmoji.onclick = (e) => {
      e.stopPropagation();
      console.log('Play clicked');
      if (randomizeInterval) {
        clearInterval(randomizeInterval);
        if (currentSpeed === 1000) currentSpeed = 100;
        else if (currentSpeed === 100) currentSpeed = 10;
      } else {
        currentSpeed = 1000;
      }
      randomizeInterval = setInterval(() => {
        const traitIndex = Math.floor(Math.random() * magnifiedState.length);
        const trait = magnifiedState[traitIndex];
        if (trait.variants.length > 0) {
          trait.selected = Math.floor(Math.random() * trait.variants.length);
          console.log(`Randomized trait ${trait.id} to variant ${trait.selected}`);
          updateEnlargedPreview();
        }
      }, currentSpeed);
    };

    pauseEmoji.onclick = (e) => {
      e.stopPropagation();
      if (randomizeInterval) {
        clearInterval(randomizeInterval);
        randomizeInterval = null;
        currentSpeed = 1000;
      }
    };

    enlargedPreview.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const projectName = document.getElementById('project-name').value || 'Untitled';
      let saveCount = parseInt(localStorage.getItem(`${projectName}_saveCount`) || 0) + 1;
      if (saveCount > 100) {
        console.warn('Save limit reached');
        return;
      }
      localStorage.setItem(`${projectName}_saveCount`, saveCount);
      const saveKey = `${projectName}_${saveCount}`;
      const currentState = magnifiedState.map(trait => ({
        id: trait.id,
        selected: trait.selected,
        variants: trait.variants.map(v => ({ id: v.id, name: v.name, url: v.url }))
      }));
      localStorage.setItem(saveKey, JSON.stringify(currentState));
      console.log(`Saved as ${saveKey}`);
    });

    enlargedPreview.onclick = (e) => {
      if (e.target === playEmoji || e.target === pauseEmoji) return;
      if (randomizeInterval) {
        clearInterval(randomizeInterval);
        randomizeInterval = null;
        currentSpeed = 1000;
      }
      enlargedPreview.style.display = 'none';
      controls.style.display = 'none';
    };
  });

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
          // Reapply zIndex after position change
          TraitManager.traits.sort((a, b) => a.position - b.position);
          TraitManager.traits.forEach((t, idx) => {
            t.zIndex = TraitManager.traits.length - idx;
          });
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
          // Reapply zIndex after position change
          TraitManager.traits.sort((a, b) => a.position - b.position);
          TraitManager.traits.forEach((t, idx) => {
            t.zIndex = TraitManager.traits.length - idx;
          });
        }
      }
    });
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
        saveProject();
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
        saveProject();
      }
    });
  }

  // Set up Chosen grid
  const chosenCountInput = document.getElementById('chosen-count');
  const updateChosenGridButton = document.getElementById('update-chosen-grid');
  updateChosenGrid(parseInt(chosenCountInput.value));
  updateChosenGridButton.addEventListener('click', () => {
    updateChosenGrid(parseInt(chosenCountInput.value));
  });
  chosenCountInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      updateChosenGrid(parseInt(chosenCountInput.value));
    }
  });

  // Set up drag-and-drop for Chosen grid
  const chosenGrid = document.getElementById('chosen-grid');
  chosenGrid.addEventListener('dragover', (e) => {
    e.preventDefault();
    const target = e.target.closest('.chosen-image-container');
    if (target) {
      target.style.border = '2px dashed #4CAF50';
    }
  });
  chosenGrid.addEventListener('dragleave', (e) => {
    const target = e.target.closest('.chosen-image-container');
    if (target) {
      target.style.border = '1px solid black';
    }
  });
  chosenGrid.addEventListener('drop', (e) => {
    e.preventDefault();
    const imageUrl = e.dataTransfer.getData('text/plain');
    const source = e.dataTransfer.getData('source');
    const target = e.target.closest('.chosen-image-container');
    if (!target || !imageUrl) return;

    target.style.border = '1px solid black';

    if (source === 'chosen-grid') {
      const draggedContainer = Array.from(chosenGrid.children).find(container => 
        container.querySelector('img')?.src === imageUrl
      );
      if (draggedContainer && draggedContainer !== target) {
        const draggedImg = draggedContainer.querySelector('img');
        const targetImg = target.querySelector('img');
        const draggedIndex = chosenImages.indexOf(imageUrl);

        if (draggedIndex !== -1) {
          chosenImages.splice(draggedIndex, 1);
        }

        if (targetImg) {
          const targetIndex = chosenImages.indexOf(targetImg.src);
          if (targetIndex !== -1) {
            chosenImages.splice(targetIndex, 1, imageUrl);
            draggedImg.src = targetImg.src;
            chosenImages.splice(draggedIndex, 0, targetImg.src);
          }
        } else {
          const targetIndex = Array.from(chosenGrid.children).indexOf(target);
          chosenImages.splice(targetIndex, 0, imageUrl);
          target.appendChild(draggedImg);
        }
      }
    } else {
      const existingImg = target.querySelector('img');
      if (existingImg) {
        const index = chosenImages.indexOf(existingImg.src);
        if (index !== -1) {
          chosenImages.splice(index, 1);
        }
        existingImg.remove();
      }
      const img = document.createElement('img');
      img.src = imageUrl;
      img.draggable = true;
      img.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', img.src);
        e.dataTransfer.setData('source', 'chosen-grid');
      });
      target.appendChild(img);
      chosenImages.push(imageUrl);
    }
  });

  // Ensure all images in Chosen grid are draggable on load
  chosenGrid.querySelectorAll('.chosen-image-container img').forEach(img => {
    img.draggable = true;
    img.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', img.src);
      e.dataTransfer.setData('source', 'chosen-grid');
    });
  });

  // Log logo URL for debugging
  const logo = document.getElementById('logo');
  if (logo) console.log('Logo URL:', logo.src);
});



/* Section 4 ----------------------------------------- TRAIT MANAGEMENT FUNCTIONS (PART 1) ------------------------------------------------*/
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

/* Section 7 ----------------------------------------- PREVIEW AND POSITION MANAGEMENT (PART 2) ------------------------------------------------*/

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

/* Section 8 ----------------------------------------- BACKGROUND GENERATION AND MINTING ------------------------------------------------*/

function updateChosenGrid(count) {
  const chosenGrid = document.getElementById('chosen-grid');
  chosenGrid.innerHTML = '';
  chosenGrid.style.display = 'flex';
  chosenGrid.style.flexWrap = 'wrap';
  chosenGrid.style.gap = '15px';
  chosenGrid.style.width = '600px';
  for (let i = 0; i < count; i++) {
    const container = document.createElement('div');
    container.className = 'chosen-image-container';
    container.style.width = '108px';
    container.style.height = '108px';
    chosenGrid.appendChild(container);
  }
  chosenImages.forEach(imageUrl => addToChosenGrid(imageUrl));
}

function addToChosenGrid(imageUrl, targetContainer = null) {
  const chosenGrid = document.getElementById('chosen-grid');
  let container = targetContainer || chosenGrid.querySelector('.chosen-image-container:not(:has(img))');
  if (container) {
    const existingImg = container.querySelector('img');
    if (existingImg) {
      const index = chosenImages.indexOf(existingImg.src);
      if (index !== -1) chosenImages.splice(index, 1);
      existingImg.remove();
    }
    const img = document.createElement('img');
    img.src = imageUrl;
    img.draggable = true;
    img.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', img.src);
      e.dataTransfer.setData('source', 'chosen-grid');
    });
    container.appendChild(img);
    chosenImages.push(imageUrl);
  }
}

async function fetchMultipleBackgrounds(count) {
  try {
    clickSound.play().catch(error => console.error(error));
    let seconds = 0;
    generateButton.disabled = true;
    timerInterval = setInterval(() => {
      seconds++;
      timerDisplay.innerText = `Processing: ${seconds}s`;
    }, 1000);

    const backgroundDetails = document.getElementById('background-details');
    backgroundDetails.innerHTML = '';

    const gridSize = Math.sqrt(count);
    const gap = 10;
    const totalSize = 600;
    const cellSize = (totalSize - (gridSize - 1) * gap) / gridSize;

    const grid = document.createElement('div');
    grid.id = 'gen-grid';
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = `repeat(${gridSize}, ${cellSize}px)`;
    grid.style.gridTemplateRows = `repeat(${gridSize}, ${cellSize}px)`;
    grid.style.gap = `${gap}px`;
    grid.style.width = `${totalSize}px`;
    grid.style.height = `${totalSize}px`;
    backgroundDetails.appendChild(grid);

    const basePrompt = document.getElementById('base-prompt').value.trim();
    const userPrompt = document.getElementById('user-prompt').value.trim();
    const width = document.getElementById('width-input').value;
    const height = document.getElementById('height-input').value;

    const imageUrls = new Array(count).fill(null);
    currentGridState = { count, imageUrls, deleted: new Array(count).fill(false) };

    for (let i = 0; i < count; i++) {
      const container = document.createElement('div');
      container.className = 'gen-image-container';
      container.dataset.index = i;
      container.style.width = `${cellSize}px`;
      container.style.height = `${cellSize}px`;

      const img = document.createElement('img');
      img.src = 'https://raw.githubusercontent.com/geoffmccabe/AIFN1-nft-minting/main/images/Preview_Panel_Bkgd_600px.webp';
      img.draggable = true;
      img.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', img.src);
        e.dataTransfer.setData('source', 'gen-grid');
      });
      container.appendChild(img);
      grid.appendChild(container);
    }

    for (let i = 0; i < count; i++) {
      const randomNumber = Math.floor(1000000 + Math.random() * 9000000);
      const modifiedPrompt = `${basePrompt}${userPrompt ? ', ' + userPrompt : ''}, ${randomNumber}`;
      const url = `https://aifn-1-api-new3.vercel.app/api/generate-background?basePrompt=${encodeURIComponent(modifiedPrompt)}&userPrompt=&width=${width}&height=${height}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) throw new Error(`Failed: ${response.status} ${response.statusText}`);
        const data = await response.json();
        imageUrls[i] = data.imageUrl;
        const container = grid.querySelector(`.gen-image-container[data-index="${i}"]`);
        const img = container.querySelector('img');
        img.src = data.imageUrl;
      } catch (error) {
        console.error(`Error fetching background ${i + 1}:`, error);
        imageUrls[i] = 'https://raw.githubusercontent.com/geoffmccabe/AIFN1-nft-minting/main/images/Preview_Panel_Bkgd_600px.webp';
        const container = grid.querySelector(`.gen-image-container[data-index="${i}"]`);
        const img = container.querySelector('img');
        img.src = 'https://raw.githubusercontent.com/geoffmccabe/AIFN1-nft-minting/main/images/Preview_Panel_Bkgd_600px.webp';
      }
    }

    currentGridState.imageUrls = imageUrls;
  } catch (error) {
    console.error('Error:', error);
    const backgroundMetadata = document.getElementById('background-metadata');
    if (backgroundMetadata) backgroundMetadata.innerText = `Failed: ${error.message}`;
  } finally {
    clearInterval(timerInterval);
    generateButton.innerText = 'Generate Bkgd';
    timerDisplay.innerText = 'Processing: 0s';
    generateButton.disabled = false;
  }

  const grid = document.getElementById('gen-grid');
  currentGridState.imageUrls.forEach((imageUrl, index) => {
    if (!imageUrl) return;
    const container = grid.querySelector(`.gen-image-container[data-index="${index}"]`);
    const img = container.querySelector('img');

    container.addEventListener('click', () => {
      if (currentGridState.deleted[index]) {
        currentGridState.deleted[index] = false;
        img.src = currentGridState.imageUrls[index];
        return;
      }

      document.querySelectorAll('.gen-image-container').forEach(c => c.classList.remove('selected'));
      container.classList.add('selected');

      const backgroundDetails = document.getElementById('background-details');
      backgroundDetails.innerHTML = '';
      const fullImg = document.createElement('img');
      fullImg.className = 'gen-image-full';
      fullImg.src = imageUrl;
      fullImg.dataset.index = index;
      backgroundDetails.appendChild(fullImg);

      preview.style.background = `url(${imageUrl})`;
      preview.style.backgroundSize = 'cover';

      fullImg.addEventListener('click', () => {
        backgroundDetails.innerHTML = '';
        backgroundDetails.appendChild(grid);
        preview.style.background = `url('https://raw.githubusercontent.com/geoffmccabe/AIFN1-nft-minting/main/images/Preview_Panel_Bkgd_600px.webp')`;
        preview.style.backgroundSize = 'cover';
      });

      const leftArrow = document.querySelector('.gen-control-emoji[data-action="left"]');
      const rightArrow = document.querySelector('.gen-control-emoji[data-action="right"]');
      const deleteEmoji = document.querySelector('.gen-control-emoji[data-action="delete"]');
      const keepEmoji = document.querySelector('.gen-control-emoji[data-action="keep"]');

      leftArrow.onclick = () => {
        let newIndex = parseInt(fullImg.dataset.index) - 1;
        if (newIndex < 0) newIndex = currentGridState.imageUrls.length - 1;
        while (currentGridState.deleted[newIndex] || !currentGridState.imageUrls[newIndex]) {
          newIndex--;
          if (newIndex < 0) newIndex = currentGridState.imageUrls.length - 1;
        }
        fullImg.src = currentGridState.imageUrls[newIndex];
        fullImg.dataset.index = newIndex;
        preview.style.background = `url(${currentGridState.imageUrls[newIndex]})`;
        preview.style.backgroundSize = 'cover';
        document.querySelectorAll('.gen-image-container').forEach(c => c.classList.remove('selected'));
        document.querySelector(`.gen-image-container[data-index="${newIndex}"]`).classList.add('selected');
      };

      rightArrow.onclick = () => {
        let newIndex = parseInt(fullImg.dataset.index) + 1;
        if (newIndex >= currentGridState.imageUrls.length) newIndex = 0;
        while (currentGridState.deleted[newIndex] || !currentGridState.imageUrls[newIndex]) {
          newIndex++;
          if (newIndex >= currentGridState.imageUrls.length) newIndex = 0;
        }
        fullImg.src = currentGridState.imageUrls[newIndex];
        fullImg.dataset.index = newIndex;
        preview.style.background = `url(${currentGridState.imageUrls[newIndex]})`;
        preview.style.backgroundSize = 'cover';
        document.querySelectorAll('.gen-image-container').forEach(c => c.classList.remove('selected'));
        document.querySelector(`.gen-image-container[data-index="${newIndex}"]`).classList.add('selected');
      };

      deleteEmoji.onclick = () => {
        const index = parseInt(fullImg.dataset.index);
        currentGridState.deleted[index] = true;
        backgroundDetails.innerHTML = '';
        backgroundDetails.appendChild(grid);
        const containerToUpdate = grid.querySelector(`.gen-image-container[data-index="${index}"]`);
        const imgToUpdate = containerToUpdate.querySelector('img');
        imgToUpdate.src = 'https://raw.githubusercontent.com/geoffmccabe/AIFN1-nft-minting/main/images/Preview_Panel_Bkgd_600px.webp';
        preview.style.background = `url('https://raw.githubusercontent.com/geoffmccabe/AIFN1-nft-minting/main/images/Preview_Panel_Bkgd_600px.webp')`;
        preview.style.backgroundSize = 'cover';
      };

      keepEmoji.onclick = () => {
        addToChosenGrid(fullImg.src);
        backgroundDetails.innerHTML = '';
        backgroundDetails.appendChild(grid);
        preview.style.background = `url('https://raw.githubusercontent.com/geoffmccabe/AIFN1-nft-minting/main/images/Preview_Panel_Bkgd_600px.webp')`;
        preview.style.backgroundSize = 'cover';
      };
    });
  });

  const backgroundMetadata = document.getElementById('background-metadata');
  if (backgroundMetadata) {
    backgroundMetadata.innerText = `Generated ${count} images with prompt: ${basePrompt}${userPrompt ? ', ' + userPrompt : ''}`;
  }
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
  
