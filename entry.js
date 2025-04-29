/* Section 1 ----------------------------------------- TRAIT MANAGER FRAMEWORK ------------------------------------------------*/

let idCounter = 1;
function generateId() {
  return `id-${idCounter++}`;
}

const TraitManager = {
  traits: [],
  initialize() {
    this.traits = [];
    for (let i = 0; i < 3; i++) {
      this.addTrait(i + 1);
    }
    this.sortTraits();

    // Removed placeholder variant addition to prevent background image from being used as a trait

    const traitsPanel = document.querySelector('.traits-panel-container .panel-content');
    if (traitsPanel) {
      traitsPanel.style.maxHeight = '400px';
    }
  },
  addTrait(position) {
    const newTrait = {
      id: generateId(),
      position: position,
      name: '',
      variants: [],
      selected: 0,
      zIndex: this.traits.length + 1 - position,
      createdAt: Date.now()
    };
    this.traits.forEach(trait => {
      if (trait.position >= position) {
        trait.position++;
        trait.zIndex = this.traits.length + 1 - trait.position;
      }
    });
    this.traits.push(newTrait);
    this.sortTraits();
    if (this.traits.length > 3) {
      const traitsPanel = document.querySelector('.traits-panel-container .panel-content');
      if (traitsPanel) {
        traitsPanel.style.maxHeight = 'max(70vh, 2400px)';
      }
    }
    return newTrait;
  },
  sortTraits() {
    this.traits.sort((a, b) => a.position - b.position);
    this.traits.forEach((trait, idx) => {
      trait.zIndex = this.traits.length - idx;
    });
  },
  removeTrait(traitId) {
    const traitIndex = this.traits.findIndex(trait => trait.id === traitId);
    if (traitIndex === -1) return;
    const removedTrait = this.traits[traitIndex];
    const removedPosition = removedTrait.position;
    this.traits.splice(traitIndex, 1);
    this.traits.forEach(trait => {
      if (trait.position > removedPosition) {
        trait.position--;
        trait.zIndex = this.traits.length + 1 - trait.position;
      }
    });
  },
  moveTrait(traitId, newPosition) {
    const trait = this.traits.find(t => t.id === traitId);
    if (!trait) return;
    const oldPosition = trait.position;
    if (newPosition < oldPosition) {
      this.traits.forEach(t => {
        if (t.position >= newPosition && t.position < oldPosition) t.position++;
      });
    } else if (newPosition > oldPosition) {
      this.traits.forEach(t => {
        if (t.position > oldPosition && t.position <= newPosition) t.position--;
      });
    }
    trait.position = newPosition;
    this.sortTraits();
  },
  addVariant(traitId, variantData) {
    const trait = this.traits.find(t => t.id === traitId);
    if (!trait) return;
    const newVariant = {
      id: generateId(),
      name: variantData.name,
      url: variantData.url,
      chance: variantData.chance || 0.5,
      createdAt: Date.now()
    };
    trait.variants.push(newVariant);
    return newVariant;
  },
  removeVariant(traitId, variantId) {
    const trait = this.traits.find(t => t.id === traitId);
    if (!trait) return;
    const variantIndex = trait.variants.findIndex(v => v.id === variantId);
    if (variantIndex === -1) return;
    trait.variants.splice(variantIndex, 1);
    if (trait.selected >= trait.variants.length) {
      trait.selected = Math.max(0, trait.variants.length - 1);
    }
  },
  updateVariantChance(traitId, variantId, chance) {
    const trait = this.traits.find(t => t.id === traitId);
    if (!trait) return;
    const variant = trait.variants.find(v => v.id === variantId);
    if (!variant) return;
    variant.chance = chance;
  },
  getTrait(traitId) {
    return this.traits.find(t => t.id === traitId);
  },
  getAllTraits() {
    return [...this.traits];
  }
};



/* Section 2 ----------------------------------------- GLOBAL SETUP AND INITIALIZATION ------------------------------------------------*/




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
let currentGridState = { count: 1, imageUrls: [], deleted: [] };
let chosenImages = [];
const clickSound = new Audio('https://www.soundjay.com/buttons/button-3.mp3');
clickSound.volume = 0.25;
let initialHtmlUri = '';

const DIMENSIONS = {
  BASE_SIZE: 600,  // Changed from 598 to 600
  BORDER_ADJUSTMENT: 0,  // Changed from 2 to 0
  GRID_GAP: 13
};

const DEBUG = true;
function debugLog(...args) {
  if (DEBUG) console.log('[DEBUG]', ...args);
}


/* Section 3 ----------------------------------------- GLOBAL EVENT LISTENERS ------------------------------------------------ */

