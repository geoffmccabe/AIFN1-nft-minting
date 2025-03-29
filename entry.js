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
    this.style = { ...style }; // Store custom styles
    this.element = null;
  }

  // *** ADDED: Apply specific styles for logo centering via JS ***
  applyLogoCenteringStyles() {
    if (this.id === 'logo-panel' && this.element) {
        // Style the panel itself for flex centering
        Object.assign(this.element.style, {
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            height: '200px', padding: '0' // Needs explicit height
        });
        // Style the logo image within the panel
        const logoImg = this.element.querySelector('#logo');
        if (logoImg) {
            Object.assign(logoImg.style, {
                margin: 'auto', // Center block/image in flex
                maxWidth: '600px', // Respect max size
                maxHeight: '100%', // Fit panel height
                width: 'auto', // Maintain aspect ratio
                height: 'auto', // Maintain aspect ratio
                display: 'block' // Needed for margin:auto
            });
        }
    }
  }

  // Use original render logic, but call the centering helper
  render() {
    // Original render created element if !this.element
    // Let's always create/recreate for consistency on renderAll
    this.element = document.createElement('div');
    this.element.id = this.id;
    this.element.className = 'panel';
    const header = this.id === 'logo-panel' ? '' : `<div class="panel-top-bar"></div><h2>${this.title}</h2>`;
    this.element.innerHTML = header + this.content;
    // Apply base styles + custom styles from constructor
    // Note: Original JS applied display:block, width:100% here - remove those
    Object.assign(this.element.style, {
        ...this.style, // Apply styles passed in constructor
        position: 'relative', // Needed for dragging context
        cursor: 'default' // Default cursor
    });
    // Apply logo centering styles if this is the logo panel
    this.applyLogoCenteringStyles();
    return this.element;
  }

  // Use original update logic, but call the centering helper
  update(content) {
    if (this.element) {
      const header = this.id === 'logo-panel' ? '' : `<div class="panel-top-bar"></div><h2>${this.title}</h2>`;
      const currentScrollTop = this.element.scrollTop;
      this.element.innerHTML = header + (content || this.content);
      this.element.scrollTop = currentScrollTop;
      // Re-apply minimal styles potentially wiped by innerHTML
      Object.assign(this.element.style, { position: 'relative', cursor: 'default' });
      // Re-apply logo centering
      this.applyLogoCenteringStyles();
    }
  }

  // Original setColumn
  setColumn(column) {
    this.column = column;
  }
}

class PanelManager {
  constructor() {
    this.panels = [];
    // State for panel dragging (robust version)
    this.boundHandleMouseMove = null;
    this.boundHandleMouseUp = null;
    this.draggedElement = null;
    this.offsetX = 0; this.offsetY = 0;
  }

  // Original addPanel
  addPanel(panel) {
    this.panels.push(panel);
    this.renderAll();
  }

  // Original removePanel
  removePanel(panelId) {
    this.panels = this.panels.filter(p => p.id !== panelId);
    this.renderAll();
  }

  // Original renderAll logic (simplified, calls new setupDrag)
  renderAll() {
    const leftColumn = document.getElementById('left-column');
    const rightColumn = document.getElementById('right-column');
    if (!leftColumn || !rightColumn) { console.error('Columns not found'); return; }

    const scrollTops = { left: leftColumn.scrollTop, right: rightColumn.scrollTop };
    leftColumn.innerHTML = ''; rightColumn.innerHTML = ''; // Clear columns

    const leftFrag = document.createDocumentFragment();
    const rightFrag = document.createDocumentFragment();

    this.panels.forEach(panel => {
      panel.element = panel.render(); // Re-render element
      if (!panel.element) return;
      if (panel.column === 'left') { leftFrag.appendChild(panel.element); }
      else { rightFrag.appendChild(panel.element); }
      // Attach drag listener using the robust method defined below
      this.setupDrag(panel); // Attach corrected drag logic
    });

    leftColumn.appendChild(leftFrag);
    rightColumn.appendChild(rightFrag);
    leftColumn.scrollTop = scrollTops.left;
    rightColumn.scrollTop = scrollTops.right;

    // Re-attach essential listeners for dynamically loaded content WITHIN panels
    // We need this minimal re-attachment, otherwise trait controls etc won't work
    // after a drag operation causes renderAll.
    this.reAttachMinimalListeners();
  }

  // Minimal listener re-attachment needed after renderAll clears innerHTML
  reAttachMinimalListeners() {
    // Re-attach listeners specifically needed for panel CONTENT functionality
    // Example: Trait listeners (essential)
    const traitsPanel = this.panels.find(p => p.id === 'traits-panel');
    if (traitsPanel && traitsPanel.element && document.contains(traitsPanel.element)) {
        // traitsPanel.update(getTraitsContent()); // Content set by render, just need listeners
        TraitManager.getAllTraits().forEach(t => setupTraitListeners(t.id));
    }
    // Example: Preview listeners (essential for controls)
    const previewPanel = this.panels.find(p => p.id === 'preview-panel');
    if (previewPanel && previewPanel.element && document.contains(previewPanel.element)) {
        setupPreviewListeners(); // Use original global setup
    }
    // Example: Other buttons if needed
    const bgPanel = this.panels.find(p => p.id === 'background-panel');
    if (bgPanel && bgPanel.element) {
        const btn = bgPanel.element.querySelector('#generate-background');
        if (btn) btn.addEventListener('click', fetchBackground);
    }
     const samplesPanel = this.panels.find(p => p.id === 'preview-samples-panel');
    if (samplesPanel && samplesPanel.element) {
        const btn = samplesPanel.element.querySelector('#update-previews');
        if (btn) btn.addEventListener('click', updatePreviewSamples);
         samplesPanel.element.querySelectorAll('#preview-samples-grid .sample-container').forEach((c, i) => {
             c.addEventListener('click', () => {
                 if (sampleData[i]) sampleData[i].forEach(s => selectVariation(s.traitId, s.variantId));
             });
         });
    }
    const mintPanel = this.panels.find(p => p.id === 'minting-panel');
    if (mintPanel && mintPanel.element) {
        const btn = mintPanel.element.querySelector('#mintButton');
        if (btn) btn.addEventListener('click', window.mintNFT);
    }
  }


