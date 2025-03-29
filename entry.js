/* Section 1 - PANELS MANAGER FRAMEWORK */





let idCounter = 0;
function generateId() {
  return `id-${idCounter++}`;
}

class Panel {
  constructor(id, title, content, column = 'left', style = {}) {
    this.id = id;
    this.title = title;
    this.content = content;
    this.column = column;
    this.style = { backgroundColor: '#ffffff', ...style };
    this.element = null;
  }

  render() {
    if (!this.element) {
      this.element = document.createElement('div');
      this.element.id = this.id;
      this.element.className = 'panel';
      this.element.innerHTML = this.id === 'logo-panel' ? this.content : `<h2>${this.title}</h2>${this.content}`;
      Object.assign(this.element.style, this.style);
    }
    return this.element;
  }

  update(content) {
    if (this.element) {
      this.element.innerHTML = this.id === 'logo-panel' ? content || this.content : `<h2>${this.title}</h2>${content || this.content}`;
    }
  }
}

class PanelManager {
  constructor() {
    this.panels = [];
  }

  addPanel(panel) {
    this.panels.push(panel);
    this.renderAll();
  }

  removePanel(panelId) {
    this.panels = this.panels.filter(p => p.id !== panelId);
    this.renderAll();
  }

  renderAll() {
    const leftColumn = document.getElementById('left-column');
    const rightColumn = document.getElementById('right-column');
    if (!leftColumn || !rightColumn) {
      console.error('Column elements not found');
      return;
    }
    leftColumn.innerHTML = '';
    rightColumn.innerHTML = '';
    this.panels.forEach(panel => {
      const el = panel.render();
      if (panel.column === 'left') {
        leftColumn.appendChild(el);
      } else {
        rightColumn.appendChild(el);
      }
    });
  }
}

/* Section 2 - TRAIT MANAGER FRAMEWORK */