document.addEventListener('DOMContentLoaded', async () => {
  let randomizeInterval = null;
  let currentSpeed = 1000;

  Object.keys(localStorage).forEach(key => {
    if (key.includes('-position') || key.includes('-manuallyMoved') || key.includes('_saveCount')) {
      localStorage.removeItem(key);
    }
  });

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

  debugLog('DOM Elements:', { traitContainer, previewSamplesGrid, chosenGrid: document.getElementById('chosen-grid') });

  if (!traitContainer || !previewSamplesGrid || !document.getElementById('chosen-grid')) {
    console.error('Critical DOM elements missing:', { traitContainer, previewSamplesGrid, chosenGrid: document.getElementById('chosen-grid') });
    return;
  }

  variantHistories = {};

  if (preview && !preview.hasChildNodes()) {
    preview.innerHTML = '';
  }

  TraitManager.initialize();
  traitContainer.innerHTML = '';
  TraitManager.getAllTraits().forEach(trait => {
    addTrait(trait);
    refreshTraitGrid(trait.id);
  });

  initializePositions();
  updatePreviewSamples();
  await populateProjectSlots();

  // Add permanent mousemove and mouseup listeners for drag-and-drop
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', stopDragging);

  async function openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('NFTProjectDB', 1);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('projects')) db.createObjectStore('projects', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('images')) db.createObjectStore('images', { keyPath: 'id' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function populateProjectSlots() {
    const projectSlotSelect = document.getElementById('project-slot');
    const slots = ['project-1', 'project-2', 'project-3', 'project-4', 'project-5', 'project-6', 'project-7', 'project-8', 'project-9', 'project-10'];
    const db = await openDB();
    const tx = db.transaction(['projects'], 'readonly');
    const projectStore = tx.objectStore('projects');
    const slotPromises = slots.map(slotId => 
      new Promise(resolve => projectStore.get(slotId).onsuccess = e => resolve({ id: slotId, project: e.target.result || null }))
    );
    const slotData = await Promise.all(slotPromises);
    
    slotData.forEach((data, index) => {
      const option = projectSlotSelect.options[index];
      const projectName = data.project ? data.project.name : '';
      option.text = `Slot ${index + 1}${projectName ? ` - ${projectName}` : ''}`;
    });
  }

  async function saveProject() {
    try {
      debugLog('Starting saveProject...');
      const db = await openDB();
      const tx = db.transaction(['projects', 'images'], 'readwrite');
      const imageStore = tx.objectStore('images');
      const projectStore = tx.objectStore('projects');

      await new Promise((resolve, reject) => {
        const clearRequest = imageStore.clear();
        clearRequest.onsuccess = () => resolve();
        clearRequest.onerror = () => reject(clearRequest.error);
      });
      debugLog('Cleared existing images');

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

      for (const trait of TraitManager.getAllTraits()) {
        for (const variant of trait.variants) {
          if (variant.data) {
            try {
              const key = `${trait.id}_${variant.id}`;
              debugLog(`Storing image with key: ${key}, size: ${variant.data.byteLength} bytes`);
              await new Promise((resolve, reject) => {
                const request = imageStore.put({ id: key, data: variant.data });
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
              });
            } catch (error) {
              console.error(`Error saving image ${trait.id}_${variant.id}:`, error);
              throw error;
            }
          } else {
            debugLog(`No data for variant ${trait.id}_${variant.id} - skipping image save`);
          }
        }
      }

      const slot = document.getElementById('project-slot').value;
      const projectData = {
        id: slot,
        name: document.getElementById('project-name').value || 'Unnamed',
        size: document.getElementById('project-size').value,
        description: document.getElementById('project-description').value,
        traits: traitsToSave
      };
      debugLog('Saving project metadata:', projectData);
      await new Promise((resolve, reject) => {
        const request = projectStore.put(projectData);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      debugLog('Saved project:', projectData);
      alert(`Project saved to ${slot} successfully!`);
      await populateProjectSlots();
    } catch (err) {
      console.error('SaveProject caught error:', err);
      alert('Failed to save project');
    }
  }

  async function loadProject() {
    let projectLoadedSuccessfully = false;
    try {
      let db;
      try {
        db = await openDB();
      } catch (dbError) {
        throw new Error(`Failed to open database: ${dbError.message}`);
      }

      const tx = db.transaction(['projects', 'images'], 'readonly');
      const projectStore = tx.objectStore('projects');
      const imageStore = tx.objectStore('images');
      const slot = document.getElementById('project-slot').value;
      const project = await new Promise(resolve => projectStore.get(slot).onsuccess = e => resolve(e.target.result));

      if (!project) {
        alert(`No saved project found in ${slot}`);
        return;
      }

      TraitManager.traits = [];
      traitImages = [];
      traitContainer.innerHTML = '';
      if (preview) preview.innerHTML = '';

      document.getElementById('project-name').value = project.name;
      document.getElementById('project-size').value = project.size || '600x600';
      document.getElementById('project-description').value = project.description || '';

      for (const savedTrait of project.traits) {
        const newTrait = {
          id: savedTrait.id,
          position: savedTrait.position,
          name: savedTrait.name,
          selected: savedTrait.selected,
          zIndex: savedTrait.zIndex,
          variants: [],
          createdAt: savedTrait.createdAt || Date.now()
        };
        TraitManager.traits.push(newTrait);

        for (const savedVariant of savedTrait.variants) {
          let imageData;
          try {
            imageData = await new Promise(resolve => imageStore.get(`${savedTrait.id}_${savedVariant.id}`).onsuccess = e => resolve(e.target.result));
          } catch (fetchError) {
            debugLog(`Failed to fetch image data for variant ${savedVariant.id} in trait ${savedTrait.id}:`, fetchError);
            continue;
          }

          if (imageData?.data) {
            try {
              const variantData = {
                id: savedVariant.id,
                name: savedVariant.name,
                url: URL.createObjectURL(new Blob([imageData.data], { type: 'image/webp' })),
                data: imageData.data,
                chance: savedVariant.chance,
                createdAt: savedVariant.createdAt
              };
              newTrait.variants.push(variantData);
              debugLog(`Loaded variant ${variantData.id} for trait ${savedTrait.id}: Image present`);
            } catch (urlError) {
              debugLog(`Error creating Blob URL for variant ${savedVariant.id} in trait ${savedTrait.id}:`, urlError);
            }
          } else {
            debugLog(`Missing image data for variant ${savedVariant.id} in trait ${savedTrait.id}`);
          }
        }
      }

      TraitManager.sortTraits();
      TraitManager.getAllTraits().forEach(trait => {
        addTrait(trait);
        const input = document.getElementById(`trait${trait.id}-name`);
        if (input) {
          input.value = trait.name || input.placeholder;
          input.dataset.userEntered = trait.name ? 'true' : 'false';
          refreshTraitGrid(trait.id);
          if (trait.variants.length > 0) (trait.id, trait.variants[trait.selected].id);
        }
      });

      projectLoadedSuccessfully = true;
    } catch (err) {
      console.error('Load failed:', err, err.stack);
      if (!projectLoadedSuccessfully) {
        alert('Failed to load project');
      } else {
        debugLog('Project loaded successfully despite error:', err);
      }
    }

    // Move post-load operations outside the try-catch to avoid catching their errors
    try {
      initializePositions();
      debouncedUpdatePreviewSamples();
      await populateProjectSlots();
    } catch (postLoadError) {
      debugLog('Error in post-load operations:', postLoadError);
    }
  }

  async function deleteProject() {
    try {
      const slot = document.getElementById('project-slot').value;
      const db = await openDB();
      const tx = db.transaction(['projects', 'images'], 'readwrite');
      const projectStore = tx.objectStore('projects');
      const imageStore = tx.objectStore('images');

      const project = await new Promise(resolve => projectStore.get(slot).onsuccess = () => resolve(e.target.result));
      if (!project) {
        alert('No project found in ' + slot);
        return;
      }

      if (!confirm('Are you sure you want to delete project "' + project.name + '" from ' + slot + '?')) return;

      for (const trait of project.traits) {
        for (const variant of trait.variants) {
          const imageId = trait.id + '_' + variant.id;
          await new Promise(resolve => imageStore.delete(imageId).onsuccess = () => resolve());
        }
      }

      await new Promise(resolve => projectStore.delete(slot).onsuccess = () => resolve());

      alert('Deleted project "' + project.name + '" from ' + slot);
      await populateProjectSlots();
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Failed to delete project');
    }
  }

  updatePreviewsButton.addEventListener('click', () => {
    updatePreviewSamples();
  });

  generateButton.addEventListener('click', () => fetchMultipleBackgrounds(1));
  document.getElementById('gen-4x')?.addEventListener('click', () => fetchMultipleBackgrounds(4));
  document.getElementById('gen-16x')?.addEventListener('click', () => fetchMultipleBackgrounds(16));

  const projectSizeSelect = document.getElementById('project-size');
  const customSizeGroup = document.getElementById('custom-size-group');
  if (projectSizeSelect && customSizeGroup) {
    projectSizeSelect.onchange = () => {
      customSizeGroup.style.display = projectSizeSelect.value === 'custom' ? 'block' : 'none';
      document.getElementById('width-input').value = '600';
      document.getElementById('height-input').value = '600';
    };
  }

  const saveButton = document.getElementById('save-project');
  const loadButton = document.getElementById('load-project');
  const deleteButton = document.getElementById('delete-project');

  if (saveButton) {
    saveButton.addEventListener('click', async () => {
      try {
        await saveProject();
      } catch (err) {
        console.error('Save failed:', err);
        alert('Failed to save project');
      }
    });
  }

  if (loadButton) {
    loadButton.addEventListener('click', async () => {
      try {
        await loadProject();
      } catch (err) {
        console.error('Load failed:', err);
        alert('Failed to load project');
      }
    });
  }

  if (deleteButton) {
    deleteButton.addEventListener('click', async () => {
      try {
        await deleteProject();
      } catch (err) {
        console.error('Delete failed:', err);
        alert('Failed to delete project');
      }
    });
  }

  const infoTooltip = document.querySelector('.info-tooltip');
  if (infoTooltip) {
    infoTooltip.addEventListener('click', (e) => {
      e.preventDefault();
      const tooltipText = infoTooltip.getAttribute('title');
      alert(tooltipText);
    });
  }

  if (magnifyEmoji) {
    magnifyEmoji.addEventListener("click", () => {
      const magnifyPanel = document.getElementById("magnify-panel");
      if (magnifyPanel) {
        magnifyPanel.style.display = "block";
        const maxWidth = window.innerWidth * 0.9;
        const maxHeight = window.innerHeight * 0.9;
        let scale = 1;
        const enlargedSize = 900; // #enlarged-preview is 900px
        if (maxWidth / maxHeight > 1) {
          enlargedPreview.style.height = `${maxHeight - 60}px`;
          enlargedPreview.style.width = `${maxHeight - 60}px`;
          scale = (maxHeight - 60) / enlargedSize;
        } else {
          enlargedPreview.style.width = `${maxWidth - 60}px`;
          enlargedPreview.style.height = `${maxWidth - 60}px`;
          scale = (maxWidth - 60) / enlargedSize;
        }

        const controls = document.getElementById("enlarged-preview-controls");
        if (controls) controls.style.display = "flex";

        const magnifiedState = TraitManager.getAllTraits()
          .map((trait) => ({
            id: trait.id,
            variants: [...trait.variants],
            selected: trait.selected,
            position: trait.position,
            zIndex: trait.zIndex,
          }))
          .sort((a, b) => b.position - a.position);

        const updateEnlargedPreview = async () => {
          enlargedPreview.innerHTML = "";
          const enlargedRect = enlargedPreview.getBoundingClientRect();
          const enlargedWidth = enlargedRect.width;
          const sizeScaleFactor = enlargedWidth / DIMENSIONS.BASE_SIZE;
          debugLog(`Magnify update: enlargedWidth=${enlargedWidth}, sizeScaleFactor=${sizeScaleFactor}`);

          const imagePromises = magnifiedState.map(async (trait) => {
            const variant = trait.variants[trait.selected];
            if (variant && variant.url) {
              const img = document.createElement("img");
              img.style.position = "absolute";
              img.style.zIndex = trait.zIndex;
              img.style.visibility = "hidden";

              let natWidth = DIMENSIONS.BASE_SIZE;
              let natHeight = DIMENSIONS.BASE_SIZE;
              const tempImg = new Image();
              tempImg.src = variant.url;
              await new Promise((resolve) => {
                tempImg.onload = () => {
                  natWidth = tempImg.naturalWidth;
                  natHeight = tempImg.naturalHeight;
                  img.src = variant.url;
                  resolve();
                };
                tempImg.onerror = () => {
                  img.src = "https://via.placeholder.com/150";
                  resolve();
                };
              });

              const scaledWidth = (natWidth > 0 ? natWidth : DIMENSIONS.BASE_SIZE) * sizeScaleFactor;
              const scaledHeight = (natHeight > 0 ? natHeight : DIMENSIONS.BASE_SIZE) * sizeScaleFactor;
              img.style.width = `${scaledWidth}px`;
              img.style.height = `${scaledHeight}px`;

              const key = `trait${trait.id}-${variant.id}-position`;
              const savedPosition = localStorage.getItem(key);
              let finalLeft = "50%";
              let finalTop = "50%";
              let transform = "translate(-50%, -50%)";
              try {
                if (savedPosition) {
                  const { left, top } = JSON.parse(savedPosition);
                  finalLeft = `${left}%`;
                  finalTop = `${top}%`;
                  transform = "";
                }
              } catch (e) {
                debugLog("Invalid position data for magnified trait " + trait.id + ":", e);
              }
              img.style.left = finalLeft;
              img.style.top = finalTop;
              if (transform) {
                img.style.transform = transform;
              } else {
                img.style.removeProperty("transform");
              }

              img.style.visibility = "visible";
              return img;
            }
            return null;
          });

          const loadedImages = await Promise.all(imagePromises);
          loadedImages.forEach(img => {
            if (img) enlargedPreview.appendChild(img);
          });

          debugLog("Magnify Panel updated with scaled images");
        };
        updateEnlargedPreview();

        const playEmoji = document.getElementById("play-emoji");
        const pauseEmoji = document.getElementById("pause-emoji");

        if (playEmoji) {
          playEmoji.onclick = (e) => {
            e.stopPropagation();
            debugLog("Play clicked");
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
                debugLog(`Randomized trait ${trait.id} to variant ${trait.selected}`);
                const traitInMain = TraitManager.getTrait(trait.id);
                traitInMain.selected = trait.selected;
                const previewImage = traitImages.find((img) => img.id === `preview-trait${trait.id}`);
                if (previewImage) {
                  previewImage.src = trait.variants[trait.selected].url;
                  applyScalingToImage(previewImage);
                  const key = `trait${trait.id}-position`;
                  const savedPosition = localStorage.getItem(key);
                  try {
                    if (savedPosition) {
                      const { left, top } = JSON.parse(savedPosition);
                      previewImage.style.left = `${left}%`;
                      previewImage.style.top = `${top}%`;
                    }
                  } catch (e) {
                    debugLog("Invalid position data in playEmoji:", e);
                    previewImage.style.left = "0%";
                    previewImage.style.top = "0%";
                  }
                }
                updateEnlargedPreview();
              }
            }, currentSpeed);
          };
        }

        if (pauseEmoji) {
          pauseEmoji.onclick = (e) => {
            e.stopPropagation();
            if (randomizeInterval) {
              clearInterval(randomizeInterval);
              randomizeInterval = null;
              currentSpeed = 1000;
            }
          };
        }

        enlargedPreview.addEventListener("contextmenu", (e) => {
          e.preventDefault();
          const projectName = document.getElementById("project-name").value || "Unnamed";
          let saveCount = parseInt(localStorage.getItem(`${projectName}_saveCount`) || 0) + 1;
          if (saveCount > 100) {
            debugLog("Save limit reached");
            return;
          }
          localStorage.setItem(`${projectName}_saveCount`, saveCount);
          const saveKey = `${projectName}_${saveCount}`;
          const currentState = magnifiedState.map((trait) => ({
            id: trait.id,
            selected: trait.selected,
            variants: trait.variants.map((v) => ({ id: v.id, name: v.name, url: v.url })),
          }));
          localStorage.setItem(saveKey, JSON.stringify(currentState));
          debugLog(`Saved as ${saveKey}`);
        });

        enlargedPreview.onclick = (e) => {
          if (e.target === playEmoji || e.target === pauseEmoji) return;
          if (randomizeInterval) {
            clearInterval(randomizeInterval);
            randomizeInterval = null;
            currentSpeed = 1000;
          }
          magnifyPanel.style.display = "none";
          controls.style.display = "none";
        };
      }
    });
  }

  function debounce(func, wait) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  directionEmojis.forEach(emoji => {
    const direction = emoji.getAttribute('data-direction');
    emoji.addEventListener('mousedown', async () => {
      // Use the currently selected trait (currentImage)
      if (!currentImage || !isValidImage(currentImage)) {
        // Fallback to first valid image if none selected
        currentImage = traitImages.find(img => isValidImage(img));
      }
      if (!currentImage) return;

      // Ensure the image is scaled before moving
      await applyScalingToImage(currentImage);

      moveInterval = setInterval(() => {
        let left = parseFloat(currentImage.style.left) || 0;
        let top = parseFloat(currentImage.style.top) || 0;
        const contentWidth = preview.getBoundingClientRect().width;
        const contentHeight = contentWidth;
        const imgWidth = parseFloat(currentImage.style.width) || contentWidth;
        const imgHeight = parseFloat(currentImage.style.height) || contentHeight;

        let leftPx = (left / 100) * contentWidth;
        let topPx = (top / 100) * contentHeight;

        if (direction === 'up') topPx -= 1;
        if (direction === 'down') topPx += 1;
        if (direction === 'left') leftPx -= 1;
        if (direction === 'right') leftPx += 1;

        leftPx = Math.max(0, Math.min(leftPx, contentWidth - imgWidth));
        topPx = Math.max(0, Math.min(topPx, contentHeight - imgHeight));

        left = (leftPx / contentWidth) * 100;
        top = (topPx / contentHeight) * 100;

        currentImage.style.left = left + '%';
        currentImage.style.top = top + '%';
        currentImage.classList.add('dragging');
        updateCoordinates(currentImage);
      }, 50);
    });

    emoji.addEventListener('mouseup', () => {
      if (moveInterval) {
        clearInterval(moveInterval);
        moveInterval = null;
        if (currentImage) {
          const traitId = currentImage.id.substring('preview-trait'.length);
          const trait = TraitManager.getTrait(traitId);
          const variationName = trait.variants[trait.selected].name;
          savePosition(currentImage, traitId, variationName);
          currentImage.classList.remove('dragging');
          TraitManager.sortTraits();
        }
      }
    });

    emoji.addEventListener('mouseleave', () => {
      if (moveInterval) {
        clearInterval(moveInterval);
        moveInterval = null;
        if (currentImage) {
          const traitId = currentImage.id.substring('preview-trait'.length);
          const trait = TraitManager.getTrait(traitId);
          const variationName = trait.variants[trait.selected].name;
          savePosition(currentImage, traitId, variationName);
          currentImage.classList.remove('dragging');
          TraitManager.sortTraits();
        }
      }
    });
  });

  document.addEventListener('keydown', debounce((e) => {
    const now = Date.now();
    if (now - lastUndoTime < 300) return;
    lastUndoTime = now;

    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      e.preventDefault();
      if (!currentImage) return;
      const traitId = currentImage.id.substring('preview-trait'.length);
      const trait = TraitManager.getTrait(traitId);
      const variationName = trait.variants[trait.selected].name;
      const key = 'trait' + traitId + '-position';
      if (variantHistories[key] && variantHistories[key].length > 1) {
        variantHistories[key].pop();
        const previousPosition = variantHistories[key][variantHistories[key].length - 1];
        currentImage.style.left = previousPosition.left + '%';
        currentImage.style.top = previousPosition.top + '%';
        localStorage.setItem(key, JSON.stringify(previousPosition));
        updateCoordinates(currentImage);
        updateSamplePositions(traitId, trait.variants[trait.selected].id, previousPosition);
      }
    }
  }, 32));

  const chosenCountInput = document.getElementById('chosen-count');
  const updateChosenGridButton = document.getElementById('update-chosen-grid');
  if (chosenCountInput && updateChosenGridButton) {
    updateChosenGrid(parseInt(chosenCountInput.value));
    updateChosenGridButton.addEventListener('click', () => {
      updateChosenGrid(parseInt(chosenCountInput.value));
    });
    chosenCountInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        updateChosenGrid(parseInt(chosenCountInput.value));
      }
    });
  }

  const chosenGrid = document.getElementById('chosen-grid');
  if (chosenGrid) {
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
        target.style.border = '1px solid rgba(0, 0, 0, 0.1)';
      }
    });
    chosenGrid.addEventListener('drop', (e) => {
      e.preventDefault();
      const imageUrl = e.dataTransfer.getData('text/plain');
      const source = e.dataTransfer.getData('source');
      const target = e.target.closest('.chosen-image-container');
      if (!target || !imageUrl) return;

      target.style.border = '1px solid rgba(0, 0, 0, 0.1)';

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

    chosenGrid.querySelectorAll('.chosen-image-container img').forEach(img => {
      img.draggable = true;
      img.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', img.src);
        e.dataTransfer.setData('source', 'chosen-grid');
      });
    });
  }

  const logo = document.getElementById('logo');
  if (logo) debugLog('Logo URL:', logo.src);
});


