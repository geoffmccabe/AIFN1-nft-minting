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
    this.style = { backgroundColor: '#ffffff', ...style }; // Original included background
    this.element = null;
  }

  render() {
    this.element = document.createElement('div');
    this.element.id = this.id;
    this.element.className = 'panel';
    // Original logic: only add header if NOT logo-panel
    const header = this.id === 'logo-panel' ? '' : `<div class="panel-top-bar"></div><h2>${this.title}</h2>`;
    this.element.innerHTML = header + this.content;
    // Original styling applied inline
    Object.assign(this.element.style, {
      ...this.style,
      position: 'relative',
      cursor: 'default',
      display: 'block', // Original had display: block here
      width: '100%'
    });
    return this.element;
  }

  update(content) {
    if (this.element) {
      const header = this.id === 'logo-panel' ? '' : `<div class="panel-top-bar"></div><h2>${this.title}</h2>`;
      this.element.innerHTML = header + (content || this.content);
      // Original minimal update styles
      Object.assign(this.element.style, {
        position: 'relative',
        width: '100%'
      });
    }
  }

  setColumn(column) {
    this.column = column;
  }
}

class PanelManager {
  constructor() {
    this.panels = [];
    // Original didn't explicitly manage listener state here
  }

  addPanel(panel) {
    this.panels.push(panel);
    this.renderAll();
    // Original explicitly called setupDrag after renderAll in addPanel
    this.panels.forEach(p => this.setupDrag(p));
  }

  removePanel(panelId) {
    this.panels = this.panels.filter(p => p.id !== panelId);
    this.renderAll();
    // Original also called setupDrag after removePanel's renderAll
    this.panels.forEach(p => this.setupDrag(p));
  }

  renderAll() {
    const leftColumn = document.getElementById('left-column');
    const rightColumn = document.getElementById('right-column');
    if (!leftColumn || !rightColumn) return;

    leftColumn.innerHTML = '';
    rightColumn.innerHTML = '';

    const leftPanels = this.panels.filter(p => p.column === 'left');
    const rightPanels = this.panels.filter(p => p.column === 'right');

    // Original append logic
    leftPanels.forEach(panel => {
      panel.element = panel.render();
      leftColumn.appendChild(panel.element);
    });

    rightPanels.forEach(panel => {
      panel.element = panel.render();
      rightColumn.appendChild(panel.element);
    });

    // Original Traits Panel rehydration check
    const traits = this.panels.find(p => p.id === 'traits-panel');
    if (traits) {
      traits.update(getTraitsContent()); // Does update content
      TraitManager.getAllTraits().forEach(t => setupTraitListeners(t.id)); // Re-attaches listeners
    }
  }