  // *** REPLACED original setupDrag with robust version for panel drag (incl. logo panel) ***
  setupDrag(panel) {
    const el = panel.element;
    // Use flag to prevent attaching listener multiple times
    if (!el || el.hasAttribute('data-panel-drag-listener')) return;

    const topBar = el.querySelector('.panel-top-bar');
    const isLogoPanel = el.id === 'logo-panel';
    const dragInitiator = isLogoPanel ? el : topBar; // Drag logo panel itself, others by top bar

    if (!dragInitiator) return; // Cannot drag if no initiator found

    const handleMouseDown = (e) => {
        let isValidDragStart = false;
        if (isLogoPanel) {
            const rect = el.getBoundingClientRect();
            const clickYRelative = e.clientY - rect.top;
            // Allow drag if click is within top 10 pixels for logo panel
            if (clickYRelative >= 0 && clickYRelative <= 10) isValidDragStart = true;
        } else if (e.target === topBar) {
            // Allow drag only if clicking the top bar for other panels
             isValidDragStart = true;
        }

        if (!isValidDragStart) return;

        e.preventDefault(); // Prevent text selection, etc.

        this.draggedElement = el; // Store element being dragged

        const rect = el.getBoundingClientRect();
        this.offsetX = e.clientX - rect.left;
        this.offsetY = e.clientY - rect.top;

        // Apply dragging styles
        Object.assign(el.style, {
            position: 'absolute', left: `${rect.left}px`, top: `${rect.top}px`,
            width: `${rect.width}px`, height: `${rect.height}px`,
            zIndex: '1000', cursor: 'grabbing', opacity: '0.8',
            boxShadow: '0 5px 15px rgba(0,0,0,0.2)', pointerEvents: 'none',
        });

        // Add global listeners (bound correctly)
        this.boundHandleMouseMove = handleMouseMove.bind(this);
        this.boundHandleMouseUp = handleMouseUp.bind(this);
        document.addEventListener('mousemove', this.boundHandleMouseMove);
        document.addEventListener('mouseup', this.boundHandleMouseUp);
    };

    const handleMouseMove = (e) => {
        if (!this.draggedElement) return;
        e.preventDefault();
        this.draggedElement.style.left = `${e.clientX - this.offsetX}px`;
        this.draggedElement.style.top = `${e.clientY - this.offsetY}px`;
    };

    const handleMouseUp = (e) => {
        if (!this.draggedElement) return;

        const droppedElement = this.draggedElement;
        this.draggedElement = null; // Clear state

        // Remove global listeners
        if (this.boundHandleMouseMove) document.removeEventListener('mousemove', this.boundHandleMouseMove);
        if (this.boundHandleMouseUp) document.removeEventListener('mouseup', this.boundHandleMouseUp);
        this.boundHandleMouseMove = null; this.boundHandleMouseUp = null;

        // Clear inline styles from drag
        Object.assign(droppedElement.style, {
            cursor: '', zIndex: '', opacity: '', position: '', left: '',
            top: '', width: '', height: '', boxShadow: '', pointerEvents: '',
        });

        // Determine Drop Location & Reorder panels array
        const dropX = e.clientX; const windowWidth = window.innerWidth;
        const newColumn = dropX < windowWidth / 2 ? 'left' : 'right';
        const droppedPanelObject = this.panels.find(p => p.element === droppedElement);
        if (!droppedPanelObject) return; // Safety check

        droppedPanelObject.setColumn(newColumn); // Update panel's logical column

        // Find insertion point based on visual elements
        const dropY = e.clientY;
        const targetColumnElement = document.getElementById(newColumn === 'left' ? 'left-column' : 'right-column');
        if (!targetColumnElement) return; // Safety check

        let insertBeforeElement = null;
        const siblingsInColumn = Array.from(targetColumnElement.children);
        for (const sibling of siblingsInColumn) {
           if (sibling === droppedElement) continue;
           const rect = sibling.getBoundingClientRect();
           if (dropY < rect.top + rect.height / 2) { insertBeforeElement = sibling; break; }
        }

        // Reorder the internal `this.panels` array based on drop position
        const currentPanelIndex = this.panels.findIndex(p => p === droppedPanelObject);
        if (currentPanelIndex > -1) this.panels.splice(currentPanelIndex, 1); else return;

        let insertAtIndex = -1;
        if (insertBeforeElement) {
           const insertBeforePanelObj = this.panels.find(p => p.element === insertBeforeElement);
           if (insertBeforePanelObj) insertAtIndex = this.panels.findIndex(p => p === insertBeforePanelObj);
        }

        if (insertAtIndex !== -1) {
           this.panels.splice(insertAtIndex, 0, droppedPanelObject);
        } else {
           // Insert at end of the correct column group in the array
           let lastPanelInColumnIndex = -1;
           for (let i = this.panels.length - 1; i >= 0; i--) {
               if (this.panels[i].column === newColumn) { lastPanelInColumnIndex = i; break; }
           }
           this.panels.splice(lastPanelInColumnIndex + 1, 0, droppedPanelObject);
        }

        this.renderAll(); // Re-render based on updated panel order
    }; // End handleMouseUp

    // Attach the listener to the correct target
    dragInitiator.removeEventListener('mousedown', handleMouseDown); // Clean first
    dragInitiator.addEventListener('mousedown', handleMouseDown);
    el.setAttribute('data-panel-drag-listener', 'true'); // Mark attached
  } // End setupDrag
}


    /* Section 2 - TRAIT MANAGER FRAMEWORK */





    // --- Original TraitManager code ---
    const TraitManager = {
      traits: [],
      initialize() {
        this.traits = [];
        for (let i = 0; i < 3; i++) { this.addTrait(i + 1); }
      },
      addTrait(position) {
        const newTrait = { id: generateId(), position: position, name: '', isUserAssignedName: false, variants: [], selected: 0, zIndex: 0, createdAt: Date.now() };
        let maxPos = 0;
        this.traits.forEach(trait => {
          if (trait.position >= position) { trait.position++; }
          maxPos = Math.max(maxPos, trait.position);
        });
        newTrait.position = Math.min(position, maxPos + 1);
        this.traits.push(newTrait);
        this.traits.sort((a, b) => a.position - b.position);
        this.traits.forEach((trait, index) => {
             trait.position = index + 1;
             trait.zIndex = this.traits.length - trait.position + 1;
         });
        return newTrait;
      },
      removeTrait(traitId) {
        const traitIndex = this.traits.findIndex(trait => trait.id === traitId);
        if (traitIndex === -1) return;
        const removedPosition = this.traits[traitIndex].position;
        this.traits.splice(traitIndex, 1);
        this.traits.forEach(trait => {
          if (trait.position > removedPosition) { trait.position--; }
        });
        this.traits.forEach(trait => { trait.zIndex = this.traits.length - trait.position + 1; });
      },
      moveTrait(traitId, newPosition) {
        const trait = this.traits.find(t => t.id === traitId);
        if (!trait) return;
        const oldPosition = trait.position;
        if (newPosition === oldPosition) return;
        this.traits = this.traits.filter(t => t.id !== traitId);
        const insertIndex = Math.max(0, Math.min(newPosition - 1, this.traits.length));
        this.traits.splice(insertIndex, 0, trait);
        this.traits.forEach((t, idx) => {
            t.position = idx + 1;
            t.zIndex = this.traits.length - t.position + 1;
        });
      },
      addVariant(traitId, variantData) {
        const trait = this.traits.find(t => t.id === traitId);
        if (!trait) return;
        const newVariant = { id: generateId(), name: variantData.name, url: variantData.url, chance: variantData.chance || 0.5, createdAt: Date.now() };
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
      getTrait(traitId) { return this.traits.find(t => t.id === traitId); },
      getAllTraits() { return [...this.traits]; }
    };




    /* Section 3 - GLOBAL SETUP AND PANEL INITIALIZATION */





    let provider, contract, signer, contractWithSigner;
    let traitImages = [];
    let isDragging = false; // Flag for trait image dragging
    let currentImage = null; // Current trait image
    let offsetX_img = 0; // Renamed to avoid conflict with panel drag offset
    let offsetY_img = 0; // Renamed to avoid conflict with panel drag offset
    let moveInterval = null;
    let variantHistories = {};
    let timerInterval = null;
    let lastUndoTime = 0;
    let autoPositioned = new Array(20).fill(false);
    let sampleData = Array(16).fill(null).map(() => []);
    const clickSound = new Audio('https://www.soundjay.com/buttons/button-3.mp3');
    clickSound.volume = 0.25;

    const panelManager = new PanelManager(); // Instantiate manager

    // --- Define Panels ---
    const logoPanel = new Panel('logo-panel', '',
      `<img id="logo" src="https://github.com/geoffmccabe/AIFN1-nft-minting/raw/main/images/Perceptrons_Logo_Perc_Creator_600px.webp" alt="Perceptrons Logo">`, // Removed width="600"
      'left'
    );
    const traitsPanel = new Panel('traits-panel', 'Traits Manager', `<div id="trait-container"></div>`, 'left' );
    const previewPanel = new Panel('preview-panel', 'Preview',
      `<div id="preview"></div><div id="controls"><span id="coordinates"><strong>Coordinates:</strong> (0, 0)</span><span>&nbsp;&nbsp;</span><span class="direction-emoji" data-direction="up" title="Move Up">⬆️</span><span class="direction-emoji" data-direction="down" title="Move Down">⬇️</span><span class="direction-emoji" data-direction="left" title="Move Left">⬅️</span><span class="direction-emoji" data-direction="right" title="Move Right">➡️</span><span class="magnify-emoji" title="Enlarge Preview">🔍</span></div><div id="enlarged-preview"></div>`, // Coords start at 0,0
      'right'
    );
    const previewSamplesPanel = new Panel('preview-samples-panel', 'Preview Samples',
      `<div id="preview-samples"><div id="preview-samples-header"><button id="update-previews">UPDATE</button></div><div id="preview-samples-grid"></div></div>`,
      'right'
    );
    const backgroundPanel = new Panel('background-panel', 'AI Background',
      `<div id="prompt-section"><label for="base-prompt">Base Prompt:</label><textarea id="base-prompt" readonly>...</textarea><label for="user-prompt">User Prompt:</label><textarea id="user-prompt" placeholder="..."></textarea></div><button id="generate-background">Generate Bkgd</button><div id="background-details"><img id="background-image" src="..." alt="AI Background Preview"><p id="background-metadata">Default background shown.</p></div>`,
      'left'
    );
    // Restore original placeholder values (shortened before)
    backgroundPanel.content = backgroundPanel.content.replace('...</textarea><label','1girl, shiyang, ((((small breasts)))), (white skull belt buckle, front hair locks, black flat dragon tattoo on right shoulder, black flat dragon tattoo on right arm, red clothes, shoulder tattoo,:1.1), golden jewelry, long hair, earrings, black hair, golden hoop earrings, clothing cutout, ponytail, cleavage cutout, cleavage, bracelet, midriff, cheongsam top, red choli top, navel, makeup, holding, pirate pistol, lips, pirate gun, black shorts, looking at viewer, dynamic pose, ((asian girl)), action pose, (white skull belt buckle), black dragon tattoo on right shoulder, black dragon tattoo on right arm, ((shoulder tattoo))</textarea><label');
    backgroundPanel.content = backgroundPanel.content.replace('placeholder="..."','placeholder="(e.g. \'with a cyberpunk city background\')"');
    backgroundPanel.content = backgroundPanel.content.replace('src="..."', 'src="https://github.com/geoffmccabe/AIFN1-nft-minting/raw/main/images/Preview_Panel_Bkgd_600px.webp"');


    const mintingPanel = new Panel('minting-panel', 'Minting',
      `<div id="mint-section"><button id="mintButton" disabled>Mint NFT</button><div id="mintFeeDisplay">Mint Fee: Loading...</div><div id="status"></div></div>`,
      'right'
    );

    // --- Original Undo Listener ---
    function setupUndoListener() {
      document.addEventListener('keydown', (e) => {
        const now = Date.now(); if (now - lastUndoTime < 300) return;
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
          e.preventDefault(); lastUndoTime = now;
          if (!currentImage || !document.contains(currentImage)) return;
          const traitId = currentImage.id.replace('preview-trait', '');
          const trait = TraitManager.getTrait(traitId);
          if (!trait || trait.variants.length <= trait.selected) return;
          const variationName = trait.variants[trait.selected].name;
          const key = `${trait.id}-${variationName}`;
          if (variantHistories[key] && variantHistories[key].length > 1) {
            variantHistories[key].pop();
            const previousPosition = variantHistories[key][variantHistories[key].length - 1];
            currentImage.style.left = `${previousPosition.left}px`;
            currentImage.style.top = `${previousPosition.top}px`;
            try { localStorage.setItem(`trait${trait.id}-${variationName}-position`, JSON.stringify(previousPosition)); }
          catch (err) { console.error('Failed localStorage save:', err); }
          const coordsElement = document.getElementById('coordinates');
            if (coordsElement) updateCoordinates(currentImage, coordsElement);
            // Note: Original didn't call updateSamplePositions/updateSubsequentTraits here
          }
        }
      });
    }

    // --- DOMContentLoaded (Original structure + corrected setupDrag call) ---
    document.addEventListener('DOMContentLoaded', () => {
      try {
        // Ethers setup
        if (typeof window.ethereum !== 'undefined') {
            provider = new ethers.providers.Web3Provider(window.ethereum);
            if (window.config && window.config.sepolia && window.config.abi) {
                contract = new ethers.Contract(config.sepolia.contractAddress, config.abi, provider);
                signer = provider.getSigner();
                contractWithSigner = contract.connect(signer);
            } else { console.error("Config missing"); }
        } else { console.error("No ethereum provider"); }

        // Add panels
        panelManager.addPanel(logoPanel);
        panelManager.addPanel(traitsPanel);
        panelManager.addPanel(backgroundPanel);
        panelManager.addPanel(previewPanel);
        panelManager.addPanel(previewSamplesPanel);
        panelManager.addPanel(mintingPanel);

        // Init TraitManager
        TraitManager.initialize();
        // Explicitly update traits panel content AFTER init
        const traitsPanelInstance = panelManager.panels.find(p=>p.id==='traits-panel');
        if(traitsPanelInstance) traitsPanelInstance.update(getTraitsContent()); // Requires getTraitsContent (S4)

        // Init samples (relies on Section 6 functions)
        updatePreviewSamples();

        // Fetch fee (relies on Section 7 function)
        fetchMintFee();

        // Attach preview listeners (relies on Section 5 functions)
        setupPreviewListeners();
        // Attach undo listener
        setupUndoListener();

        // Select initial variations (relies on Section 5 function)
        TraitManager.getAllTraits().forEach(trait => {
            if (trait.variants.length > 0) {
                selectVariation(trait.id, trait.variants[0].id);
            }
        });

        // *** Corrected: Call setupDrag for each panel after adding ***
        // Note: renderAll now handles this internally, so this loop is potentially redundant
        // Commenting out to rely on renderAll's call
        // panelManager.panels.forEach(panel => panelManager.setupDrag(panel));

        // Setup initial trait image drag/drop (relies on Section 5 function)
        // Note: traitImages might be empty here
        traitImages.forEach((img, index) => setupDragAndDrop(img, index));

      } catch (error) {
            console.error("Error during initial setup:", error);
            const body = document.querySelector('body');
            if(body) body.innerHTML = `<p style="color:red;">Init Error: ${error.message}</p>`;
      }
    });






    /* Section 4 - TRAIT MANAGEMENT LOGIC */





    // --- Original Section 4 Code ---
    function getTraitsContent() {
      let html = '<div id="trait-container">';
      TraitManager.getAllTraits().forEach(trait => {
        html += `<div id="trait${trait.id}" class="trait-section"><div class="trait-header"><h2>TRAIT ${trait.position}${trait.isUserAssignedName && trait.name ? ` - ${trait.name}` : ''}</h2><div class="trait-controls"><span class="up-arrow" data-trait="${trait.id}" data-tooltip="Swap Trait Order">⬆️</span><span class="down-arrow" data-trait="${trait.id}" data-tooltip="Swap Trait Order">⬇️</span><span class="add-trait" data-trait="${trait.id}">➕</span><span class="remove-trait" data-trait="${trait.id}">➖</span></div></div><input type="text" id="trait${trait.id}-name" placeholder="Trait ${trait.position}" ${trait.isUserAssignedName ? `value="${trait.name}"` : ''}><input type="file" id="trait${trait.id}-files" accept="image/png,image/webp" multiple onchange="handleFileChange('${trait.id}', this)"><label class="file-input-label" for="trait${trait.id}-files">Choose Files</label><div id="trait${trait.id}-grid" class="trait-grid">`;
        trait.variants.forEach(variant => {
          html += `<div class="variation-container" data-trait-id="${trait.id}" data-variation-id="${variant.id}"><div class="variation-image-wrapper${trait.selected === trait.variants.indexOf(variant) ? ' selected' : ''}"><img src="${variant.url}" alt="${variant.name}" class="variation"></div><div class="variation-filename">${variant.name}</div></div>`;
        }); html += `</div></div>`; }); html += '</div>'; return html;
    }
    function handleFileChange(traitId, input) {
      console.log(`File input triggered for trait ${traitId}`);
      const files = Array.from(input.files).sort((a, b) => a.name.localeCompare(b.name));
      if (!files.length) { console.log('No files selected'); return; }
      const validTypes = ['image/png', 'image/webp'];
      for (let file of files) { if (!validTypes.includes(file.type)) { console.error(`Invalid file type: ${file.name}`); return; } }
      const trait = TraitManager.getTrait(traitId);
      if (!trait) return; // Guard
      if (!trait.isUserAssignedName) { trait.name = `Trait ${trait.position}`; }
      trait.variants.forEach(variant => { if (variant.url && variant.url.startsWith('blob:')) { URL.revokeObjectURL(variant.url); } });
      trait.variants = [];
      traitImages = traitImages.filter(img => img.id !== `preview-trait${traitId}`);
      files.forEach(file => {
        const variationName = file.name.split('.').slice(0, -1).join('.'); const url = URL.createObjectURL(file);
        TraitManager.addVariant(traitId, { name: variationName, url });
      });
      if (trait.variants.length > 0) {
        setTimeout(() => { selectVariation(traitId, trait.variants[0].id); }, 100);
        document.querySelector(`label[for="trait${traitId}-files"]`).textContent = 'Choose New Files';
        autoPositioned[TraitManager.getAllTraits().findIndex(t => t.id === traitId)] = false;
      }
      const traitsPanelInstance = panelManager.panels.find(p => p.id === 'traits-panel');
      if (traitsPanelInstance) traitsPanelInstance.update(getTraitsContent()); // Update via panel instance
      TraitManager.getAllTraits().forEach(t => setupTraitListeners(t.id)); // Re-attach listeners
      updateMintButton(); updatePreviewSamples(); input.value = '';
    }
    function setupTraitListeners(traitId) {
      const traitElement = document.getElementById(`trait${traitId}`); if (!traitElement) return;
      const listenerFlag = 'data-trait-listener'; // Use flag to prevent duplicates
      const safeAddListener = (el, event, handler) => { if (el && !el.hasAttribute(listenerFlag)) { el.addEventListener(event, handler); el.setAttribute(listenerFlag, 'true'); } };

      const nameInput = traitElement.querySelector(`#trait${traitId}-name`);
      const grid = traitElement.querySelector(`#trait${traitId}-grid`);
      const upArrow = traitElement.querySelector(`.up-arrow[data-trait="${traitId}"]`);
      const downArrow = traitElement.querySelector(`.down-arrow[data-trait="${traitId}"]`);
      const addTraitBtn = traitElement.querySelector(`.add-trait[data-trait="${traitId}"]`);
      const removeTraitBtn = traitElement.querySelector(`.remove-trait[data-trait="${traitId}"]`);

      safeAddListener(nameInput, 'input', () => {
          const trait = TraitManager.getTrait(traitId); if (!trait) return;
          trait.name = nameInput.value.trim(); trait.isUserAssignedName = true;
          const title = nameInput.closest('.trait-section')?.querySelector('h2');
          if (title) title.textContent = `TRAIT ${trait.position}${trait.name ? ` - ${trait.name}` : ''}`;
      });

      if (grid) {
        grid.querySelectorAll('.variation-container').forEach(container => {
          if (!container.hasAttribute(listenerFlag)) {
            container.addEventListener('click', () => {
              const clickedTraitId = container.dataset.traitId; const variantId = container.dataset.variationId;
              const parentGrid = container.closest('.trait-grid');
              if (parentGrid) { parentGrid.querySelectorAll('.variation-image-wrapper').forEach(w => w.classList.remove('selected')); }
              container.querySelector('.variation-image-wrapper').classList.add('selected');
              selectVariation(clickedTraitId, variantId);
            }); container.setAttribute(listenerFlag, 'true');
          }
        });
      }

      const handleTraitMove = (direction) => { /* Original logic */ }; // Define or paste original move handler
      safeAddListener(upArrow, 'click', () => handleTraitMove('up'));
      safeAddListener(downArrow, 'click', () => handleTraitMove('down'));
      safeAddListener(addTraitBtn, 'click', () => {
          if (TraitManager.getAllTraits().length < 20) {
              const currentTrait = TraitManager.getTrait(traitId); if (!currentTrait) return;
              TraitManager.addTrait(currentTrait.position + 1);
              const traitsPanelInstance = panelManager.panels.find(p => p.id === 'traits-panel');
              if(traitsPanelInstance) traitsPanelInstance.update(getTraitsContent());
              TraitManager.getAllTraits().forEach(t => setupTraitListeners(t.id)); updatePreviewSamples(); updateZIndices();
          }
      });
      safeAddListener(removeTraitBtn, 'click', () => removeTrait(traitId));
    }
    function removeTrait(traitId) { /* Original logic */ } // Define or paste original remove handler

    // Re-inserting original handleTraitMove logic (needs careful check)
    const handleTraitMove = (direction) => {
        const trait = TraitManager.getTrait(traitId); if (!trait) return;
        const traits = TraitManager.getAllTraits();
        let newPosition;
        if (direction === 'up') { newPosition = trait.position === 1 ? traits.length : trait.position - 1; }
        else { newPosition = trait.position === traits.length ? 1 : trait.position + 1; }
        TraitManager.moveTrait(traitId, newPosition);
        traitImages = TraitManager.getAllTraits().map(t => document.getElementById(`preview-trait${t.id}`)).filter(img => img);
        const traitsPanelInstance = panelManager.panels.find(p => p.id === 'traits-panel');
        if (traitsPanelInstance) traitsPanelInstance.update(getTraitsContent());
        TraitManager.getAllTraits().forEach(t => setupTraitListeners(t.id));
        traitImages.forEach((img, index) => setupDragAndDrop(img, index));
        updatePreviewSamples(); updateZIndices();
    };
    // Re-inserting original removeTrait logic (needs careful check)
    function removeTrait(traitId) {
      if (TraitManager.getAllTraits().length <= 1) return;
      const traitToRemove = TraitManager.getTrait(traitId); if (!traitToRemove) return;
      const confirmationDialog = document.createElement('div'); confirmationDialog.className = 'confirmation-dialog';
      const message = document.createElement('p'); message.textContent = `Delete Trait ${traitToRemove.position}?`;
      const buttonsDiv = document.createElement('div'); buttonsDiv.className = 'buttons';
      const yesButton = document.createElement('button'); yesButton.className = 'yes-button'; yesButton.textContent = 'Y';
      const noButton = document.createElement('button'); noButton.className = 'no-button'; noButton.textContent = 'N';
      const cleanupDialog = () => { if (confirmationDialog.parentNode) confirmationDialog.parentNode.removeChild(confirmationDialog); };
      yesButton.addEventListener('click', () => {
          TraitManager.removeTrait(traitId);
          const imgToRemove = document.getElementById(`preview-trait${traitId}`); if (imgToRemove) imgToRemove.remove();
          traitImages = traitImages.filter(img => img.id !== `preview-trait${traitId}`);
          const traitsPanelInstance = panelManager.panels.find(p => p.id === 'traits-panel'); if(traitsPanelInstance) traitsPanelInstance.update(getTraitsContent());
          TraitManager.getAllTraits().forEach(t => setupTraitListeners(t.id));
          traitImages.forEach((img, index) => setupDragAndDrop(img, index));
          updatePreviewSamples(); updateZIndices(); updateMintButton();
          cleanupDialog();
      });
      noButton.addEventListener('click', cleanupDialog);
      buttonsDiv.appendChild(yesButton); buttonsDiv.appendChild(noButton); confirmationDialog.appendChild(message); confirmationDialog.appendChild(buttonsDiv); document.body.appendChild(confirmationDialog);
    }