/* Section 4 ----------------------------------------- TRAIT MANAGEMENT FUNCTIONS (PART 1) ------------------------------------------------*/




function addTrait(trait) {
  const traitSection = document.createElement("div");
  traitSection.id = `trait${trait.id}`;
  traitSection.className = "trait-section";

  const traitHeader = document.createElement("div");
  traitHeader.className = "trait-header";
  const title = document.createElement("h2");
  title.textContent = `TRAIT ${traitContainer.children.length + 1}`;
  if (trait.name) {
    title.textContent += ` - ${trait.name}`;
  }
  const controls = document.createElement("div");
  controls.className = "trait-controls";
  const upArrow = document.createElement("span");
  upArrow.className = "up-arrow";
  upArrow.setAttribute("data-trait", trait.id);
  upArrow.setAttribute("data-tooltip", "Swap Trait Order");
  upArrow.textContent = "⬆️";
  const downArrow = document.createElement("span");
  downArrow.className = "down-arrow";
  downArrow.setAttribute("data-trait", trait.id);
  downArrow.setAttribute("data-tooltip", "Swap Trait Order");
  downArrow.textContent = "⬇️";
  const addTraitBtn = document.createElement("span");
  addTraitBtn.className = "add-trait";
  addTraitBtn.setAttribute("data-trait", trait.id);
  addTraitBtn.textContent = "➕";
  const removeTraitBtn = document.createElement("span");
  removeTraitBtn.className = "remove-trait";
  removeTraitBtn.setAttribute("data-trait", trait.id);
  removeTraitBtn.textContent = "➖";
  controls.appendChild(upArrow);
  controls.appendChild(downArrow);
  controls.appendChild(addTraitBtn);
  controls.appendChild(removeTraitBtn);
  traitHeader.appendChild(title);
  traitHeader.appendChild(controls);

  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.id = `trait${trait.id}-name`;
  nameInput.placeholder = `Trait Name (e.g., ${traitContainer.children.length + 1 === 1 ? "Eyes" : traitContainer.children.length + 1 === 2 ? "Hair" : "Accessories"})`;
  nameInput.value = trait.name || "";

  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.id = `trait${trait.id}-files`;
  fileInput.accept = "image/png,image/webp";
  fileInput.multiple = true;

  const fileInputLabel = document.createElement("label");
  fileInputLabel.className = "file-input-label";
  fileInputLabel.htmlFor = `trait${trait.id}-files`;
  fileInputLabel.textContent = "Choose Files";

  const grid = document.createElement("div");
  grid.id = `trait${trait.id}-grid`;
  grid.className = "trait-grid";

  traitSection.appendChild(traitHeader);
  traitSection.appendChild(nameInput);
  traitSection.appendChild(fileInput);
  traitSection.appendChild(fileInputLabel);
  traitSection.appendChild(grid);

  const existingSections = traitContainer.querySelectorAll(".trait-section");
  let inserted = false;
  for (let i = 0; i < existingSections.length; i++) {
    const existingSection = existingSections[i];
    const existingTraitId = existingSection.id.replace("trait", "");
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

  let traitImage = traitImages.find((img) => img.id === `preview-trait${trait.id}`);
  if (!traitImage) {
    traitImage = document.createElement("img");
    traitImage.id = `preview-trait${trait.id}`;
    traitImage.src = "";
    traitImage.alt = "";
    traitImage.style.zIndex = TraitManager.getAllTraits().length - trait.position + 1;
    traitImage.style.visibility = "hidden";
    traitImages.push(traitImage);
  }

  if (preview) {
    const sortedTraits = TraitManager.getAllTraits().sort((a, b) => a.position - b.position);
    const existingImages = Array.from(preview.children);
    const newImages = sortedTraits.map((trait) => {
      let img = traitImages.find((i) => i.id === `preview-trait${trait.id}`);
      if (!img) {
        img = document.createElement("img");
        img.id = `preview-trait${trait.id}`;
        img.src = "";
        img.alt = "";
        img.style.visibility = "hidden";
        traitImages.push(img);
      }
      img.style.zIndex = TraitManager.getAllTraits().length - trait.position + 1;
      return img;
    });

    existingImages.forEach((img) => {
      if (!newImages.includes(img)) {
        preview.removeChild(img);
      }
    });
    newImages.forEach((img) => {
      if (!preview.contains(img)) {
        preview.appendChild(img);
      }
    });

    debugLog(`Added trait image ${traitImage.id} to preview, position: ${trait.position}, zIndex: ${traitImage.style.zIndex}`);
  }

  setupTraitListeners(trait.id);
  requestAnimationFrame(() => {
    debugLog(`Setting up drag-and-drop for trait ${trait.id}, image:`, traitImage);
    setupDragAndDrop(traitImage, TraitManager.getAllTraits().findIndex((t) => t.id === trait.id));
  });
  updateZIndices();
}

function removeTrait(traitId) {
  if (TraitManager.getAllTraits().length <= 1) return;

  const confirmationDialog = document.createElement("div");
  confirmationDialog.className = "confirmation-dialog";
  const message = document.createElement("p");
  message.textContent = `Are you sure you want to delete Trait ${TraitManager.getTrait(traitId).position}?`;
  const buttonsDiv = document.createElement("div");
  buttonsDiv.className = "buttons";
  const yesButton = document.createElement("button");
  yesButton.className = "yes-button";
  yesButton.textContent = "Y";
  const noButton = document.createElement("button");
  noButton.className = "no-button";
  noButton.textContent = "N";

  yesButton.addEventListener("click", () => {
    TraitManager.removeTrait(traitId);
    const traitSection = document.getElementById(`trait${traitId}`);
    if (traitSection) traitSection.remove();
    const traitImageIndex = traitImages.findIndex((img) => img.id === `preview-trait${traitId}`);
    if (traitImageIndex !== -1) traitImages.splice(traitImageIndex, 1);
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith(`trait${traitId}-`)) localStorage.removeItem(key);
    });
    renumberTraits();
    updateZIndices();
    updatePreviewSamples();
    confirmationDialog.remove();
  });

  noButton.addEventListener("click", () => confirmationDialog.remove());

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
    nameInput.dataset.userEntered = 'false';
    nameInput.addEventListener('input', () => {
      const trait = TraitManager.getTrait(traitId);
      const position = Array.from(traitContainer.children).indexOf(nameInput.parentElement) + 1;
      const placeholderPattern = `Trait Name (e.g., ${position === 1 ? 'Eyes' : position === 2 ? 'Hair' : 'Accessories'})`;
      const trimmedValue = nameInput.value.trim();
      if (trimmedValue && trimmedValue !== placeholderPattern) {
        nameInput.dataset.userEntered = 'true';
        trait.name = trimmedValue;
      } else {
        nameInput.dataset.userEntered = 'false';
        trait.name = '';
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
      if (nameInput.dataset.userEntered !== 'true') {
        trait.name = '';
        nameInput.value = placeholderPattern;
      }

      trait.variants = [];
      grid.innerHTML = '';

      // Clear old position data for this trait
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(`trait${traitId}-`)) {
          localStorage.removeItem(key);
        }
      });

      for (const file of files) {
        const variationName = file.name.split('.').slice(0, -1).join('.');
        const url = URL.createObjectURL(file);
        const data = await file.arrayBuffer();
        const variant = TraitManager.addVariant(traitId, { name: variationName, url });
        variant.data = data;

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
          debugLog(`Clicked variant: Trait ${traitId}, Variation ${variationName}`);
          const allWrappers = grid.querySelectorAll('.variation-image-wrapper');
          allWrappers.forEach(w => w.classList.remove('selected'));
          imageWrapper.classList.add('selected');
          (traitId, variant.id);
        });

        grid.appendChild(container);

        const key = `trait${traitId}-${variant.id}-position`;
        if (!variantHistories[key]) {
          variantHistories[key] = [{ left: 0, top: 0 }];
          localStorage.setItem(key, JSON.stringify({ left: 0, top: 0 }));
          localStorage.removeItem(`trait${traitId}-${variationName}-manuallyMoved`);
        }
      }

      if (trait.variants.length > 0) {
        const randomIndex = Math.floor(Math.random() * trait.variants.length);
        (traitId, trait.variants[randomIndex].id);
        const firstWrapper = grid.querySelector('.variation-image-wrapper');
        if (firstWrapper) firstWrapper.classList.add('selected');
        autoPositioned[TraitManager.getAllTraits().findIndex(t => t.id === traitId)] = false;
        fileInputLabel.textContent = 'Choose New Files';
      }

      updateMintButton();
      debouncedUpdatePreviewSamples();
    });
  }

  const upArrow = document.querySelector(`.up-arrow[data-trait="${traitId}"]`);
  const downArrow = document.querySelector(`.down-arrow[data-trait="${traitId}"]`);
  const addTraitBtn = document.querySelector(`.add-trait[data-trait="${traitId}"]`);
  const removeTraitBtn = document.querySelector(`.remove-trait[data-trait="${traitId}"]`);

  upArrow.addEventListener('click', () => {
    const trait = TraitManager.getTrait(traitId);
    const newPosition = trait.position === 1 ? TraitManager.getAllTraits().length : trait.position - 1;
    TraitManager.moveTrait(traitId, newPosition);
    const traitSection = document.getElementById(`trait${traitId}`);
    const sibling = traitSection.parentNode.children[newPosition - 1];
    if (sibling && sibling !== traitSection) {
      traitSection.parentNode.insertBefore(traitSection, sibling);
    } else if (!sibling) {
      traitSection.parentNode.appendChild(traitSection);
    }
    renumberTraits();
    updateZIndices();
    updatePreviewSamples();
  });

  downArrow.addEventListener('click', () => {
    const trait = TraitManager.getTrait(traitId);
    const lastPosition = TraitManager.getAllTraits().length;
    const newPosition = trait.position === lastPosition ? 1 : trait.position + 1;
    TraitManager.moveTrait(traitId, newPosition);
    const traitSection = document.getElementById(`trait${traitId}`);
    const sibling = traitSection.parentNode.children[newPosition - 1];
    if (sibling && sibling !== traitSection) {
      traitSection.parentNode.insertBefore(traitSection, sibling);
    } else if (!sibling) {
      traitSection.parentNode.appendChild(traitSection);
    }
    renumberTraits();
    updateZIndices();
    updatePreviewSamples();
  });

  addTraitBtn.addEventListener('click', () => {
    if (TraitManager.getAllTraits().length < 20) {
      const trait = TraitManager.getTrait(traitId);
      const newTrait = TraitManager.addTrait(trait.position);
      addTrait(newTrait);
      renumberTraits();
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
      debugLog(`Clicked variant: Trait ${traitId}, Variation ${variant.name}`);
      const allWrappers = grid.querySelectorAll('.variation-image-wrapper');
      allWrappers.forEach(w => w.classList.remove('selected'));
      imageWrapper.classList.add('selected');
      (traitId, variant.id);
    });

    grid.appendChild(container);
  }

  const selectedIndex = trait.selected;
  const selectedWrapper = grid.children[selectedIndex]?.querySelector('.variation-image-wrapper');
  if (selectedWrapper) selectedWrapper.classList.add('selected');

  const previewImage = traitImages.find(img => img.id === `preview-trait${traitId}`);
  if (previewImage && isValidImage(previewImage) && trait.variants[trait.selected]) {
    const key = `trait${traitId}-${trait.variants[trait.selected].id}-position`;
    const savedPosition = localStorage.getItem(key);
    if (savedPosition) {
      try {
        const { left, top } = JSON.parse(savedPosition);
        previewImage.style.left = `${left}%`;
        previewImage.style.top = `${top}%`;
        debugLog(`refreshTraitGrid: Applied position for Trait ${traitId}, Variant ${trait.variants[trait.selected].id}: left=${left}%, top=${top}%`);
      } catch (e) {
        debugLog('Invalid position data in refreshTraitGrid:', e);
        previewImage.style.left = '0%';
        previewImage.style.top = '0%';
      }
    } else {
      previewImage.style.left = '0%';
      previewImage.style.top = '0%';
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

class ScalingManager {
  static baseSize = 600;  // Updated to match DIMENSIONS.BASE_SIZE
  static getScaleFactor(currentSize) {
    return currentSize / this.baseSize;
  }
  static applyScaling(element, container) {
    const currentSize = container.getBoundingClientRect().width;
    const scale = this.getScaleFactor(currentSize);
    if (element.naturalWidth && element.naturalHeight) {
      element.style.width = (element.naturalWidth * scale) + "px";
      element.style.height = (element.naturalHeight * scale) + "px";
    }
    return scale;
  }
}

function isValidImage(img) {
  return img && img.src && img.src !== "" && img.naturalWidth > 0;
}

function normalizePosition(leftPercent, topPercent, previewWidth, previewHeight, targetWidth, targetHeight) {
  const leftPx = (leftPercent / 100) * previewWidth;
  const topPx = (topPercent / 100) * previewHeight;
  return {
    left: (leftPx / previewWidth) * targetWidth,
    top: (topPx / previewHeight) * targetHeight,
  };
}

function calculateScalingFactor(container = preview) {
  if (!container) return 1;
  const width = container.clientWidth;
  debugLog(`calculateScalingFactor: container=${container.id}, width=${width}`);
  return width / DIMENSIONS.BASE_SIZE;
}

async function applyScalingToImage(img) {
  return new Promise((resolve) => {
    if (!img || !img.src) {
      img.style.width = `${DIMENSIONS.BASE_SIZE}px`;
      img.style.height = `${DIMENSIONS.BASE_SIZE}px`;
      return resolve();
    }

    const tempImg = new Image();
    tempImg.onload = () => {
      const scale = calculateScalingFactor(img.parentElement);
      img.naturalWidth = tempImg.naturalWidth;
      img.naturalHeight = tempImg.naturalHeight;
      img.style.width = `${tempImg.naturalWidth * scale}px`;
      img.style.height = `${tempImg.naturalHeight * scale}px`;
      debugLog(`Applied scaling to ${img.id}: width=${img.style.width}, height=${img.style.height}, scale=${scale}`);
      resolve();
    };
    tempImg.onerror = () => {
      img.style.width = `${DIMENSIONS.BASE_SIZE}px`;
      img.style.height = `${DIMENSIONS.BASE_SIZE}px`;
      debugLog(`Error loading image for scaling in ${img.id}, using default size`);
      resolve();
    };
    tempImg.src = img.src;
  });
}

function applyScalingToTraits() {
  traitImages.forEach((img) => {
    if (img.src && img.src !== "") {
      applyScalingToImage(img);
    }
  });
}

function applyScalingToSamples() {
  const sampleImages = document.querySelectorAll("#preview-samples-grid .sample-preview img");
  sampleImages.forEach((img) => {
    if (img.src && img.src !== "") {
      applyScalingToImage(img).then(() => {
        const containerWidth = DIMENSIONS.BASE_SIZE;
        const containerHeight = DIMENSIONS.BASE_SIZE;
        const imgWidth = parseFloat(img.style.width) || 0;
        const imgHeight = parseFloat(img.style.height) || 0;
        img.style.left = (containerWidth - imgWidth) / 2 + "px";
        img.style.top = (containerHeight - imgHeight) / 2 + "px";
      });
    }
  });
}

function initializePositions() {
    debugLog("Running initializePositions..."); // Added log
    TraitManager.getAllTraits().forEach((trait) => {
        const img = traitImages.find((ti) => ti.id === "preview-trait" + trait.id);

        // Ensure trait, image, variants exist and selection is valid
        if (img && trait.variants && trait.variants.length > 0 && trait.selected >= 0 && trait.selected < trait.variants.length) {
            const selectedVariant = trait.variants[trait.selected];

            // *** Get the name of the selected variant ***
            const variantName = selectedVariant.name;

            if (!variantName) {
                 console.error(`initializePositions: Variant name is missing for selected variant index ${trait.selected} in trait ${trait.id}`);
                 img.style.visibility = "hidden"; // Hide if data is inconsistent
                 return; // Skip this trait image
            }

             debugLog(`initializePositions: Processing Trait ${trait.id}, Selected Variant Name: ${variantName}`);

             // Apply scaling first (ensure it completes if async)
            applyScalingToImage(img).then(() => { // Assuming applyScalingToImage might be async
                // *** MODIFIED: Use variantName for the localStorage key lookup ***
                const key = `trait${trait.id}-${variantName}-position`;
                const savedPosition = localStorage.getItem(key);
                 debugLog(`initializePositions: Looking for key "${key}" in localStorage. Found: ${savedPosition ? 'Yes' : 'No'}`);

                try {
                    if (savedPosition) {
                        const { left, top } = JSON.parse(savedPosition);
                        // Optional: Add boundary checks based on scaled size if necessary
                        img.style.left = left + "%";
                        img.style.top = top + "%";
                        debugLog(`initializePositions: Applied position for Trait ${trait.id}, Variant ${variantName}: left=${left}%, top=${top}%`);
                    } else {
                        // Default position if not found in localStorage
                        img.style.left = "0%";
                        img.style.top = "0%";
                        debugLog(`initializePositions: No position found for Trait ${trait.id}, Variant ${variantName}. Defaulting to 0%, 0%.`);
                    }
                } catch (e) {
                    console.error(`initializePositions: Invalid position data for trait ${trait.id}, Variant ${variantName}:`, e, `Raw data: "${savedPosition}"`);
                    img.style.left = "0%";
                    img.style.top = "0%";
                    localStorage.removeItem(key); // Clear invalid data
                }
                 // Ensure image visibility matches its state after potentially loading src in loadProject/selectVariation
                 if (img.src && img.src !== "" && !img.src.includes('placeholder.com') && selectedVariant.url === img.src) {
                      img.style.visibility = "visible";
                 } else {
                      img.style.visibility = "hidden";
                      if (selectedVariant.url !== img.src) {
                           debugLog(`initializePositions: Hiding image ${img.id} because its src (${img.src}) doesn't match selected variant URL (${selectedVariant.url})`);
                      }
                 }
            }).catch(error => {
                 console.error(`Error applying scaling during initializePositions for ${img.id}:`, error);
                 // Handle scaling error, maybe default position and hide?
                 img.style.left = "0%";
                 img.style.top = "0%";
                 img.style.visibility = "hidden";
            });

        } else if (img) {
             // Handle cases where the image element exists but trait/variant data is inconsistent after load
             img.style.visibility = "hidden";
             img.style.left = "0%";
             img.style.top = "0%";
             if(!trait.variants || trait.variants.length === 0) {
                debugLog(`initializePositions: Trait ${trait.id} has no variants.`);
             } else {
                debugLog(`initializePositions: Trait ${trait.id} has invalid selected index: ${trait.selected}`);
             }
        } else {
             debugLog(`initializePositions: Preview image not found for trait ${trait.id}`);
        }
    });
     debugLog("Finished initializePositions."); // Added log
}

async function selectVariation(traitId, variationId) {
  const trait = TraitManager.getTrait(traitId);
  const variationIndex = trait.variants.findIndex((v) => v.id === variationId);
  if (variationIndex === -1) {
    debugLog("Variation " + variationId + " not found in Trait " + traitId);
    return;
  }
  trait.selected = variationIndex; // Keep track of selection for the trait manager grid

  const selectedVariant = trait.variants[variationIndex]; // Get the selected variant object
  const variantName = selectedVariant.name; // Get its stable name

  const previewImage = traitImages.find((img) => img.id === "preview-trait" + traitId);
  if (previewImage) {
    const variantUrl = selectedVariant.url || "https://via.placeholder.com/600";
    previewImage.src = variantUrl;

    // *** ADDED: Store the stable variant name on the image element ***
    previewImage.dataset.variantName = variantName;

    previewImage.style.visibility = "visible";
    debugLog(
      "Selected variation " +
        variationId + // Log original ID for debugging context if needed
        " (Name: " + variantName + ")" + // Log the name used for keys
        " for trait " +
        traitId +
        ", src: " +
        previewImage.src +
        ", visibility: " +
        previewImage.style.visibility +
        ", previewWidth: " +
        preview.getBoundingClientRect().width
    );

    // Ensure image is scaled before applying position
    await applyScalingToImage(previewImage);

    // *** MODIFIED: Use variantName for the localStorage key ***
    const key = `trait${traitId}-${variantName}-position`;
    const savedPosition = localStorage.getItem(key);
    const historyKey = `trait${traitId}-${variantName}-history`; // History key also uses name

    const contentWidth = preview.getBoundingClientRect().width;
    const contentHeight = contentWidth;
    const imgWidth = parseFloat(previewImage.style.width) || contentWidth;
    const imgHeight = parseFloat(previewImage.style.height) || contentHeight;
    const maxLeft = ((contentWidth - imgWidth) / contentWidth) * 100;
    const maxTop = ((contentHeight - imgHeight) / contentHeight) * 100;

    try {
      if (savedPosition) {
        const { left, top } = JSON.parse(savedPosition);
        // Apply boundaries if needed (normalizePosition could be used if necessary)
        const boundedLeft = Math.max(0, Math.min(left, maxLeft));
        const boundedTop = Math.max(0, Math.min(top, maxTop));

        previewImage.style.left = boundedLeft + "%";
        previewImage.style.top = boundedTop + "%";

        // Initialize history if it doesn't exist based on localStorage
        if (!variantHistories[historyKey]) {
           try {
             const storedHistory = localStorage.getItem(historyKey);
             variantHistories[historyKey] = storedHistory ? JSON.parse(storedHistory) : [{ left: boundedLeft, top: boundedTop }];
           } catch (e) {
             variantHistories[historyKey] = [{ left: boundedLeft, top: boundedTop }];
           }
        }
        debugLog(`selectVariation: Applied position for Trait ${traitId}, Variant ${variantName}: left=${boundedLeft}%, top=${boundedTop}%`);
      } else {
        // Default position if nothing is saved
        previewImage.style.left = "0%";
        previewImage.style.top = "0%";
        // Initialize history
        variantHistories[historyKey] = [{ left: 0, top: 0 }];
        // Optionally save the default 0,0 position to localStorage immediately
        // localStorage.setItem(key, JSON.stringify({ left: 0, top: 0 }));
      }
    } catch (e) {
      debugLog("Invalid position data for trait " + traitId + ", Variant " + variantName + ":", e);
      previewImage.style.left = "0%";
      previewImage.style.top = "0%";
      variantHistories[historyKey] = [{ left: 0, top: 0 }];
      localStorage.removeItem(key); // Clear corrupted data
      localStorage.removeItem(historyKey);
    }

    currentImage = previewImage; // Update global reference if needed for other controls
    updateZIndices();
    updateCoordinates(previewImage);
    applyScalingToSamples(); // Update samples if needed
    if (typeof updatePreviewSamples === "function") {
      updatePreviewSamples(); // Ensure samples reflect the change
    }
  } else {
    debugLog("Preview image for trait " + traitId + " not found in traitImages");
  }
}

// Helper function to determine if a click is on a transparent pixel
async function isTransparentClick(img, clickX, clickY) {
  if (!img || !img.src) return false;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  ctx.drawImage(img, 0, 0);

  // Adjust click coordinates to the image's natural dimensions
  const rect = img.getBoundingClientRect();
  const scaleX = img.naturalWidth / rect.width;
  const scaleY = img.naturalHeight / rect.height;
  const adjustedX = (clickX - rect.left) * scaleX;
  const adjustedY = (clickY - rect.top) * scaleY;

  const pixelData = ctx.getImageData(adjustedX, adjustedY, 1, 1).data;
  const alpha = pixelData[3]; // Alpha channel (0 = fully transparent, 255 = fully opaque)
  return alpha === 0;
}

// Helper function to find the topmost non-transparent image at a click position
async function findImageAtPosition(images, clickX, clickY) {
  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    if (!isValidImage(img)) continue;

    const rect = img.getBoundingClientRect();
    if (
      clickX >= rect.left &&
      clickX <= rect.right &&
      clickY >= rect.top &&
      clickY <= rect.bottom
    ) {
      const isTransparent = await isTransparentClick(img, clickX, clickY);
      if (!isTransparent) {
        return img;
      }
    }
  }
  // If no non-transparent image is found, return the topmost image at the position
  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    if (!isValidImage(img)) continue;

    const rect = img.getBoundingClientRect();
    if (
      clickX >= rect.left &&
      clickX <= rect.right &&
      clickY >= rect.top &&
      clickY <= rect.bottom
    ) {
      return img;
    }
  }
  return null;
}