  // Original setupDrag method, with modification for logo panel drag
  setupDrag(panel) {
    const el = panel.element;
    if (!el) return; // Safety check

    let isDragging = false;
    let offsetX, offsetY;

    // --- MOUSE DOWN --- (Original logic + logo panel check) ---
    el.addEventListener('mousedown', (e) => {
      // *** SINGLE MODIFICATION START ***
      // Check if it's the logo panel and click is in top 10px OR if it's a normal top bar click
      const isLogoPanel = el.id === 'logo-panel';
      const rect = el.getBoundingClientRect(); // Get rect for position check
      const clickYRelativeToPanel = e.clientY - rect.top;
      const isLogoTopAreaClick = isLogoPanel && clickYRelativeToPanel >= 0 && clickYRelativeToPanel <= 10;
      const isTopBarClick = e.target.classList.contains('panel-top-bar');

      // Proceed only if valid drag start
      if (!isTopBarClick && !isLogoTopAreaClick) {
          return;
      }
      // *** SINGLE MODIFICATION END ***

      // Original drag initialization logic follows
      isDragging = true;

      // const rect = el.getBoundingClientRect(); // Rect already calculated above
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;

      el.style.position = 'absolute';
      el.style.left = `${rect.left}px`;
      el.style.top = `${rect.top}px`;
      el.style.width = `${rect.width}px`;
      el.style.height = `${rect.height}px`;
      el.style.zIndex = '1000';
      el.style.cursor = 'grabbing';
      el.style.opacity = '0.8';
      // Original had pointerEvents none, keep it for now
      el.style.pointerEvents = 'none';
    });

    // --- MOUSE MOVE --- (Original logic) ---
    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      el.style.left = `${e.clientX - offsetX}px`;
      el.style.top = `${e.clientY - offsetY}px`;
    });

    // --- MOUSE UP --- (Original logic) ---
    document.addEventListener('mouseup', (e) => {
      if (!isDragging) return;
      isDragging = false;

      // Restore original styles
      el.style.cursor = 'default';
      el.style.zIndex = '';
      el.style.opacity = '';
      el.style.pointerEvents = ''; // Restore pointer events

      // Determine drop column and index
      const dropX = e.clientX;
      const dropY = e.clientY;
      const windowWidth = window.innerWidth;
      const newColumn = dropX < windowWidth / 2 ? 'left' : 'right';
      panel.setColumn(newColumn);

      const sameColumnPanels = this.panels.filter(p => p.column === newColumn);
      const insertIndex = sameColumnPanels.findIndex(p => {
        const rect = p.element.getBoundingClientRect();
        return dropY < rect.top + rect.height / 2;
      });

      // Reorder internal panels array
      if (insertIndex === -1) {
        // If dropped below all panels or in empty column, move to end of logical list
        this.panels = this.panels.filter(p => p !== panel).concat(panel);
      } else {
        // Find global index corresponding to the insertion point
        const globalIndex = this.panels.findIndex(p => p.id === sameColumnPanels[insertIndex].id);
        this.panels = this.panels.filter(p => p !== panel); // Remove from old pos
        this.panels.splice(globalIndex, 0, panel); // Insert at new pos
      }

      // Reset inline styles used for absolute positioning during drag
      el.style.position = '';
      el.style.left = '';
      el.style.top = '';
      el.style.width = '';
      el.style.height = '';
      // Z-index and opacity already reset above

      // Re-render all panels based on new order
      this.renderAll();
      // Re-attach drag listeners to all potentially new elements (original logic)
      this.panels.forEach(p => this.setupDrag(p));
    });
  } // End setupDrag
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
          zIndex: this.traits.length - position + 1, // Incorrect zIndex logic? Should be based on position
          createdAt: Date.now()
        };
      // Original logic for re-calculating positions/z-index
        this.traits.forEach(trait => {
          if (trait.position >= position) {
            trait.position++;
            trait.zIndex = this.traits.length - trait.position + 1; // Still seems reversed
          }
        });
        this.traits.push(newTrait);
        this.traits.sort((a, b) => a.position - b.position); // Sort by position
        return newTrait;
      },

      removeTrait(traitId) {
        const traitIndex = this.traits.findIndex(trait => trait.id === traitId);
        if (traitIndex === -1) return;
        const removedTrait = this.traits[traitIndex];
        const removedPosition = removedTrait.position;
        this.traits.splice(traitIndex, 1);
      // Original logic for re-calculating positions/z-index
        this.traits.forEach(trait => {
          if (trait.position > removedPosition) {
            trait.position--;
            trait.zIndex = this.traits.length - trait.position + 1; // Still seems reversed
          }
        });
      },

      moveTrait(traitId, newPosition) {
        const trait = this.traits.find(t => t.id === traitId);
        if (!trait) return;
        const oldPosition = trait.position;
        const maxPosition = this.traits.length;
        if (newPosition === oldPosition) return;

        // Original complex move logic
        if (oldPosition === 1 && newPosition === maxPosition) {
          const lastTrait = this.traits.find(t => t.position === maxPosition);
          if (lastTrait) { lastTrait.position = 1; trait.position = maxPosition; }
        } else if (oldPosition === maxPosition && newPosition === 1) {
          const firstTrait = this.traits.find(t => t.position === 1);
          if (firstTrait) { firstTrait.position = maxPosition; trait.position = 1; }
        } else {
          const targetTrait = this.traits.find(t => t.position === newPosition);
          if (targetTrait) { targetTrait.position = oldPosition; trait.position = newPosition; }
        }
        this.traits.sort((a, b) => a.position - b.position); // Re-sort
      // Original z-index calculation
        this.traits.forEach((t, idx) => {
          t.zIndex = this.traits.length - t.position + 1; // Position 1 gets highest z-index
        });
      },

      addVariant(traitId, variantData) {
        const trait = this.traits.find(t => t.id === traitId);
        if (!trait) return;
        const newVariant = {
          id: generateId(), name: variantData.name, url: variantData.url,
          chance: variantData.chance || 0.5, createdAt: Date.now()
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
        return [...this.traits]; // Return copy
      }
    };






   
    
  /* Section 3 - GLOBAL SETUP AND PANEL INITIALIZATION */





    let provider, contract, signer, contractWithSigner;
    let traitImages = [];
    let isDragging = false; // Flag for trait image dragging
    let currentImage = null;
    let offsetX = 0; let offsetY = 0; // Offset for trait image dragging
    let moveInterval = null;
    let variantHistories = {};
    let timerInterval = null;
    let lastUndoTime = 0;
    let autoPositioned = new Array(20).fill(false);
    let sampleData = Array(16).fill(null).map(() => []);
    const clickSound = new Audio('https://www.soundjay.com/buttons/button-3.mp3');
    clickSound.volume = 0.25;

    // Original panel manager instantiation
    const panelManager = new PanelManager();

    // Original panel definitions
    const logoPanel = new Panel('logo-panel', '',
      `<img id="logo" src="https://github.com/geoffmccabe/AIFN1-nft-minting/raw/main/images/Perceptrons_Logo_Perc_Creator_600px.webp" alt="Perceptrons Logo">`,
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
         <span>   </span>
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

    // Original Undo Listener Setup
    function setupUndoListener() {
      document.addEventListener('keydown', (e) => {
        const now = Date.now();
        if (now - lastUndoTime < 300) return;
        lastUndoTime = now;
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
          e.preventDefault();
          if (!currentImage) return;
          const traitIndex = traitImages.indexOf(currentImage);
          // Original check might fail if traitImages isn't synced
          if (traitIndex === -1) return;
          const trait = TraitManager.getAllTraits()[traitIndex];
          if (!trait || trait.variants.length <= trait.selected) return; // Added checks
          const variationName = trait.variants[trait.selected].name;
          const key = `${trait.id}-${variationName}`;
          if (variantHistories[key] && variantHistories[key].length > 1) {
            variantHistories[key].pop();
            const previousPosition = variantHistories[key][variantHistories[key].length - 1];
            currentImage.style.left = `${previousPosition.left}px`;
            currentImage.style.top = `${previousPosition.top}px`;
            try {
              localStorage.setItem(`trait${trait.id}-${variationName}-position`, JSON.stringify(previousPosition));
            } catch (e) { console.error('Failed to save to localStorage:', e); }
            updateCoordinates(currentImage, document.getElementById('coordinates'));
            updateSamplePositions(trait.id, trait.variants[trait.selected].id, previousPosition); // Original called this
            updateSubsequentTraits(trait.id, variationName, previousPosition); // Original called this
          }
        }
      });
    }

    // Original DOMContentLoaded Listener
    document.addEventListener('DOMContentLoaded', () => {
        // Original Ethers setup
      provider = new ethers.providers.Web3Provider(window.ethereum);
      contract = new ethers.Contract(config.sepolia.contractAddress, config.abi, provider);
      signer = provider.getSigner();
      contractWithSigner = contract.connect(signer);

      // Original panel adding sequence
      panelManager.addPanel(logoPanel);
      panelManager.addPanel(traitsPanel);
      panelManager.addPanel(backgroundPanel);
      panelManager.addPanel(previewPanel);
      panelManager.addPanel(previewSamplesPanel);
      panelManager.addPanel(mintingPanel);

      // Original initializations
      TraitManager.initialize();
      // Original had manual traitsPanel update here
      traitsPanel.update(getTraitsContent());
      // Original fetch mint fee
      fetchMintFee();

      // Original setup listeners
      document.getElementById('generate-background').addEventListener('click', fetchBackground);
      document.getElementById('mintButton').addEventListener('click', window.mintNFT);

      setupPreviewListeners(); // Original global call
      setupUndoListener();

      // Original initial variant selection
      TraitManager.getAllTraits().forEach(trait => {
        if (trait.variants.length > 0) {
          selectVariation(trait.id, trait.variants[0].id);
        }
      });

      // Original setupDrag and setupDragAndDrop calls
      // NOTE: The setupDrag call below was the one causing the TypeError in the user's last test
      // because setupDrag was renamed in Section 1. Reverting Section 1 means this call is valid again.
      panelManager.panels.forEach(panel => panelManager.setupDrag(panel));
      // This traitImages loop might still have issues if traitImages isn't populated correctly yet
      traitImages.forEach((img, index) => setupDragAndDrop(img, index));
    });






    /* Section 4 - TRAIT MANAGEMENT LOGIC */





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
            <input type="file" id="trait${trait.id}-files" accept="image/png,image/webp" multiple onchange="handleFileChange('${trait.id}', this)">
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

    function handleFileChange(traitId, input) {
      console.log(`File input triggered for trait ${traitId}`);
      const files = Array.from(input.files).sort((a, b) => a.name.localeCompare(b.name));
      if (!files.length) { console.log('No files selected'); return; }

      const validTypes = ['image/png', 'image/webp'];
      for (let file of files) {
        if (!validTypes.includes(file.type)) { console.error(`Invalid file type: ${file.name} (${file.type})`); return; }
      }

      const trait = TraitManager.getTrait(traitId);
      if (!trait.isUserAssignedName) {
        const position = TraitManager.getAllTraits().findIndex(t => t.id === traitId) + 1;
        trait.name = `Trait ${position}`;
      }

      // Original logic to revoke and clear variants
      trait.variants.forEach(variant => { if (variant.url && variant.url.startsWith('blob:')) { URL.revokeObjectURL(variant.url); } });
      trait.variants = [];
      // Original logic to filter traitImages
      traitImages = traitImages.filter(img => img.id !== `preview-trait${traitId}`);

      files.forEach(file => {
        const variationName = file.name.split('.').slice(0, -1).join('.');
        const url = URL.createObjectURL(file);
        TraitManager.addVariant(traitId, { name: variationName, url });
      });

      if (trait.variants.length > 0) {
        console.log(`Selecting variant for trait ${traitId}`);
        setTimeout(() => { selectVariation(traitId, trait.variants[0].id); }, 100);
        document.querySelector(`label[for="trait${traitId}-files"]`).textContent = 'Choose New Files';
        autoPositioned[TraitManager.getAllTraits().findIndex(t => t.id === traitId)] = false;
      } else { console.log('No variants added for trait', traitId); }

      // Original update sequence
      traitsPanel.update(getTraitsContent());
      TraitManager.getAllTraits().forEach(t => setupTraitListeners(t.id));
      updateMintButton();
      updatePreviewSamples();
      input.value = '';
    }

    // Original listener setup
    function setupTraitListeners(traitId) {
      const nameInput = document.getElementById(`trait${traitId}-name`);
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
          const title = nameInput.parentElement.querySelector('h2');
          if (title) title.textContent = `TRAIT ${trait.position}${trait.name ? ` - ${trait.name}` : ''}`;
        });
      }

      if (grid) {
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

      // Original move/add/remove trait logic
      if (upArrow) {
        upArrow.addEventListener('click', () => {
          const trait = TraitManager.getTrait(traitId);
          let newPosition = trait.position === 1 ? TraitManager.getAllTraits().length : trait.position - 1;
          TraitManager.moveTrait(traitId, newPosition);
          traitImages = TraitManager.getAllTraits().map(trait => { /* ... original image handling ... */
            let img = document.getElementById(`preview-trait${trait.id}`);
            if (!img && trait.variants.length > 0 && trait.selected < trait.variants.length) {
                img = document.createElement('img'); img.id = `preview-trait${trait.id}`;
                img.src = trait.variants[trait.selected].url; // Use selected index
                img.onerror = () => { img.style.visibility = 'hidden'; };
                document.getElementById('preview').appendChild(img);
                setupDragAndDrop(img, TraitManager.getAllTraits().findIndex(t => t.id === trait.id));
            } return img; }).filter(img => img);
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
          traitImages = TraitManager.getAllTraits().map(trait => { /* ... original image handling ... */
            let img = document.getElementById(`preview-trait${trait.id}`);
             if (!img && trait.variants.length > 0 && trait.selected < trait.variants.length) {
                img = document.createElement('img'); img.id = `preview-trait${trait.id}`;
                img.src = trait.variants[trait.selected].url; // Use selected index
                img.onerror = () => { img.style.visibility = 'hidden'; };
                document.getElementById('preview').appendChild(img);
                setupDragAndDrop(img, TraitManager.getAllTraits().findIndex(t => t.id === trait.id));
             } return img; }).filter(img => img);
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
            TraitManager.addTrait(trait.position); // Original used trait.position, might need adjustment
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

    // Original remove trait function
    function removeTrait(traitId) {
      if (TraitManager.getAllTraits().length <= 1) return;
      const confirmationDialog = document.createElement('div'); /* ... original dialog setup ... */
      confirmationDialog.className = 'confirmation-dialog';
      const message = document.createElement('p');
      const traitToRemove = TraitManager.getTrait(traitId);
      message.textContent = `Are you sure you want to delete Trait ${traitToRemove ? traitToRemove.position : '?' }?`;
      const buttonsDiv = document.createElement('div'); buttonsDiv.className = 'buttons';
      const yesButton = document.createElement('button'); yesButton.className = 'yes-button'; yesButton.textContent = 'Y';
      const noButton = document.createElement('button'); noButton.className = 'no-button'; noButton.textContent = 'N';

      yesButton.addEventListener('click', () => {
        // Original deletion logic
        const imgToRemove = document.getElementById(`preview-trait${traitId}`);
        if(imgToRemove) imgToRemove.remove(); // Remove image from preview
        TraitManager.removeTrait(traitId);
        traitImages = traitImages.filter(img => img.id !== `preview-trait${traitId}`);
        traitsPanel.update(getTraitsContent());
        TraitManager.getAllTraits().forEach(t => setupTraitListeners(t.id));
        // Original didn't re-run setupDragAndDrop here, maybe should?
        updatePreviewSamples();
        confirmationDialog.remove(); // Close dialog
      });
      noButton.addEventListener('click', () => confirmationDialog.remove());

      buttonsDiv.appendChild(yesButton); buttonsDiv.appendChild(noButton);
      confirmationDialog.appendChild(message); confirmationDialog.appendChild(buttonsDiv);
      document.body.appendChild(confirmationDialog);
    }






/* Section 5 - PREVIEW MANAGEMENT LOGIC */





function selectVariation(traitId, variationId) {
  const trait = TraitManager.getTrait(traitId);
  if (!trait) return; // Added check
  const variationIndex = trait.variants.findIndex(v => v.id === variationId);
  if (variationIndex === -1) return; // Added check
  trait.selected = variationIndex;
  const selectedVariant = trait.variants[variationIndex]; // Added reference

  let previewImage = document.getElementById(`preview-trait${traitId}`);
  if (!previewImage) {
    previewImage = document.createElement('img');
    previewImage.id = `preview-trait${traitId}`;
    const previewContainer = document.getElementById('preview'); // Added check
    if (previewContainer) previewContainer.appendChild(previewImage);
    traitImages.push(previewImage);
  }

  previewImage.src = selectedVariant.url; // Use selectedVariant
  previewImage.alt = selectedVariant.name; // Added alt text
  previewImage.style.visibility = 'visible'; // Added for safety
  previewImage.onerror = () => { previewImage.style.visibility = 'hidden'; }; // Original error handling


  // Original position loading logic
  const key = `${traitId}-${selectedVariant.name}`; // Use selectedVariant
  const savedPosition = localStorage.getItem(`trait${traitId}-${selectedVariant.name}-position`);
  let position = { left: 0, top: 0 };

  if (savedPosition) { position = JSON.parse(savedPosition); }
  else {
      // Original logic to try finding position from other variants
      let lastPosition = null;
      for (let i = 0; i < trait.variants.length; i++) {
        if (i === variationIndex) continue;
        const otherKey = `${traitId}-${trait.variants[i].name}`;
        if (variantHistories[otherKey]?.length) { lastPosition = variantHistories[otherKey].slice(-1)[0]; }
      }
      if (lastPosition) position = lastPosition;
      try { localStorage.setItem(`trait${traitId}-${selectedVariant.name}-position`, JSON.stringify(position)); } catch (e) {}
  }

  previewImage.style.left = `${position.left}px`;
  previewImage.style.top = `${position.top}px`;

  // Original history update
  if (!variantHistories[key]) variantHistories[key] = [position];


  // Original setup drag and update calls
  const traitIndex = TraitManager.getAllTraits().findIndex(t => t.id === traitId); // Original index finding
  setupDragAndDrop(previewImage, traitIndex); // Original call
  currentImage = previewImage;
  updateZIndices(); // Original call
  const coords = document.getElementById('coordinates'); // Added check
  if (coords) updateCoordinates(currentImage, coords); // Original call
}

// Original Preview Listeners Setup
function setupPreviewListeners() {
  const preview = document.getElementById('preview');
  const coordinates = document.getElementById('coordinates');
  const directionEmojis = document.querySelectorAll('.direction-emoji');
  const magnifyEmoji = document.querySelector('.magnify-emoji');
  const enlargedPreview = document.getElementById('enlarged-preview');

  // Original logic, potentially problematic if elements are null
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
      updateCoordinates(currentImage, coordinates); // Assumes coordinates exists
    });

    // Original mouseup - relies on global document listener from setupDrag now
//     document.addEventListener('mouseup', () => { // This global listener is problematic
//       if (isDragging && currentImage) {
//          // ... original savePosition logic ...
//          const traitIndex = traitImages.indexOf(currentImage);
//          const trait = TraitManager.getAllTraits()[traitIndex];
//          const variationName = trait.variants[trait.selected].name;
//          savePosition(currentImage, trait.id, variationName);
//          isDragging = false;
//          currentImage.style.cursor = 'grab';
//          currentImage.classList.remove('dragging');
//          updateZIndices();
//       }
//     });
  }

  // Original arrow key logic
  directionEmojis.forEach(emoji => {
    const direction = emoji.getAttribute('data-direction');
    emoji.addEventListener('mousedown', () => {
      if (!currentImage || !currentImage.src) return;
      // Use original stop function
      stopArrowMovement(); // Clear previous interval
      moveInterval = setInterval(() => {
          if (!currentImage) { stopArrowMovement(); return; } // Added check
        let left = parseFloat(currentImage.style.left) || 0;
        let top = parseFloat(currentImage.style.top) || 0;
        if (direction === 'up') top -= 1; if (direction === 'down') top += 1;
        if (direction === 'left') left -= 1; if (direction === 'right') right += 1;
          // Use original bounds check (assuming 600x600 preview)
        left = Math.max(0, Math.min(left, 600 - currentImage.width));
        top = Math.max(0, Math.min(top, 600 - currentImage.height));
        currentImage.style.left = `${left}px`; currentImage.style.top = `${top}px`;
        currentImage.classList.add('dragging');
        updateCoordinates(currentImage, coordinates); // Assumes coordinates exists
      }, 50);
    });

    // Original cleanup listeners
    emoji.addEventListener('mouseup', () => stopArrowMovement());
    emoji.addEventListener('mouseleave', () => stopArrowMovement());
  });

  // Original magnify logic
  magnifyEmoji.addEventListener('click', () => {
    if (!enlargedPreview) return; // Added check
    const maxWidth = window.innerWidth * 0.9;
    const maxHeight = window.innerHeight * 0.9;
    enlargedPreview.innerHTML = '';
    let scale = maxWidth / 600;
    if (maxHeight / 600 < scale) scale = maxHeight / 600;
    enlargedPreview.style.width = `${600 * scale}px`;
    enlargedPreview.style.height = `${600 * scale}px`;

    // Original sorting and cloning
    const sorted = traitImages
      .map((img, i) => ({ img, z: TraitManager.getAllTraits()[i]?.zIndex })) // Added safe navigation
      .filter(item => item.z !== undefined) // Filter out items without zIndex
      .sort((a, b) => b.z - a.z); // Original sort (descending zIndex = higher layer on top?)

    sorted.forEach(({ img }) => {
      if (!img) return; // Added check
      const clone = img.cloneNode(true);
      // Original scaling logic
      clone.style.width = `${img.width * scale}px`;
      clone.style.height = `${img.height * scale}px`;
      clone.style.left = `${parseFloat(img.style.left) * scale}px`;
      clone.style.top = `${parseFloat(img.style.top) * scale}px`;
      clone.style.position = 'absolute';
      clone.style.zIndex = img.style.zIndex;
      clone.style.visibility = 'visible'; // Ensure visible
      enlargedPreview.appendChild(clone);
    });

    enlargedPreview.style.display = 'block';
    enlargedPreview.addEventListener('click', () => { enlargedPreview.style.display = 'none'; }, { once: true });
  });
}

// Original Drag and Drop for trait images
function setupDragAndDrop(img, traitIndex) {
  img.addEventListener('dragstart', e => e.preventDefault());

  img.addEventListener('mousedown', (e) => {
    if (!img.src) return;
    e.stopPropagation(); // Prevent panel drag
    isDragging = true; // Global flag for image drag
    currentImage = img;
    const rect = img.getBoundingClientRect();
    offsetX = e.clientX - rect.left; // Offset relative to image top-left
    offsetY = e.clientY - rect.top;
    img.style.cursor = 'grabbing';
    img.classList.add('dragging');
    // Original didn't update z-index on mousedown here
    updateCoordinates(img, document.getElementById('coordinates')); // Assumes coordinates exists
  });

  // Original didn't have specific click handler separate from mousedown
//   img.addEventListener('click', () => {
//     currentImage = img;
//     updateCoordinates(img, document.getElementById('coordinates'));
//   });
}

// Original stop arrow movement function
function stopArrowMovement() {
  if (moveInterval) {
    clearInterval(moveInterval);
    moveInterval = null;
    if (currentImage) {
      const traitIndex = traitImages.indexOf(currentImage);
      if (traitIndex === -1) return; // Added check
      const trait = TraitManager.getAllTraits()[traitIndex];
      if (!trait || trait.variants.length <= trait.selected) return; // Added checks
      const variationName = trait.variants[trait.selected].name;
      savePosition(currentImage, trait.id, variationName); // Original save call
      currentImage.classList.remove('dragging');
    }
  }
}

// Original coordinates update function
function updateCoordinates(img, coordsElement) {
  if (img && coordsElement) {
    const left = parseFloat(img.style.left) || 0;
    const top = parseFloat(img.style.top) || 0;
    // Original used 1-based coordinates
    coordsElement.innerHTML = `<strong>Coordinates:</strong> (${Math.round(left) + 1}, ${Math.round(top) + 1})`;
  }
}

// Original z-index update function
function updateZIndices() {
  traitImages.forEach((img, index) => {
      // Original logic relied on index matching TraitManager array index
      if (!TraitManager.getAllTraits()[index]) return; // Added check
      const trait = TraitManager.getAllTraits()[index];
      img.style.zIndex = String(TraitManager.getAllTraits().length - trait.position + 1); // Original logic
  });
  // Original didn't force redraw
}






    /* Section 6 - PREVIEW SAMPLES LOGIC */





    // Original get samples content function
    function getPreviewSamplesContent() {
      let html = `<div id="preview-samples"><div id="preview-samples-header"><button id="update-previews">UPDATE</button></div><div id="preview-samples-grid">`;
      sampleData.forEach((sample, i) => {
        html += `<div class="sample-container">`;
        sample.forEach(item => {
          const trait = TraitManager.getTrait(item.traitId);
          if (!trait) return; // Added check
          const variant = trait.variants.find(v => v.id === item.variantId);
          if (!variant) return; // Added check
          const scale = 140 / 600; // Original scale assumption
          html += `<img src="${variant.url}" alt="Sample ${i + 1} - Trait ${trait.position}" style="position: absolute; z-index: ${TraitManager.getAllTraits().length - trait.position + 1}; left: ${item.position.left * scale}px; top: ${item.position.top * scale}px; transform: scale(0.23333); transform-origin: top left;">`;
        });
        html += `</div>`;
      });
      html += `</div></div>`;
      return html;
    }

    // Original update samples function
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
      // Original update call and listener attachment
      previewSamplesPanel.update(getPreviewSamplesContent());
      const updateButton = document.getElementById('update-previews');
      if (updateButton) { updateButton.addEventListener('click', updatePreviewSamples); }
      document.querySelectorAll('#preview-samples-grid .sample-container').forEach((container, i) => {
        container.addEventListener('click', () => {
          if (!sampleData[i]) return; // Added check
          sampleData[i].forEach(sample => selectVariation(sample.traitId, sample.variantId));
        });
      });
    }





    /* Section 7 - BACKGROUND AND MINTING LOGIC */





    // Original background fetch function
    async function fetchBackground() {
      try {
        clickSound.play().catch(error => console.error('Error playing click sound:', error));
        let seconds = 0;
        const generateButton = document.getElementById('generate-background');
        generateButton.disabled = true; generateButton.innerText = `Processing ${seconds}...`;
        timerInterval = setInterval(() => { seconds++; generateButton.innerText = `Processing ${seconds}...`; }, 1000);

        const userPrompt = document.getElementById('user-prompt').value.trim();
        const url = `https://aifn-1-api-q1ni.vercel.app/api/generate-background${userPrompt ? `?prompt=${encodeURIComponent(userPrompt)}` : ''}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch background: ${response.statusText}`);
        const data = await response.json();

        // Original update logic (might be fragile)
        backgroundPanel.update(
          backgroundPanel.content.replace(
            /<img id="background-image"[^>]+>/,
            `<img id="background-image" src="${data.imageUrl}" alt="AI Background">` // Assumes img tag exists
          ).replace(
            /<p id="background-metadata">[^<]+<\/p>/,
            `<p id="background-metadata">${data.metadata}</p>` // Assumes p tag exists
          )
        );
      } catch (error) {
        console.error('Error fetching background:', error);
        // Original error update logic
        backgroundPanel.update(
          backgroundPanel.content.replace(/<img id="background-image"[^>]+>/, `<img id="background-image" src="https://github.com/geoffmccabe/AIFN1-nft-minting/raw/main/images/Preview_Panel_Bkgd_600px.webp" alt="AI Background">`)
          .replace(/<p id="background-metadata">[^<]+<\/p>/, `<p id="background-metadata">Failed to load background: ${error.message}</p>`)
        );
      } finally {
        clearInterval(timerInterval); timerInterval = null; // Added null assignment
        const generateButton = document.getElementById('generate-background');
        if (generateButton) { // Added check
            generateButton.innerText = 'Generate Bkgd';
            generateButton.disabled = false;
        }
      }
    }

    // Original mock mint fee function
    function fetchMintFee() {
      const mintFeeDisplay = document.getElementById('mintFeeDisplay');
      if (mintFeeDisplay) mintFeeDisplay.innerText = `Mint Fee: 0.001 ETH (Mock)`; // Original mock display
    }

    // Original update mint button function
    function updateMintButton() {
      const allTraitsSet = TraitManager.getAllTraits().every(trait => trait.name && trait.variants.length > 0);
      const mintBtn = document.getElementById('mintButton');
      if (mintBtn) { mintBtn.disabled = !allTraitsSet; }
    }

    // Original save position function
    function savePosition(img, traitId, variationName) {
      const position = { left: parseFloat(img.style.left) || 0, top: parseFloat(img.style.top) || 0 };
      const key = `${traitId}-${variationName}`;
      if (!variantHistories[key]) variantHistories[key] = [];
      variantHistories[key].push(position);
      try {
        localStorage.setItem(`trait${traitId}-${variationName}-position`, JSON.stringify(position));
        localStorage.setItem(`trait${traitId}-${variationName}-manuallyMoved`, 'true');
      } catch (e) { console.error('Failed to save to localStorage:', e); }

      // Original logic for auto-positioning
      const trait = TraitManager.getTrait(traitId);
      if (!trait) return; // Added check
      const traitIndex = TraitManager.getAllTraits().findIndex(t => t.id === traitId);
      const currentVariationIndex = trait.variants.findIndex(v => v.name === variationName);
      if (currentVariationIndex === 0 && !autoPositioned[traitIndex]) {
        for (let i = 1; i < trait.variants.length; i++) {
          const otherVariationName = trait.variants[i].name;
          const otherKey = `${traitId}-${otherVariationName}`;
          variantHistories[otherKey] = [{ left: position.left, top: position.top }];
          try {
            localStorage.setItem(`trait${traitId}-${otherVariationName}-position`, JSON.stringify(position));
            localStorage.removeItem(`trait${traitId}-${otherVariationName}-manuallyMoved`);
          } catch (e) { console.error('Failed to save to localStorage:', e); }
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
      updateSubsequentTraits(traitId, variationName, position); // Original had this potentially complex function
    }

    // Original subsequent trait update function
    function updateSubsequentTraits(currentTraitId, currentVariationName, position) {
      const currentTrait = TraitManager.getTrait(currentTraitId);
      if (!currentTrait) return; // Added check
      const currentTraitIndex = TraitManager.getAllTraits().findIndex(t => t.id === currentTraitId);
      const currentVariationIndex = currentTrait.variants.findIndex(v => v.name === currentVariationName);

      if (currentTrait.variants.length > 1) {
        for (let i = currentVariationIndex + 1; i < currentTrait.variants.length; i++) {
          const nextVariationName = currentTrait.variants[i].name;
          const key = `${currentTraitId}-${nextVariationName}`;
          const manuallyMoved = localStorage.getItem(`trait${currentTraitId}-${nextVariationName}-manuallyMoved`);
          // Original logic for applying position if not manually moved
          if (!manuallyMoved && !variantHistories[key]) { // Should this check history? Maybe just !manuallyMoved
            variantHistories[key] = [{ left: position.left, top: position.top }];
            try { localStorage.setItem(`trait${currentTraitId}-${nextVariationName}-position`, JSON.stringify(position)); } catch (e) {}
            if (currentTrait.selected === i) {
              const previewImage = document.getElementById(`preview-trait${currentTraitId}`);
              if (previewImage && previewImage.src) { /* ... update position ... */ }
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
          // Original logic
          if (!manuallyMoved && !variantHistories[key]) {
            variantHistories[key] = [{ left: position.left, top: position.top }];
            try { localStorage.setItem(`trait${nextTrait.id}-${nextVariationName}-position`, JSON.stringify(position)); } catch (e) {}
            if (nextTrait.selected === i) {
              const previewImage = document.getElementById(`preview-trait${nextTrait.id}`);
              if (previewImage && previewImage.src) { /* ... update position ... */ }
            }
          }
        }
      }
    }

    // Original update sample positions function
    function updateSamplePositions(traitId, variationName, position) { // Note: variationName wasn't used here originally
      const variant = TraitManager.getTrait(traitId)?.variants.find(v => v.name === variationName);
      if (!variant) return; // Need variantId to update correctly
      const variationId = variant.id;

      for (let i = 0; i < 16; i++) {
        if (!sampleData[i]) continue; // Added check
        const sample = sampleData[i];
        for (let j = 0; j < sample.length; j++) {
          if (sample[j].traitId === traitId && sample[j].variantId === variationId) {
            sample[j].position = position;
          }
        }
      }
      updatePreviewSamples(); // Original called update
    }

    // Original mint function (with missing initialHtmlUri variable)
    window.mintNFT = async function() {
      const status = document.getElementById('status'); // Assume status exists or create if needed
      if (!status && mintingPanel && mintingPanel.element) {
          status = document.createElement('div'); status.id = 'status';
          mintingPanel.element.appendChild(status);
      } else if (!status) { console.error("Cannot find/create status element"); return; }


      try {
          if (!provider || !signer || !contractWithSigner) { throw new Error("Wallet not connected or contract not initialized."); } // Added checks
        await provider.send("eth_requestAccounts", []);
        const numTraitCategories = TraitManager.getAllTraits().length;
        const traitCategoryVariants = TraitManager.getAllTraits().map(trait => trait.variants.length);
        const traitIndices = TraitManager.getAllTraits().map(trait => trait.selected);
        const recipient = await signer.getAddress();

        status.innerText = "Uploading images to Arweave...";
        const formData = new FormData(); /* ... original Arweave upload logic ... */
         // This loop might fail if trait name is empty or variants empty
         for (let i = 0; i < TraitManager.getAllTraits().length; i++) {
            const trait = TraitManager.getAllTraits()[i];
            if (trait.variants.length <= trait.selected) throw new Error(`Trait ${trait.position} has no selected variant or variant list is empty.`);
            const selectedVariation = trait.variants[trait.selected];
            const response = await fetch(selectedVariation.url); // Fails if URL is invalid (e.g., revoked blob)
            const blob = await response.blob();
            formData.append('images', blob, `${trait.name || `Trait${trait.position}`}-${selectedVariation.name || `Variant${trait.selected}`}.png`); // Use fallback names
         }
         const uploadResponse = await fetch('https://aifn-1-api-q1ni.vercel.app/api/upload-to-arweave', { method: 'POST', body: formData });
         const uploadData = await uploadResponse.json();
         if (!uploadResponse.ok || uploadData.error) throw new Error(uploadData.error || `Arweave upload failed: ${uploadResponse.statusText}`);
         if (!uploadData.transactionIds || uploadData.transactionIds.length !== numTraitCategories) throw new Error("Arweave upload did not return expected number of transaction IDs.");
         const arweaveUrls = uploadData.transactionIds.map(id => `https://arweave.net/${id}`);
         console.log("Arweave URLs:", arweaveUrls); // Debug Log

        // !!! CRITICAL ORIGINAL ERROR: initialHtmlUri is not defined !!!
        // Need to define what this should be. Placeholder added.
        const initialHtmlUri = "ipfs://placeholder_uri"; // Placeholder - MUST BE REPLACED WITH ACTUAL LOGIC/VALUE
        if (initialHtmlUri === "ipfs://placeholder_uri") {
            console.warn("Using placeholder initialHtmlUri for minting!");
            // status.innerText = "Error: initialHtmlUri not set!"; // Option to halt mint
            // return;
        }

        status.innerText = "Estimating gas...";
         // Use config fee value
         const feeWei = ethers.utils.parseEther(config.sepolia.mintFee || "0");
        const gasLimit = await contractWithSigner.estimateGas.mintNFT(
          recipient, initialHtmlUri, numTraitCategories, traitCategoryVariants, traitIndices,
          { value: feeWei }
        );

        status.innerText = "Minting...";
        const tx = await contractWithSigner.mintNFT(
          recipient, initialHtmlUri, numTraitCategories, traitCategoryVariants, traitIndices,
          { value: feeWei, gasLimit: gasLimit.add(50000) } // Add buffer to estimated gas
        );
        const receipt = await tx.wait();

        // Original event finding logic
        const transferEvent = receipt.events?.find(e => e.event === "Transfer"); // Use optional chaining
        if (!transferEvent || !transferEvent.args) throw new Error("Mint transaction failed or Transfer event not found.");
        const tokenId = transferEvent.args.tokenId.toString();
        status.innerText = `Minted! Token ID: ${tokenId}`;
      } catch (error) {
        console.error("Minting Error:", error); // Log full error
        status.innerText = `Error: ${error.message}`;
      }
    };
