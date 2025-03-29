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
    this.style = { ...style };
    this.element = null;
  }

  applyLogoCenteringStyles() {
    // Helper function to apply centering styles via JS
    if (this.id === 'logo-panel' && this.element) {
        // Style the panel itself for flex centering
        Object.assign(this.element.style, {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '200px', // Explicit height needed
            padding: '0' // Remove panel padding
        });
        // Style the logo image within the panel
        const logoImg = this.element.querySelector('#logo');
        if (logoImg) {
            Object.assign(logoImg.style, {
                margin: 'auto', // Center block/image in flex
                maxWidth: '100%', // Fit panel
                maxHeight: '100%', // Fit panel
                display: 'block' // Ensure block behavior for margin:auto
            });
        }
    }
  }

  render() {
    this.element = document.createElement('div');
    this.element.id = this.id;
    this.element.className = 'panel'; // Base class for CSS

    const header = this.id === 'logo-panel' ? '' : `<div class="panel-top-bar"></div><h2>${this.title}</h2>`;
    this.element.innerHTML = header + this.content;

    // Apply minimal essential inline styles common to all panels
    Object.assign(this.element.style, {
      ...this.style,
      position: 'relative', // Needed for drag positioning context
      cursor: 'default',
    });

    // *** JS FIX for Issue 1: Logo Centering ***
    this.applyLogoCenteringStyles();

    return this.element;
  }

  update(content) {
    if (this.element) {
      const header = this.id === 'logo-panel' ? '' : `<div class="panel-top-bar"></div><h2>${this.title}</h2>`;
      this.element.innerHTML = header + (content || this.content);
      // Re-apply minimal styles after innerHTML potentially clears them
      Object.assign(this.element.style, {
        position: 'relative',
        cursor: 'default',
      });

      // *** JS FIX for Issue 1: Logo Centering (apply on update too) ***
      this.applyLogoCenteringStyles();
    }
  }

  setColumn(column) {
    this.column = column;
  }
}

class PanelManager {
  constructor() {
    this.panels = [];
    // Store references to bound listeners for correct removal
    this.boundHandleMouseMove = null;
    this.boundHandleMouseUp = null;
    this.draggedElement = null; // Track the element being dragged
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
    if (!leftColumn || !rightColumn) return;

    const scrollTops = { left: leftColumn.scrollTop, right: rightColumn.scrollTop };
    leftColumn.innerHTML = ''; // Clear columns
    rightColumn.innerHTML = '';

    const leftFrag = document.createDocumentFragment();
    const rightFrag = document.createDocumentFragment();

    this.panels.forEach(panel => {
      panel.element = panel.render(); // Create/update element
      if (panel.column === 'left') {
          leftFrag.appendChild(panel.element);
      } else {
          rightFrag.appendChild(panel.element);
      }
      this.setupDrag(panel); // Setup drag listeners for the element
    });

    leftColumn.appendChild(leftFrag);
    rightColumn.appendChild(rightFrag);

    // Restore scroll positions
    leftColumn.scrollTop = scrollTops.left;
    rightColumn.scrollTop = scrollTops.right;

    // Re-attach listeners for dynamic content inside panels after render
    this.reAttachDynamicListeners();
  }

  reAttachDynamicListeners() {
    // Central place to re-attach listeners potentially lost by innerHTML changes
    // Ensure event handlers have unique references if needed for removal
    const traitsPanel = this.panels.find(p => p.id === 'traits-panel');
    if (traitsPanel && traitsPanel.element) {
      TraitManager.getAllTraits().forEach(t => setupTraitListeners(t.id)); // Assumes setupTraitListeners handles its own cleanup/idempotency
    }

    const samplesPanel = this.panels.find(p => p.id === 'preview-samples-panel');
    if (samplesPanel && samplesPanel.element) {
        const updateButton = samplesPanel.element.querySelector('#update-previews');
        if (updateButton && !updateButton.hasAttribute('data-listener-attached')) { // Prevent multiple listeners
            updateButton.addEventListener('click', updatePreviewSamples);
            updateButton.setAttribute('data-listener-attached', 'true');
        }
        samplesPanel.element.querySelectorAll('#preview-samples-grid .sample-container').forEach((container, i) => {
            if (!container.hasAttribute('data-listener-attached')) {
                const sampleClickHandler = () => {
                    if (sampleData[i]) {
                        sampleData[i].forEach(sample => selectVariation(sample.traitId, sample.variantId));
                    }
                };
                container.addEventListener('click', sampleClickHandler);
                container.setAttribute('data-listener-attached', 'true');
            }
        });
    }

    const backgroundPanelElem = this.panels.find(p => p.id === 'background-panel')?.element;
    if (backgroundPanelElem) {
        const genBgBtn = backgroundPanelElem.querySelector('#generate-background');
         if (genBgBtn && !genBgBtn.hasAttribute('data-listener-attached')) {
            genBgBtn.addEventListener('click', fetchBackground);
            genBgBtn.setAttribute('data-listener-attached', 'true');
        }
    }

    const mintingPanelElem = this.panels.find(p => p.id === 'minting-panel')?.element;
    if (mintingPanelElem) {
        const mintBtn = mintingPanelElem.querySelector('#mintButton');
        if (mintBtn && !mintBtn.hasAttribute('data-listener-attached')) {
            mintBtn.addEventListener('click', window.mintNFT);
            mintBtn.setAttribute('data-listener-attached', 'true');
        }
    }
    // Re-run setup for preview controls which might be inside a re-rendered panel
    setupPreviewListeners();
  }