function handleDragError(error) {
  console.error('Drag error:', error);
  if (currentImage) {
    currentImage.style.cursor = 'grab';
    currentImage.classList.remove('dragging');
  }
  isDragging = false;
  currentImage = null;
}

async function setupDragAndDrop(img, traitIndex) {
  if (!img) {
    debugLog("setupDragAndDrop: No image provided for trait index", traitIndex);
    return;
  }

  function startDragging(e) {
    e.preventDefault();
    e.stopPropagation();

    // Get all images in the preview container, sorted by z-index (highest to lowest)
    const images = Array.from(preview.children)
      .filter(child => child.tagName === "IMG" && isValidImage(child))
      .sort((a, b) => parseInt(b.style.zIndex || 0) - parseInt(a.style.zIndex || 0));

    const clickX = e.clientX;
    const clickY = e.clientY;

    // Find the topmost non-transparent image at the click position
    findImageAtPosition(images, clickX, clickY).then(targetImg => {
      if (!targetImg) {
        debugLog("startDragging: No valid image found at click position", { clickX, clickY });
        return;
      }

      try {
        // Clear any existing drag state
        if (isDragging && currentImage) {
          debugLog("startDragging: Clearing existing drag state");
          currentImage.style.cursor = "grab";
          currentImage.classList.remove("dragging");
        }

        currentImage = targetImg;
        isDragging = true;
        const rect = currentImage.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
        currentImage.style.cursor = "grabbing";
        currentImage.classList.add("dragging");
        updateCoordinates(currentImage);
        debugLog("startDragging: Started dragging", currentImage.id);
      } catch (error) {
        handleDragError(error);
      }
    }).catch(error => {
      handleDragError(error);
    });
  }

  function onMouseMove(e) {
    if (!isDragging || !currentImage) return;

    try {
      const container = preview.getBoundingClientRect();
      const contentWidth = container.width;
      const contentHeight = container.height;

      // Calculate new position (in pixels)
      let newLeft = e.clientX - container.left - offsetX;
      let newTop = e.clientY - container.top - offsetY;

      // Convert to percentages
      newLeft = (newLeft / contentWidth) * 100;
      newTop = (newTop / contentHeight) * 100;

      // Apply boundaries
      const imgWidth = parseFloat(currentImage.style.width) || contentWidth;
      const imgHeight = parseFloat(currentImage.style.height) || contentHeight;
      const maxLeft = ((contentWidth - imgWidth) / contentWidth) * 100;
      const maxTop = ((contentHeight - imgHeight) / contentHeight) * 100;

      newLeft = Math.max(0, Math.min(newLeft, maxLeft));
      newTop = Math.max(0, Math.min(newTop, maxTop));

      currentImage.style.left = `${newLeft}%`;
      currentImage.style.top = `${newTop}%`;
      updateCoordinates(currentImage);
      debugLog("onMouseMove: Updated position", { left: newLeft, top: newTop });
    } catch (error) {
      handleDragError(error);
    }
  }

function stopDragging(e) {
  e.preventDefault();
  e.stopPropagation();

  // Check if the left mouse button is actually released (e.buttons === 0 means no buttons pressed)
  // Note: Some edge cases might exist with specific mouse/trackpad drivers, but this is generally reliable.
  if (e.buttons !== 0 && e.type === 'mouseup') { // Check button state specifically on mouseup
     debugLog("stopDragging (mouseup): Mouse button potentially still pressed, ignoring event", e.buttons);
     return;
  }

  if (!isDragging || !currentImage) {
    // debugLog("stopDragging: No dragging in progress or no current image"); // Can be noisy
    // Reset states just in case they are stuck
    isDragging = false;
    if(currentImage) {
        currentImage.style.cursor = "grab";
        currentImage.classList.remove("dragging");
    }
    currentImage = null;
    return;
  }

  debugLog("stopDragging: Attempting to stop drag for", currentImage?.id);

  try {
    const traitId = currentImage.id.substring("preview-trait".length);

    // *** MODIFIED: Get the identifier directly from the dragged image's data attribute ***
    const draggedVariantName = currentImage.dataset.variantName;

    if (!draggedVariantName) {
      console.error("stopDragging: Could not determine variant name for dragged image:", currentImage.id, "Source:", currentImage.src);
      // Fallback attempt (optional): Try matching the src
      // const trait = TraitManager.getTrait(traitId);
      // const matchedVariant = trait?.variants.find(v => v.url === currentImage.src);
      // if (!matchedVariant) {
      //    throw new Error("Cannot identify dragged variant via data attribute or src match.");
      // }
      // console.warn("stopDragging: Identified variant via src match as fallback:", matchedVariant.name);
      // draggedVariantName = matchedVariant.name;
      throw new Error("Missing variant name (data-variant-name) on dragged image element."); // Fail fast
    }

    debugLog(`stopDragging: Identified dragged image as Trait ${traitId}, Variant Name: ${draggedVariantName}`);

    // *** Call savePosition with the CORRECT identifier ***
    savePosition(currentImage, traitId, draggedVariantName);

  } catch (error) {
    console.error("stopDragging: Error during stop/save process", error);
    // Ensure UI resets even if save fails
     handleDragError(error); // Make sure handleDragError exists or implement reset here
  } finally {
    // Reset dragging state regardless of success or failure inside try block
    isDragging = false;
    if (currentImage) { // Check currentImage again as it might be nullified by handleDragError
      currentImage.style.cursor = "grab";
      currentImage.classList.remove("dragging");
      updateZIndices(); // Update z-index based on final state if needed
      debugLog("stopDragging: Finalized state reset for", currentImage?.id || "image already nullified", "Variant Name:", currentImage?.dataset?.variantName);
      currentImage = null; // Clear the reference to the dragged image *after* saving attempt
    } else {
       debugLog("stopDragging: Finalized state reset, currentImage was null.");
    }
  }
}


  function selectImage(e) {
    e.stopPropagation();
    debugLog("selectImage: Image clicked", img.id);
  }

  // Remove existing listeners to prevent duplicates
  img.removeEventListener("mousedown", startDragging);
  img.removeEventListener("dragstart", (e) => e.preventDefault());
  img.removeEventListener("click", selectImage);

  // Add event listeners
  img.addEventListener("mousedown", startDragging);
  img.addEventListener("dragstart", (e) => e.preventDefault()); // Prevent browser drag behavior
  img.addEventListener("click", selectImage);
  debugLog("setupDragAndDrop: Event listeners set up for", img.id);
}