const TraitManager = {
  traits: [],

  initialize() {
    this.traits = [];
    for (let i = 0; i < 3; i++) {
      this.addTrait(i + 1);
    }
  },

  addTrait(position) {
    const newTrait = {
      id: generateId(),
      position: position,
      name: '',
      isUserAssignedName: false,
      variants: [],
      selected: 0,
      zIndex: this.traits.length - position + 1,
      createdAt: Date.now()
    };

    this.traits.forEach(trait => {
      if (trait.position >= position) {
        trait.position++;
        trait.zIndex = this.traits.length - trait.position + 1;
      }
    });

    this.traits.push(newTrait);
    this.traits.sort((a, b) => a.position - b.position);
    return newTrait;
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
        trait.zIndex = this.traits.length - trait.position + 1;
      }
    });
  },

  moveTrait(traitId, newPosition) {
    const trait = this.traits.find(t => t.id === traitId);
    if (!trait) return;

    const oldPosition = trait.position;

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

    trait.position = newPosition;

    this.traits.sort((a, b) => a.position - b.position);
    this.traits.forEach((t, idx) => {
      t.zIndex = this.traits.length - t.position + 1;
    });
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

/* Section 3 - GLOBAL SETUP AND PANEL INITIALIZATION */





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
const clickSound = new Audio('https://www.soundjay.com/buttons/button-3.mp3');
clickSound.volume = 0.25;

const panelManager = new PanelManager();

const logoPanel = new Panel('logo-panel', '', 
  `<img id="logo" src="https://github.com/geoffmccabe/AIFN1-nft-minting/raw/main/images/Perceptrons_Logo_Perc_Creator_600px.webp" alt="Perceptrons Logo" width="600">`,
  'left'
);

const traitsPanel = new Panel('traits-panel', 'Traits Manager', 
  `<div id="trait-container"></div>`,
  'left'
);

const previewPanel = new Panel('preview-panel', 'Preview', 
  `<div id="preview"></div>
   <div id="controls">
     <span id="coordinates"><strong>Coordinates:</strong> (1, 1)</span>
     <span>   </span>
     <span class="direction-emoji" data-direction="up">⬆️</span>
     <span class="direction-emoji" data-direction="down">⬇️</span>
     <span class="direction-emoji" data-direction="left">⬅️</span>
     <span class="direction-emoji" data-direction="right">➡️</span>
     <span class="magnify-emoji">🔍</span>
   </div>
   <div id="enlarged-preview"></div>`,
  'right'
);

const previewSamplesPanel = new Panel('preview-samples-panel', 'Preview Samples', 
  `<div id="preview-samples">
     <div id="preview-samples-header">
       <button id="update-previews">UPDATE</button>
     </div>
     <div id="preview-samples-grid"></div>
   </div>`,
  'right'
);

const backgroundPanel = new Panel('background-panel', 'AI Background', 
  `<div id="prompt-section">
     <label for="base-prompt">Basic Prompt:</label>
     <textarea id="base-prompt" readonly>1girl, shiyang, ((((small breasts)))), (white skull belt buckle, front hair locks, black flat dragon tattoo on right shoulder, black flat dragon tattoo on right arm, red clothes, shoulder tattoo,:1.1), golden jewelry, long hair, earrings, black hair, golden hoop earrings, clothing cutout, ponytail, cleavage cutout, cleavage, bracelet, midriff, cheongsam top, red choli top, navel, makeup, holding, pirate pistol, lips, pirate gun, black shorts, looking at viewer, dynamic pose, ((asian girl)), action pose, (white skull belt buckle), black dragon tattoo on right shoulder, black dragon tattoo on right arm, ((shoulder tattoo))</textarea>
     <label for="user-prompt">User Prompt:</label>
     <textarea id="user-prompt" placeholder="Add your custom prompt (e.g., 'with a cyberpunk city background')"></textarea>
   </div>
   <button id="generate-background">Generate Bkgd</button>
   <div id="background-details">
     <img id="background-image" src="https://github.com/geoffmccabe/AIFN1-nft-minting/raw/main/images/Preview_Panel_Bkgd_600px.webp" alt="AI Background">
     <p id="background-metadata">Loading...</p>
   </div>`,
  'left'
);

const mintingPanel = new Panel('minting-panel', 'Minting', 
  `<div id="mint-section">
     <button id="mintButton" disabled>Mint NFT</button>
     <div id="mintFeeDisplay">Mint Fee: Loading...</div>
   </div>`,
  'right'
);

document.addEventListener('DOMContentLoaded', () => {
  provider = new ethers.providers.Web3Provider(window.ethereum);
  contract = new ethers.Contract(config.sepolia.contractAddress, config.abi, provider);
  signer = provider.getSigner();
  contractWithSigner = contract.connect(signer);

  panelManager.addPanel(logoPanel);
  panelManager.addPanel(traitsPanel);
  panelManager.addPanel(backgroundPanel);
  panelManager.addPanel(previewPanel);
  panelManager.addPanel(previewSamplesPanel);
  panelManager.addPanel(mintingPanel);

  TraitManager.initialize();
  traitsPanel.update(getTraitsContent());
  previewSamplesPanel.update(getPreviewSamplesContent());
  fetchMintFee();

  document.getElementById('generate-background').addEventListener('click', fetchBackground);
  document.getElementById('mintButton').addEventListener('click', window.mintNFT);

  setupPreviewListeners();
  setupUndoListener();

  TraitManager.getAllTraits().forEach(trait => {
    setupTraitListeners(trait.id);
    if (trait.variants.length > 0) {
      selectVariation(trait.id, trait.variants[0].id);
    }
  });

  traitImages.forEach((img, index) => setupDragAndDrop(img, index));
});

/* Section 4 - PANEL LOGIC */





function getTraitsContent() {
  let html = '<div id="trait-container">';
  TraitManager.getAllTraits().forEach(trait => {
    html += `
      <div id="trait${trait.id}" class="trait-section">
        <div class="trait-header">
          <h2>TRAIT ${trait.position}${trait.isUserAssignedName && trait.name ? ` - ${trait.name}` : ''}</h2>
          <div class="trait-controls">
            <span class="up-arrow" data-trait="${trait.id}" data-tooltip="Swap Trait Order">⬆️</span>
            <span class="down-arrow" data-trait="${trait.id}" data-tooltip="Swap Trait Order">⬇️</span>
            <span class="add-trait" data-trait="${trait.id}">➕</span>
            <span class="remove-trait" data-trait="${trait.id}">➖</span>
          </div>
        </div>
        <input type="text" id="trait${trait.id}-name" placeholder="Trait ${trait.position}" ${trait.isUserAssignedName ? `value="${trait.name}"` : ''}>
        <input type="file" id="trait${trait.id}-files" accept="image/png,image/webp" multiple>
        <label class="file-input-label" for="trait${trait.id}-files">Choose Files</label>
        <div id="trait${trait.id}-grid" class="trait-grid">`;
    trait.variants.forEach(variant => {
      html += `
        <div class="variation-container" data-trait-id="${trait.id}" data-variation-id="${variant.id}">
          <div class="variation-image-wrapper${trait.selected === trait.variants.indexOf(variant) ? ' selected' : ''}">
            <img src="${variant.url}" alt="${variant.name}" class="variation">
          </div>
          <div class="variation-filename">${variant.name}</div>
        </div>`;
    });
    html += `</div></div>`;
  });
  html += '</div>';
  return html;
}

function setupTraitListeners(traitId) {
  const nameInput = document.getElementById(`trait${traitId}-name`);
  const fileInput = document.getElementById(`trait${traitId}-files`);
  const fileInputLabel = document.querySelector(`label[for="trait${traitId}-files"]`);
  const grid = document.getElementById(`trait${traitId}-grid`);
  const upArrow = document.querySelector(`.up-arrow[data-trait="${traitId}"]`);
  const downArrow = document.querySelector(`.down-arrow[data-trait="${traitId}"]`);
  const addTraitBtn = document.querySelector(`.add-trait[data-trait="${traitId}"]`);
  const removeTraitBtn = document.querySelector(`.remove-trait[data-trait="${traitId}"]`);

  if (nameInput) {
    nameInput.addEventListener('input', () => {
      const trait = TraitManager.getTrait(traitId);
      trait.name = nameInput.value.trim();
      trait.isUserAssignedName = true;
      traitsPanel.update(getTraitsContent());
      TraitManager.getAllTraits().forEach(t => setupTraitListeners(t.id));
    });
  }

  if (fileInput && fileInputLabel && grid) {
    fileInput.addEventListener('change', async (event) => {
      const files = Array.from(event.target.files).sort((a, b) => a.name.localeCompare(b.name));
      if (!files.length) return;

      const trait = TraitManager.getTrait(traitId);
      if (!trait.isUserAssignedName) {
        const position = TraitManager.getAllTraits().findIndex(t => t.id === traitId) + 1;
        trait.name = `Trait ${position}`;
      }

      // Replace variants instead of appending
      trait.variants = [];
      traitImages = traitImages.filter(img => img.id !== `preview-trait${traitId}`);
      files.forEach(file => {
        const variationName = file.name.split('.').slice(0, -1).join('.');
        const url = URL.createObjectURL(file);
        TraitManager.addVariant(traitId, { name: variationName, url });
      });

      if (trait.variants.length > 0) {
        selectVariation(traitId, trait.variants[0].id);
        fileInputLabel.textContent = 'Choose New Files';
        autoPositioned[TraitManager.getAllTraits().findIndex(t => t.id === traitId)] = false;
      }

      traitsPanel.update(getTraitsContent());
      TraitManager.getAllTraits().forEach(t => setupTraitListeners(t.id));
      updateMintButton();
      updatePreviewSamples();
    });

    grid.querySelectorAll('.variation-container').forEach(container => {
      container.addEventListener('click', () => {
        const traitId = container.dataset.traitId;
        const variantId = container.dataset.variationId;
        const allWrappers = grid.querySelectorAll('.variation-image-wrapper');
        allWrappers.forEach(w => w.classList.remove('selected'));
        container.querySelector('.variation-image-wrapper').classList.add('selected');
        selectVariation(traitId, variantId);
      });
    });
  }

  if (upArrow) {
    upArrow.addEventListener('click', () => {
      const trait = TraitManager.getTrait(traitId);
      let newPosition = trait.position === 1 ? TraitManager.getAllTraits().length : trait.position - 1;
      TraitManager.moveTrait(traitId, newPosition);
      traitImages = TraitManager.getAllTraits().map(trait => {
        let img = document.getElementById(`preview-trait${trait.id}`);
        if (!img && trait.variants.length > 0) {
          img = document.createElement('img');
          img.id = `preview-trait${trait.id}`;
          img.src = trait.variants[trait.selected].url;
          document.getElementById('preview').appendChild(img);
        }
        return img;
      }).filter(img => img);
      traitsPanel.update(getTraitsContent());
      TraitManager.getAllTraits().forEach(t => setupTraitListeners(t.id));
      traitImages.forEach((img, index) => setupDragAndDrop(img, index));
      updatePreviewSamples();
    });
  }

  if (downArrow) {
    downArrow.addEventListener('click', () => {
      const trait = TraitManager.getTrait(traitId);
      let newPosition = trait.position === TraitManager.getAllTraits().length ? 1 : trait.position + 1;
      TraitManager.moveTrait(traitId, newPosition);
      traitImages = TraitManager.getAllTraits().map(trait => {
        let img = document.getElementById(`preview-trait${trait.id}`);
        if (!img && trait.variants.length > 0) {
          img = document.createElement('img');
          img.id = `preview-trait${trait.id}`;
          img.src = trait.variants[trait.selected].url;
          document.getElementById('preview').appendChild(img);
        }
        return img;
      }).filter(img => img);
      traitsPanel.update(getTraitsContent());
      TraitManager.getAllTraits().forEach(t => setupTraitListeners(t.id));
      traitImages.forEach((img, index) => setupDragAndDrop(img, index));
      updatePreviewSamples();
    });
  }

  if (addTraitBtn) {
    addTraitBtn.addEventListener('click', () => {
      if (TraitManager.getAllTraits().length < 20) {
        const trait = TraitManager.getTrait(traitId);
        TraitManager.addTrait(trait.position);
        traitsPanel.update(getTraitsContent());
        TraitManager.getAllTraits().forEach(t => setupTraitListeners(t.id));
        updatePreviewSamples();
      }
    });
  }

  if (removeTraitBtn) {
    removeTraitBtn.addEventListener('click', () => removeTrait(traitId));
  }
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

  const deleteAndRemoveDialog = () => {
    TraitManager.removeTrait(traitId);
    traitImages = traitImages.filter(img => img.id !== `preview-trait${traitId}`);
    traitsPanel.update(getTraitsContent());
    TraitManager.getAllTraits().forEach(t => setupTraitListeners(t.id));
    traitImages.forEach((img, index) => setupDragAndDrop(img, index));
    updatePreviewSamples();
  };

  yesButton.addEventListener('click', () => {
    deleteAndRemoveDialog();
    setTimeout(() => {
      if (confirmationDialog && confirmationDialog.parentNode) {
        confirmationDialog.parentNode.removeChild(confirmationDialog);
      }
    }, 0);
  });

  noButton.addEventListener('click', () => confirmationDialog.remove());

  buttonsDiv.appendChild(yesButton);
  buttonsDiv.appendChild(noButton);
  confirmationDialog.appendChild(message);
  confirmationDialog.appendChild(buttonsDiv);
  document.body.appendChild(confirmationDialog);
}

function getPreviewSamplesContent() {
  let html = `<div id="preview-samples"><div id="preview-samples-header"><button id="update-previews">UPDATE</button></div><div id="preview-samples-grid">`;
  sampleData.forEach((sample, i) => {
    html += `<div class="sample-container">`;
    sample.forEach(item => {
      const trait = TraitManager.getTrait(item.traitId);
      const variant = trait.variants.find(v => v.id === item.variantId);
      const scale = 140 / 600;
      html += `<img src="${variant.url}" alt="Sample ${i + 1} - Trait ${trait.position}" style="position: absolute; z-index: ${TraitManager.getAllTraits().length - trait.position + 1}; left: ${item.position.left * scale}px; top: ${item.position.top * scale}px; transform: scale(0.23333); transform-origin: top left;">`;
    });
    html += `</div>`;
  });
  html += `</div></div>`;
  return html;
}

function updatePreviewSamples() {
  sampleData = Array(16).fill(null).map(() => []);
  const traits = TraitManager.getAllTraits().slice().sort((a, b) => a.position - b.position);
  for (let i = 0; i < 16; i++) {
    traits.forEach(trait => {
      if (trait.variants.length === 0) return;
      const randomIndex = Math.floor(Math.random() * trait.variants.length);
      const variant = trait.variants[randomIndex];
      const key = `${trait.id}-${variant.name}`;
      const savedPosition = localStorage.getItem(`trait${trait.id}-${variant.name}-position`) || JSON.stringify({ left: 0, top: 0 });
      const position = JSON.parse(savedPosition);
      if (!variantHistories[key]) variantHistories[key] = [position];
      sampleData[i].push({ traitId: trait.id, variantId: variant.id, position });
    });
  }
  previewSamplesPanel.update(getPreviewSamplesContent());
  const updateButton = document.getElementById('update-previews');
  if (updateButton) {
    updateButton.addEventListener('click', updatePreviewSamples);
  }
  document.querySelectorAll('#preview-samples-grid .sample-container').forEach((container, i) => {
    container.addEventListener('click', () => {
      sampleData[i].forEach(sample => selectVariation(sample.traitId, sample.variantId));
    });
  });
}

function setupPreviewListeners() {
  const preview = document.getElementById('preview');
  const coordinates = document.getElementById('coordinates');
  const directionEmojis = document.querySelectorAll('.direction-emoji');
  const magnifyEmoji = document.querySelector('.magnify-emoji');
  const enlargedPreview = document.getElementById('enlarged-preview');

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
      updateCoordinates(currentImage, coordinates);
    });

    document.addEventListener('mouseup', (e) => {
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
        updateCoordinates(currentImage, coordinates);
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

    const sortedImages = traitImages
      .map((img, idx) => ({ img, position: TraitManager.getAllTraits()[idx].position }))
      .sort((a, b) => a.position - b.position);

    sortedImages.forEach(({ img }) => {
      if (img && img.src && img.style.visibility !== 'hidden') {
        const clonedImg = img.cloneNode(true);
        clonedImg.style.width = `${img.width * scale}px`;
        clonedImg.style.height = `${img.height * scale}px`;
        clonedImg.style.left = `${parseFloat(img.style.left) * scale}px`;
        clonedImg.style.top = `${parseFloat(img.style.top) * scale}px`;
        clonedImg.style.zIndex = String(img.style.zIndex);
        clonedImg.style.visibility = 'visible';
        enlargedPreview.appendChild(clonedImg);
      }
    });

    enlargedPreview.style.display = 'block';
    enlargedPreview.addEventListener('click', () => enlargedPreview.style.display = 'none', { once: true });
  });
}