/* Section 5 - PREVIEW MANAGEMENT LOGIC */


    // --- Original Section 5 Code ---
function selectVariation(traitId, variationId) {
  const trait = TraitManager.getTrait(traitId); if (!trait) return;
  const variationIndex = trait.variants.findIndex(v => v.id === variationId); if (variationIndex === -1) return;
  trait.selected = variationIndex;
  let previewImage = document.getElementById(`preview-trait${traitId}`);
  if (!previewImage) {
    previewImage = document.createElement('img'); previewImage.id = `preview-trait${traitId}`;
    const previewContainer = document.getElementById('preview'); if (!previewContainer) return;
    previewContainer.appendChild(previewImage); traitImages.push(previewImage);
    // Need to re-sort traitImages if order matters elsewhere? Maybe not critical here.
  }
  previewImage.src = trait.variants[variationIndex].url;
  previewImage.alt = trait.variants[variationIndex].name;
  previewImage.onerror = () => { previewImage.style.visibility = 'hidden'; };
  previewImage.style.visibility = 'visible';
  const key = `${traitId}-${trait.variants[variationIndex].name}`;
  const savedPositionStr = localStorage.getItem(`trait${traitId}-${trait.variants[variationIndex].name}-position`);
  let position = { left: 0, top: 0 };
  if (savedPositionStr) { try { position = JSON.parse(savedPositionStr); } catch { position = { left: 0, top: 0 }; } }
  // Removed original logic for inheriting position for simplicity in reset
  previewImage.style.left = `${position.left}px`; previewImage.style.top = `${position.top}px`;
  if (!variantHistories[key]) variantHistories[key] = [];
  const lastPos = variantHistories[key].slice(-1)[0];
  if (!lastPos || JSON.stringify(lastPos) !== JSON.stringify(position)) { variantHistories[key].push(position); }
  const currentTraitIndex = TraitManager.getAllTraits().findIndex(t => t.id === traitId); if (currentTraitIndex === -1) return;
  setupDragAndDrop(previewImage, currentTraitIndex); // Original call
  currentImage = previewImage; updateZIndices();
  const coordsElement = document.getElementById('coordinates'); if (coordsElement) updateCoordinates(currentImage, coordsElement);
}
function setupPreviewListeners() { // Original version
  const preview = document.getElementById('preview'); const coordinates = document.getElementById('coordinates');
  const directionEmojis = document.querySelectorAll('.direction-emoji'); const magnifyEmoji = document.querySelector('.magnify-emoji');
  const enlargedPreview = document.getElementById('enlarged-preview');
  if (preview) {
    preview.addEventListener('mousemove', (e) => {
      if (!isDragging || !currentImage) return; const rect = preview.getBoundingClientRect();
      let newLeft = e.clientX - rect.left - offsetX_img; let newTop = e.clientY - rect.top - offsetY_img; // Use renamed offsets
      const previewWidth = preview.clientWidth; const previewHeight = preview.clientHeight;
      const imgWidth = currentImage.clientWidth; const imgHeight = currentImage.clientHeight;
      newLeft = Math.max(0, Math.min(newLeft, previewWidth - imgWidth)); newTop = Math.max(0, Math.min(newTop, previewHeight - imgHeight));
      currentImage.style.left = `${newLeft}px`; currentImage.style.top = `${newTop}px`;
      updateCoordinates(currentImage, coordinates);
    });
    // Original didn't have mouseup/leave on preview, relies on document mouseup
    // Keep document mouseup defined here (original placement)
    document.addEventListener('mouseup', () => {
        if (isDragging && currentImage) {
            const traitIndex = traitImages.indexOf(currentImage);
            if (traitIndex !== -1) {
                const trait = TraitManager.getAllTraits()[traitIndex];
                if (trait && trait.variants.length > trait.selected) {
                    const variationName = trait.variants[trait.selected].name;
                    savePosition(currentImage, trait.id, variationName);
                }
            }
            isDragging = false; // Reset global image drag flag
            currentImage.style.cursor = 'grab'; currentImage.classList.remove('dragging'); updateZIndices();
        }
    });
  }
  if (directionEmojis) {
    directionEmojis.forEach(emoji => {
      const direction = emoji.getAttribute('data-direction');
      emoji.addEventListener('mousedown', () => {
        if (!currentImage || currentImage.src === '') return; stopArrowMovement();
        moveInterval = setInterval(() => {
          if (!currentImage || !document.contains(currentImage)) { stopArrowMovement(); return; }
          let left = parseFloat(currentImage.style.left) || 0; let top = parseFloat(currentImage.style.top) || 0;
          if (direction === 'up') top -= 1; if (direction === 'down') top += 1;
          if (direction === 'left') left -= 1; if (direction === 'right') right += 1;
          const previewContainer = document.getElementById('preview'); if (!previewContainer) return;
          const previewWidth = previewContainer.clientWidth; const previewHeight = previewContainer.clientHeight;
          const imgWidth = currentImage.clientWidth; const imgHeight = currentImage.clientHeight;
          left = Math.max(0, Math.min(left, previewWidth - imgWidth)); top = Math.max(0, Math.min(top, previewHeight - imgHeight));
          currentImage.style.left = `${left}px`; currentImage.style.top = `${top}px`;
          if (!currentImage.classList.contains('dragging')) currentImage.classList.add('dragging');
          updateCoordinates(currentImage, coordinates);
        }, 50);
      });
      emoji.addEventListener('mouseup', stopArrowMovement); // Use shared stop function
      emoji.addEventListener('mouseleave', stopArrowMovement); // Use shared stop function
    });
  }
  if (magnifyEmoji && enlargedPreview) {
    magnifyEmoji.addEventListener('click', () => { // Original magnify logic
      enlargedPreview.innerHTML = ''; const maxWidth = window.innerWidth * 0.9; const maxHeight = window.innerHeight * 0.9;
      let scale = 1; const previewRect = document.getElementById('preview').getBoundingClientRect();
      if ((maxWidth / maxHeight) > (previewRect.width / previewRect.height)) { // Aspect ratio check
          scale = maxHeight / previewRect.height; enlargedPreview.style.height = `${maxHeight}px`; enlargedPreview.style.width = `${previewRect.width * scale}px`;
      } else { scale = maxWidth / previewRect.width; enlargedPreview.style.width = `${maxWidth}px`; enlargedPreview.style.height = `${previewRect.height * scale}px`; }

      const visibleImages = traitImages.filter(img => img && img.style.visibility !== 'hidden' && img.src);
      const sortedImages = visibleImages.map((img, idx) => ({ img, z: parseInt(img.style.zIndex || '0') })).sort((a, b) => a.z - b.z);
      sortedImages.forEach(({ img }) => {
        const clonedImg = img.cloneNode(true);
        const style = window.getComputedStyle(img);
        const w = parseFloat(style.width); const h = parseFloat(style.height);
        const l = parseFloat(img.style.left) || 0; const t = parseFloat(img.style.top) || 0;
        clonedImg.style.width = `${w * scale}px`; clonedImg.style.height = `${h * scale}px`;
        clonedImg.style.left = `${l * scale}px`; clonedImg.style.top = `${t * scale}px`;
        clonedImg.style.zIndex = img.style.zIndex; clonedImg.style.visibility = 'visible'; clonedImg.style.position = 'absolute';
        enlargedPreview.appendChild(clonedImg);
      });
      enlargedPreview.style.display = 'block';
      const closeHandler = () => { enlargedPreview.style.display = 'none'; enlargedPreview.removeEventListener('click', closeHandler); };
      enlargedPreview.removeEventListener('click', closeHandler); // Clean first
      enlargedPreview.addEventListener('click', closeHandler, { once: true }); // Use once option
    });
  }
}
function setupDragAndDrop(img, traitIndex) { // Original version
    if (img) {
      // Renamed offsets used in original preview mousemove
      offsetX_img = 0; offsetY_img = 0;
      img.addEventListener('dragstart', (e) => e.preventDefault());
      img.addEventListener('mousedown', (e) => {
        if (img.src === '') return; // Ignore if no image source
        isDragging = true; // Set global flag for image drag
        currentImage = img; // Set current image being dragged
        const rect = img.getBoundingClientRect();
        // Use renamed offsets
        offsetX_img = e.clientX - rect.left;
        offsetY_img = e.clientY - rect.top;
        img.style.cursor = 'grabbing'; img.classList.add('dragging');
        const originalZ = img.style.zIndex; img.setAttribute('data-original-zindex', originalZ);
        img.style.zIndex = '999'; // Temp boost
        updateCoordinates(img, document.getElementById('coordinates'));
      });
      img.addEventListener('click', () => { // Original click handler
        if (img.src !== '') { currentImage = img; updateCoordinates(img, document.getElementById('coordinates')); }
      });
      // Add attribute flag to prevent duplicates if called again
      img.setAttribute('data-dragdrop-listener', 'true');
    }
}
function stopArrowMovement() { // Original stop logic + savePosition call
  if (moveInterval) {
    clearInterval(moveInterval); moveInterval = null;
    if (currentImage) {
        currentImage.classList.remove('dragging');
      const traitIndex = traitImages.indexOf(currentImage);
       if(traitIndex !== -1){
            const trait = TraitManager.getAllTraits()[traitIndex];
            if (trait && trait.variants.length > trait.selected) {
                const variationName = trait.variants[trait.selected].name;
                savePosition(currentImage, trait.id, variationName); // Call save on stop
            }
       }
    }
  }
}
function updateCoordinates(img, coordsElement) { // Original
  if (img && coordsElement) {
    const left = parseFloat(img.style.left) || 0; const top = parseFloat(img.style.top) || 0;
    coordsElement.innerHTML = `<strong>Coordinates:</strong> (${Math.round(left)}, ${Math.round(top)})`; // Use zero-based
  }
}
function updateZIndices() { // Original update logic
    traitImages.forEach((img, index) => {
      if (img) {
        // Ensure trait exists at index before accessing position
        const trait = TraitManager.getAllTraits()[index];
        if (trait) {
            // Don't update if it's being dragged (has data-original-zindex)
            if (!img.hasAttribute('data-original-zindex')) {
                 img.style.zIndex = String(TraitManager.getAllTraits().length - trait.position + 1);
            }
        } else {
             img.style.zIndex = '0'; // Default if trait missing
        }
      }
    });
    // Original didn't have offsetHeight redraw trigger
}






    /* Section 6 - PREVIEW SAMPLES LOGIC */


    // --- Original Section 6 Code ---
    function getPreviewSamplesContent() {
      let html = `<div id="preview-samples"><div id="preview-samples-header"><button id="update-previews">UPDATE</button></div><div id="preview-samples-grid">`;
      sampleData.forEach((sample, i) => {
        html += `<div class="sample-container">`;
        sample.forEach(item => {
          const trait = TraitManager.getTrait(item.traitId); if (!trait) return;
          const variant = trait.variants.find(v => v.id === item.variantId); if (!variant) return;
          // Use trait zIndex property now calculated in TraitManager
          html += `<img src="${variant.url}" alt="Sample ${i+1}" style="position: absolute; z-index: ${trait.zIndex}; left: ${item.position.left * 0.23333}px; top: ${item.position.top * 0.23333}px; transform: scale(0.23333); transform-origin: top left;">`;
        }); html += `</div>`; }); html += `</div></div>`; return html;
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
          let position; try { position = JSON.parse(savedPosition); } catch { position = {left:0, top:0}; }
          if (!variantHistories[key]) variantHistories[key] = [position];
          sampleData[i].push({ traitId: trait.id, variantId: variant.id, position });
        });
      }
      // Update via PanelManager instance
      const samplesPanelInstance = panelManager.panels.find(p => p.id === 'preview-samples-panel');
      if(samplesPanelInstance) samplesPanelInstance.update(getPreviewSamplesContent());
      // Re-attach listeners after update
      const updateButton = document.getElementById('update-previews');
      if (updateButton) { updateButton.addEventListener('click', updatePreviewSamples); }
      document.querySelectorAll('#preview-samples-grid .sample-container').forEach((container, i) => {
        container.addEventListener('click', () => { if (sampleData[i]) sampleData[i].forEach(sample => selectVariation(sample.traitId, sample.variantId)); });
      });
    }






    /* Section 7 - BACKGROUND AND MINTING LOGIC */


    // --- Original Section 7 Code ---
    async function fetchBackground() {
      const generateButton = document.getElementById('generate-background'); const bgImage = document.getElementById('background-image'); const bgMetadata = document.getElementById('background-metadata'); if (!generateButton || !bgImage || !bgMetadata) return;
      try {
        clickSound.play().catch(e=>{}); let seconds = 0; generateButton.disabled = true; generateButton.innerText = `Processing 0...`;
        timerInterval = setInterval(() => { seconds++; generateButton.innerText = `Processing ${seconds}...`; }, 1000);
        const userPrompt = document.getElementById('user-prompt').value.trim();
        const url = `https://aifn-1-api-q1ni.vercel.app/api/generate-background${userPrompt ? `?prompt=${encodeURIComponent(userPrompt)}` : ''}`;
        const response = await fetch(url); if (!response.ok) throw new Error(`API Error: ${response.statusText}`); const data = await response.json();
        // Use direct src assignment if #background-image is now an img tag
        bgImage.src = data.imageUrl; bgMetadata.textContent = data.metadata;
      } catch (error) {
        console.error('Error fetching background:', error); bgMetadata.textContent = `Failed: ${error.message}`;
      } finally {
        clearInterval(timerInterval); timerInterval = null; generateButton.innerText = 'Generate Bkgd'; generateButton.disabled = false;
      }
    }
    function fetchMintFee() {
      const mintFeeDisplay = document.getElementById('mintFeeDisplay');
      if (mintFeeDisplay) mintFeeDisplay.textContent = `Mint Fee: ${config?.sepolia?.mintFee || 'N/A'} ETH`; // Use config value
    }
    function updateMintButton() {
      const allTraitsHaveVariants = TraitManager.getAllTraits().every(trait => trait.variants.length > 0); // Original logic only checked for variants
      const mintBtn = document.getElementById('mintButton'); if (mintBtn) { mintBtn.disabled = !allTraitsHaveVariants; }
    }
    function savePosition(img, traitId, variationName) {
      const position = { left: parseFloat(img.style.left) || 0, top: parseFloat(img.style.top) || 0 }; const key = `${traitId}-${variationName}`;
      if (!variantHistories[key]) variantHistories[key] = [];
      const lastPos = variantHistories[key].slice(-1)[0]; if (!lastPos || JSON.stringify(lastPos) !== JSON.stringify(position)) { variantHistories[key].push(position); }
      try { localStorage.setItem(`trait${traitId}-${variationName}-position`, JSON.stringify(position)); localStorage.setItem(`trait${traitId}-${variationName}-manuallyMoved`, 'true'); }
      catch (e) { console.error('LS Error:', e); }
      // Removed original updateSubsequentTraits call for reset
      updateSamplePositions(traitId, variationName, position); // Original call
    }
    // Removed updateSubsequentTraits function
    function updateSamplePositions(traitId, variationName, position) { // Original logic, ensure variable names match
      for (let i = 0; i < sampleData.length; i++) { if (!sampleData[i]) continue;
        for (let j = 0; j < sampleData[i].length; j++) {
          const sampleItem = sampleData[i][j]; const trait = TraitManager.getTrait(sampleItem.traitId);
          const variant = trait ? trait.variants.find(v => v.id === sampleItem.variantId) : null;
          if (sampleItem.traitId === traitId && variant && variant.name === variationName) { sampleItem.position = position; }
        } }
      const samplesPanelInstance = panelManager.panels.find(p => p.id === 'preview-samples-panel');
      if (samplesPanelInstance) samplesPanelInstance.update(getPreviewSamplesContent()); // Update via instance
      // Re-attach listeners (original pattern)
      const updateButton = document.getElementById('update-previews'); if (updateButton) { updateButton.addEventListener('click', updatePreviewSamples); }
      document.querySelectorAll('#preview-samples-grid .sample-container').forEach((container, i) => { if (sampleData[i]) { container.addEventListener('click', () => sampleData[i].forEach(s => selectVariation(s.traitId, s.variantId))); } });
    }
    window.mintNFT = async function() { // Original logic (check placeholder uri)
      const statusDiv = document.getElementById('status'); if (!statusDiv) return;
      try { statusDiv.innerText = "Connecting..."; if (!provider || !signer || !contractWithSigner || !config) throw new Error("BC not init.");
        await provider.send("eth_requestAccounts", []); const recipient = await signer.getAddress(); if (!recipient) throw new Error("No address.");
          const traits = TraitManager.getAllTraits(); if (traits.some(t => !t.name || t.variants.length === 0 || t.selected < 0)) throw new Error("Traits incomplete.");
        const numTraitCategories = traits.length; const traitCategoryVariants = traits.map(t => t.variants.length); const traitIndices = traits.map(t => t.selected);
          const initialHtmlUri = "ipfs://placeholder"; // Needs definition
          statusDiv.innerText = "Uploading..."; const formData = new FormData();
        for (let i = 0; i < traits.length; i++) {
          const trait = traits[i]; const selectedVariation = trait.variants[trait.selected];
          try { const response = await fetch(selectedVariation.url); if (!response.ok) throw new Error(`Workspace blob fail ${trait.name}`); const blob = await response.blob(); formData.append('images', blob, `${trait.name||`trait${i+1}`}-${selectedVariation.name}.png`); }
          catch (fetchError) { throw new Error(`Img fetch error ${trait.name}: ${fetchError.message}`); } }
        const uploadResponse = await fetch('https://aifn-1-api-q1ni.vercel.app/api/upload-to-arweave', { method: 'POST', body: formData }); if (!uploadResponse.ok) throw new Error(`Upload fail: ${uploadResponse.statusText}`);
        const uploadData = await uploadResponse.json(); if (uploadData.error) throw new Error(`API Error: ${uploadData.error}`); if (!uploadData.transactionIds) throw new Error("Upload incomplete.");
          statusDiv.innerText = "Preparing tx..."; const mintFeeEth = config.sepolia.mintFee; const valueToSend = ethers.utils.parseEther(mintFeeEth);
          let estimatedGas; try { estimatedGas = await contractWithSigner.estimateGas.mintNFT(recipient, initialHtmlUri, numTraitCategories, traitCategoryVariants, traitIndices, { value: valueToSend }); }
          catch (gasError) { console.error("Gas Error:", gasError); throw new Error(`Gas fail: ${gasError.reason || gasError.message}`); }
        statusDiv.innerText = "Confirm in wallet..."; const tx = await contractWithSigner.mintNFT(recipient, initialHtmlUri, numTraitCategories, traitCategoryVariants, traitIndices, { value: valueToSend, gasLimit: estimatedGas.add(50000) });
        statusDiv.innerText = `Minting... Tx: ${tx.hash.substring(0,10)}...`; const receipt = await tx.wait();
        const transferEvent = receipt.events?.find(e => e.event === "Transfer"); if (!transferEvent || !transferEvent.args) throw new Error("Minted but no Transfer event.");
        const tokenId = transferEvent.args.tokenId.toString(); statusDiv.innerText = `Minted! Token ID: ${tokenId}`;
      } catch (error) { console.error('Mint Error:', error); statusDiv.innerText = `Error: ${error.reason || error.message || error}`; }
    };