function updateCoordinates(img) {
  if (img && coordinates) {
    const left = parseFloat(img.style.left) || 0;
    const top = parseFloat(img.style.top) || 0;
    coordinates.innerHTML = `<strong>Coordinates:</strong> (${Math.round(left)}%, ${Math.round(top)}%)`;
  }
}

function savePosition(img, traitId, variationName) {
  const trait = TraitManager.getTrait(traitId);
  if (!trait || trait.variants.length === 0) {
    debugLog("savePosition: Invalid trait or no variants", traitId);
    return;
  }

  const selectedVariant = trait.variants[trait.selected];
  if (!selectedVariant || !selectedVariant.id) {
    debugLog("savePosition: No selected variant or variant ID for trait", traitId);
    return;
  }
  const variantId = selectedVariant.id;

  const contentWidth = preview.getBoundingClientRect().width;
  const contentHeight = contentWidth;
  const imgWidth = parseFloat(img.style.width) || contentWidth;
  const imgHeight = parseFloat(img.style.height) || contentHeight;
  const maxLeft = ((contentWidth - imgWidth) / contentWidth) * 100;
  const maxTop = ((contentHeight - imgHeight) / contentHeight) * 100;

  let left = parseFloat(img.style.left) || 0;
  let top = parseFloat(img.style.top) || 0;

  left = Math.max(0, Math.min(left, maxLeft));
  top = Math.max(0, Math.min(top, maxTop));

  const position = {
    left,
    top,
    absWidth: imgWidth,
    absHeight: imgHeight,
  };

  const key = `trait${traitId}-${variantId}-position`;
  const historyKey = "trait" + traitId + "-position";
  if (!variantHistories[historyKey]) variantHistories[historyKey] = [];
  variantHistories[historyKey].push(position);
  if (variantHistories[historyKey].length > 20) {
    variantHistories[historyKey].shift();
  }
  localStorage.setItem(key, JSON.stringify(position));
  localStorage.setItem(`trait${traitId}-manuallyMoved`, "true");

  img.style.left = left + "%";
  img.style.top = top + "%";

  const traitIndex = TraitManager.getAllTraits().findIndex((t) => t.id === traitId);
  autoPositioned[traitIndex] = true;

  debugLog(`savePosition: Saved position for Trait ${traitId}, Variant ${variantId}`, position);

  if (typeof updateSamplePositions === "function") {
    updateSamplePositions(traitId, variantId, position);
  } else {
    debugLog("savePosition: updateSamplePositions is not defined yet");
    if (typeof updatePreviewSamples === "function") {
      updatePreviewSamples();
    }
  }
}