  setupDrag(panel) {
    const el = panel.element;
    if (!el || el.hasAttribute('data-drag-listener')) return; // Safety check and prevent duplicates

    let isDragging = false;
    let offsetX = 0, offsetY = 0;

    const handleMouseDown = (e) => {
      const isLogoPanel = el.id === 'logo-panel';
      const isTopBarClick = e.target.classList.contains('panel-top-bar');
      let isLogoTopAreaClick = false;

      console.log(`Mousedown on panel: ${el.id}`); // Debug Log

      if (isLogoPanel) {
        const rect = el.getBoundingClientRect();
        const clickYRelativeToPanel = e.clientY - rect.top;
        isLogoTopAreaClick = clickYRelativeToPanel >= 0 && clickYRelativeToPanel <= 10;
        console.log(`  isLogoPanel: ${isLogoPanel}, clickYRelative: ${clickYRelativeToPanel.toFixed(1)}, isLogoTopAreaClick: ${isLogoTopAreaClick}`); // Debug Log
      } else {
        console.log(`  isTopBarClick: ${isTopBarClick}`); // Debug Log
      }

      if (!isTopBarClick && !isLogoTopAreaClick) {
        console.log("  Invalid drag start area, returning."); // Debug Log
        return;
      }

      console.log("  Valid drag start."); // Debug Log
      e.preventDefault(); // Prevent text selection/default drag

      isDragging = true;
      this.draggedElement = el; // Track dragged element

      const dragRect = el.getBoundingClientRect();
      offsetX = e.clientX - dragRect.left;
      offsetY = e.clientY - dragRect.top;

      Object.assign(el.style, { // Apply dragging styles
          position: 'absolute',
          left: `${dragRect.left}px`,
          top: `${dragRect.top}px`,
          width: `${dragRect.width}px`,
          height: `${dragRect.height}px`,
          zIndex: '1000',
          cursor: 'grabbing',
          opacity: '0.8',
          boxShadow: '0 5px 15px rgba(0,0,0,0.2)',
      });

      // Bind listeners and store references FOR THIS DRAG INSTANCE
      // Important: Use .bind to maintain 'this' context if methods need it (handleMouseMove/Up don't here)
      this.boundHandleMouseMove = handleMouseMove; //.bind(this);
      this.boundHandleMouseUp = handleMouseUp; //.bind(this);

      document.addEventListener('mousemove', this.boundHandleMouseMove);
      document.addEventListener('mouseup', this.boundHandleMouseUp);
    };

    const handleMouseMove = (e) => {
      if (!isDragging || !this.draggedElement) return;
      e.preventDefault();
      this.draggedElement.style.left = `${e.clientX - offsetX}px`;
      this.draggedElement.style.top = `${e.clientY - offsetY}px`;
    };

    const handleMouseUp = (e) => {
      if (!isDragging || !this.draggedElement) return;

      const droppedElement = this.draggedElement; // Temp store before nulling
      isDragging = false;
      this.draggedElement = null; // Clear tracked element
      console.log(`Mouseup, dropping panel: ${droppedElement.id}`); // Debug Log

      // ** Remove the specific listeners bound for this drag instance **
      document.removeEventListener('mousemove', this.boundHandleMouseMove);
      document.removeEventListener('mouseup', this.boundHandleMouseUp);
      this.boundHandleMouseMove = null; // Clear references
      this.boundHandleMouseUp = null;

      // Restore styles by clearing inline styles
      droppedElement.style.cursor = '';
      droppedElement.style.zIndex = '';
      droppedElement.style.opacity = '';
      droppedElement.style.position = '';
      droppedElement.style.left = '';
      droppedElement.style.top = '';
      droppedElement.style.width = '';
      droppedElement.style.height = '';
      droppedElement.style.boxShadow = '';

      // --- Determine Drop Location & Reorder panels array ---
      const dropX = e.clientX;
      const windowWidth = window.innerWidth;
      const newColumn = dropX < windowWidth / 2 ? 'left' : 'right';
      const droppedPanelObject = this.panels.find(p => p.element === droppedElement);

      if (!droppedPanelObject) { console.error("Dropped panel object not found!"); return; }

      droppedPanelObject.setColumn(newColumn);
      console.log(`  Setting column to: ${newColumn}`); // Debug Log

      const dropY = e.clientY;
      const targetColumnElement = document.getElementById(newColumn === 'left' ? 'left-column' : 'right-column');
      if (!targetColumnElement) return;

      // Find visual insertion point based on elements currently in the DOM column
      const siblingsInColumn = Array.from(targetColumnElement.children);
      let insertBeforeElement = null;
      for (const sibling of siblingsInColumn) {
          if (sibling === droppedElement) continue;
          const rect = sibling.getBoundingClientRect();
          if (dropY < rect.top + rect.height / 2) {
              insertBeforeElement = sibling;
              break;
          }
      }

      // Reorder the internal `this.panels` array
      const currentPanelIndex = this.panels.findIndex(p => p === droppedPanelObject);
      if (currentPanelIndex > -1) {
          this.panels.splice(currentPanelIndex, 1); // Remove from old logical position
      }

      let insertAtIndex = -1;
      if (insertBeforeElement) {
          const insertBeforePanelObj = this.panels.find(p => p.element === insertBeforeElement);
          if (insertBeforePanelObj) {
              insertAtIndex = this.panels.findIndex(p => p === insertBeforePanelObj);
          }
      }

      if (insertAtIndex !== -1) {
          this.panels.splice(insertAtIndex, 0, droppedPanelObject);
          console.log(`  Inserting panel logically before: ${insertBeforeElement ? insertBeforeElement.id : 'null'}`); // Debug Log
      } else {
          // Insert after the last panel that *should* be in the target column
          let lastPanelInColumnIndex = -1;
          for (let i = this.panels.length - 1; i >= 0; i--) {
              if (this.panels[i].column === newColumn) {
                  lastPanelInColumnIndex = i;
                  break;
              }
          }
          this.panels.splice(lastPanelInColumnIndex + 1, 0, droppedPanelObject);
          console.log(`  Inserting panel logically at end of column ${newColumn}`); // Debug Log
      }

      // Re-render all panels from the updated `this.panels` array order
      this.renderAll();
    };

    // Prevent adding multiple mousedown listeners to the same element
    el.removeEventListener('mousedown', handleMouseDown); // Remove listener using the exact handler reference
    el.addEventListener('mousedown', handleMouseDown);
    el.setAttribute('data-drag-listener', 'true'); // Mark as having listener attached

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
        const maxPosition = this.traits.length;
        if (newPosition === oldPosition) return;
        if (oldPosition === 1 && newPosition === maxPosition) {
          const lastTrait = this.traits.find(t => t.position === maxPosition);
          if (lastTrait) {
            lastTrait.position = 1;
            trait.position = maxPosition;
          }
        } else if (oldPosition === maxPosition && newPosition === 1) {
          const firstTrait = this.traits.find(t => t.position === 1);
          if (firstTrait) {
            firstTrait.position = maxPosition;
            trait.position = 1;
          }
        } else {
          const targetTrait = this.traits.find(t => t.position === newPosition);
          if (targetTrait) {
            targetTrait.position = oldPosition;
            trait.position = newPosition;
          }
        }
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
            try {
              localStorage.setItem(`trait${trait.id}-${variationName}-position`, JSON.stringify(previousPosition));
            } catch (e) {
              console.error('Failed to save to localStorage:', e);
            }
            updateCoordinates(currentImage, document.getElementById('coordinates'));
            updateSamplePositions(trait.id, trait.variants[trait.selected].id, previousPosition);
            updateSubsequentTraits(trait.id, variationName, previousPosition);
          }
        }
      });
    }

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
        if (trait.variants.length > 0) {
          selectVariation(trait.id, trait.variants[0].id);
        }
      });

      panelManager.panels.forEach(panel => panelManager.setupDrag(panel));
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
      if (!files.length) {
        console.log('No files selected');
        return;
      }

      const validTypes = ['image/png', 'image/webp'];
      for (let file of files) {
        if (!validTypes.includes(file.type)) {
          console.error(`Invalid file type: ${file.name} (${file.type})`);
          return;
        }
      }

      const trait = TraitManager.getTrait(traitId);
      if (!trait.isUserAssignedName) {
        const position = TraitManager.getAllTraits().findIndex(t => t.id === traitId) + 1;
        trait.name = `Trait ${position}`;
      }

      trait.variants.forEach(variant => {
        if (variant.url && variant.url.startsWith('blob:')) {
          URL.revokeObjectURL(variant.url);
        }
      });

      trait.variants = [];
      traitImages = traitImages.filter(img => img.id !== `preview-trait${traitId}`);
      files.forEach(file => {
        const variationName = file.name.split('.').slice(0, -1).join('.');
        const url = URL.createObjectURL(file);
        TraitManager.addVariant(traitId, { name: variationName, url });
      });

      if (trait.variants.length > 0) {
        console.log(`Selecting variant for trait ${traitId}`);
        setTimeout(() => {
          selectVariation(traitId, trait.variants[0].id);
        }, 100);
        document.querySelector(`label[for="trait${traitId}-files"]`).textContent = 'Choose New Files';
        autoPositioned[TraitManager.getAllTraits().findIndex(t => t.id === traitId)] = false;
      } else {
        console.log('No variants added for trait', traitId);
      }

      traitsPanel.update(getTraitsContent());
      TraitManager.getAllTraits().forEach(t => setupTraitListeners(t.id));
      updateMintButton();
      updatePreviewSamples();
      input.value = ''; // Clear the input to prevent double triggering
    }

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
          title.textContent = `TRAIT ${trait.position}${trait.name ? ` - ${trait.name}` : ''}`;
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
              img.onerror = () => {
                console.error(`Failed to load image for trait ${trait.id}`);
                img.style.visibility = 'hidden';
              };
              document.getElementById('preview').appendChild(img);
              setupDragAndDrop(img, TraitManager.getAllTraits().findIndex(t => t.id === trait.id));
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
              img.onerror = () => {
                console.error(`Failed to load image for trait ${trait.id}`);
                img.style.visibility = 'hidden';
              };
              document.getElementById('preview').appendChild(img);
              setupDragAndDrop(img, TraitManager.getAllTraits().findIndex(t => t.id === trait.id));
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





    /* Section 5 - PREVIEW MANAGEMENT LOGIC */