function setupUndoListener() {
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
        updateCoordinates(currentImage, document.getElementById('coordinates'));
        updateSamplePositions(trait.id, trait.variants[trait.selected].id, previousPosition);
        updateSubsequentTraits(trait.id, variationName, previousPosition);
      }
    }
  });
}

function updateZIndices() {
  traitImages.forEach((img, index) => {
    if (img) {
      const trait = TraitManager.getAllTraits()[index];
      img.style.zIndex = String(TraitManager.getAllTraits().length - trait.position + 1);
    }
  });
  if (previewPanel.element) previewPanel.element.offsetHeight;
}

function selectVariation(traitId, variationId) {
  const trait = TraitManager.getTrait(traitId);
  const variationIndex = trait.variants.findIndex(v => v.id === variationId);
  if (variationIndex === -1) {
    console.error(`Variation ${variationId} not found in Trait ${traitId}`);
    return;
  }
  trait.selected = variationIndex;

  let previewImage = document.getElementById(`preview-trait${traitId}`);
  if (!previewImage) {
    previewImage = document.createElement('img');
    previewImage.id = `preview-trait${traitId}`;
    traitImages.push(previewImage);
    document.getElementById('preview').appendChild(previewImage);
    setupDragAndDrop(previewImage, TraitManager.getAllTraits().findIndex(t => t.id === traitId));
  }

  previewImage.src = trait.variants[variationIndex].url;
  previewImage.style.visibility = 'visible';
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
  updateCoordinates(currentImage, document.getElementById('coordinates'));
  traitsPanel.update(getTraitsContent());
  TraitManager.getAllTraits().forEach(t => setupTraitListeners(t.id));
}