function updateZIndices() {
  const sortedTraits = TraitManager.getAllTraits().sort((a, b) => a.position - b.position);
  traitImages.forEach((img, index) => {
    if (img) {
      const trait = sortedTraits[index];
      img.style.zIndex = TraitManager.getAllTraits().length - trait.position + 1;
      debugLog(`Setting zIndex for Trait ${trait.position} (ID: ${trait.id}): ${img.style.zIndex}`);
    }
  });
  if (preview) preview.offsetHeight;
}


/* Section 7 ----------------------------------------- PREVIEW AND POSITION MANAGEMENT (PART 2) ------------------------------------------------*/



function updateSamplePositions(traitId, variantId, position) {
  for (let i = 0; i < 16; i++) {
    const sample = sampleData[i] || [];
    let updated = false;
    for (let j = 0; j < sample.length; j++) {
      if (sample[j].traitId === traitId && sample[j].variantId === variantId) {
        sample[j].position = position;
        updated = true;
        break;
      }
    }
    if (!updated) {
      sample.push({ traitId, variantId, position });
    }
    sampleData[i] = sample;
  }
  debugLog(`updateSamplePositions: Updated position for Trait ${traitId}, Variant ${variantId}`, position);
  updatePreviewSamples();
}

async function updatePreviewSamples() {
  previewSamplesGrid.innerHTML = "";
  
  const gridWidth = previewSamplesGrid.clientWidth;
  if (gridWidth <= 0) {
    debugLog("Preview samples grid has zero width. Skipping update.");
    return;
  }
  const columns = 4;
  const gap = DIMENSIONS.GRID_GAP;
  const totalGap = gap * (columns - 1);
  const containerSize = (gridWidth - totalGap) / columns;
  if (containerSize <= 0) {
    debugLog("Calculated container size is zero or negative. Skipping update.");
    return;
  }
  const scaleFactor = containerSize / DIMENSIONS.BASE_SIZE;
  debugLog(`Grid width: ${gridWidth}, Container size: ${containerSize}, Scale factor: ${scaleFactor}`);

  for (let i = 0; i < 16; i++) {
    const sampleContainer = document.createElement("div");
    sampleContainer.className = "sample-container";
    
    const previewContainer = document.createElement("div");
    previewContainer.className = "sample-preview";
    previewContainer.style.transform = `scale(${scaleFactor})`;
    previewContainer.style.transformOrigin = "0 0";
    
    const traits = [...TraitManager.getAllTraits()].reverse();
    debugLog(`Sample ${i}: Traits available:`, traits);

    // If no traits are loaded, render an empty sample with background
    if (!traits.length) {
      sampleContainer.appendChild(previewContainer);
      previewSamplesGrid.appendChild(sampleContainer);
      continue;
    }

    let hasAllTraits = true;
    const traitVariants = traits.map(trait => {
      if (!trait.variants.length) {
        debugLog(`Sample ${i}: Trait ${trait.id} has no variants`);
        hasAllTraits = false;
        return null;
      }
      
      const randomIndex = Math.floor(Math.random() * trait.variants.length);
      const variant = trait.variants[randomIndex];
      debugLog(`Sample ${i}: Trait ${trait.id}, Selected Variant ${variant.id}, URL: ${variant.url}`);
      return { trait, variant };
    });

    if (!hasAllTraits) {
      debugLog(`Sample ${i}: Skipping due to missing variants in some traits`);
      continue;
    }

    traitVariants.forEach(({ trait, variant }) => {
      if (!variant) return;

      const img = document.createElement("img");
      img.alt = `${trait.name || `Trait ${trait.position}`} variant`;
      img.style.position = "absolute";
      img.style.zIndex = trait.zIndex;
      img.style.visibility = "hidden";
      
      img.onerror = () => {
        debugLog(`Sample ${i}: Image failed to load for Trait ${trait.id}, Variant ${variant.id}`);
        img.src = "https://via.placeholder.com/150?text=Image+Failed";
        img.style.visibility = "visible";
      };
      img.onload = () => {
        const scaledWidth = img.naturalWidth * scaleFactor;
        const scaledHeight = img.naturalHeight * scaleFactor;
        img.style.width = `${scaledWidth}px`;
        img.style.height = `${scaledHeight}px`;
        
        // Base container size before scaling (600x600px)
        const baseContainerSize = DIMENSIONS.BASE_SIZE;
        let leftPx = baseContainerSize / 2 - img.naturalWidth / 2;
        let topPx = baseContainerSize / 2 - img.naturalHeight / 2;
        
        const key = `trait${trait.id}-${variant.id}-position`;
        const savedPosStr = localStorage.getItem(key);
        const sampleEntry = (sampleData[i] || []).find(entry => entry.traitId === trait.id && entry.variantId === variant.id);
        
        try {
          let savedPos;
          if (sampleEntry && sampleEntry.position) {
            savedPos = sampleEntry.position;
            debugLog(`Sample ${i}: Using position from sampleData for Trait ${trait.id}, Variant ${variant.id}`, savedPos);
          } else if (savedPosStr) {
            savedPos = JSON.parse(savedPosStr);
            if (typeof savedPos.left !== "number" || typeof savedPos.top !== "number") {
              throw new Error("Invalid position format");
            }
          }
          
          if (savedPos) {
            // Positions are stored as percentages relative to 600x600px
            // Convert percentage to pixels in the base container size (600px)
            leftPx = (savedPos.left / 100) * baseContainerSize - (img.naturalWidth / 2);
            topPx = (savedPos.top / 100) * baseContainerSize - (img.naturalHeight / 2);
          }
        } catch (e) {
          debugLog(`Sample ${i}: Failed to parse position for Trait ${trait.id}, Variant ${variant.id}:`, e);
          localStorage.setItem(key, JSON.stringify({ left: 50, top: 50 }));
        }
        
        // The transform: scale(scaleFactor) will handle the scaling of positions
        img.style.left = `${leftPx}px`;
        img.style.top = `${topPx}px`;
        
        img.style.visibility = "visible";
        debugLog(`Sample ${i}: Image loaded for Trait ${trait.id}, Variant ${variant.id}, Size: ${scaledWidth}x${scaledHeight}, Position: ${leftPx},${topPx}`);
      };
      img.src = variant.url;
      
      previewContainer.appendChild(img);
    });

    sampleContainer.appendChild(previewContainer);
    previewSamplesGrid.appendChild(sampleContainer);
  }
}