function selectVariation(traitId, variationId) {
  const trait = TraitManager.getTrait(traitId);
  const variationIndex = trait.variants.findIndex(v => v.id === variationId);
  if (variationIndex === -1) return;
  trait.selected = variationIndex;

  let previewImage = document.getElementById(`preview-trait${traitId}`);
  if (!previewImage) {
    previewImage = document.createElement('img');
    previewImage.id = `preview-trait${traitId}`;
    document.getElementById('preview').appendChild(previewImage);
    traitImages.push(previewImage);
  }

  previewImage.src = trait.variants[variationIndex].url;
  previewImage.onerror = () => {
    previewImage.style.visibility = 'hidden';
  };
  previewImage.style.visibility = 'visible';

  const key = `${traitId}-${trait.variants[variationIndex].name}`;
  const savedPosition = localStorage.getItem(`trait${traitId}-${trait.variants[variationIndex].name}-position`);
  let position = { left: 0, top: 0 };

  if (savedPosition) {
    position = JSON.parse(savedPosition);
  } else {
    let lastPosition = null;
    for (let i = 0; i < trait.variants.length; i++) {
      if (i === variationIndex) continue;
      const otherKey = `${traitId}-${trait.variants[i].name}`;
      if (variantHistories[otherKey]?.length) {
        lastPosition = variantHistories[otherKey].slice(-1)[0];
      }
    }
    if (lastPosition) position = lastPosition;
    try {
      localStorage.setItem(`trait${traitId}-${trait.variants[variationIndex].name}-position`, JSON.stringify(position));
    } catch (e) {}
  }

  previewImage.style.left = `${position.left}px`;
  previewImage.style.top = `${position.top}px`;

  if (!variantHistories[key]) variantHistories[key] = [position];

  setupDragAndDrop(previewImage, TraitManager.getAllTraits().findIndex(t => t.id === traitId));
  currentImage = previewImage;
  updateZIndices();
  updateCoordinates(currentImage, document.getElementById('coordinates'));
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

    document.addEventListener('mouseup', () => {
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

  directionEmojis.forEach(emoji => {
    const direction = emoji.getAttribute('data-direction');
    emoji.addEventListener('mousedown', () => {
      if (!currentImage || !currentImage.src) return;
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

    emoji.addEventListener('mouseup', () => stopArrowMovement());
    emoji.addEventListener('mouseleave', () => stopArrowMovement());
  });

  magnifyEmoji.addEventListener('click', () => {
    const maxWidth = window.innerWidth * 0.9;
    const maxHeight = window.innerHeight * 0.9;
    const enlargedPreview = document.getElementById('enlarged-preview');
    enlargedPreview.innerHTML = '';
    let scale = maxWidth / 600;
    if (maxHeight / 600 < scale) scale = maxHeight / 600;
    enlargedPreview.style.width = `${600 * scale}px`;
    enlargedPreview.style.height = `${600 * scale}px`;

    const sorted = traitImages
      .map((img, i) => ({ img, z: TraitManager.getAllTraits()[i].zIndex }))
      .sort((a, b) => b.z - a.z);

    sorted.forEach(({ img }) => {
      const clone = img.cloneNode(true);
      clone.style.width = `${img.width * scale}px`;
      clone.style.height = `${img.height * scale}px`;
      clone.style.left = `${parseFloat(img.style.left) * scale}px`;
      clone.style.top = `${parseFloat(img.style.top) * scale}px`;
      clone.style.position = 'absolute';
      clone.style.zIndex = img.style.zIndex;
      clone.style.visibility = 'visible';
      enlargedPreview.appendChild(clone);
    });

    enlargedPreview.style.display = 'block';
    enlargedPreview.addEventListener('click', () => {
      enlargedPreview.style.display = 'none';
    }, { once: true });
  });
}

function setupDragAndDrop(img, traitIndex) {
  img.addEventListener('dragstart', e => e.preventDefault());

  img.addEventListener('mousedown', (e) => {
    if (!img.src) return;
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
    currentImage = img;
    updateCoordinates(img, document.getElementById('coordinates'));
  });
}

function stopArrowMovement() {
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
}

function updateCoordinates(img, coordsElement) {
  if (img && coordsElement) {
    const left = parseFloat(img.style.left) || 0;
    const top = parseFloat(img.style.top) || 0;
    coordsElement.innerHTML = `<strong>Coordinates:</strong> (${Math.round(left) + 1}, ${Math.round(top) + 1})`;
  }
}

function updateZIndices() {
  traitImages.forEach((img, index) => {
    const trait = TraitManager.getAllTraits()[index];
    img.style.zIndex = String(TraitManager.getAllTraits().length - trait.position + 1);
  });
  if (previewPanel.element) previewPanel.element.offsetHeight;
}





    /* Section 6 - PREVIEW SAMPLES LOGIC */





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





    /* Section 7 - BACKGROUND AND MINTING LOGIC */





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
      if (mintBtn) {
        mintBtn.disabled = !allTraitsSet;
      }
    }

    function savePosition(img, traitId, variationName) {
      const position = { left: parseFloat(img.style.left) || 0, top: parseFloat(img.style.top) || 0 };
      const key = `${traitId}-${variationName}`;
      if (!variantHistories[key]) variantHistories[key] = [];
      variantHistories[key].push(position);
      try {
        localStorage.setItem(`trait${traitId}-${variationName}-position`, JSON.stringify(position));
        localStorage.setItem(`trait${traitId}-${variationName}-manuallyMoved`, 'true');
      } catch (e) {
        console.error('Failed to save to localStorage:', e);
      }

      const trait = TraitManager.getTrait(traitId);
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
          } catch (e) {
            console.error('Failed to save to localStorage:', e);
          }
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
            try {
              localStorage.setItem(`trait${currentTraitId}-${nextVariationName}-position`, JSON.stringify(position));
            } catch (e) {
              console.error('Failed to save to localStorage:', e);
            }
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
            try {
              localStorage.setItem(`trait${nextTrait.id}-${nextVariationName}-position`, JSON.stringify(position));
            } catch (e) {
              console.error('Failed to save to localStorage:', e);
            }
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