function setupDragAndDrop(img, traitIndex) {
  if (img) {
    img.addEventListener('dragstart', (e) => e.preventDefault());

    img.addEventListener('mousedown', (e) => {
      if (img.src === '' || img !== currentImage) return;
      isDragging = true;
      currentImage = img;
      const rect = img.getBoundingClientRect();
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;
      img.style.cursor = 'grabbing';
      img.classList.add('dragging');
      updateCoordinates(img, document.getElementById('coordinates'));
    });

    img.addEventListener('click', () => {
      if (img.src !== '') {
        currentImage = img;
        updateCoordinates(img, document.getElementById('coordinates'));
      }
    });
  }
}

function updateCoordinates(img, coordsElement) {
  if (img && coordsElement) {
    const left = parseFloat(img.style.left) || 0;
    const top = parseFloat(img.style.top) || 0;
    coordsElement.innerHTML = `<strong>Coordinates:</strong> (${Math.round(left) + 1}, ${Math.round(top) + 1})`;
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
        const previewImage = document.getElementById(`preview-trait${traitId}`);
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

async function fetchBackground() {
  try {
    clickSound.play().catch(error => console.error('Error playing click sound:', error));
    let seconds = 0;
    const generateButton = document.getElementById('generate-background');
    generateButton.disabled = true;
    generateButton.innerText = `Processing ${seconds}...`;
    timerInterval = setInterval(() => {
      seconds++;
      generateButton.innerText = `Processing ${seconds}...`;
    }, 1000);

    const userPrompt = document.getElementById('user-prompt').value.trim();
    const url = `https://aifn-1-api-q1ni.vercel.app/api/generate-background${userPrompt ? `?prompt=${encodeURIComponent(userPrompt)}` : ''}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch background: ${response.statusText}`);
    const data = await response.json();
    backgroundPanel.update(
      backgroundPanel.content.replace(
        /<img id="background-image"[^>]+>/,
        `<img id="background-image" src="${data.imageUrl}" alt="AI Background">`
      ).replace(
        /<p id="background-metadata">[^<]+<\/p>/,
        `<p id="background-metadata">${data.metadata}</p>`
      )
    );
  } catch (error) {
    console.error('Error fetching background:', error);
    backgroundPanel.update(
      backgroundPanel.content.replace(
        /<img id="background-image"[^>]+>/,
        `<img id="background-image" src="https://github.com/geoffmccabe/AIFN1-nft-minting/raw/main/images/Preview_Panel_Bkgd_600px.webp" alt="AI Background">`
      ).replace(
        /<p id="background-metadata">[^<]+<\/p>/,
        `<p id="background-metadata">Failed to load background: ${error.message}</p>`
      )
    );
  } finally {
    clearInterval(timerInterval);
    const generateButton = document.getElementById('generate-background');
    generateButton.innerText = 'Generate Bkgd';
    generateButton.disabled = false;
  }
}

function fetchMintFee() {
  const mintFeeDisplay = document.getElementById('mintFeeDisplay');
  if (mintFeeDisplay) mintFeeDisplay.innerText = `Mint Fee: 0.001 ETH (Mock)`;
}

function updateMintButton() {
  const allTraitsSet = TraitManager.getAllTraits().every(trait => trait.name && trait.variants.length > 0);
  const mintBtn = document.getElementById('mintButton');
  if (mintBtn) mintBtn.disabled = !allTraitsSet;
}

window.mintNFT = async function() {
  const status = document.getElementById('status') || document.createElement('div');
  status.id = 'status';
  mintingPanel.element.appendChild(status);

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