/* Section 8 ----------------------------------------- BACKGROUND GENERATION AND MINTING ------------------------------------------------*/




function updateChosenGrid(count) {
  const chosenGrid = document.getElementById('chosen-grid');
  if (!chosenGrid) {
    console.error('Chosen Grid not found');
    return;
  }
  chosenGrid.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const container = document.createElement('div');
    container.className = 'chosen-image-container';
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

    const grid = document.createElement('div');
    grid.id = 'gen-grid';
    grid.style.gridTemplateColumns = `repeat(${Math.sqrt(count)}, 1fr)`;
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
        debugLog(`Error fetching background ${i + 1}:`, error);
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

/* Section 10 ----------------------------------------- PROJECT BANNER UPLOAD HANDLER ------------------------------------------------*/

document.addEventListener('DOMContentLoaded', () => {
  const bannerUploadInput = document.getElementById('project-banner-upload');
  const bannerImage = document.getElementById('project-banner-image');

  if (bannerUploadInput && bannerImage) {
    bannerUploadInput.addEventListener('change', (event) => {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          bannerImage.src = e.target.result;
          bannerImage.style.display = 'block';
        };
        reader.readAsDataURL(file);
      }
    });
  }
});

window.addEventListener('resize', () => {
  applyScalingToTraits();
  applyScalingToSamples();
});
